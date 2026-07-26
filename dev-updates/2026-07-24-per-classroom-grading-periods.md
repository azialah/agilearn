Per-classroom grading_period date scoping (Option A)

Date: 2026-07-24T11:56:44-07:00
Author: Copilot (local edits)

Summary
-------
Implemented Option A: grading_periods now include optional start/end dates and the dashboard's At-risk computation was updated to scope attendance per-classroom using those ranges. If a classroom lacks period dates, the logic falls back to the active academic_period, then to including all sessions.

Files added/changed
-------------------
- Added migration: supabase/migrations/0020_grading_period_dates.sql
  - Adds starts_on date and ends_on date to public.grading_periods
  - Adds an index supporting classroom + date lookups

- Updated types: src/lib/database.types.ts
  - grading_periods Row/Insert/Update now include starts_on: string | null and ends_on: string | null

- Updated dashboard: src/features/teacher/dashboard/DashboardPage.tsx
  - Replaced the temporary attendance-scope selector with per-classroom date scoping
  - For each class session the code now checks:
    1) Is the session inside one of the classroom's grading_periods (using starts_on/ends_on)? If yes, include.
    2) If the classroom has no period date ranges, fall back to the active academic_period.
    3) If neither exists, include the session by default.
  - The "View all at-risk" link remains and points to /teacher/analytics?atRisk=1

- Tests adjusted: src/lib/grading.test.ts
  - Test helper period() now includes starts_on and ends_on fields (null) to match updated types

Why this approach
-----------------
Planned options:
- Option A (chosen): read per-classroom grading_period date ranges and use them to scope attendance.
- Option B: surface a dashboard-level grading-period selector.

Reason for choosing Option A now:
- The product request preferred per-classroom scoping.
- Implementing Option A required a schema migration (add starts_on/ends_on) and a conservative code change, which preserves backward compatibility by falling back to the global academic_period when classroom periods have no dates.

Implementation notes & tradeoffs
-------------------------------
- Migration is additive and safe: starts_on/ends_on are nullable. No data migration performed.
- Dashboard reads grading_periods from the already-existing structure query; the new migration makes those fields available to the client without adding extra queries.
- Fallbacks keep current behavior for classrooms that don't set dates.

Audit vs Plan
-------------
Planned
- Add per-classroom dates to grading_periods via migration.
- Update dashboard at-risk computation to use per-classroom grading_period dates when present.
- Fallback to active academic_period when per-classroom dates missing.
- Re-run format → typecheck → tests → build and report results.

What was done
- Created migration adding starts_on/ends_on.
- Updated database types to reflect new columns.
- Updated dashboard computation to check per-classroom periods, then fallback to active academic_period.
- Adjusted unit tests that construct grading_period objects to include the new nullable fields.
- Ran format, typecheck, tests, and build locally; addressed a type fallout in tests by updating test fixtures.

Results (local validation)
- pnpm run format:check: OK
- pnpm run typecheck: OK
- pnpm run test: All tests passed (105 tests)
- pnpm run build: Production build completed successfully

Bugs / issues found and addressed
- Type-errors in grading tests due to new required fields on GradingPeriod; fixed by adding starts_on/ends_on to test fixtures.
- No runtime exceptions or test failures observed after fixes.

Performance considerations
- No change to query count: dashboard still fetches per-classroom structure + scores (same as prior implementation). The new logic uses the already-fetched structure.periods to scope attendance, so no additional network calls were introduced.
- If teachers have many classrooms, client-side per-classroom computation may be slow. Recommended next steps: implement a DB-side aggregation RPC to compute per-student finals and attendance counts for the teacher in a single call.

Next steps / recommendations
- Deploy migration to Supabase (review with DB team): the migration is additive but must be applied in the production DB and in any downstream environments.
- After DB migration, add UI to allow teachers to edit grading_period start/end dates in the grading UI (Structure / Period dialog) — keep dates optional.
- Consider adding a small unit test that verifies at-risk filtering when periods have overlapping or adjacent ranges.
- If performance concerns appear in real traffic, implement server-side RPC aggregation.

Actions taken locally
- Files changed and built at: C:\Users\Neo021\Documents\GitHub\agilearn
- Commands run: pnpm run format; pnpm run format:check; pnpm run typecheck; pnpm run test; pnpm run build
- All checks passed locally.

If you'd like, next I can:
- Draft the SQL migration for your production DB (already created under supabase/migrations/0020_...)
- Add the UI for editing grading_period starts_on/ends_on in the grade structure dialogs
- Implement the DB RPC to aggregate per-teacher at-risk metrics

