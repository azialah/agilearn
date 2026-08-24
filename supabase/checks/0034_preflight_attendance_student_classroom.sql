-- Preflight for 0034_attendance_records_student_classroom.sql — READ ONLY.
--
-- Deliberately not in migrations/: this detects rows that the tightened
-- attendance_records policy would refuse to let you write again. Run it as a
-- privileged user (SQL editor) BEFORE pushing 0034.
--
-- An empty result means the migration is safe to apply as-is.
--
-- A non-empty result means an attendance record names a student who does not
-- belong to the session's classroom. Those rows stay readable and deletable by
-- whoever the session belongs to, but any future update to them will be
-- rejected. Decide per row whether to delete it or repoint it before pushing.

select
  ar.session_id,
  ar.student_id,
  ar.status,
  cs.classroom_id as session_classroom,
  s.classroom_id  as student_classroom,
  cs.session_date,
  cs.title
from public.attendance_records ar
join public.class_sessions cs on cs.id = ar.session_id
left join public.students s on s.id = ar.student_id
where s.id is null                       -- record points at a deleted student
   or s.classroom_id <> cs.classroom_id  -- ...or a student from another classroom
order by cs.session_date desc, ar.student_id;
