# Agilearn Backlog

A three-milestone backlog of missing features, expanded into implementation-
ready detail. No dates are attached — milestones are ordered buckets, not a
calendar commitment.

**For Fable 5 (or whoever implements this):** every story below states its
acceptance criteria, the existing code/pattern to reuse, and any hard
constraint from [`.claude/CLAUDE.md`](../.claude/CLAUDE.md) that a naive
implementation would violate (most commonly: no `service_role` key in the
client, no new dependencies beyond what's in `package.json`, RLS is the
security boundary — not app code). Read a story's "Technical Implementation
Context" before writing code against it. Run the CI gate (`format:check` →
`typecheck` → `test` → `build`) before calling any story done — see
CLAUDE.md §5. Read **"Workflow: Commits, Session Limits & Auditing"** near
the end of this document before starting — it governs how and when you
commit, when to stop for the session, and where to log what you find.

Only two entities exist in this product: **Teacher** and **Admin**. There is
no student/parent portal and no public sign-up.

---

## Labels

| Name                | Color (hex) | Meaning                                                                                             |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `enhancement`       | `#A2EEF9`   | New capability, non-critical                                                                        |
| `bug`               | `#D73A4A`   | Something is broken vs. its intended behavior                                                       |
| `documentation`     | `#0075CA`   | Docs-only change                                                                                    |
| `critical-priority` | `#B60205`   | Severe — data loss, security, blocks a core workflow, or has wide blast radius across the app       |
| `hotfix`            | `#D93F0B`   | Needs to ship outside normal milestone flow                                                         |
| `high-priority`     | `#E99695`   | Do this milestone, ahead of medium/light                                                            |
| `medium-priority`   | `#FBCA04`   | Normal priority, scheduled but not urgent                                                           |
| `light-priority`    | `#C2E0C6`   | Small, low-effort, nice-to-have                                                                     |
| `epic`              | `#5319E7`   | Tags an Epic grouping itself, not an individual story                                               |
| `milestone-1`       | `#0E8A16`   | Password recovery, audit trail, and the light/dark theme system                                     |
| `milestone-2`       | `#1D76DB`   | Domain-allowlist management, classroom setup wizard, notifications, and the at-risk students list   |
| `milestone-3`       | `#FEF2C0`   | Grade-distribution and school-wide analytics dashboards, plus cross-classroom bulk student import   |
| `milestone-4`       | `#F9D0C4`   | Per-student grade emails via a new Resend Edge Function, plus the student-email field it depends on |
| `sprint-1`          | `#BFD4F2`   | Password recovery, audit trail, and the light/dark theme system                                     |
| `sprint-2`          | `#D4C5F9`   | Domain-allowlist management, notifications, at-risk/analytics dashboards, and bulk student import   |

`enhancement` / `bug` / `documentation` classify _type_; the four
`-priority` labels plus `hotfix` classify _priority_; the `milestone-*`
labels classify _when_ under the 3-milestone breakdown; `sprint-1`/
`sprint-2` classify the same stories under the older 2-sprint breakdown,
kept alongside so either grouping can be filtered on. A story typically
carries one of each, plus its epic's `epic` label is carried by the epic
heading, not repeated per story.

---

## Milestone 1 — Access, Trust & Theming

`milestone-1` `sprint-1`

- [ ] US-1 — Forgot-password link on login
- [ ] US-2 — Audit log of role changes and data edits
- [ ] US-3 — Filter the audit log
- [ ] US-17 — Light token set + theme resolution
- [ ] US-18 — Theme switcher control
- [ ] US-19 — No flash of the wrong theme on load

_(Theming is grouped into Milestone 1 deliberately: it touches every
existing screen's visual correctness, so it's cheaper to land before later
milestones add more UI on top of what is today a dark-only assumption.)_

---

### Epic 1: Account Recovery & Audit Trail

`epic`

**Problem:** Admins have no self-service way to recover a lost password —
today that means a manual reset in the Supabase Dashboard. And no table in
the schema (`supabase/migrations/0001`–`0006`) records who changed a role
or edited a classroom/student/grade, so a bad edit or a disputed role
change is untraceable after the fact.

#### US-1 — Forgot-password link on login

`enhancement` `critical-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As a** Teacher or Admin, **I want** a "Forgot password" link on the login
page, **so that** I'm not locked out if I forget my password.

##### ⚙️ Technical Implementation Context

- `LoginPage.tsx` gets a "Forgot password?" link below the sign-in form.
- Clicking it swaps to (or navigates to) a request-reset view: email input
  → calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- The emailed link lands on a new `/reset-password` route (thin route,
  logic in `src/features/auth/`) that reads the recovery session Supabase
  sets, presents a new-password form, and calls
  `supabase.auth.updateUser({ password })`.
- **Reuse:** `src/features/auth/LoginPage.tsx` for form styling/pattern;
  the toast system already used in `TopBar.tsx` (`useToast`).
- **Constraints:** No service-role key needed — `resetPasswordForEmail` and
  `updateUser` both run on the anon key against the _currently
  authenticated-via-recovery-link_ session. Don't hand-manage the session
  yourself (CLAUDE.md §6) — let the Supabase client's recovery flow set it.

##### 🧪 Acceptance Criteria

- [ ] **Given** a user on the login page, **When** they click "Forgot
      password?", **Then** they see an email input that calls
      `resetPasswordForEmail` and shows a neutral "if that email exists, a
      reset link was sent" message (never leaking whether the address is
      registered).
- [ ] **Given** a valid recovery link is clicked, **When** the
      `/reset-password` route loads, **Then** it presents a new-password
      form, and submitting it calls `updateUser({ password })` and redirects
      to `/login` with a success toast.
- [ ] **Given** an expired or invalid recovery link, **When** the
      `/reset-password` route loads, **Then** it shows an inline error with
      a link back to "request a new one," not a silent failure.

#### US-2 — Audit log of role changes and data edits

`enhancement` `high-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As an** Admin, **I want** an audit log of role changes and key data edits
(classrooms, students, grades), **so that** I can trace who did what.

