# Architecture

Agilearn is a **static single-page app plus a managed database**. The browser talks
to Supabase directly with the public anon key and the signed-in user's JWT, and
**Postgres Row Level Security decides every read and write**. There is no
application server to deploy, scale or secure.

> [!IMPORTANT]
> If you remember one rule: **the database is the security boundary**. A UI bug
> may show a button it shouldn't — it can never return a row RLS forbids.

---

## System context

```mermaid
flowchart TB
    T(["Teacher"]) & AD(["Admin"]) --> APP

    subgraph Vercel
        APP["Agilearn SPA<br/><sub>static assets + service worker</sub>"]
    end

    subgraph Supabase["Supabase project"]
        AUTH["Auth"]
        DB[("Postgres + RLS")]
        ST["Storage"]
        FN["send-grade-emails<br/><sub>Deno Edge Function</sub>"]
    end

    APP -->|"HTTPS · anon key + JWT"| AUTH & DB & ST
    APP -->|"HTTPS · JWT"| FN
    FN -->|"caller's JWT"| DB
    FN -->|"batch API"| RESEND["Resend"] --> INBOX(["Student inboxes"])
    APP -.->|"errors + perf"| BUGSNAG["Bugsnag"]
```

| Component              | Runtime          | Holds secrets?                | Deployed by                  |
| ---------------------- | ---------------- | ----------------------------- | ---------------------------- |
| SPA                    | Browser / PWA    | No — anon key is public       | Vercel, on push              |
| Postgres, Auth, Storage | Supabase        | Managed by Supabase           | `supabase db push`           |
| `send-grade-emails`    | Supabase Edge (Deno) | `RESEND_API_KEY` only     | `supabase functions deploy`  |

There is **no service-role key anywhere** — not in the SPA, not in the function.

---

## Layers inside the SPA

```mermaid
flowchart LR
    subgraph routes["src/routes/** — thin"]
        RT["params · loaders · auth guard"]
    end
    subgraph features["src/features/** — fat"]
        UI["pages · dialogs · grids<br/>local UI state"]
    end
    subgraph lib["src/lib/**"]
        QH["queries/*<br/><sub>useQuery / useMutation</sub>"]
        K["queries/keys.ts"]
        GR["grading.ts<br/><sub>pure</sub>"]
        SB["supabase.ts<br/><sub>createClient&lt;Database&gt;</sub>"]
        OF["offlineQueue.ts<br/>queryPersist.ts"]
    end
    RT --> UI --> QH --> SB
    UI --> GR
    QH --> K
    QH <--> OF
```

| Layer           | Path                       | Rule                                                                                   |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| Routes          | `src/routes/**`            | Read params, run guards, render a feature. No data logic. `routeTree.gen.ts` is generated. |
| Features        | `src/features/<area>/`     | All UI and orchestration. Local, ephemeral UI state only.                              |
| Data            | `src/lib/queries/*`        | The **only** code that calls Supabase. Reads are `useQuery`, writes are `useMutation` that invalidate `keys.*`. |
| Query keys      | `src/lib/queries/keys.ts`  | The only source of key tuples, so invalidation can't drift.                            |
| Grade math      | `src/lib/grading.ts`       | Pure, deterministic, no Supabase import. See [GRADING.md](GRADING.md).                 |
| Types           | `src/lib/database.types.ts` → `src/types/domain.ts` | Generated schema types → friendly `Classroom`, `Student`, … aliases. |
| Design system   | `src/components/ui/`, `src/styles/app.css` | Radix primitives + Tailwind v4 tokens under `@theme` (no config file).   |

### State ownership

| State                          | Owner                                  |
| ------------------------------ | -------------------------------------- |
| Anything that came from Supabase | TanStack Query — never copied into component state |
| Auth session and token refresh | The Supabase client (`persistSession`) |
| Writes made while offline      | IndexedDB queue (`offlineQueue.ts`)    |
| Cache snapshot for offline reload | IndexedDB (`queryPersist.ts`)       |
| Transient UI (open dialog, filters) | `useState` / Zustand inside the feature |
| Per-device conveniences (theme, recent classrooms) | `localStorage`       |

