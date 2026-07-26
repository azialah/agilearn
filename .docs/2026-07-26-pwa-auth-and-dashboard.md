# PWA startup, auth flows, and dashboard analytics

**Date:** 2026-07-26
**Scope:** installed-PWA startup bugs, public-page unification, magic-link auth,
last-route restore, and user stories US-8 / US-9 / US-10.

This is the reasoning record, not a changelog. It exists so the *why* survives —
several decisions here look wrong without their context, and one of them
deliberately re-opens a bug that a previous comment warned about.

---

## 1. Root causes we actually found

Each of these was reported as a symptom and traced to source before any fix.

### 1.1 "The splash flashes on launch"

Cold boot painted **five** distinct states:

1. OS splash (always cream — `manifest.background_color`)
2. **blank**, while a render-blocking cross-origin Google Fonts stylesheet
   resolved (`Stack Sans Text` is `--font-sans` and was in *no* cache)
3. `#app-boot-splash`, which was `#17110d` in dark mode → hard cut from cream
4. a 180 ms fade fired one rAF after *root* mount, ignoring route readiness
5. `PageLoader`, a visually different bare centered logo

Fixes: font stylesheet made non-blocking (`preload` + `onload` swap), workbox
`runtimeCaching` for both Google Fonts origins, the boot splash made
theme-neutral so it matches the OS splash exactly, and dismissal moved to
**router-idle** so `PageLoader` never appears during boot. The pre-paint script
also now applies `calm-white`, which it had never handled.

### 1.2 "It reloads when I come back"

**This was not a service-worker bug.** There is no `location.reload()` anywhere
in `src/`, and the generated `registerSW.js` is the non-reloading variant.

What actually happens: the OS discards a backgrounded standalone WebView and
relaunches at `start_url` (`/`), which redirects standalone+sub-`lg` users to
`/login`. The *damage* was that with "remember me" unchecked the session lived in
`sessionStorage`, which a relaunched shell does not have — so it was a real
logout, not just a navigation.

Fix: in standalone, always persist the session to `localStorage`
(`src/lib/supabase.ts`). An installed app is a personal device. Later we added
last-route restore (§2.1) on top.

**Not fixable:** the OS discard itself. We only remove the logout and shorten the
cold path.

### 1.3 "The CTA starts mid-screen then jumps to the bottom"

`position: fixed` resolves against the nearest ancestor with a non-`none`
`transform`. Three `motion` wrappers above the CTA animated `y` — a transform.
While they ran, `bottom: 0` resolved to the *card* box (which
`mobileFormCentered` pushes to vertical center), and when Motion wrote
`transform: none` the CTA snapped down.

The codebase already knew this hazard: `wizard-ui.tsx` carried a comment and used
`marginTop` instead of `y` on one wrapper. `StaggerGroup` was simply missed.

Fix: all CTA ancestors animate opacity/`marginTop`, never a transform. Verified
empirically — 100 rAF samples across the mount animation showed `bottom` constant
at exactly the viewport height with no ancestor transform at any frame.

> **If you add motion to an auth screen, do not animate `x`/`y`/`scale` on
> anything that wraps `StickyCta`.** Use `marginTop`. This bug is invisible under
> Reduce Motion, so test with it off.

---

## 2. Decisions and their trade-offs

### 2.1 Last-route restore

`router.subscribe('onResolved')` persists the path; `/` restores it in standalone.

The important part is the **allowlist**, not the storage: only `/teacher/*`
(excluding signup), `/settings`, and `/admin` are ever saved. Public and auth
routes are not, so a stale entry can never strand someone mid-signup. Deep
attendance-session links are excluded because a stale id 404s. Covered by
`src/lib/lastRoute.test.ts`.

### 2.2 `100vh` **and** `100dvh` — a deliberate risk

The standalone CSS block previously used `100vh` only, with a comment stating
that iOS reports dynamic viewport units unreliably during a standalone cold
launch. We now declare `100vh` then `100dvh`, so **dvh wins wherever supported**.

This was an explicit product decision, and it partially re-opens the path that
comment warned about. In standalone there is no collapsing URL bar, so the two
should resolve identically in the steady state — the risk is confined to the
first frames of a cold launch. **If launch flicker is ever reported again, this
block is the first place to look.**

### 2.3 Magic link, not OTP codes

The signup and reset screens were built around a typed 6-digit code, but the
project is on Supabase's stock email templates, which interpolate
`{{ .ConfirmationURL }}` only — there was never a code to type. Both flows are
now link-based (`emailRedirectTo` / `redirectTo` + `detectSessionInUrl`), sharing
one `useResendCooldown` hook.

**Operational caveat:** free-tier built-in SMTP is heavily rate-limited and
intended for testing. Real teacher signups need custom SMTP configured in
Supabase Auth. The client-side cooldown is comfort; the server is the real limit.

### 2.4 One public header/footer

