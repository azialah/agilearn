# 2026-08-05 grading-engine session audit

## Summary

- Scope audited: Part A of the grading system overhaul (US-20–US-23,
  revised) — DepEd transmutation + CHED banding engine, schema, and the
  `grading_template` picker wiring through to the grade-sheet display.
  Plus one unrelated, already-completed item from earlier the same
  session: a second border-token lightening pass (`src/styles/app.css`).
- Date: 2026-08-05
- Gate result: `format:check` / `typecheck` / `test` (184/184) / `build`
  — all pass.

## Issues found

### `SubjectFormDialog.tsx`'s `save()` never persisted `grading_template`

- Severity: medium
- Where: `src/features/teacher/classrooms/SubjectFormDialog.tsx` (pre-existing,
  found while wiring the new picker — the field was silently missing from
  the mutation payload for every subject added via this dialog)
- Description: `save()`'s `fields` object omitted `grading_template`
  entirely, so any subject created or edited through the standalone
  add/edit dialog (as opposed to the classroom wizard) could never get
  anything but the column's `'custom'` default, even after this session
  added a real picker to `SubjectFields.tsx`.
- Root cause: the field was never added when `grading_template` was
  originally introduced (migration `0016`) — pre-dates this session, not
  introduced by it.
- Fix: added `grading_template: draft.gradingTemplate` to the `fields`
  object.
- Status: fixed.

## Verification

- 19 new tests (`src/lib/grading.transmutation.test.ts`,
  `src/lib/grading.ched.test.ts`) cover: boundary percentages between
  adjacent transmutation bands, below-lowest-band → null, null
  propagation, malformed/overlapping table → null, DepEd per-period
  transmutation before averaging (74/76 split ≠ flat 75/75 in the
  General Average), CHED 100%→1.00, 75%→3.00 exactly, 74.99%→5.00, custom
  increments without float drift.
- Full CI gate re-run clean after every edit in this session, not just at
  the end.