##### ⚙️ Technical Implementation Context

- New migration `0007_audit_log.sql` adds:
  ```sql
  create table audit_log (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references profiles(id) not null,
    action text not null,               -- e.g. 'role_change', 'classroom_update'
    target_table text not null,
    target_id uuid not null,
    detail jsonb,                       -- old/new values, kept minimal
    created_at timestamptz not null default now()
  );
  ```
- RLS enabled; policy mirrors the admin-only pattern from
  `0006_rls_policies.sql` — `USING (public.is_admin())`, no teacher policy
  (teachers never read this table).
- Trigger on `profiles` fires on `role` UPDATE and inserts an `audit_log`
  row (reuse the `enforce_role_change()` trigger file,
  `0001_profiles_roles.sql`, as the pattern for a `SECURITY DEFINER`
  trigger function).
- Triggers on `classrooms`, `students`, and `scores` fire on
  INSERT/UPDATE/DELETE and log actor (`auth.uid()`), action, and target.
- New admin-only page (`src/features/admin/AuditLogPage.tsx`, route
  `/_auth/admin/audit-log`) lists entries newest-first, paginated the same
  way `UsersPage.tsx` lists profiles.
- **Reuse:** `public.is_admin()` helper (0001 migration); the
  `enforce_role_change()` trigger as the template for `SECURITY DEFINER`
  logging triggers; `src/features/admin/UsersPage.tsx` for the list-page
  pattern and its query hook in `src/lib/queries/`.
- **Constraints:** Query key must come from `src/lib/queries/keys.ts` — add
  an `auditLog` key, don't hand-write a tuple (CLAUDE.md §6). Regenerate
  `src/lib/database.types.ts` after the migration (CLAUDE.md §5).

##### 🧪 Acceptance Criteria

- [ ] **Given** an Admin updates a profile's `role`, **When** the trigger
      fires, **Then** an `audit_log` row is inserted with `action =
'role_change'` and the actor's id.
- [ ] **Given** an Admin (or teacher acting on their own classroom) inserts,
      updates, or deletes a `classrooms`, `students`, or `scores` row,
      **When** the change commits, **Then** a matching `audit_log` row is
      written with actor, action, and target.
- [ ] **Given** a teacher who is not an Admin, **When** they query
      `audit_log` directly, **Then** RLS returns zero rows.
- [ ] **Given** an Admin on `/_auth/admin/audit-log`, **When** the page
      loads, **Then** entries render newest-first, paginated like
      `UsersPage.tsx`.

#### US-3 — Filter the audit log

`enhancement` `medium-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As an** Admin, **I want** to filter the audit log by teacher or date
range, **so that** I can investigate a specific incident quickly.

##### ⚙️ Technical Implementation Context

- Filter controls (actor select, date-range inputs) above the audit log
  table; filters compose into the Supabase query (`.eq('actor_id', ...)`,
  `.gte('created_at', ...)`) — filter in the query, not in JS after
  fetching (CLAUDE.md §11 anti-pattern).
- **Depends on:** US-2.

##### 🧪 Acceptance Criteria

- [ ] **Given** an actor filter is selected, **When** the query re-runs,
      **Then** only rows matching that `actor_id` are fetched from
      Supabase (not filtered client-side).
- [ ] **Given** a date range is set, **When** the query re-runs, **Then**
      only rows within that `created_at` range are fetched from Supabase.

### Epic 6: Theme System (Light / Dark / System)

`epic`

**Problem:** `src/styles/app.css` currently defines exactly one palette —
hardcoded dark (`html { color-scheme: dark }`, near-black surface tokens,
no light values exist at all). `index.html`'s `<meta name="theme-color">`
and `vite.config.ts`'s PWA manifest `theme_color`/`background_color` are
also hardcoded to the dark surface color. There is no theme switcher
anywhere in the UI (`TopBar.tsx`'s only menu is the sign-out dropdown).

**Goal:** the app should default to a **light** theme, but on a user's
first visit it should respect their OS/browser color-scheme preference
(`prefers-color-scheme`) if one is available, and it must offer an
explicit **Light / Dark / System** switcher that persists across sessions.
This applies to the whole app _and_ the logged-out landing page
(`src/features/landing/`) — both currently render only in dark.

#### US-17 — Light token set + theme resolution

`enhancement` `critical-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As a** user (Teacher, Admin, or a logged-out visitor on the landing
page), **I want** the app to look correct in both light and dark,
defaulting sensibly, **so that** I'm not forced into one palette.

##### ⚙️ Technical Implementation Context

- `src/styles/app.css` gains a full light token set (surfaces, borders,
  ink, accent scale, status colors) alongside the existing dark set — same
  custom-property names, different values, selected by a `data-theme`
  attribute on `<html>`.
- Theme **resolution order** on load: (1) an explicit choice previously
  saved to `localStorage` (`'light' | 'dark' | 'system'`) wins; (2) if
  nothing is saved yet, resolve as `'system'` — i.e. immediately reflect
  `window.matchMedia('(prefers-color-scheme: dark)')`; (3) if the browser
  can't report a preference at all, fall back to **light**.
- While in `'system'` mode, a `matchMedia` change listener updates the
  active theme live if the OS preference changes without a reload.
- `html`'s `color-scheme` is set dynamically (`light dark` base, or the
  resolved value) so native form controls/scrollbars match.
