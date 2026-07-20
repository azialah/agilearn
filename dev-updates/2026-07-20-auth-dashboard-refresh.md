# 2026-07-20 — Landing, auth/onboarding, and workspace refresh

This handoff records the uncommitted Agilearn work completed on 2026-07-20.
**Preserve the current worktree**: it contains pre-existing user changes as well
as the work below. Do not reset, checkout, or discard unrelated modifications.

## What landed

### Landing and visual foundation

- Added `src/components/ui/BackgroundLines.tsx`: a token-aware, decorative
  Motion SVG background with deterministic timing and reduced-motion support.
- Enriched the landing hero with `HeroWorkspace`, proof points for weighted
  grades / live attendance / teaching modules, and staged product-proof motion.
- Retained the existing scramble/typewriter patterns and kept visual motion
  progressive-enhancement only.

### Desktop auth and teacher onboarding

- Added the reusable desktop auth rail in `src/features/auth/wizard-ui.tsx`.
  It uses the 48% rail / 52% form composition at `lg` and above and preserves
  the existing mobile form and sticky CTA behavior below `lg`.
- Login has a product reassurance rail; password recovery has contextual rails
  for email, code, and password stages; signup displays all six milestones with
  completed/current/upcoming states.
- Added subtle, reduced-motion-safe enter/exit animation to the shared Radix
  dialog primitive. Password tips and all other shared dialogs inherit it.
- Signup now has direct, lazy route chunks:
  - `/signup/step-1/create-your-account`
  - `/signup/step-2/verify-your-email`
  - `/signup/step-3/tell-us-about-you`
  - `/signup/step-4/your-school`
  - `/signup/step-5/teaching-levels`
  - `/signup/step-6/welcome-to-agilearn`
- Added a 3-second debounce to the approved-school-domain pre-check. The
  allowlist query remains cached for five minutes, so it does not issue a
  database request on every keystroke.
- Name onboarding uses low-key typewriter placeholders for Dela Cruz / Juan /
  Manuel and provides suffix options I, II, III, IV, and Jr.

### Settings, profile, and Tagalog foundation

- Added `/settings` with profile presentation, monogram avatar color chooser,
  persisted English/Tagalog language preference, signed-in password change, and
  sign-out. The profile menu now leads to Settings; it no longer signs out
  directly.
- `src/components/ui/Avatar.tsx` provides the initial-based avatar used by the
  top bar and Settings. Avatar colour is persisted rather than using an image
  upload/storage bucket.
- Added `src/lib/locale.tsx`, a lightweight locale provider backed by profile
  preference plus localStorage during initial loading. Current Tagalog coverage:
  navigation, dashboard, settings language labels, and sign-in. Extend this
  message catalog before translating the remainder of recovery/onboarding.
- Added `supabase/migrations/0012_profile_preferences.sql` and matching
  `src/lib/database.types.ts` fields:
  - `profiles.preferred_locale`: `en` or `tl`, defaults to `en`
  - `profiles.avatar_color`: `orange`, `plum`, `teal`, or `blue`, defaults to
    `orange`
    Existing profile update RLS covers these personal preferences. The migration
    still needs to be applied to the target Supabase database before deploy.

### Dashboard

- The greeting now uses `profile.first_name`, so a profile whose first name is
  `John Neo` reads “Welcome back, John Neo.”
- Added richer zero-state content: a three-step teaching-flow orientation and a
  workspace-readiness panel, while retaining classroom loading skeletons and
  recent-classroom behavior.

## Verification

Latest successful gates after the Settings reliability fixes:

- `pnpm run typecheck` — passed.
- `pnpm run test` — 94 tests passed.
- `pnpm run build` — passed. Vite still reports the existing `ExportMenu` chunk
  size warning (>500 kB).

`pnpm run format:check` remains red because the existing repository baseline
has 114 unrelated formatting violations (including checked-in `.agents` files
and pre-existing source/docs). Files changed in this refresh were formatted
individually.

## Review results

- Supabase compliance review: no findings. The migration is ordered, profile
  RLS-safe, and database types match.
- Security review: no findings. No secrets or service-role usage were added;
  preferences are constrained by database checks and update only the current
  user row.
- Code review identified reliability gaps in Settings password update/sign-out;
  both were fixed before the final verification run.

## Next steps

1. Apply migration `0012_profile_preferences.sql` to Supabase, then verify
   language and avatar persistence with a real authenticated profile.
2. Extend `src/lib/locale.tsx` through the remaining recovery and onboarding
   copy before claiming full auth translation coverage.
3. Keep the 3-second debounce for user-entered availability/domain checks and
   keep modal motion in the shared dialog primitive; both are now project UI
   conventions.
4. Before deploy, run the repository's security/RLS audits and resolve the
   separate formatting baseline if CI requires a clean whole-repo Prettier run.
