Classroom wizard redesign: level-aware fields, JHS/SHS grouping, accessible colors

Date: 2026-08-05T23:10:00+08:00

Summary
-------
The teacher classroom-creation wizard was built college-first and never
adapted as preschool/elementary/high-school support was added: every level
saw the same college-flavored fields ("Course code", "Field of study"), and
step 1 stacked 9+ field-groups regardless of level. Separately, a color audit
found the input/select border was only ~1.3:1 against its own fill in every
theme — a real WCAG 1.4.11 failure. This session fixed both: color tokens at
the shared level (fixes every input/select app-wide), and a level-aware,
reordered, less dense wizard scoped to the classroom-wizard family
(`ClassroomFormDialog.tsx`, `SubjectFields.tsx`, `PeriodDialog.tsx`).

The plan was scoped with the user up front: no `teaching_level` schema
change (Junior/Senior High is a UI-only grouping within the existing
`high_school` value), forms-refactor scoped to the classroom-wizard family
only (not the auth signup wizard), raw-`<select>` migration scoped to
`ClassroomFormDialog.tsx`'s 9 instances (not an app-wide sweep).

What changed
------------
- **Color tokens** (`src/styles/app.css`) — `--color-border`/
  `--color-border-strong` darkened per theme (light/dark/calm-white) to clear
  3:1 against `--color-surface-1`; verified by hand-computing WCAG contrast
  math independently of the agent that proposed the values (matched to 3
  decimal places). Focus indicator swapped from `--color-accent-400` (only
  ~2.5:1 in light theme) to `--color-accent-350` (≥3:1 in every theme), in
  `Input.tsx`, `Select.tsx`, and the global `:focus-visible` fallback.
- **`src/components/ui/Field.tsx`** (new) — shared label+control+hint/error
  wrapper, replacing three independent hand-rolled versions across the
  classroom-wizard family.
- **`src/components/ui/ChoiceButton.tsx`** (new) — unifies `SubjectFields`'
  `SessionChoice` and `PeriodDialog`'s `ShareChoice`, which were the same
  button idiom duplicated independently.
- **9 raw `<select>` → `Select.tsx`** in `ClassroomFormDialog.tsx` (Radix),
  via a shared `UNSET` sentinel for the 6 with a real placeholder option
  (Radix rejects `value=""`) — `FormState` itself keeps `''` as its
  canonical unset value throughout, so `composeCohortName` and the
  template-payload schema are untouched.
- **Junior/Senior High grouping** — new `LEVEL_GROUPS` map splits the
  existing flat `high_school` grade list into "Junior High (Grade 7–10)" /
  "Senior High (Grade 11–12)" `SelectGroup`/`SelectLabel` sections (new
  `SelectLabel` export added to `Select.tsx`). Purely render-layer — the
  stored grade string, the `teaching_level` enum, and `composeCohortName`
  are unaffected. Exported `LEVELS`/`LEVEL_GROUPS` for testing.
- **Level-aware subject fields** (`SubjectFields.tsx`) — "Course code" (the
  one unambiguous college-jargon field) is dropped entirely for non-college
  levels; "Subject code" is kept but demoted to a single de-emphasized
  optional row instead of college's two-column grid (DepEd-style short codes
  are a legitimate K-12 use case, so it wasn't cut). Verified safe: both
  columns are `text not null default ''`, and every downstream reader
  already guards against an empty value.
- **Step 1 reorder + progressive disclosure** — School level moved to the
  top (it gates the most downstream fields: college-only fields, grade/year
  options, section-vs-block wording), followed by the level-dependent
  fields, then the school-year/semester grid, then a collapsed-by-default
  "Add semester dates" disclosure. Class name now appears *after* all its
  real inputs (course/year/block) instead of before them, fixing a latent
  UX issue where the derived-name preview used to render before anything
  fed it.
- **`ClassroomFormDialog.tsx`'s school-level `onChange`** now also clears
  `courseCode` when the level moves off college, so a value typed while
  College was selected can't survive hidden in step 2 and get silently saved
  once the level changes — a small correctness gap the field-hiding change
  would otherwise have introduced.

Bug found and fixed during browser verification
-------------------------------------------------
The original plan grouped **both** "Start from a template" and "Use an
existing semester" under one collapsed-by-default "Quick start" disclosure.
Browser-testing the actual save path caught a real regression this
introduced: skipping the (now-hidden) existing-semester picker and typing a
school year/semester that already has a period silently tries to create a
**second** period with the same `(school_year, semester_name)` — the backend
correctly rejects it (409), but the teacher gets a generic failure with no
indication why. This isn't a new bug (the underlying `save()` logic was
untouched), but collapsing the one field that prevents it by default made it
meaningfully easier to hit. Fixed by keeping "Use an existing semester"
always visible whenever periods exist (matching the original behavior); only
"Start from a template" stays behind the collapsed disclosure, since picking
no template has no data-integrity consequence.

Verification
------------
Full CI gate, run twice (once before, once after the Quick-Start fix above):
`format:check` → `typecheck` → `test` (165/165, 4 new) → `build`, all green.

Browser-verified against the real running app (not just typechecked),
including full end-to-end creates against a live Supabase project:
- **Elementary**: full create → save succeeded, landed on the new
  classroom's page, "Single session" subject with no course code anywhere,
  correct "Grade level"/"Section" wording, flat (ungrouped) grade list.
- **High school**: opened the Grade-level dropdown and confirmed the
  Junior High (Grade 7–10) / Senior High (Grade 11–12) `SelectGroup`
  sections render with the right options in each.
- **College**: full create with "Lecture + laboratory" selected → save
  correctly created *two* subjects (Lecture and Laboratory rows) from one
  submission; confirmed Field of study/Course selects, the "How is it
  taught?" toggle, and the two-column Course code/Subject code grid all
  still render correctly (ungrouped Year-level list, as expected — only
  `high_school` groups).
- Confirmed the new `--color-border`/`--color-border-strong`/focus-color
  values are the actual live computed CSS custom property values in the
  browser, in all three themes (light/dark/calm-white) — not just the
  values written to `app.css`.
- Two test classrooms created during verification ("Grade 4 — Verification
  Test", "BSCS 1Ver") were deleted afterward via the app's own
  `useDeleteClassroom` mutation path, restoring the account to its prior
  state (1 classroom).

Known gaps / not done this pass
--------------------------------
- Preschool's level dropdown was not directly clicked through (only
  Elementary/High school/College were); it uses the identical code path and
  a 3-option flat `LEVELS.preschool` list with no grouping, so it's expected
  to work, but wasn't independently exercised in-browser.
- No full keyboard-only (Tab/Arrow/Enter/Escape) pass was done on the
  migrated selects — Radix's keyboard handling is a well-established library
  behavior, not something this change customized, so risk here is low, but
  it wasn't explicitly walked per the plan's verification checklist.
- Per the approved scope: the auth signup wizard, and raw `<select>` usages
  outside `ClassroomFormDialog.tsx` (Calendar, signup, settings, grade
  reports), are untouched — not a gap, an explicit scope boundary.
- `--color-border` on `--color-surface-3` (a deeper surface tier than the
  `--color-surface-1` this pass targeted) lands at ~2.7-2.8:1, still under
  3:1 — flagged by the contrast math during planning as a residual gap, not
  fixed here since no in-scope component uses that pairing today.

Nothing in this session is committed yet.
