# 2026-07-16 — Platform foundation

Rewrote the repository from the legacy Laravel app into **Agilearn**, a
Supabase-backed Vite + React 19 single-page application. This log covers the
foundation package that every later feature builds on.

## What landed

### Scaffold & tooling

- Vite + React 19 + TypeScript (strict) at the repository root, managed with Bun.
- File-based TanStack Router with an auto-generated, commit-tracked route tree.
- Tailwind CSS v4 (CSS-first tokens — no config files), Radix UI primitives.
- PWA via `vite-plugin-pwa` (auto-update SW, navigate-fallback denylist for
  `/auth` and Supabase URLs), with generated 192/512 icons.
- Vitest + Testing Library; Prettier (single quotes, no semicolons).
- `vercel.json` (SPA rewrites, Bun build) and a GitHub Actions CI workflow that
  runs prettier check, typecheck, tests, and build. Legacy Laravel workflows
  removed with the old app.

### Database (scaffold only)

- Six ordered migrations under `supabase/migrations/`: roles + profiles with
  `is_admin()` / `owns_classroom()` helpers and sync/guard triggers; classrooms
  and students; grade sheets (periods, categories, activities, scores);
  attendance; teaching modules + a private storage bucket; and RLS policies on
  every table plus a reporting view.
- RLS isolates tenants: teachers only touch their own classrooms; role changes
  are admin-only; profile policies never recurse (all admin checks go through
  the SECURITY DEFINER `is_admin()`).
- A local-only `seed.sql` with an admin, two teachers, two fully populated
  classrooms, and attendance history.

### Typed data layer

- Hand-written `Database` type mirroring the migrations, a typed Supabase client
  singleton, and friendly domain aliases.
- `src/lib/grading.ts` — the single, pure home for grade math: category
  percentages, per-period and per-component grades with weight renormalization,
  and a final-grade combiner matching legacy parity (lecture 40 / lab 60). 18
  unit tests cover parity, null handling, renormalization, empty structures, and
  half-up rounding.
- TanStack Query hooks + a central query-key factory; session/profile auth
  hooks.

### Design system & shell

- Dark-leaning token set (near-black surfaces, light-blue accent) and a full set
  of UI primitives (Button, Input, Select, Dialog, DropdownMenu, Tooltip, Badge,
  Card, Table, Spinner, EmptyState, Toaster, Skeleton, ConfirmDialog).
- Responsive app shell with a sidebar that collapses to a drawer, a top bar with
  a user menu + sign-out, and a shared page header.

### Routes & features

- Every route created up front. Auth flow implemented: login, session-guarded
  `_auth` layout, and redirects.
- Implemented: landing, login, dashboard, admin users (role management),
  classrooms list (create/edit/delete), and classroom detail (weights editor via
  edit dialog, tabbed nav, student roster CRUD, IO toolbar mounts).
- Stubbed for later agents: grades, attendance (+ session), slideshow, modules,
  and the IO import/export buttons.

## Verification

`bun install`, prettier check, `bun run typecheck`, `bun run test` (18 passing),
and `bun run build` all green.

## Notes for the next agents

- Follow `CONTRIBUTING.md`: thin routes, feature dirs, no new deps, no route edits,
  grade math only in `grading.ts`.
- Provisioning and deployment steps live in `SETUP.md`.
