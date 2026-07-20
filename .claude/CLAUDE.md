# CLAUDE.md — Agilearn Agent Context (Master Harness)

**Stack:** Vite + React 19 + TypeScript (strict) + Supabase + TanStack Router/Query
**Runtime:** pnpm (package manager + runner)
**Kind:** Single-page app (SPA), installable PWA

---

## 1. Platform & Mission

**Domain:** School-management platform for teachers and administrators.
**What it does:** Brings classrooms, rosters, weighted gradebooks, attendance, and
a shared teaching-modules library into one calm, dark-leaning workspace.

- **Teachers:** manage their own classrooms, rosters, grades, attendance, modules.
- **Admins:** everything a teacher can do, plus user/role management. Admins are
  provisioned out-of-band (no admin self-signup).
- **Teacher sign-up:** self-serve but gated — only emails on an approved domain
  (`allowed_email_domains`, enforced by `handle_new_user()`) can sign up. New
  users always default to the `teacher` role.
- **Security model:** Postgres Row Level Security is the boundary. Teachers only
  ever see their own classrooms; RLS enforces it regardless of UI bugs.

There is **no backend server, no Edge Functions, no payments, no i18n**. The React
SPA talks directly to Supabase (Auth + Postgres + Storage) using the anon key,
and RLS does the access control.

---

## 2. Tech Stack

| Technology         | Version   | Purpose                                  |
| ------------------ | --------- | ---------------------------------------- |
| React              | 19.2+     | UI framework                             |
| TypeScript         | 7.0+      | Type safety (strict, `tsc -b`)           |
| Vite               | 8.1+      | Build tool / dev server                  |
| TanStack Router    | 1.170+    | File-based routing                       |
| TanStack Query     | 5.101+    | Server state + caching                   |
| TanStack Table     | 8.21+     | Grade/roster tables                      |
| TanStack Virtual   | 3.14+     | Virtualized rows                         |
| Supabase JS        | v2.110+   | Auth + Postgres + Storage (anon key)     |
| Tailwind CSS       | 4.3+      | Styling (CSS-first, no config file)      |
| Radix UI           | latest    | Dialog/Select/Dropdown/Tooltip/Label     |
| Motion             | 12+       | Animation                                |
| pdf-lib / xlsx     | latest    | PDF + spreadsheet import/export          |
| Vitest + RTL       | latest    | Testing                                  |
| vite-plugin-pwa    | 1.3+      | Offline shell / service worker           |

pnpm is the package manager and runner. There is **no ESLint** — Prettier is the
only formatter/linter gate.

---

## 3. Ownership & Off-Limits Zones

| Zone                          | Rule                                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| `src/routes/**`               | Thin route files only (params/loaders → render a feature). Do NOT add logic. |
| `src/routeTree.gen.ts`        | **Generated + commit-tracked.** Never hand-edit.                 |
| `src/features/<name>/`        | Where all feature UI + logic lives.                              |
| `src/lib/grading.ts`          | The ONLY place grade math lives. Pure, no Supabase imports.       |
| `src/lib/queries/keys.ts`     | The query-key factory. Never hand-write key tuples elsewhere.     |
| `src/lib/database.types.ts`   | Mirrors `supabase/migrations/*`. Keep in sync on every schema change. |
| `supabase/migrations/`        | Ordered SQL, source of truth for the DB. Reviewed before applying. |
| `package.json`                | **Never edit or add dependencies.** Work with what is installed.  |

These mirror `CONTRIBUTING.md` — that file is the human-facing version of this
section; keep the two consistent.

---

## 4. Dev Commands

```bash
# Setup
pnpm install
cp .env.example .env          # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

# Dev
pnpm dev                       # Vite dev server (prints local URL)

# Quality gate (matches .github/workflows/ci.yml)
pnpm run format:check          # prettier --check .
pnpm run typecheck             # tsc -b --noEmit
pnpm run test                  # vitest run
pnpm run build                 # tsc -b && vite build

# Fix formatting
pnpm run format                # prettier --write .

# Database types (after any migration)
supabase gen types typescript --local > src/lib/database.types.ts
#   or, against a hosted project:
supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
```

Path alias `@/*` maps to `src/*`.

---

## 5. Execution Hard Limits

- **Surface the error, never paper over it.** If a query, migration, or build
  fails, report it — don't swallow it.
- **Never claim "done" without the gate.** Run the CI order — `format:check` →
  `typecheck` → `test` → `build` — and show output. Build passing alone is not
  enough; a formatting drift fails CI.
- **Stay in your lane.** Don't touch `src/routes/**`, `routeTree.gen.ts`, or
  `package.json` (§3). Feature work goes in `src/features/<name>/`.