- **Reuse:** the existing `@theme` block structure in `app.css` — this is
  additive (a second palette), not a rewrite of the token names consumers
  already reference via `var(--color-surface-1)` etc. throughout
  `src/features/**` and `src/components/**`.
- **Constraints:** no new dependency — `matchMedia` and `localStorage` are
  native. No `tailwind.config.js` (CLAUDE.md §11) — this stays inside the
  existing CSS-first `@theme` block in `app.css`.

##### 🧪 Acceptance Criteria

- [ ] **Given** a first-time visitor with no saved preference, **When**
      the app loads, **Then** the theme resolves to `'system'` and
      reflects `prefers-color-scheme` immediately.
- [ ] **Given** a user has previously saved an explicit theme choice,
      **When** the app loads, **Then** that saved choice wins over the
      system preference.
- [ ] **Given** the browser can't report a color-scheme preference at all,
      **When** the app loads with no saved choice, **Then** it falls back
      to light.
- [ ] **Given** the app is in `'system'` mode, **When** the OS preference
      changes, **Then** the active theme updates live without a reload.
- [ ] **Given** any existing screen (dashboard, classrooms, grades,
      attendance, modules, admin, slideshow, landing), **When** light mode
      is active, **Then** it renders correctly — no literal color values
      bypassing the `var(--color-*)` tokens.

#### US-18 — Theme switcher control

`enhancement` `high-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As a** Teacher or Admin, **I want** to switch between Light, Dark, and
System from the app, **so that** my choice persists.

##### ⚙️ Technical Implementation Context

- A three-way control (Light/Dark/System) is reachable from
  `TopBar.tsx`'s existing user-menu `DropdownMenu` (a submenu or a set of
  `DropdownMenuItem`s) — reuse those primitives rather than building a new
  menu component.
- Same control (or a simpler visible toggle) is present on the logged-out
  landing page (`src/features/landing/`), since it renders before any auth
  state exists.
- **Depends on:** US-17 (the token set and resolution logic this control
  drives).

##### 🧪 Acceptance Criteria

- [ ] **Given** a logged-in user opens `TopBar.tsx`'s user menu, **When**
      they select Light, Dark, or System, **Then** the choice is written
      to `localStorage` immediately and `data-theme` updates without a
      page reload.
- [ ] **Given** the current theme selection, **When** the menu is open,
      **Then** the active option is visually indicated (e.g. a check
      mark), and every option has an accessible name per CLAUDE.md §9.
- [ ] **Given** a logged-out visitor on the landing page, **When** they
      use the visible toggle there, **Then** the same persistence and
      live-update behavior applies.

#### US-19 — No flash of the wrong theme on load

`enhancement` `medium-priority` `milestone-1` `sprint-1`

##### 👤 User Story Statement

**As a** Teacher or Admin, **I want** to avoid seeing a flash of the wrong
theme before my saved preference applies, **so that** the app feels
polished on load.

##### ⚙️ Technical Implementation Context

- A small inline `<script>` in `index.html`, before any stylesheet, reads
  `localStorage` + `matchMedia` synchronously and sets `data-theme` on
  `<html>` before first paint — this is the standard no-FOUC pattern and
  doesn't require a dependency or a build-time plugin.
- `index.html`'s `<meta name="theme-color">` is split into two
  media-scoped tags (`media="(prefers-color-scheme: light)"` /
  `"(prefers-color-scheme: dark)"`) so the OS chrome (status bar, task
  switcher) matches automatically for the `'system'` case.
- `vite.config.ts`'s PWA manifest `theme_color`/`background_color` (single
  static values) are updated to the **light** brand color, since a
  freshly-installed PWA icon/splash should match the new default before
  any preference is known.
- **Constraints:** editing `vite.config.ts` and `index.html` is in-bounds
  (only `package.json` and `src/routeTree.gen.ts` are off-limits per
  CLAUDE.md §3) — this does not require adding the PWA plugin itself, only
  changing config values already passed to it.

##### 🧪 Acceptance Criteria

- [ ] **Given** a user with a saved theme preference, **When** the page
      loads, **Then** `data-theme` is set on `<html>` before first paint
      (no flash of the other theme).
- [ ] **Given** the app is loaded, **When** the OS is in light or dark
      mode, **Then** the corresponding media-scoped `<meta
name="theme-color">` tag matches the OS chrome.
- [ ] **Given** a freshly-installed PWA with no preference known yet,
      **When** it launches, **Then** its icon/splash uses the light brand
      color from the manifest.

## Milestone 2 — Notifications & At-Risk Insight

`milestone-2` `sprint-2`

- [ ] US-13 — Admin manages the allowed-domains list directly
- [x] US-14 — Password + email verification at sign-up
- [x] US-15 — Name / school / teaching-level profiling steps
- [ ] US-16 — Empty-state classroom setup wizard
- [ ] US-4 — Low-average notification
- [ ] US-5 — Absence-streak notification
- [ ] US-6 — Mark notifications read / clear
- [ ] US-7 — At-risk students list

---

### Epic 5: Teacher Self-Onboarding & Domain Management

`epic`

**What's already live:** teachers self-register — there is no admin
invite. `src/features/auth/SignupWizard.tsx` runs the whole flow on a
single `/signup` route as a 6-step wizard driven by local step state:
Credentials (email + password, `supabase.auth.signUp()`) → Verify (6-digit
OTP, `supabase.auth.verifyOtp({ type: 'signup' })`, with resend) → Name
(required) → School (optional, skippable) → Teaching level (optional,
skippable) → a 3-slide Welcome tour, then `/dashboard`. Domain gating
isn't admin-invite-driven either: `src/features/landing/RequestAccess.tsx`
on the public landing page lets a prospective school submit
`{name, school, domain, message}` via the `submit_domain_request` RPC
(`domain_requests` table, `0009_domain_requests.sql`), and
`src/features/admin/DomainRequestsPage.tsx`
(`/_auth/admin/domain-requests`) lets an Admin **Approve** (upserts the
domain into `allowed_email_domains`, deletes the request) or **Dismiss**
it (`src/lib/queries/domainRequests.ts`).

**The gap this epic now covers:** there is no admin UI to manage
`allowed_email_domains` directly — an Admin can only add a domain by
approving a submitted request. There's no page listing what's currently
allowed, no way to add a domain without waiting for a request, and no way
to remove one.

#### US-13 — Admin manages the allowed-domains list directly

`enhancement` `high-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As an** Admin, **I want** to view and directly add/remove entries in the
allowed-domains list, **so that** I'm not limited to only allowlisting a
domain by approving a submitted request.

