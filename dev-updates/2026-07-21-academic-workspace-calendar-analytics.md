# 2026-07-21 — Academic workspace, calendar, analytics, and usage

This handoff records the uncommitted Agilearn work completed on 2026-07-21.
Preserve the current worktree: it includes earlier user changes as well as the
work described below. Do not reset, checkout, or discard unrelated changes.

## Delivered

- Reorganized the teacher workspace around `School Year/Semester → Classroom
  / Cohort → Course Subject`. Lecture and laboratory are now separate course
  subjects with independent gradebooks rather than fixed weighted columns.
- Added a two-step, responsive create-workspace flow and a shared responsive
  drawer/modal primitive for mobile and desktop creation and editing flows.
- Rebuilt teacher navigation with a rounded desktop rail, persisted compact
  mode, hover expansion, a top-right search trigger, account menu, nested
  classroom/subject navigation, breadcrumbs, and mobile pill navigation.
- Added Calendar, Analytics, Usage, Profile, academic period, classroom, and
  course-subject workspaces. Calendar is Sunday-first and supports structured
  meeting slots, modality labels, private events, notes, and holidays.
- Added source-backed SVG/Tailwind analytics for teaching load, attendance,
  grade completion, readiness, and storage. Empty states never present example
  values as real teacher data.
- Added a private Modules repository with folder/type metadata, clear example
  placeholders, upload progress, and subject imports that link rather than
  duplicate material.
- Refined profile, settings, Classroom, and Modules views with clearer empty
  states, avatar/account controls, and onboarding-derived teacher details.

## Data, security, and documentation

- Added the academic hierarchy, subject ownership, calendar, schedule, event,
  usage, and quota schema work. Existing classroom data is backfilled into an
  imported academic period and initial subject so dependent roster, grade,
  attendance, and material records remain connected.
- Enforced a 500 MB per-teacher private-storage quota through authenticated,
  ownership-scoped database checks. Client-side checks remain advisory.
- Added RLS and ownership checks for subject-scoped records, schedule and
  calendar data, holidays, module imports, and storage usage. No service-role
  client access or public bucket exposure was introduced.
- Added `docs/STORAGE_QUOTA_ADMIN_HANDOFF.md` and retained the email delivery
  roadmap for a future verified-domain, server-side delivery path.
- The hierarchy backfill intentionally occurs in the deployment migration to
  preserve existing data, despite the repository's usual preference for seed
  data rather than migration data mutations. Apply it to the target Supabase
  database before relying on the new hierarchy.

## Review and validation

- React/TypeScript, accessibility, query-boundary, and mobile review completed
  with confirmed findings addressed.
- Security review completed with no remaining service-role, PII, or private
  storage exposure findings.
- Supabase review findings for deterministic backfill, RLS ownership,
  constraints, and generated types were addressed. The deliberate deployment
  backfill convention above remains documented for release review.
- Final validation passed in order:
  - `pnpm run format:check`
  - `pnpm run typecheck`
  - `pnpm run test` — 7 files, 97 tests passed
  - `pnpm run build`
- The build retains the non-blocking Vite warning that the `ExportMenu` chunk
  exceeds 500 kB.

## Formatting note

The final formatter sweep applied Prettier across the repository. As a result,
the worktree contains formatting-only changes in addition to the implementation
changes above; review those separately when staging.

## Follow-up

1. Apply the new migration to the target Supabase project and regenerate types
   from that environment if its schema has drifted.
2. Verify calendar events, quota enforcement, module imports, and subject
   routing with a real authenticated teacher before release.
3. Resolve the existing large `ExportMenu` bundle when performance work is
   scheduled; it does not block the validated build.