- **Keep the types file honest.** Any `supabase/migrations/*` change must be
  mirrored in `src/lib/database.types.ts` (regenerate or hand-edit to match).

---

## 6. Architecture Rules

### Routing (TanStack file-based)

Routes live under `src/routes/`. `src/routeTree.gen.ts` is auto-generated by the
`@tanstack/router-plugin` — never hand-edit it. Route files stay **thin**: read
params/loaders and render a component from `src/features/`. All real UI and logic
live in the feature directory.

Auth-gated routes live under `src/routes/_auth/`, split into `_auth/teacher/**`
(core teaching surfaces: dashboard, classrooms, grades, attendance, modules,
slideshow) and `_auth/admin/**` (users, domain requests) — organizational only,
not a security boundary; RLS (`owns_classroom()` / `is_admin()`) is still the
real gate regardless of folder. The unauthenticated app routes are `/login`,
`/teacher/signup` (domain-gated teacher onboarding wizard), and
`/forgot-password` (OTP password reset).

### Layer Boundaries

**Routes (`src/routes/**`):** wiring only — params, loaders, render a feature.

**Features (`src/features/<name>/`):** all UI, local state, and orchestration.

**Data layer (`src/lib/queries/*`):** every Supabase read/write is a TanStack
Query hook here. Reads use `useQuery`, writes use `useMutation` and invalidate the
relevant `keys.*` on success. See `src/lib/queries/classrooms.ts` for the pattern.

**Types:** import the typed client from `@/lib/supabase` (`createClient<Database>`,
so `.from('table')` is fully typed). Row/Insert/Update/Enum aliases come from
`@/types/domain`.

**Supabase (Postgres):** single source of truth. RLS enforces access. Grade math
is the one thing that lives in app code (`src/lib/grading.ts`), pure and tested.

### State Management

- **TanStack Query** owns all server state (classrooms, students, grades,
  attendance, modules, profiles). Never cache remote data in component state or a
  hand-rolled store.
- **Query keys** come exclusively from `src/lib/queries/keys.ts` — never
  hand-write key tuples, so invalidation stays consistent.
- **Auth session:** the Supabase client owns it (`persistSession: true`). Never
  hand-manage tokens.

---

## 7. Supabase Conventions

### Migrations

Numbered `NNNN_<descriptive-name>.sql` (matching the existing `0001`–`0006`).
Each migration creates its tables/indexes AND enables + defines RLS. Column
comments welcome. No data mutations in schema migrations (seed data lives in
`supabase/seed.sql`, local-only).

### RLS Pattern (every table)

```sql
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers reach students only through a classroom they own.
CREATE POLICY "students_owner_rw" ON students FOR ALL
  USING (public.owns_classroom(classroom_id))
  WITH CHECK (public.owns_classroom(classroom_id));

-- Admins see everything. Never query auth.users directly in a policy (42501).
CREATE POLICY "students_admin_all" ON students FOR ALL
  USING (public.is_admin());
```

Helper functions (`0001_profiles_roles.sql`): `public.is_admin()` and
`public.owns_classroom(cid uuid)` — both SECURITY DEFINER. Use them in every
policy instead of re-deriving ownership.

### Roles & auth

- `app_role` enum = `'admin' | 'teacher'`. New auth users get a `profiles` row
  via the `on_auth_user_created` trigger (default role `teacher`).
- A teacher cannot self-promote — the `enforce_role_change()` trigger blocks it.
- Teacher self-sign-up is allowed but gated by `allowed_email_domains`
  (checked in `handle_new_user()`); no admin self-sign-up.

### Storage

- Bucket `teaching-modules` (private) holds lesson plans / activity stories /
  resources. Access via `supabase.storage.from('teaching-modules')`. Storage RLS
  (migration `0005`): authenticated users can read; only the owning folder (or an
  admin) can write/delete.

### Timestamps

- `timestamptz` storing UTC, `DEFAULT now()`. Don't append a hard-coded `Z` to
  values read back — they are already UTC-aware. The client never sets timestamps.

### Types

- `src/lib/database.types.ts` mirrors the migrations. Regenerate with
  `supabase gen types typescript --local`, or hand-edit to match. `src/types/domain.ts`
  derives friendly aliases (`Profile`, `Classroom`, `Student`, …) from it.

---

## 8. TypeScript

`strict` is on (`tsc -b`). No `any`, no non-null `!` to silence the compiler.

- Feature components: local `interface Props`, named export, colocated in
  `src/features/<name>/`.
- Fully typed Supabase access via `createClient<Database>` — never cast query
  results.
- Grade math stays pure in `src/lib/grading.ts` (no Supabase imports), covered by
  `grading.test.ts`.

---

## 9. Accessibility Rules

Every interactive element needs an accessible name.

