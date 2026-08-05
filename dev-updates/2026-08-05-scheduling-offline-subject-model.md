Scheduling conflicts, offline attendance, and the course-subject model

Date: 2026-08-05T21:00:37+08:00
Author: Claude (local edits, paired session)

Summary
-------
An eight-phase pass over the teacher workspace, plus a follow-up round on the
classroom wizard and profile photo editor. The through-line: several features
were half-built — the code existed but nothing called it — and several surfaces
showed database shorthand to teachers. Migrations 0025–0029 were applied to the
hosted database during the session.

Highlights, in the order they matter:

- Meeting-slot overlaps are now impossible at the database level, and the
  already-written `schedulesOverlap()` (previously zero callers) drives a live
  pre-check in the UI.
- Meeting slots can finally be edited and deleted. `useDeleteMeetingSlot` had
  existed with no callers, so a mistyped meeting was permanent.
- Attendance marked without a signal is queued in IndexedDB and replayed on
  reconnect, with a server-wins conflict review.
- `course_subjects` now states whether a subject is single-session or a
  lecture+laboratory pair, instead of teachers encoding it in the title.

Files added/changed
-------------------
Migrations (all applied to the hosted DB during this session)
- 0025_meeting_slot_conflicts.sql — btree_gist, trigger-derived
  `subject_meeting_slots.owner_id`, per-teacher EXCLUDE constraint,
  `subject_meeting_slot_conflicts` quarantine table with RLS, simplified slot
  policy. Companion read-only script: supabase/checks/0025_preflight_overlaps.sql
- 0026_subject_kind_level_rule.sql — triggers both directions so lecture/lab
  subjects exist only under college classrooms
- 0027_classroom_subject_mirror.sql — `classrooms.course_name/course_code`
  become a trigger-maintained mirror of the primary course subject
- 0028_drop_classroom_subject_columns.sql — drops five dead duplicate columns
- 0029_course_subject_session_type.sql — `course_subject_session` enum,
  backfill, unique key widened to include `kind`, redundant "(Lecture)" /
  "(Laboratory)" suffixes stripped from names

Scheduling
- src/features/teacher/calendar/calendar.ts — `findSlotConflicts`,
  `conflictReason`, time normalisation; `formatSchedule`/`to12Hour` moved here
  from the dialog so a validator no longer depends on a UI file
- src/features/teacher/calendar/MeetingSlotFields.tsx — one meeting form,
  replacing two drifting copies
- src/features/teacher/calendar/useSlotConflicts.ts, slotErrors.ts
- src/lib/queries/calendar.ts — `useUpdateMeetingSlot` added

Offline
- src/lib/offlineQueue.ts, src/lib/queries/offlineSync.ts
- src/features/teacher/attendance/OfflineSyncBar.tsx
- src/lib/queries/attendance.ts — network failures enqueue instead of rolling back

Classroom model and wizard
- SubjectFields.tsx, SubjectFormDialog.tsx, ClassroomFormDialog.tsx,
  ClassroomMeta.tsx, ClassroomHeader.tsx, ClassroomTabs.tsx
- src/lib/classroomColor.ts, src/lib/recentClassrooms.ts

Other
- src/features/teacher/grades/PeriodDialog.tsx, StructurePanel.tsx — shares
  instead of raw weights
- src/features/teacher/profile/AvatarUploadDrawer.tsx — two-column desktop
  review, rule-of-thirds grid, live circular preview
- src/components/ui/RouteSkeleton.tsx (replaces PageLoader), Badge.tsx,
  ConfirmDialog.tsx, ResponsiveDrawer.tsx

Decisions and why
-----------------
1. Overlap enforcement: database EXCLUDE + client pre-check, not client alone.
   `subject_meeting_slots` keys on `course_subject_id` but the conflict scope is
   the teacher, and EXCLUDE cannot join. Chose a denormalised `owner_id` stamped
   by a BEFORE trigger over a lookup trigger, because a GiST index is race-safe
   for free while a lookup would need an advisory lock. `tsrange` defaults to
   `[)`, matching the strict `<` in `schedulesOverlap()` — 10:00–11:00 and
   11:00–12:00 do not conflict, in both layers.