The landing page and `PublicPageShell` had diverged: different nav items, a dead
`#features` anchor on non-landing pages, different Sign-in styling, and a
non-clickable logo. Both now use `PublicHeader` / `PublicFooter`.

Two latent bugs surfaced while unifying:

- The logo `<img>` had no `shrink-0` and collapsed to **0 px wide** under flex
  pressure in a narrow header.
- `ThemeToggle`'s `hidden sm:inline-flex` **never worked**: `cn()` is clsx
  *without* tailwind-merge, so `hidden` coexisted with the component's own
  `inline-flex` and lost on CSS source order. Fixed by wrapping the component
  rather than passing the class in.

> **`cn()` does not merge Tailwind conflicts.** Passing a `display`/`padding`
> utility into a component that already sets one is a coin flip. Wrap instead.

---

## 3. User stories — feasibility and adaptations

### US-8 — grade-distribution chart

**Already ~80% shipped when the story was written.** A bucketing chart existed on
the dashboard with the right ranges and no chart library, so **AC-1 was already
met**. The real gaps were AC-2 (period reactivity), a silent `.slice(0, 3)` cap,
missing bucket labels and accessible names, static inline styles, and an `as any`.

**Adaptation — periods are per-classroom rows.** `grading_periods` have distinct
UUIDs per classroom, so "the active grading period" is not a single value that a
cross-classroom chart can select. The selector therefore matches on period
**name**, and each classroom resolves its own row. Classrooms that don't run that
period say so explicitly rather than rendering a misleading empty chart.

### US-9 — school-wide overview

Cheaper than it reads: RLS (`owns_classroom` / `is_admin`) already widens the
*existing* teacher hooks for admins, so there is no separate admin query path and
no migration was required for correctness.

**Adaptation — "previous period" by position, not dates.**
`grading_periods.starts_on/ends_on` and `academic_periods.starts_on/ends_on` are
all nullable, so a date-derived previous period is undefined for any classroom
that never set them. We use `position - 1`, which always exists, and show
"No comparable previous period" instead of fabricating a delta.

### US-10 — filters

Pure client-side filtering over data already in memory; teacher options join
`classrooms.owner_id` → `profiles`. Selecting a teacher narrows the classroom
list, and a stale classroom selection falls back to "all" rather than rendering
an empty page.

---

## 4. Known gaps — read before continuing

- **The admin overview has never been rendered with real data.** It typechecks,
  builds, and gates correctly, but no admin session was available; the
  aggregates, the trend, and the filters are **unproven at runtime**. This is the
  largest open risk in the batch.
- **Last-route restore**: the *save* side is tested; the *restore* branch only
  fires under `display-mode: standalone` and was never exercised there.
- **No iOS device check** for the dvh change, safe-area insets, or the OS→web
  splash handoff. Browser emulation cannot prove any of them.
- **Magic-link signup is unverified end-to-end** — it needs a real email round
  trip.
- **US-9's fan-out is still 2 queries per classroom.** Migration
  `0021_gradebook_overview_views.sql` adds the views that fix it; the client has
  **not** been migrated onto them yet (see §5).

---

## 5. Migration 0021 — the fan-out fix (client not yet wired)

`supabase/migrations/0021_gradebook_overview_views.sql` adds
`v_gradebook_activities` and `v_gradebook_scores`.

**These views reshape data only — they compute nothing.** Final grades are
weighted and renormalize when a category is ungraded; that logic lives in
`src/lib/grading.ts`, which the project designates as the only home for grade
math. Reimplementing it in SQL would create a second, untested copy that drifts.
So the views just denormalize `classroom_id` onto the two tables that lack it
(`activities` has only `grading_period_id`; `scores` has only `activity_id`),
which is the specific reason the client has to loop per classroom today.

Both views use `security_invoker = true` so the caller's RLS still applies —
teachers see their own classrooms, admins see all. **Do not remove that.**

After applying it, `useAllGradebooks` can become a constant number of queries:
`grading_periods`, `grade_components`, and `activity_categories` unfiltered (they
already carry `classroom_id`), plus the two views — then group by `classroom_id`
in memory and hand each classroom's slice to `grading.ts` unchanged.

Until that rewrite lands the views are inert; applying the migration changes no
behaviour.

---

## 6. Gotchas worth remembering

- **`course_subject_id` is a non-null uuid.** `.eq('course_subject_id', x ?? '')`
  sends `eq.` against a uuid column and raises `22P02`. Omit the filter entirely
  when no subject is scoped. This regressed once during this batch and was caught
  in audit — the dashboard needs *all* subjects in a classroom, and only
  `GradesPage` scopes to one.
- **Query keys belong in `src/lib/queries/keys.ts`.** `useAllStudents` was
  hand-writing `['students','all']`; it is now `keys.studentsAll`.
- Nav labels are typed `MessageKey`, so a new nav item needs an entry in **both**
  locales in `src/lib/locale.tsx`.