##### ⚙️ Technical Implementation Context

- New section on `DomainRequestsPage.tsx` (or a sibling page/tab) listing
  the current contents of `allowed_email_domains` alongside the existing
  pending-requests table.
- "Add domain" action inserts directly into `allowed_email_domains` — the
  same table `useApproveDomainRequest` already upserts into — without
  requiring a pending request first.
- "Remove" action deletes a row from `allowed_email_domains`; the UI
  should make the consequence explicit: this only blocks _new_ sign-ups
  from that domain, it doesn't touch teachers already registered under it.
- **Reuse:** the `useDomainRequests`/`useApproveDomainRequest` pattern in
  `src/lib/queries/domainRequests.ts` as the template for new
  `useAllowedDomainsList`/`useAddAllowedDomain`/`useRemoveAllowedDomain`
  hooks; `DomainRequestsPage.tsx`'s table/admin-gate pattern for the UI.
- **Constraints:** RLS on `allowed_email_domains` already restricts writes
  to admins (`0007_teacher_onboarding.sql`) — no new policy needed, just
  new UI and query hooks.

##### 🧪 Acceptance Criteria

- [ ] **Given** an Admin on the domains page, **When** it loads, **Then**
      every row currently in `allowed_email_domains` is listed, not just
      pending requests.
- [ ] **Given** an Admin adds a domain directly, **When** they submit it,
      **Then** it's inserted into `allowed_email_domains` with no
      `domain_requests` row required first.
- [ ] **Given** an Admin removes a domain, **When** they confirm, **Then**
      new sign-ups from that domain are rejected by the existing
      `handle_new_user()` gate, while already-registered teachers under
      that domain are unaffected.

#### US-14 — Password + email verification at sign-up

`enhancement` `critical-priority` `milestone-2` `sprint-2`

**Status: Shipped** — kept here for traceability, not as remaining work.

##### 👤 User Story Statement

**As a** new Teacher, **I want** to set my password and verify my email as
part of signing up, **so that** I can access my account securely without a
separate invite step.

##### ⚙️ Technical Implementation Context

- `CredentialsStep` (email + password + confirm password,
  `supabase.auth.signUp()`) followed by `VerifyStep` (6-digit OTP via
  `supabase.auth.verifyOtp({ type: 'signup' })`, with a resend action) —
  both in `src/features/auth/SignupWizard.tsx`, on the single `/signup`
  route (no separate onboarding routes).

##### 🧪 Acceptance Criteria

- [x] **Given** a visitor on `/signup` with an approved-domain email,
      **When** they submit credentials, **Then** `signUp()` fires and a
      6-digit code is emailed to them.
- [x] **Given** a code has been sent, **When** the visitor enters the
      correct 6-digit code, **Then** `verifyOtp({ type: 'signup' })`
      succeeds and the wizard advances to the Name step.
- [x] **Given** a visitor didn't receive the code, **When** they use
      "Resend code," **Then** a fresh code is sent and the previous one is
      superseded.

#### US-15 — Name / school / teaching-level profiling steps

`enhancement` `medium-priority` `milestone-2` `sprint-2`

**Status: Shipped** — kept here for traceability, not as remaining work.

##### 👤 User Story Statement

**As a** new Teacher, **I want** a short guided profile setup (name,
school, teaching level) right after verifying my email, **so that** my
account has useful context without a long form.

##### ⚙️ Technical Implementation Context

- `NameStep` (required, `useCompleteProfile`), then `SchoolStep` and
  `LevelStep` (both optional and skippable via `SkipButton`,
  `useSaveProfilingDetails`), then `WelcomeStep` (a 3-slide feature tour)
  before redirecting to `/dashboard` — all in `SignupWizard.tsx`.
- No avatar upload was built as part of this — the shipped scope is name,
  school, location, and teaching level only.

##### 🧪 Acceptance Criteria

- [x] **Given** a verified teacher, **When** they submit the Name step,
      **Then** `profiles` is updated and the wizard advances to School.
- [x] **Given** the School or Level step, **When** the teacher chooses
      "Skip for now," **Then** the wizard advances without requiring that
      data.
- [x] **Given** the teacher reaches the Welcome tour's last slide,
      **When** they click "Go to dashboard," **Then** they land on
      `/dashboard`.

#### US-16 — Empty-state classroom setup wizard