---

## A write, end to end

A teacher types a score into the gradebook.

```mermaid
sequenceDiagram
    autonumber
    actor T as Teacher
    participant G as GradeGrid
    participant M as useMutation (queries/grades.ts)
    participant Q as offlineQueue
    participant DB as Postgres

    T->>G: enters 18 / 20
    G->>M: mutate({ activity_id, student_id, score })
    alt online
        M->>DB: upsert scores (anon key + JWT)
        DB->>DB: RLS: owns_classroom(student's classroom)?
        DB->>DB: trigger: 0 ≤ score ≤ activity.max_score
        DB-->>M: row
        M->>M: invalidate keys.* → refetch
    else offline
        M->>Q: enqueue (id, payload, baseUpdatedAt)
        Note over Q: replayed on reconnect,<br/>server-wins conflict check
    end
    G-->>T: grid re-renders, grade recomputed by grading.ts
```

Nothing between step 2 and the database is ours to secure — the database
enforces itself.

---

## Auth and roles

```mermaid
stateDiagram-v2
    [*] --> SignUp: /teacher/signup
    SignUp --> Rejected: email domain not in allowed_email_domains
    SignUp --> VerifyOTP: handle_new_user() accepts
    VerifyOTP --> Teacher: profiles row, role = teacher
    Teacher --> Admin: promoted by an existing admin
    Admin --> Teacher: demoted by an admin
    note right of Teacher
        enforce_role_change() blocks
        self-promotion
    end note
```

- **Sign-in:** email + password at `/login`; password reset by 6-digit OTP at
  `/forgot-password`.
- **Teacher sign-up:** a six-step wizard at `/teacher/signup`, gated in the
  database by `handle_new_user()` against `allowed_email_domains`. Unknown schools
  can file a domain request, which admins review.
- **Admins** are never self-served. The very first admin is bootstrapped once by
  migration `0035`; every later admin is promoted from the Users page.
- **Session storage** honours "remember me" (localStorage vs sessionStorage),
  except in an installed PWA, which always persists — the OS kills backgrounded
  PWAs and would otherwise sign the user out on every app switch.
- **Route guard:** `src/routes/_auth.tsx` redirects to `/login` without a session.
  This is UX only; RLS is the real gate.

The `_auth/teacher/**` and `_auth/admin/**` folders are organisational. Moving a
route between them changes nothing about who can reach its data.

---

## Feature map

Update this table in the same PR that adds a route or feature.

### Public and auth

| Route                                     | Feature                    | Purpose                                 |
| ----------------------------------------- | -------------------------- | --------------------------------------- |
| `/` · `/features` · `/about`              | `features/landing`         | Marketing site                          |
| `/privacy` · `/terms`                     | `features/public`          | Legal pages                             |
| `/login`                                  | `features/auth`            | Email sign-in                           |
| `/forgot-password`                        | `features/auth`            | OTP password reset                      |
| `/teacher/signup/step-1 … step-6`         | `features/teacher/onboarding` | Domain-gated onboarding wizard       |

### Teacher

| Route                                          | Feature                       | Purpose                                     |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------- |
| `/teacher/dashboard`                           | `teacher/dashboard`           | Today's classes, alerts, quick actions      |
| `/teacher/classrooms`                          | `teacher/classrooms`          | Classroom list + creation wizard            |
| `/teacher/classrooms/$id`                      | `teacher/classrooms`          | Roster, subjects, schedule                  |
| `/teacher/classrooms/$id/grades`               | `teacher/grades`, `teacher/io`, `teacher/posted-grades` | Gradebook grid, import/export, posted grades, emails |
| `/teacher/classrooms/$id/attendance`           | `teacher/attendance`          | Session list                                |
| `/teacher/classrooms/$id/attendance/$sessionId` | `teacher/attendance`         | Mark present / absent / late / excused      |
| `/teacher/classrooms/$id/slideshow`            | `teacher/slideshow`           | Full-screen grade presentation              |
| `/teacher/modules`                             | `teacher/modules`             | Private teaching-modules library            |
| `/teacher/analytics`                           | `teacher/analytics`           | Grade distribution, at-risk students        |
| `/teacher/calendar`                            | `teacher/calendar`            | Meetings, events, holidays                  |
| `/teacher/usage`                               | `teacher/usage`               | Storage quota meter                         |
| `/teacher/profile`                             | `teacher/profile`             | Public profile + avatar                     |

