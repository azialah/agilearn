# Agilearn architecture

Agilearn is a single-page React app that talks directly to Supabase. There is no
application server of our own: the browser holds the anon key, and **Postgres Row
Level Security is the access-control boundary**. This keeps the moving parts few
and the security model in one place — the database.

## System shape

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Browser (React SPA, PWA)   │         │           Supabase           │
│                             │  HTTPS  │                              │
│  routes → features          │ ──────▶ │  Auth   (email, no signup)   │
│  TanStack Query (server     │  anon   │  Postgres + RLS (10 tables)  │
│    state + cache)           │  key    │  Storage (teaching-modules)  │
│  supabase-js client         │ ◀────── │                              │
└─────────────────────────────┘         └──────────────────────────────┘
        served as static assets by Vercel (SPA rewrite → /index.html)
```

Every request from the browser carries the signed-in user's JWT. RLS policies
decide what that user can read or write; the app never sees rows it isn't allowed
to. There is no privileged backend path — no service-role key exists in this
codebase.

## Layers (and the rules between them)

```
src/
  routes/**                  Thin. Wire params/loaders, render a feature. (routeTree.gen.ts is generated)
    _auth/teacher/**          Authenticated core teaching surfaces (dashboard, classrooms, grades, attendance, modules, slideshow)
    _auth/admin/**            Authenticated admin management surfaces (users, domain requests)
    _auth/settings.tsx        Shared account settings (both roles)
    teacher.signup*.tsx       Pre-auth teacher onboarding wizard (domain-gated self-signup)
    login.tsx, forgot-password.tsx, index.tsx   Shared / public, ungrouped
  features/
    teacher/<name>/           Core teaching UI: onboarding, dashboard, classrooms, grades, attendance, modules, slideshow, io
    admin/                    Admin management UI: users, domain requests
    auth/                     Shared auth UI: LoginPage, ForgotPasswordFlow, shared schema/wizard-ui primitives
    settings/, landing/       Shared / public UI, ungrouped
  lib/queries/*        The ONLY place Supabase is read/written — TanStack Query hooks.
  lib/queries/keys.ts  Query-key factory. Invalidation depends on it; no inline key tuples.
  lib/grading.ts       Pure grade math. No Supabase imports. Unit-tested.
  lib/supabase.ts      createClient<Database> singleton (typed, persists the session).
  lib/database.types.ts  Mirrors supabase/migrations/*. Kept in sync by hand or `gen types`.
  types/domain.ts      Friendly Row/Insert/Update/Enum aliases derived from database.types.
  components/ui, layout  Design-system primitives + app shell.
```

- **Routes stay thin, features stay fat.** A route file reads params and renders a
  component from `src/features/`. It holds no data logic.
- **Server state is TanStack Query, only.** Reads are `useQuery`, writes are
  `useMutation` that invalidate the relevant `keys.*` on success. Remote data is
  never copied into component state or a separate store.
- **Grades are computed in exactly one place.** `src/lib/grading.ts` is pure and
  covered by `grading.test.ts`, so weighting logic can't diverge across screens.

## Feature map

Route prefix → feature directory → what it's for. **Update this table in the
same PR that adds a route/feature** — same discipline as keeping
`database.types.ts` in sync, not a separate task.

| Route prefix                                    | Feature dir                           | Purpose                                                  |
| ----------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `/`, `/about`, `/features`, `/privacy`, `/terms` | `features/landing`, `features/public` | Marketing landing + public legal/about/privacy/terms     |
| `/login`                                        | `features/auth`                       | Email sign-in page                                       |
| `/forgot-password`                              | `features/auth`                       | Password reset flow (OTP)                                |
| `/teacher.signup.*` (steps 1–6)                 | `features/teacher/onboarding`         | Domain-gated self-serve teacher sign-up wizard (multi-step) |
| `/_auth/teacher/dashboard`                      | `features/teacher/dashboard`          | Home dashboard (grades/attendance summary)               |
| `/_auth/teacher/classrooms`                     | `features/teacher/classrooms`         | Classroom list                                           |
| `/_auth/teacher/classrooms/$classroomId`        | `features/teacher/classrooms`         | Classroom detail (roster + metadata)                     |
| `/_auth/teacher/classrooms/$classroomId/grades` | `features/teacher/grades`             | Weighted gradebook (spreadsheet grid)                    |
| `/_auth/teacher/classrooms/$classroomId/attendance` | `features/teacher/attendance`     | Attendance session list + creation                       |
| `/_auth/teacher/classrooms/$classroomId/attendance/$sessionId` | `features/teacher/attendance` | Attendance record page (mark students present/absent/late) |
| `/_auth/teacher/classrooms/$classroomId/slideshow` | `features/teacher/slideshow`     | Classroom slideshow presentation (full-screen grades)    |
| `/_auth/teacher/modules`                        | `features/teacher/modules`            | Teaching-modules library (Storage-backed files)          |
| `/_auth/teacher/analytics`                      | `features/teacher/analytics`          | Per-classroom analytics (grade distribution, etc.)       |
| `/_auth/teacher/calendar`                       | `features/teacher/calendar`           | Calendar view (sessions, grading periods)                |
| `/_auth/teacher/profile`                        | `features/teacher/profile`            | Teacher profile editing                                  |
| `/_auth/teacher/usage`                          | `features/teacher/usage`              | Usage statistics                                         |
| `/_auth/admin/overview`                         | `features/admin`                      | School-wide analytics + admin overview dashboard         |
| `/_auth/admin/users`                            | `features/admin`                      | User/role management + directory                         |
| `/_auth/admin/domain-requests`                  | `features/admin`                      | Approve/manage allowed email domains                     |
| `/_auth/admin/audit-log`                        | `features/admin`                      | Admin action audit trail                                 |
| `/_auth/settings`                               | `features/settings`                   | Account settings (home)                                  |
| `/_auth/settings/profile`                       | `features/settings/sections`          | Profile settings                                         |
| `/_auth/settings/workspace`                     | `features/settings/sections`          | Workspace/classroom settings                             |
| `/_auth/settings/privacy`                       | `features/settings/sections`          | Privacy settings                                         |
| `/_auth/settings/about`                         | `features/settings/sections`          | About the app                                            |
| `features/teacher/io`                           | —                                     | Import/export helpers (PDF/xlsx), not a route            |
| `features/teacher/notifications`                | —                                     | Notification UI (toast/banner), not a route              |

## Data model

Ten tables (see `supabase/migrations/0001`–`0006`):

| Table                 | Holds                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| `profiles`            | One row per auth user; `role` = `admin` \| `teacher`.                      |
| `classrooms`          | A course offering (owner, name/code, year, block, weights).                |
| `students`            | Roster entries, scoped to a classroom.                                     |
| `grading_periods`     | Weighted periods within a classroom.                                       |
| `activity_categories` | Categories per period component (`lecture` \| `laboratory`).               |
| `activities`          | Graded items in a category (max score, date).                              |
| `scores`              | A student's score on an activity (composite PK).                           |
| `class_sessions`      | An attendance session for a classroom.                                     |
| `attendance_records`  | A student's status per session (`present`/`absent`/`late`/`excused`).      |
| `teaching_modules`    | Metadata for files in Storage (`lesson_plan`/`activity_story`/`resource`). |

Plus the `v_class_roster` view (classroom ⋈ students, `security_invoker`) and two
SECURITY DEFINER helper functions used inside policies:

- `public.is_admin()` — is the caller an admin?
- `public.owns_classroom(cid uuid)` — does the caller own that classroom?

**The grade model:** a classroom splits into weighted `grading_periods`; each
period has `activity_categories` tagged `lecture` or `laboratory`; each category
holds `activities`; each activity has per-student `scores`. `grading.ts` rolls
these up per component, then combines lecture and laboratory by the classroom's
`lecture_weight` / `laboratory_weight` (default 40 / 60) into a final grade.

## Auth & roles

- Email auth. **Teacher sign-up is self-serve but domain-gated**: the
  `handle_new_user()` trigger rejects any email whose domain isn't in
  `allowed_email_domains`. No admin self-sign-up — admins are provisioned
  out-of-band.
- A new auth user gets a `profiles` row via the `on_auth_user_created` trigger,
  defaulting to `teacher`.
- The `enforce_role_change()` trigger blocks a teacher from promoting themselves;
  only an admin can change a role.
- Teachers are isolated to classrooms they own (via `owns_classroom()`); admins
  see everything (via `is_admin()`).

**Folder convention vs. security boundary.** Routes and features are grouped
into `teacher/` (the core teaching product surface plus onboarding — used by
both roles, since admins reach it too) and `admin/` (the management surface —
users, domain requests) purely for organization. Both groupings sit behind the
same single `_auth` pathless layout, and access within them is enforced
identically by RLS regardless of which folder a route lives in. Moving a route
from `_auth/dashboard.tsx` to `_auth/teacher/dashboard.tsx` changes nothing
about who can reach it — `owns_classroom()` and `is_admin()` in Postgres are
still the only real gate.

## Storage

Teaching-module files live in a **private** `teaching-modules` bucket. Storage RLS
(migration `0005`) lets any authenticated user read, but only the owning folder or
an admin can write or delete. The `teaching_modules` table stores the metadata
(title, kind, path, size, mime) and points at the object.

## Implementation structure

### `src/lib/queries/` — Data layer

The **only place** Supabase is read or written. Every table access is wrapped
in a TanStack Query hook (`useQuery` for reads, `useMutation` for writes).

- **`keys.ts`** — Query-key factory. All invalidation depends on it; never
  hand-write key tuples elsewhere.
- **`classrooms.ts`, `students.ts`, `grades.ts`, `attendance.ts`, etc.** — One
  file per major entity. Each file exports hooks like `useClassrooms()`,
  `useCreateClassroom()`, `useUpdateClassroom()`, etc.
- **`offlineSync.ts`** — Offline queue and sync mechanism (mutations queue when
  offline, sync when reconnected).
- **`profiles.ts`** — Auth user profile queries + mutations.

Pattern (from `classrooms.ts`):
```typescript
export function useClassrooms() {
  return useQuery({
    queryKey: keys.classrooms(),
    queryFn: async () => { /* Supabase .from().select() */ }
  });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertClassroom) => { /* POST */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.classrooms() })
  });
}
```

### `src/lib/grading.ts` — Grade math

Pure, no Supabase imports. Fully tested by `grading.test.ts` and related spec
files (`grading.classrecord.test.ts`, `grading.policy.test.ts`,
`grading.transmutation.test.ts`). Exports functions like:

- `computeActivityTotal(scores, maxScore)` — sum student's scores.
- `computeCategoryComponent(activities)` — roll up activities by category.
- `computeFinalGrade(lectureComponent, labComponent, weights)` — combine
  components by lecture/lab weights.

Never compute grades elsewhere in the app; always call these functions.

### `src/lib/` — Utilities

- **`supabase.ts`** — `createClient<Database>()` typed singleton (persists auth
  session).
- **`database.types.ts`** — Mirrors `supabase/migrations/*`. Regenerate with
  `supabase gen types typescript --local` after any migration.
- **`theme.ts`** — Tailwind CSS v4 theme utilities (e.g. color/spacing lookups).
- **`locale.tsx`** — i18n provider (basic; currently minimal).
- **`queryClient.ts`** — TanStack Query client configuration (retry, stale time,
  etc.).
- **`queryPersist.ts`** — Persist Query cache to localStorage for offline PWA.
- **`useNetworkStatus.ts`** — Hook to detect online/offline.
- **`offlineQueue.ts`** — Offline-first mutation queue.
- **`cn.ts`** — `clsx` wrapper for className merging.
- **`nativeNotify.ts`** — Native browser notifications (for PWA).
- **`safeRedirect.ts`** — Safely redirect after auth actions (avoid open redirects).
- **`recentClassrooms.ts`** — Local storage tracker for recent classroom visits.
- **`imageCrop.ts`** — Image cropping utility (profile picture upload).
- **`classroomColor.ts`** — Deterministic color assignment for classrooms.

### `src/types/domain.ts` — Friendly aliases

Derives user-facing type aliases from `database.types.ts`:

```typescript
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Classroom = Database['public']['Tables']['classrooms']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
// ... etc.
```

### `src/components/` — Design system & layout

- **`ui/`** — Reusable primitives built on Radix UI + Tailwind CSS. Examples:
  - `Button.tsx`, `Input.tsx`, `Dialog.tsx`, `Select.tsx`, `Dropdown.tsx`,
    `Label.tsx`, `Tooltip.tsx`
  - Exported as single elements or compound components (e.g., Dialog/DialogTrigger/DialogContent/DialogClose)
  - All styled with Tailwind utilities; no hardcoded inline styles.

- **`layout/`** — App shell and layouts:
  - `AppShell.tsx` — Main layout wrapper (sidebar + top bar + content area)
  - `TopBar.tsx` — Header with user menu, notifications, breadcrumbs
  - `PageHeader.tsx` — Page title + breadcrumb
  - Organized by role / feature as needed

- **`OfflineCache.tsx`** — Offline cache status indicator.
- **`OfflineSyncBar.tsx`** — Shows when syncing queued mutations.
- **`NetworkStatusWatcher.tsx`** — Monitors online/offline and refreshes queries.
- **`CustomCursor.tsx`** — Custom UI cursor (if applicable).

### `src/features/` — Feature bundles

One directory per feature (teacher role, admin role, auth, settings, public).
Each feature is self-contained: components, logic, local state (via `zustand`
if needed), and hooks for data access (importing from `src/lib/queries/`).

**Example structure (`teacher/grades/`):**
```
teacher/grades/
  GradesPage.tsx           Route-level component (thin, render the page)
  GradeGrid.tsx            Spreadsheet grid (TanStack Table + virtual scrolling)
  GradeRow.tsx             Row renderer
  StructurePanel.tsx       Grading structure editor (periods, categories, activities)
  SummaryTable.tsx         Final grade rollup view
  GradeReportDialog.tsx    Export / print grades
  useGradeFilters.ts       Local state for filtering/sorting (zustand or useState)
```

No business logic in route files; they stay thin. All logic lives in feature
components or is imported from `src/lib/queries/`.

### Testing

- **Unit:** `grading.test.ts` for grade math; utility tests (e.g., `offlineQueue.test.ts`).
- **Component:** None currently (Vitest + RTL ready, but app tests may be in
  progress). Test files co-located with source when added.
- **CI gate:** `pnpm run test` (Vitest in run mode, no watch).

### Generated files (do NOT edit manually)

- **`src/routeTree.gen.ts`** — Auto-generated from `src/routes/**` by
  `@tanstack/router-plugin`. Regenerates on dev/build. Never hand-edit.
- **`src/lib/database.types.ts`** — Generated from `supabase/migrations/*` via
  `supabase gen types typescript --local`. Hand-edits are okay if types drift,
  but regeneration should be preferred. Any new table/column in a migration must
  appear here.
- **`dist/`** — Build output (Vite). Not committed; recreated per deployment.

## Build, deploy, quality

- **Build:** Vite (`tsc -b && vite build`), output to `dist/`. `vite-plugin-pwa`
  emits the service worker and offline shell.
- **Deploy:** Vercel, framework preset Vite. `vercel.json` sets a pnpm install/build
  and an SPA rewrite (`/(.*) → /index.html`). Config is just the two `VITE_SUPABASE_*`
  env vars. Full walkthrough in [DEPLOYMENT.md](./DEPLOYMENT.md).
- **CI** (`.github/workflows/ci.yml`, pnpm): `prettier --check` → `typecheck` →
  `vitest run` → `build`. There is no ESLint — Prettier is the only lint gate.