- **`<select>` needs an `aria-label`** unless it is tied to a `<label htmlFor>`.
  When a select lives in a wrapper (e.g. a `<Field label="…">`), pass that label
  down as the `aria-label` (Agilearn has no i18n — use the plain string).
- **`<button>` `aria-disabled` must be a boolean**, never a string ternary. If
  `disabled` is already set, drop `aria-disabled` (redundant). Prefer real
  `disabled`.

---

## 10. Security Rules

- **Anon key only in the client.** `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` are Vite-inlined into the browser bundle — safe,
  because RLS is the real boundary. There is **no service-role key anywhere in
  this app** — if you ever see `service_role` / `SERVICE_ROLE_KEY` in `src/`,
  that's a critical leak.
- **RLS is the security boundary.** Every table needs RLS ON + at least one
  policy. A new table without a policy is a critical gap. Verify with `/rls-audit`.
- **Private storage.** The `teaching-modules` bucket is private; never make it
  public or generate long-lived public URLs for it.
- **Don't hand-manage the auth session** — the Supabase client owns it.
- **No secrets in git.** Never `git add` `.env`. `.gitignore` enforces it.
- **No AI attributions** in code, comments, commits, or docs (house rule).

---

## 11. Anti-Patterns

- `service_role` / `SERVICE_ROLE_KEY` anywhere in `src/` — this app has no
  backend; that key must never be in the client.
- Caching remote data in component state instead of TanStack Query.
- Hand-writing query-key tuples instead of using `src/lib/queries/keys.ts`.
- Recomputing grades outside `src/lib/grading.ts`.
- `select('*')` then filtering in JS — filter in the query.
- A new table without RLS enabled + a policy.
- Editing `src/routes/**`, `src/routeTree.gen.ts`, or `package.json`.
- Adding a `tailwind.config.js` / `postcss.config.js` — Tailwind v4 is CSS-first,
  tokens live in `src/styles/app.css` under `@theme`.
- Raw JSX inline `style={{}}` for static token values — use Tailwind utilities.
- Claiming "done" without running `format:check` → `typecheck` → `test` → `build`.

---

## 12. Decision Log

**Vite SPA (no SSR):** Agilearn is an interactive internal tool, not SEO-heavy.
Fast HMR, simple deploy (static + SPA rewrite on Vercel).

**No backend / Edge Functions:** the SPA talks straight to Supabase with the anon
key; RLS enforces access. Fewer moving parts, no server to run.

**RLS over app-level auth:** the DB enforces access regardless of UI bugs.
Teachers are isolated to their own classrooms by `owns_classroom()`.

**TanStack Query owns server state:** caching + invalidation in one place; no
separate client store for remote data.

**Grade math in one pure module:** `src/lib/grading.ts` is deterministic and
unit-tested; weighting logic never drifts across the UI.

**pnpm:** fast install/run; single toolchain for dev, test, and build.

---

## 13. Subagents (`.claude/agents/`)

Advisory reviewers surface findings with concrete fixes; fixers make focused
mechanical edits. Auto-delegated by their `description`, or invoke explicitly
("use the supabase-compliance agent on this migration").

**Reviewers (read-only):**

- **code-reviewer** — React/TS correctness, state boundaries (§6), a11y (§9),
  hygiene. The only reviewer with Bash — runs the `typecheck` + `build` gate.
  Use after editing `src/`.
- **supabase-compliance** — migration naming, RLS coverage, `is_admin()` /
  `owns_classroom()` usage, timestamps, storage policy (§7). Use after editing
  `supabase/migrations/`.
- **security-vulnerabilities-reviewer** — anon-key discipline, RLS gaps, private
  storage, no service-role in client (§10). Use before committing schema, auth, or
  env changes.

**Fixers (edit code — run as a final sweep before commit):**

- **prettier-fixer** — Prettier-clean the repo (the only lint gate).
- **aria-label-fixer** — §9 accessible-name sweep across `src/`.
- **inline-style-fixer** — static inline `style={{}}` → Tailwind v4 utilities.

---

## 14. Slash Commands (`.claude/commands/`)

| Command             | Creates                                                    |
| ------------------- | --------------------------------------------------------- |
| `/create-migration` | Numbered migration with tables, indexes, RLS via helpers  |
| `/create-component` | A `src/features/<name>/` component + its query hook        |
| `/rls-audit`        | RLS coverage check across all tables                      |
| `/security-check`   | Pre-deploy security checklist (anon key, RLS, storage)    |

---

## 15. Docs

- `README.md` — feature overview + quickstart.
- `docs/ARCHITECTURE.md` — system design (layers, data model, security).
- `docs/DEPLOYMENT.md` — Supabase provisioning + Vercel deploy walkthrough.
- `CONTRIBUTING.md` — the contributor contract (mirrors §3–§6 here).