### Admin and settings

| Route                      | Feature              | Purpose                               |
| -------------------------- | -------------------- | ------------------------------------- |
| `/admin/overview`          | `features/admin`     | School-wide numbers                   |
| `/admin/users`             | `features/admin`     | Directory, roles                      |
| `/admin/domain-requests`   | `features/admin`     | Allowlist + incoming requests         |
| `/admin/audit-log`         | `features/admin`     | Role and data change history          |
| `/settings/*`              | `features/settings`  | Profile, workspace, privacy, about    |

### Non-route modules

| Module                      | Purpose                                                       |
| --------------------------- | ------------------------------------------------------------- |
| `teacher/io`                | Excel class-record import (auto-mapped, saved presets), `.xlsx` and PDF export |
| `teacher/posted-grades`     | Import finished term grades, send them by email               |
| `teacher/notifications`     | Low-average and absence-streak alerts                         |
| `components/layout`         | App shell, dock, command palette, breadcrumbs                 |

---

## Data model in one picture

```mermaid
erDiagram
    profiles ||--o{ academic_periods : owns
    profiles ||--o{ classrooms : owns
    academic_periods ||--o{ classrooms : groups
    classrooms ||--o{ students : rosters
    classrooms ||--o{ course_subjects : teaches
    course_subjects ||--o{ grade_components : "splits into"
    course_subjects ||--o{ grading_periods : "graded across"
    grade_components ||--o{ activity_categories : has
    activity_categories ||--o{ activities : contains
    activities ||--o{ scores : records
    students ||--o{ scores : earns
    course_subjects ||--o{ class_sessions : meets
    class_sessions ||--o{ attendance_records : logs
    students ||--o{ attendance_records : attends
    course_subjects ||--o{ posted_grades : publishes
    students ||--o{ posted_grades : receives
    course_subjects }o--o| transmutation_tables : "converts with"
```

30 tables, 3 `security_invoker` views, RLS on every table. The full catalogue —
every policy, trigger and RPC — is in [DATABASE.md](DATABASE.md).

---

## Storage

| Bucket             | Visibility | Layout                     | Rule                                                   |
| ------------------ | ---------- | -------------------------- | ------------------------------------------------------ |
| `teaching-modules` | private    | `<owner-uuid>/<file>`      | Owner or admin only; 500 MB per teacher, enforced in a storage policy |
| `avatars`          | public     | `<owner-uuid>/<file>`      | Anyone reads; owner writes own folder                  |

Quota operations: [STORAGE_QUOTA_ADMIN_HANDOFF.md](STORAGE_QUOTA_ADMIN_HANDOFF.md).

---

## Build and delivery

```mermaid
flowchart LR
    PR["git push"] --> CI["GitHub Actions<br/><sub>format → typecheck → test → build</sub>"]
    PR --> VB["Vercel build<br/><sub>pnpm run build</sub>"]
    VB --> CDN["Vercel CDN<br/><sub>SPA rewrite → index.html</sub>"]
    MIG["supabase db push"] --> DB[("Postgres")]
    FD["supabase functions deploy"] --> FN["Edge Function"]
```

Frontend and backend ship **independently**. A migration is never bundled into a
frontend deploy, so apply schema changes before merging code that depends on them.
Walkthrough: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Related

- [Decision records](DECISIONS.md) — why it is shaped like this
- [Security model](SECURITY.md) — what protects what
- [Offline & PWA](OFFLINE.md) — the IndexedDB queue in detail
