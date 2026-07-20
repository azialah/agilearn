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
  routes/**            Thin. Wire params/loaders, render a feature. (routeTree.gen.ts is generated)
  features/<name>/     All UI + orchestration for a feature.
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

## Storage

Teaching-module files live in a **private** `teaching-modules` bucket. Storage RLS
(migration `0005`) lets any authenticated user read, but only the owning folder or
an admin can write or delete. The `teaching_modules` table stores the metadata
(title, kind, path, size, mime) and points at the object.

## Build, deploy, quality

- **Build:** Vite (`tsc -b && vite build`), output to `dist/`. `vite-plugin-pwa`
  emits the service worker and offline shell.
- **Deploy:** Vercel, framework preset Vite. `vercel.json` sets a pnpm install/build
  and an SPA rewrite (`/(.*) → /index.html`). Config is just the two `VITE_SUPABASE_*`
  env vars. Full walkthrough in [DEPLOYMENT.md](./DEPLOYMENT.md).
- **CI** (`.github/workflows/ci.yml`, pnpm): `prettier --check` → `typecheck` →
  `vitest run` → `build`. There is no ESLint — Prettier is the only lint gate.