`enhancement` `high-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As a** new Teacher with no classrooms yet, **I want** a guided setup
wizard (create classroom → add roster → set grading weights) on my empty
dashboard, **so that** I reach a usable gradebook fast.

##### ⚙️ Technical Implementation Context

- Shown only when `DashboardPage.tsx` finds zero classrooms for the
  logged-in teacher — not a route, an inline wizard on the existing empty
  state.
- Step: create first classroom — reuses `ClassroomFormDialog.tsx` as-is,
  not a rebuilt form.
- Step: add roster — either manual name entry (reuses
  `StudentFormDialog.tsx`) or spreadsheet import (reuses `io`'s
  `ImportButton.tsx`/xlsx path) — no new parser.
- Step: set grading weights — writes straight into the existing
  `grading_periods`/`activity_categories` structure via the dialogs
  already in `src/features/grades/`, with an editable default split (e.g.
  40/60) rather than a hardcoded one. No new grade-math code — this only
  writes rows the existing `grading.ts` model already reads.
- **Reuse:** `ClassroomFormDialog`, `StudentFormDialog`, `io`'s
  `ImportButton`, and the grading-structure dialogs in
  `src/features/grades/` — this story is almost entirely composition of
  existing components behind a step indicator, not new form logic.

##### 🧪 Acceptance Criteria

- [ ] **Given** a teacher with zero classrooms, **When** they load
      `DashboardPage.tsx`, **Then** the guided wizard (create classroom →
      add roster → set grading weights) appears inline on the empty
      state.
- [ ] **Given** the teacher is at any step, **When** they choose to
      dismiss/skip, **Then** the wizard closes without blocking normal
      classroom creation.
- [ ] **Given** the teacher completes all three steps, **When** the wizard
      finishes, **Then** a classroom exists with a roster and grading
      weights set, all via the existing dialogs (no new form logic).

**Not building:** admin first-run setup. `docs/DEPLOYMENT.md` §5 already
documents it (Dashboard "Add user" + SQL promote to `admin`) — a
documented one-time step doesn't need an in-app wizard.

### Epic 2: In-App Notifications

`epic`

**Problem:** There's no proactive signal anywhere in the app — a teacher
only learns a student is struggling by opening that student's grade sheet,
and nothing surfaces attendance problems at all.

#### US-4 — Low-average notification

`enhancement` `high-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As a** Teacher, **I want** a notification when a student's average drops
below a threshold, **so that** I can intervene early.

##### ⚙️ Technical Implementation Context

- New migration adds a `notifications` table:
  ```sql
  create table notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid references profiles(id) not null,
    type text not null,                 -- 'low_average' | 'absence_streak'
    payload jsonb not null,             -- { student_id, classroom_id, value }
    read_at timestamptz,
    created_at timestamptz not null default now()
  );
  ```
  RLS: owner-only (`recipient_id = auth.uid()`) read/update, no insert
  policy for clients — rows are written only by a trigger/function running
  as the table owner.
- Recommended approach: a `useQuery` that runs after each score mutation,
  computes the average via `src/lib/grading.ts`, and calls a `useMutation`
  to upsert the notification row if it crosses below 70% — avoids
  duplicating grade math in SQL (CLAUDE.md §3: `grading.ts` is the _only_
  place grade math lives).
- Bell icon + unread-count badge added to `TopBar.tsx` (next to the
  existing user-menu dropdown), opening a `DropdownMenu` list of unread
  notifications with a link to the relevant classroom/student.
- **Reuse:** `src/lib/grading.ts` for the average calculation — do not
  reimplement weighting logic elsewhere; `DropdownMenu` primitives already
  used in `TopBar.tsx`.
- **Constraints:** Grade math must not be duplicated in SQL per CLAUDE.md
  §3/§8 — prefer the client-recompute-then-upsert approach above over a
  pure-SQL trigger that reimplements weighting.

##### 🧪 Acceptance Criteria

- [ ] **Given** a score mutation drops a student's weighted average below
      70%, **When** the recompute query runs, **Then** a `notifications`
      row of type `'low_average'` is upserted for that student's teacher.
- [ ] **Given** a teacher with unread notifications, **When** they open
      `TopBar.tsx`'s bell icon, **Then** the unread-count badge and a
      `DropdownMenu` list of unread notifications appear, each linking to
      the relevant classroom/student.
- [ ] **Given** a teacher who is not the `recipient_id`, **When** they
      query `notifications`, **Then** RLS returns zero rows for that
      notification.

#### US-5 — Absence-streak notification

`enhancement` `medium-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As a** Teacher, **I want** a notification when a student has 3+
consecutive unexcused absences, **so that** I can follow up.

##### ⚙️ Technical Implementation Context

- Trigger/query on `attendance_records` counts consecutive `'absent'`
  records (ordered by session date) per student.
- **Depends on:** US-4 (shares the `notifications` table).

##### 🧪 Acceptance Criteria

- [ ] **Given** a student reaches 3 consecutive unexcused absences,
      **When** the count is recomputed, **Then** a `notifications` row of
      type `'absence_streak'` is upserted for that student's teacher.
- [ ] **Given** a streak is already flagged, **When** the student remains
      absent in the following session, **Then** no duplicate notification
      row is created (idempotent — no spam) until the streak resets.

#### US-6 — Mark notifications read / clear

`enhancement` `light-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As a** Teacher or Admin, **I want** to mark notifications read and clear
them, **so that** my list stays manageable.

##### ⚙️ Technical Implementation Context

- Clicking a notification sets `read_at = now()` via an optimistic
  TanStack Query mutation; a "clear all" action marks all unread rows
  read.

##### 🧪 Acceptance Criteria

- [ ] **Given** an unread notification, **When** it's clicked, **Then**
      `read_at` is set optimistically and the badge count decrements
      immediately.
- [ ] **Given** unread notifications exist, **When** "clear all" is
      triggered, **Then** every unread row for that recipient is marked
      read and the badge count reflects only `read_at IS NULL` rows.

### Epic 3: Analytics Dashboard

`epic`

**Problem:** `src/features/dashboard/DashboardPage.tsx` shows only a
classroom count and a student count — no trend, no distribution, no
"who needs attention" view, for either role.

#### US-7 — At-risk students list

`enhancement` `critical-priority` `milestone-2` `sprint-2`

