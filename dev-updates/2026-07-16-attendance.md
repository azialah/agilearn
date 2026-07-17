# Attendance tracking

Implemented the Attendance feature end to end, replacing the placeholder pages.

## Data layer — `src/lib/queries/attendance.ts`

TanStack Query hooks over `class_sessions` and `attendance_records`:

- `useClassSessions(classroomId)` — sessions newest-first, each joined with its
  records' `(student_id, status)` so the list can show present/absent counts and
  the summary report can aggregate without a second round trip. Returns the
  exported `ClassSessionWithRecords` type.
- `useClassSession(sessionId)` / `useSessionRecords(sessionId)` — single session
  and its existing records (unrecorded students are simply absent from the list).
- `useCreateSession` / `useUpdateSession` / `useDeleteSession` — CRUD, invalidating
  the classroom session list (and the single-session key on update).
- `useUpsertAttendance` / `useBulkUpsertAttendance` — optimistic upserts keyed on
  the composite `(session_id, student_id)` PK. Both write the cache in `onMutate`,
  roll back the snapshot in `onError`, and re-validate the session records + the
  classroom session list in `onSettled`.

Query keys all come from the existing `keys.attendance.*` factory (plus a local
`['attendance','session',id]` tuple for the single-session read).

## Pure helpers — `src/features/attendance/summary.ts`

Side-effect-free tally/rate math, covered by `summary.test.ts` (17 cases):

- `tallyStatuses`, `computeStudentSummary`, `computeClassSummary`,
  `computeClassAttendanceRate`, `computeSessionTrend`, `formatRate`.
- Rate model: attended = present + late; excused sessions are excluded from both
  numerator and denominator; sessions with no record are ignored (unrecorded, not
  absent). Rate is `null` when nothing counts yet.

## UI

- **AttendancePage** — session list (date, title, present/absent badges), a
  create/edit/delete dialog (`SessionFormDialog`, date defaults to today), each
  card links to the session detail route. Below it, `AttendanceSummary` renders a
  per-student table (P/L/E/A counts + an animated rate bar), sortable by name or
  rate, with a class-average figure and a small per-session trend strip.
- **SessionPage** — roster with a four-way segmented status control
  (present/late/excused/absent), per-student remarks (persisted on blur), a
  "Mark all present" bulk action, and a live status tally. Unrecorded students
  are explicitly badged and their row is dashed; the present segment shows a faint
  dashed hint as the implied-but-unset default. Every toggle persists immediately
  with optimistic update + rollback + error toast.

Motion micro-interactions (`motion/react`): rate bars grow in, trend bars ease up,
status buttons scale on tap. Fully responsive (status labels collapse to
single-letter chips on mobile; count badges hide on narrow session cards).

## Verification

- `bunx tsc --noEmit` — clean.
- `bunx vitest run src/features/attendance` — 17/17 passing.
- `bunx prettier --write` on all created files — clean.
