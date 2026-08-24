-- Tie an attendance record's student to the session's own classroom.
--
-- The policy this replaces checked only that the caller owns the classroom of
-- the row's session. Nothing — not the policy, not a foreign key, not a check
-- constraint — required the student to belong to that same classroom, so a
-- teacher who owns any classroom could write an attendance row naming any
-- student uuid, including one on another teacher's roster.
--
-- Reading those students is already blocked by RLS on `students`, so this was
-- never a way to discover another roster; it was a way to write into it given a
-- uuid from elsewhere. The attendance import feature relies on this policy as
-- its backstop, so the predicate is made to say what everyone assumed it said.
--
-- The students subquery is itself RLS-filtered, which is the point: a student
-- the caller cannot see yields NULL, `NULL = uuid` is NULL, and the policy
-- fails closed.
--
-- Run supabase/checks/0034_preflight_attendance_student_classroom.sql first —
-- an existing mismatched row stays readable but can no longer be updated.

drop policy if exists "attendance_records all via session" on public.attendance_records;

create policy "attendance_records all via session"
  on public.attendance_records for all
  to authenticated
  using (
    public.owns_classroom(
      (select cs.classroom_id
       from public.class_sessions cs
       where cs.id = attendance_records.session_id)
    )
    and (select s.classroom_id
         from public.students s
         where s.id = attendance_records.student_id)
      = (select cs.classroom_id
         from public.class_sessions cs
         where cs.id = attendance_records.session_id)
  )
  with check (
    public.owns_classroom(
      (select cs.classroom_id
       from public.class_sessions cs
       where cs.id = attendance_records.session_id)
    )
    and (select s.classroom_id
         from public.students s
         where s.id = attendance_records.student_id)
      = (select cs.classroom_id
         from public.class_sessions cs
         where cs.id = attendance_records.session_id)
  );

comment on policy "attendance_records all via session" on public.attendance_records is
  'Caller must own the session''s classroom, and the student must be on that same classroom''s roster.';