- **Not yet browser-verified** — see "Resume notes" below. The plan's own
  verification checklist calls for confirming a transmuted/CHED grade
  actually renders where the raw percentage used to, and that `'custom'`
  (every existing subject's current value) shows byte-identical output to
  before this change. Neither has been checked against the running app yet.
- **Migrations not yet applied to the hosted Supabase project.** All three
  (`0031`–`0033`) exist as files and `database.types.ts`/`domain.ts` were
  hand-edited to match (confirmed in sync by a `supabase-compliance` review
  agent), but nothing has been pushed to the live database — the new
  columns/tables don't exist there yet, so `useTransmutationTable` and the
  `grading_template` picker are not functionally testable end-to-end until
  that happens.

## Session note

- Stories completed this session (Part A, revised scope): wired
  `course_subjects.grading_template` end-to-end (no new `classrooms`
  columns — reused the existing dead column instead, per the plan's
  explicit reconciliation against the codebase's own history);
  `transmutation_tables`/`transmutation_bands` schema + seeded DepEd Order
  8 s.2015 table; `course_subjects.transmutation_table_id`/`ched_increment`;
  `grading.ts` additions (`transmuteGrade`, `computeTransmutedStudentGradebook`,
  `bandChedGrade`, `computeChedFinalGrade`) fully additive, no existing
  signature changed; `useTransmutationTable` query hook; grading-template
  `<Select>` in `SubjectFields.tsx` (shared by both callers); the
  `senior_high` preset button gap in `StructurePanel.tsx` (data layer
  already supported it, just had no UI entry point); transmuted/CHED
  display wired into both `SummaryTable.tsx` and `GradeGrid.tsx`'s "Final"
  column, including a template-aware column label.
- Story in progress when paused: none — Part A is complete and gated.
  Part B (US-24–US-31 revised: clipboard paste, full-screen grid mode,
  `student_no` column, undo, a11y pass, destructive-delete copy) has not
  been started.
- What triggered the pause: not a token/session limit — a genuine decision
  point. Two things need the user's explicit go-ahead before continuing:
  (1) how to apply the three new migrations to the hosted Supabase project
  (no confirmed tooling/credentials for this in the current session), and
  (2) whether to commit any of this to `staging` per `docs/BACKLOG.md`'s
  own workflow — standing instruction is to never commit without an
  explicit ask, even though the established per-story workflow assumes it.
- Resume notes for the next session: once migrations are applied and
  `database.types.ts` is confirmed against the live schema (or reconfirmed
  if hand-edits drifted), browser-verify per the plan's checklist: pick
  `basic_education` on a subject and confirm a transmuted Quarterly Grade
  renders in place of the raw percentage; pick `higher_education` and
  confirm a 1.00–5.00 grade renders; confirm `'custom'` (the default,
  every existing subject today) is visually unchanged. Then decide whether
  to proceed with Part B.

## Part B — gradebook UI polish (2026-08-05, same day)

- Scope: US-24–US-31 revised — clipboard paste, full-screen grid mode,
  `student_no` surfaced as an editable-entry-point column, undo-on-save,
  an accessibility pass, and tightened destructive-delete copy. Continued
  under the standing instruction "Continue with Part B for now, hold off
  on migrations and commits" — migrations `0031`–`0033` and any git commit
  remain withheld, unchanged from Part A's status above.
- Gate result: `format:check` / `typecheck` / `test` (184/184, no test
  files changed in Part B) / `build` — all pass.

### What shipped

- **Clipboard paste** (`GradeGrid.tsx`): `handlePaste`, wired via
  `onPaste` on the grid's outer container. Parses TSV clipboard text,
  fills a range from the selected cell across students (rows) ×
  editable activities (cols), validates each value with the existing
  `parseScoreInput`, batches `upsertScore.mutate` for valid changed
  cells only, and reports an applied/skipped summary toast. Skips
  entirely while a cell is mid-edit, since a single-value paste into an
  open `<input>` already works natively.
- **Full-screen mode** (`GradeGrid.tsx`): a toggle button
  (`Maximize2`/`Minimize2`, Escape-to-exit via a `keydown` listener)
  renders the grid through `createPortal(..., document.body)` rather
  than an inline `fixed` wrapper — Framer Motion ancestors set an
  inline `transform`, which creates a new containing block that would
  otherwise clip `position: fixed` in place.
- **Student ID column**: no new column — reused the existing
  `students.student_no` field and the existing `StudentFormDialog` /
  `useUpdateStudent` infrastructure. The student cell is now a trigger
  for that dialog, showing name + `student_no` subtitle, matching the
  codebase's established modal-for-structural-edits pattern instead of
  building new inline-edit UX.
- **Undo on autosave** (`GradeGrid.tsx` + `toast.tsx`): `commit()`
  captures the previous score and, on a real change, fires a
  success toast with a 10s duration and an `action: { label: 'Undo',
  onClick }` that re-fires `upsertScore.mutate` with the prior value,
  with its own success/error toast feedback. `toast.tsx` gained
  `ToastAction`/`durationMs` support (button in the toast body, the
  progress-bar animation duration now driven per-toast instead of a
  single module constant) to carry this.
- **Accessibility pass**: delegated to the `aria-label-fixer` subagent
  for a scoped sweep against CLAUDE.md §9. Result: 0 auto-fixes needed
  for the core rule (`<select>`/`<button aria-disabled>` were already
  compliant everywhere). Applied directly: `ScoreCell.tsx`'s inline
  validation error gained `id`/`role="alert"` wired to the input via
  `aria-describedby` (previously visual-only, not announced). Flagged,
  not fixed — left for an explicit future decision: full ARIA grid
  role structure (`role="grid"`/`row`/`gridcell` roving tabindex is
  partially present but not a complete grid pattern) and full-screen
  focus management (no focus trap / return-focus-on-exit yet).
- **Destructive-delete copy** (`StructurePanel.tsx`): period-delete and
  category-delete confirmation dialogs now compute and name the actual
  affected-activity count (e.g. `"Quarter 1" and its 5 activities — and
  every student's scores for them — will be permanently removed.`)
  instead of generic copy, falling back to a simpler message when the
  count is 0. Activity-delete copy tightened from "and its scores" to
  "and every student's score for it." Component-delete copy left as-is
  — already accurate, since deletion is blocked while categories exist.

### Verification

- Full CI gate clean (see above). All of Part B's five stories were also
  typechecked individually as they landed, not just at the final gate.
- **Not yet browser-verified**, same as Part A — blocked on the same two
  withheld actions (migrations not applied, nothing committed), and
  additionally clipboard paste / full-screen / undo genuinely need a
  live browser + real clipboard interaction to exercise end-to-end.

### Still open (unchanged from Part A, reconfirmed here)

- Migrations `0031`–`0033` have **not** been applied to the hosted
  Supabase project.
- **Nothing has been committed to git** — everything in Part A and Part
  B remains as uncommitted working-tree changes, per explicit standing
  instruction.
- Both require explicit user go-ahead before proceeding.
