# Subject grade combinations and exact-weight validation — 2026-07-27

## Scope

Teachers can now keep each course subject independent while optionally reporting one
weighted final across subjects. This supports college Lecture + Laboratory pairs and
does not impose a combined grade on high-school or elementary classrooms.

## Schema migration

Added `supabase/migrations/0025_subject_grade_combinations.sql`.

- `subject_grade_combinations` stores a named classroom-level reporting formula.
- `subject_grade_combination_items` stores two or more selected course subjects,
  their order, and their weights.
- `save_subject_grade_combination` validates classroom ownership/admin access,
  subject membership, unique subjects, and an exact 100% total before replacing a
  formula atomically.
- `delete_subject_grade_combination` performs the equivalent ownership-checked
  deletion.
- Direct client mutations are intentionally not permitted. RLS allows only
  classroom-scoped reads; the narrow security-definer RPCs handle writes.

The migration stores configuration only. It deliberately contains no grade math;
calculation stays in `src/lib/grading.ts`.

## Teacher experience

- The Grade sheet Structure panel now offers an editable College 20/40/40 preset
  for Midterm and Finals, plus the existing school-quarter starting point.
- Period, component, and category weights are shown as percentages with visible
  totals. Incomplete totals are marked and do not produce a final grade.
- The Structure panel can create, edit, and remove a named combined final such as
  `Lecture + Laboratory final` (40% / 60%).
- The grade-sheet summary now shows a read-only combined-final preview for every
  student. A result appears only when each selected subject has a valid final.
- Score query caches are subject-scoped so viewing or updating Lecture cannot
  overwrite Laboratory scores in a multi-subject classroom.
- Dashboard grade widgets now deliberately skip multi-subject classrooms rather
  than merging their structures. Those classrooms link teachers back to the
  subject-specific grade sheet, where an explicit combination can be reviewed.

## Calculation rules

- All structural weights must total exactly 100% at persisted four-decimal
  precision before a configured period, component, or final is returned.
- A combined final requires at least two subjects, a 100% combined weight total,
  and a computable final for every selected subject.
- Teachers remain able to edit a preset. Until the edited structure again totals
  100%, Agilearn shows an incomplete total rather than publishing a misleading
  grade.

## Verification status

- `pnpm run format:check`: blocked only by pre-existing formatting drift in
  `src/components/layout/AppShell.tsx` and
  `src/features/teacher/calendar/CalendarPage.tsx`; those unrelated files were
  left untouched.
- `pnpm run typecheck`: passed
- `pnpm run test`: passed (15 files, 132 tests)
- `pnpm run build`: passed
- Migration/RLS behavior still needs to be applied and exercised against the
  intended Supabase project before production use.