##### 👤 User Story Statement

**As a** Teacher, **I want** an "at-risk students" list (low grades + high
absences) on my dashboard, **so that** I know who needs attention without
opening every classroom.

##### ⚙️ Technical Implementation Context

- New dashboard section listing students where weighted average < 70%
  (via `grading.ts`) **or** unexcused-absence rate > 20% over the active
  grading period, across _all_ of the teacher's classrooms.
- **Reuse:** `src/lib/grading.ts` for averages; existing classroom/student
  queries in `src/lib/queries/`.
- **Constraints:** RLS already scopes a teacher's queries to
  `owns_classroom()` — this view needs no new policy, just a query that
  spans the teacher's existing classrooms instead of one at a time.

##### 🧪 Acceptance Criteria

- [ ] **Given** a teacher with students below 70% average or above 20%
      unexcused-absence rate, **When** the dashboard loads, **Then** those
      students appear in the at-risk list, each linking to that student's
      grade sheet.
- [ ] **Given** no students currently qualify, **When** the dashboard
      loads, **Then** the section shows "No students currently at risk"
      instead of an empty table.

## Milestone 3 — Analytics & Bulk Onboarding

`milestone-3` `sprint-2`

- [ ] US-8 — Grade-distribution chart per classroom
- [ ] US-9 — School-wide overview
- [ ] US-10 — Filter the school-wide view
- [ ] US-11 — Cross-classroom bulk student import
- [ ] US-12 — Bulk-import error report

---

### Epic 3: Analytics Dashboard (continued)

`epic`

_(Continued from Milestone 2 — see the Epic 3 problem statement there.
US-7 landed in Milestone 2 since it reuses existing classroom/student
queries; US-8 through US-10 below need the same dashboard surface but are
large enough to sit in Milestone 3.)_

#### US-8 — Grade-distribution chart per classroom

`enhancement` `high-priority` `milestone-3` `sprint-2`

##### 👤 User Story Statement

**As a** Teacher, **I want** a grade-distribution chart per classroom on my
dashboard, **so that** I can see how the class is doing at a glance.

##### ⚙️ Technical Implementation Context

- A bar chart bucketing each classroom's computed averages into ranges
  (e.g. 90+, 80–89, 70–79, 60–69, <60).
- **Constraints:** no charting library is installed (see `package.json`)
  and CLAUDE.md §3 forbids adding dependencies — build this as plain SVG
  or CSS bars (a handful of `<div>`s scaled by `%`), not a new dependency.

##### 🧪 Acceptance Criteria

- [ ] **Given** a classroom with graded students, **When** the dashboard
      renders, **Then** a bar chart (plain SVG/CSS, no new dependency)
      buckets that classroom's averages into the defined ranges.
- [ ] **Given** the active grading period changes, **When** the selector
      updates, **Then** the chart recomputes and re-renders for the new
      period.

#### US-9 — School-wide overview

`enhancement` `high-priority` `milestone-3` `sprint-2`

##### 👤 User Story Statement

**As an** Admin, **I want** a school-wide overview (attendance-rate trend,
average grades across all classrooms), **so that** I can see overall
health at a glance.

##### ⚙️ Technical Implementation Context

- Admin's dashboard variant aggregates across _every_ classroom (RLS
  already grants admins full read via `is_admin()` policies).

##### 🧪 Acceptance Criteria

- [ ] **Given** an Admin viewing the dashboard, **When** it loads, **Then**
      it shows average grade and attendance rate aggregated across every
      classroom, not just one.
- [ ] **Given** the current and previous grading period both have data,
      **When** the overview renders, **Then** a simple trend comparison
      (this period vs. previous) is shown.

#### US-10 — Filter the school-wide view

`enhancement` `medium-priority` `milestone-3` `sprint-2`

##### 👤 User Story Statement

**As an** Admin, **I want** to filter the school-wide view by teacher or
classroom, **so that** I can drill into one of them.

##### ⚙️ Technical Implementation Context

- **Depends on:** US-9.

##### 🧪 Acceptance Criteria

- [ ] **Given** a teacher or classroom filter is selected, **When** the
      overview re-queries, **Then** the aggregated stats scope to only
      that teacher's or classroom's data.

### Epic 4: Bulk Admin Onboarding (students)

`epic`

**Problem:** `src/features/io`'s Excel import (`ImportButton.tsx`) is
scoped to one classroom's roster at a time — there's no way for an admin
to onboard an entire term of students in one pass.

#### US-11 — Cross-classroom bulk student import

`enhancement` `high-priority` `milestone-3` `sprint-2`

##### 👤 User Story Statement

**As an** Admin, **I want** to bulk-import students across multiple
classrooms from one spreadsheet (with a classroom-name column), **so
that** I can onboard a term at once instead of per classroom.

##### ⚙️ Technical Implementation Context

- New admin-only import surface accepts a spreadsheet with a `classroom`
  column in addition to the existing student-row columns.
- Rows fan out into per-classroom inserts using the _same_
  dedupe/validation logic already in `src/features/io` — don't rewrite it.
- **Reuse:** the parsing/dedupe/validation functions already in
  `src/features/io` — extend, don't duplicate.
- **Constraints:** inserts still go through RLS as the acting admin — no
  service-role bypass. An admin can only insert students into classrooms
  visible to them, which under `is_admin()` policies is all of them.

##### 🧪 Acceptance Criteria

- [ ] **Given** a spreadsheet with a `classroom` column, **When** it's
      imported, **Then** each distinct classroom value is matched to an
      existing classroom by name (scoped to the classroom's owning
      teacher, selectable in the UI before import).
- [ ] **Given** a row's classroom value has no match, **When** the import
      runs, **Then** that row is flagged "no matching classroom" instead
      of silently dropped or inserted elsewhere.