2. De-duplicate the classroom model rather than re-model it. Rejected a
   teacher↔section join table: one owner per classroom is already true
   everywhere and RLS routes through `owns_classroom()`. `course_name` and
   `course_code` have 20+ readers, so they became a trigger-maintained mirror
   instead of being dropped; the other five duplicated columns had zero readers
   and were dropped.

3. Lecture/lab pairing: no `paired_subject_id`. The per-teacher EXCLUDE already
   prevents a lecture clashing with its own lab, grading is per-subject, and a
   surviving lab after a deleted lecture is a complete subject, not an orphan.

4. `session_type` as an explicit enum (user's call over reusing `kind` alone). A
   CHECK keeps the two columns consistent: single ⇒ kind='other',
   lecture_lab ⇒ kind ∈ {lecture, laboratory}. Choosing "Lecture + laboratory"
   creates both rows from one title.

5. Offline conflicts: server wins, teacher reviews. Each queued write carries the
   `updated_at` it was based on; a newer server row parks the write for a
   "yours vs theirs" decision. Nothing is silently overwritten or dropped.
   IndexedDB over localStorage so a force-quit mid-period does not lose the work.

6. Calendar times stay wall-clock. `starts_at`/`ends_at` are `time` columns read
   by string slice; a 10:00 class is 10:00 at the school regardless of device
   timezone, and it does not shift across DST. Locked in with a test asserting
   identical output under Asia/Manila and America/New_York.

7. Percentages, never weights, in the UI. Weights are relative and renormalised
   at grade time, so `w 1`, `Σ 1` and `(0.2)` told teachers nothing.

Bugs found and fixed
--------------------
- `schedulesOverlap()` and `useDeleteMeetingSlot` both existed with zero callers.
- Analytics summed every meeting slot ever created while labelled "scheduled
  this week"; archived terms inflated it permanently. Now scoped to active
  academic periods.
- Attendance trend keyed React children by date label, so two sessions on the
  same date collided.
- `page-enter` sat on a `<main>` that never remounts, so the route animation only
  played on first load. Now keyed by pathname.
- The wizard's pane transition hung: `AnimatePresence mode="wait"` waited on
  pane 1's nested height animations, so the header advanced while the body did
  not. Now a crossfade.
- Sidebar "Recent classrooms" listed the most recently *created* classrooms, and
  rendered three links per classroom that all pointed at the same URL.
- `--color-ink-muted` on `--color-surface-3` fails WCAG AA — 3.93:1 light,
  4.23:1 calm-white. Fixed by moving text to `--color-ink` on that surface
  (10.7–12.5:1), scoped rather than retuning a token used ~200 times.
- Self-inflicted: deriving the class name overwrote `cohort_name` on edit,
  renaming a real classroom to "3" — `course` is not stored on the classroom, so
  edit starts empty and the year digit was used alone. Fixed so college derives
  nothing without a course; two regression tests added. The affected classroom
  was restored to "BSCS 3B" through the app.
- Migration-authoring mistakes caught before/at push: a hard-coded constraint
  name that Postgres had truncated (0025), `btree_gist` needing the `extensions`
  schema (0025), and `UPDATE ... FROM LATERAL` referencing the update target's
  alias — 42P10 (0027).

Results (local validation)
--------------------------
- pnpm run format:check: OK
- pnpm run typecheck: OK
- pnpm run test: 159 passed (was 105 at the previous update)
- pnpm run build: OK

Verified in the running app against real data, not just by reasoning: a lab
scheduled over its own lecture was blocked with a named reason while the
boundary case (16:00 start against a 13:00–16:00 lecture) was allowed; an
attendance mark made with `fetch` forced to fail was queued in IndexedDB and
replayed on reconnect, then the test edit was reverted.

Known gaps / next steps
-----------------------
- public/images/home-teaching-ritual.png is 2.3 MB and unoptimised — the single
  biggest LCP lever. No image encoder available on this machine.
- No real Lighthouse run; the figures gathered were Performance-API timings.
- Scores/sheets are not queued offline. The queue is generic
  (`'attendance_records' | 'scores'`), only attendance is wired.
- IndexedDB has no automated test — jsdom has none and fake-indexeddb is not
  installed, so it was verified in a real browser instead.
- Phase 5's WCAG sweep is reopened by the contrast finding above; `Badge`
  neutral is used app-wide and warrants a full re-audit.
- Nothing in this session is committed yet.
