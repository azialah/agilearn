# Decision records

Short records of the choices that shape Agilearn. Each one states the context, the
decision, and what it costs. Add a new record when a change sets a precedent;
supersede an old one rather than editing history.

| #                                                       | Decision                                   | Status   |
| ------------------------------------------------------- | ------------------------------------------ | -------- |
| [001](#adr-001-no-application-server-rls-is-the-boundary) | No application server; RLS is the boundary | Accepted |
| [002](#adr-002-one-edge-function-only-when-a-secret-demands-it) | One Edge Function, only when a secret demands it | Accepted |
| [003](#adr-003-vite-spa-not-ssr)                        | Vite SPA, not SSR                          | Accepted |
| [004](#adr-004-tanstack-query-owns-server-state)        | TanStack Query owns server state           | Accepted |
| [005](#adr-005-grade-math-in-one-pure-module)           | Grade math in one pure module              | Accepted |
| [006](#adr-006-domain-gated-teacher-self-sign-up)       | Domain-gated teacher self-sign-up          | Accepted |
| [007](#adr-007-offline-writes-server-wins)              | Offline writes, server wins                | Accepted |
| [008](#adr-008-no-new-dependencies-no-eslint)           | No new dependencies, Prettier as the only lint gate | Accepted |
| [009](#adr-009-academic-hierarchy-with-legacy-adoption) | Academic hierarchy with legacy adoption    | Accepted |

---

## ADR-001: No application server, RLS is the boundary

**Context.** A small team builds an internal school tool. Every server is something
to deploy, patch, scale and secure.

**Decision.** The SPA calls Supabase directly with the anon key. Postgres RLS,
using `is_admin()` and `owns_classroom()`, enforces all access.

**Consequences.**
- ✅ One place to audit access; UI bugs can't leak data.
- ✅ Nothing to run besides static hosting.
- ⚠️ Business rules that need atomicity live in SQL functions and triggers.
- ⚠️ Every new table must ship with RLS — forgetting is a critical bug.

## ADR-002: One Edge Function, only when a secret demands it

**Context.** Emailing grades needs a Resend API key, which can't be public.

**Decision.** Add exactly one Deno Edge Function, `send-grade-emails`. It runs as
the caller (their JWT + anon key), accepts ids only, and loads everything else
under RLS. No service-role key.

**Consequences.**
- ✅ The security model is unchanged — the function can see only what the teacher can.
- ⚠️ A second function needs the same justification: a secret that cannot live in
  the browser. Convenience is not enough.

## ADR-003: Vite SPA, not SSR

**Context.** Agilearn is an authenticated, interactive tool. Only the marketing
pages benefit from SEO.

**Decision.** Ship a Vite SPA with an SPA rewrite on Vercel.

**Consequences.**
- ✅ Fast HMR, trivial deploys, works fully offline as a PWA.
- ⚠️ Marketing pages are client-rendered.

## ADR-004: TanStack Query owns server state

**Context.** Hand-rolled caches drift and break invalidation.

**Decision.** All remote data goes through `useQuery` / `useMutation` in
`src/lib/queries/*`, with keys only from `keys.ts`. Zustand and `useState` hold UI
state only.

**Consequences.**
- ✅ One cache, predictable invalidation, offline persistence for free via `dehydrate`.
- ⚠️ Hand-written key tuples are forbidden — they silently skip invalidation.

## ADR-005: Grade math in one pure module

**Context.** Grades appear in the grid, summaries, exports, slideshow, analytics and
emails. Any two implementations eventually disagree.

**Decision.** `src/lib/grading.ts` is the only place a grade is computed. It is pure
and has no Supabase import. The database stores scores, never averages.

**Consequences.**
- ✅ Deterministic, unit-tested, one fix fixes every screen.
- ⚠️ SQL can't enforce grade-derived rules; notifications reconcile through an RPC
  that receives client-computed values.

## ADR-006: Domain-gated teacher self-sign-up

**Context.** Schools want teachers to onboard themselves, but not strangers.

**Decision.** `handle_new_user()` rejects sign-ups whose domain isn't in
`allowed_email_domains`. New users are always `teacher`. Admins are never
self-served; the first is bootstrapped once by migration.

**Consequences.**
- ✅ Zero-touch onboarding for approved schools.
- ⚠️ New schools need an admin to approve a domain request first.

## ADR-007: Offline writes, server wins

**Context.** Attendance is taken in rooms without signal. Losing a class period's
work is unacceptable; overwriting a colleague's correction is too.

**Decision.** Queue `attendance_records` and `scores` upserts in IndexedDB with the
row's `updated_at`. On replay, if the server row is newer, park the write for the
teacher to resolve.

**Consequences.**
- ✅ No silent loss, no silent overwrite.
- ⚠️ Only idempotent upserts can be queued. Details in [OFFLINE.md](OFFLINE.md).

## ADR-008: No new dependencies, no ESLint

**Context.** Each dependency is attack surface, bundle weight and upgrade work.

**Decision.** `package.json` is frozen for feature work. Prettier is the single
formatting/lint gate; strict TypeScript does the rest.

**Consequences.**
- ✅ Small surface, fast installs, one formatter.
- ⚠️ Small utilities (an IndexedDB wrapper, SVG charts) are hand-written.

## ADR-009: Academic hierarchy with legacy adoption

**Context.** Early classrooms held one subject directly. Colleges need several
subjects (lecture + laboratory) per cohort, grouped by school year and semester.

**Decision.** Introduce `academic_periods → classrooms → course_subjects`
(migration `0016`). Old classrooms keep working with a nullable link and opt in via
the `adopt_legacy_classroom()` RPC.

**Consequences.**
- ✅ No forced data migration; teachers move when ready.
- ⚠️ Some code paths must handle both shapes until every classroom is adopted.

---

## Template

```markdown
## ADR-NNN: Title

**Context.** What forces the decision.

**Decision.** What we do.

**Consequences.**
- ✅ What gets better.
- ⚠️ What it costs or constrains.
```