- [ ] **Given** the import completes, **When** the summary renders,
      **Then** it shows rows created, rows skipped (duplicate), and rows
      failed (no matching classroom), per classroom.

#### US-12 — Bulk-import error report

`enhancement` `medium-priority` `milestone-3` `sprint-2`

##### 👤 User Story Statement

**As an** Admin, **I want** an error report after a bulk import, **so
that** I can fix and re-upload only the failed rows.

##### ⚙️ Technical Implementation Context

- Reuse the existing `xlsx` export path in `src/features/io` rather than
  building a new exporter.

##### 🧪 Acceptance Criteria

- [ ] **Given** a bulk import with failed or skipped rows, **When** the
      Admin requests the error report, **Then** it downloads as a
      spreadsheet in the same shape as the input, with an added "reason"
      column.

## Milestone 4 — Grade Report Emails

`milestone-4`

- [ ] US-20 — Add student email + Resend sending infrastructure
- [ ] US-21 — Teacher sends a student's grade report by email

_(Added after the original 3-milestone plan — sits outside the old
`sprint-1`/`sprint-2` breakdown, so these two stories carry no sprint
label.)_

---

### Epic 7: Grade Report Emails

`epic`

**Problem:** A computed grade (`src/lib/grading.ts`) only ever lives on
screen — a teacher has no way to hand a student their period grade except
reading it aloud or exporting a spreadsheet. `students` also has no email
address on file at all today.

**Architecture note (read before building):** sending mail through Resend
requires its API key to stay server-side — the browser can never hold it.
This is this project's **first** Edge Function; every other epic in this
backlog holds to CLAUDE.md §1/§3's "no backend" rule, and this is a
deliberate, narrow exception scoped to this one send path, not a precedent
for routing other features through a server. `CLAUDE.md` itself is left
unedited for now — this callout is the flag until the user chooses to
formally amend it.

#### US-20 — Add student email + Resend sending infrastructure

`enhancement` `high-priority` `milestone-4`

##### 👤 User Story Statement

**As a** Teacher, **I want** to store each student's email on their roster
entry, **so that** I have somewhere to send their grade report.

##### ⚙️ Technical Implementation Context

- New migration adds `email text` (nullable) to `public.students` — not
  every existing roster row will have one, so sending is simply
  unavailable per-student until it's filled in.
- `StudentFormDialog.tsx` gets an optional email field; the roster
  spreadsheet import (`src/features/io`) gains an optional `email` column
  via its existing column-mapping pattern — no new parser.
- New Supabase Edge Function `send-grade-email` (the project's first —
  needs initial `supabase/functions/` scaffolding) holds `RESEND_API_KEY`
  as a Supabase secret (never `VITE_`-prefixed) and takes `{ studentId,
periodId }`; it fetches the student/grade data itself server-side rather
  than trusting a client-supplied grade payload.
- **Real-world prerequisite, not code:** a sending domain must be added
  and verified in Resend (e.g. `grades@agilearn.app`) before any email can
  go out from a branded address — a blocking setup step outside this
  codebase, flagged here so it isn't discovered mid-implementation.
- **Reuse:** `StudentFormDialog.tsx` and `src/features/io`'s
  column-mapping pattern for the email field; no new dependency — Resend
  is called via a plain `fetch` inside the Edge Function, not an SDK
  package (CLAUDE.md §3 still applies to `package.json`).

##### 🧪 Acceptance Criteria

- [ ] **Given** a student with no email on file, **When** a teacher opens
      the send-grade-email action for that student, **Then** it's
      disabled with a prompt to add an email first.
- [ ] **Given** `RESEND_API_KEY` is unset in the Supabase project,
      **When** the `send-grade-email` function is invoked, **Then** it
      fails loudly with a clear error, never a silent no-op.
- [ ] **Given** a spreadsheet import with an `email` column, **When** it's
      imported, **Then** each row's email lands on the matching student
      record.

#### US-21 — Teacher sends a student's grade report by email

`enhancement` `medium-priority` `milestone-4`

##### 👤 User Story Statement

**As a** Teacher, **I want** to send a student their computed grade for a
period in a friendly email, **so that** they know where they stand
without me writing it up by hand.

##### ⚙️ Technical Implementation Context

- Entry point: a "Send grade email" action next to each student on the
  existing grade-sheet view (`src/features/grades/`), calling
  `send-grade-email` via `supabase.functions.invoke(...)`.
- Fixed template (not free-text), rendered server-side by the Edge
  Function from grade numbers computed the same way
  `computeStudentGradebook` (`src/lib/grading.ts`) computes them — grade
  math still lives in exactly one formula per CLAUDE.md §3, so the exact
  mechanism (port the pure function server-side vs. a Postgres RPC that
  shares it) is a design decision to settle at implementation time, not
  guessed at here:
  ```
  Hi {StudentName},

  Here's your {PeriodName} grade for {ClassCourse}.

  Lecture: {lecturePercent}%
  Laboratory: {laboratoryPercent}%

  Weighted at {lectureWeight}% Lecture / {laboratoryWeight}% Laboratory,
  your total grade is {finalGrade}.

  If you have any concerns, you may email me at {teacherEmail} or message
  me via Google Chat or any other channel we've set up for class.

  Best regards,
  {TeacherName}

  Agilearn © 2026
  ```
- The lecture/laboratory split shown must reflect the classroom's actual
  configured `ComponentWeights`, never a hardcoded 40/60 string.
- Teacher display name and reply-to address come from `profiles.full_name`
  / `profiles.email` — no new nickname field, since none exists today and
  none of this story's acceptance criteria requires one.
- **Reuse:** `src/lib/grading.ts`'s weighting model as the single source
  of truth for every number in the email; the toast system already used
  elsewhere in the app for the send confirmation/error.

##### 🧪 Acceptance Criteria

- [ ] **Given** a student with an email on file and a computed grade for a
      period, **When** the teacher clicks "Send grade email," **Then**
      the student receives the exact template above with their real
      numbers substituted.
- [ ] **Given** a classroom whose weights differ from 40/60, **When** the
      email renders, **Then** it states that classroom's actual weights,
      not a hardcoded 40/60.
- [ ] **Given** the Edge Function call fails (network, Resend error),
      **When** the teacher triggers a send, **Then** they see an explicit
      error toast, not a silent no-op.
- **Depends on:** US-20.

---

## Cross-cutting constraints (apply to every story above)

- RLS is the security boundary, not app code (CLAUDE.md §10) — every new
  table needs RLS enabled plus at least one policy before it ships.
- No `service_role` key, no Edge Functions — this is a client-only SPA
  talking to Supabase with the anon key (CLAUDE.md §1, §10).
- No new dependencies — `package.json` is off-limits (CLAUDE.md §3);
  every story above was checked against the installed dependency list.
- Grade math lives only in `src/lib/grading.ts` (CLAUDE.md §3) — never
  reimplemented in SQL or duplicated in a component.
- Query keys come from `src/lib/queries/keys.ts` (CLAUDE.md §6) — never
  hand-written tuples.
- After any migration, regenerate or hand-edit `src/lib/database.types.ts`
  to match (CLAUDE.md §5).
- Before calling any story done: `pnpm run format:check` →
  `pnpm run typecheck` → `pnpm run test` → `pnpm run build`, in that order
  (CLAUDE.md §5). Build passing alone is not enough.

---

## Workflow: Commits, Session Limits & Auditing

This section governs _how_ Fable 5 works through the backlog above, not
_what_ to build — read it once before starting Milestone 1.

### Branch

All work lands on a `staging` branch, never directly on `main`. If
`staging` doesn't exist yet, create it from `main` before the first
commit. Nothing in this backlog is pushed straight to `main`.

### Per-story loop

1. **Implement** the story against its acceptance criteria.
2. **Test your own code.** Fable is responsible for writing and running
   tests for whatever it builds — Vitest + RTL are already set up
   (`pnpm run test`); follow the existing pattern in
   `src/lib/grading.test.ts` for pure logic and add component/integration
   tests where a story's behavior warrants one. A story isn't done until
   it's covered, not just typechecked.
3. **Run the full CI gate** yourself: `format:check` → `typecheck` →
   `test` → `build`, in that order. All four must be green.
4. **Audit before committing.** Re-read the story's acceptance criteria
   against what was actually built, and check for regressions the change
   may have caused elsewhere. Any issue, error, or bug found during this
   audit — whether it's in the change just made or something pre-existing
   noticed along the way — gets logged in `docs/audits/` (format below)
   _before_ the commit, along with what was done about it.
5. **Commit to `staging`.** Only after the gate is green and the audit is
   logged. One commit (or a small tight series) per completed story is
   preferred over one giant commit for a whole epic.

### Migrations & generated types

Fable has full authority over `supabase/migrations/` and
`src/lib/database.types.ts` — no need to ask before adding a numbered
migration or regenerating types. The only requirements are the ones
already in CLAUDE.md §5/§7: migration numbers stay ordered and
sequential, every new table gets RLS enabled with at least one policy,
and `database.types.ts` is regenerated (or hand-edited to match) in the
_same_ commit as the migration that changed the schema — never left out
of sync.

### No attribution, no watermark

Commits, code comments, and anything pushed must carry **no AI
attribution or watermark of any kind** — this is CLAUDE.md §10's existing
house rule ("No AI attributions in code, comments, commits, or docs"),
restated here because it applies without exception to this workflow: no
`Co-Authored-By` trailer, no "Generated by," no tool branding anywhere in
a commit message, docstring, or file this workflow produces.

### Session and token budget — safe pause

Before starting a new story (and periodically while one is in progress),
Fable checks how much runway is left in the current session — token
budget remaining, and how close the session is to a 5-hour wall-clock
limit. Whichever constraint is closer to being exhausted governs:

- **Don't start a story without headroom to finish it** — implement,
  self-test, audit, and commit. Starting a story you can't finish in the
  session leaves more cleanup than just not starting it.
- **If a story is already in progress when budget/time runs low:** get
  the working tree back to a green gate before stopping. That means
  finishing the story if there's just enough room, or reverting/stashing
  the in-progress change if there isn't — `staging` must never be left in
  a non-building or failing-test state as a side effect of running out of
  runway.
- **Never push broken or partial code to make a deadline.** A safe pause
  produces either a completed, committed story or no visible change at
  all — not a half-finished one on `staging`.
- **Log the pause.** Write a session audit note (see format below)
  recording which stories were completed, what (if anything) was
  in-progress and its final state (committed / stashed / reverted), and
  why the session stopped — so the next session picks up with full
  context instead of re-discovering it.

### Audit log format

Every audit pass — per-story or session-level — gets its own file in
`docs/audits/`, using the template in `docs/audits/TEMPLATE.md`:

- Per-story audit: `docs/audits/US-<n>-audit.md` (e.g. `US-04-audit.md`).
  If a story is revisited later and re-audited, append a new dated
  section to that same file rather than overwriting the original findings.
- Session/pause note: `docs/audits/<YYYY-MM-DD>-session-audit.md`.

Each entry records, per issue found: a short description, severity,
where it lives (file:line), root cause, the fix applied (or, if not
fixed, why and what state it's left in), and how the fix was verified.
An audit with zero issues found is still worth a short file — "audited,
nothing found" is a real, useful data point for whoever reads this later.
