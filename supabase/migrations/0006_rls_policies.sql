-- 0006_rls_policies.sql
-- Enable row level security on every application table and define policies.
--
-- Authorization is expressed through the SECURITY DEFINER helpers is_admin()
-- and owns_classroom(). CRITICAL: no policy on `profiles` queries `profiles`
-- directly — doing so would recurse through this same policy set. Admin checks
-- always go through is_admin(), which is SECURITY DEFINER and bypasses RLS.

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.students enable row level security;
alter table public.grading_periods enable row level security;
alter table public.activity_categories enable row level security;
alter table public.activities enable row level security;
alter table public.scores enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.teaching_modules enable row level security;

-- profiles -------------------------------------------------------------------
create policy "profiles select own or admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles update own or admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles delete admin only"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- classrooms -----------------------------------------------------------------
create policy "classrooms all owner or admin"
  on public.classrooms for all
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Direct children (own classroom_id column) ----------------------------------
create policy "students all via classroom"
  on public.students for all
  to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "grading_periods all via classroom"
  on public.grading_periods for all
  to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "activity_categories all via classroom"
  on public.activity_categories for all
  to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "class_sessions all via classroom"
  on public.class_sessions for all
  to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

-- Grandchildren (join up to the owning classroom) ----------------------------
create policy "activities all via grading period"
  on public.activities for all
  to authenticated
  using (
    public.owns_classroom(
      (select gp.classroom_id
       from public.grading_periods gp
       where gp.id = activities.grading_period_id)
    )
  )
  with check (
    public.owns_classroom(
      (select gp.classroom_id
       from public.grading_periods gp
       where gp.id = activities.grading_period_id)
    )
  );

create policy "scores all via student"
  on public.scores for all
  to authenticated
  using (
    public.owns_classroom(
      (select s.classroom_id
       from public.students s
       where s.id = scores.student_id)
    )
  )
  with check (
    public.owns_classroom(
      (select s.classroom_id
       from public.students s
       where s.id = scores.student_id)
    )
  );

create policy "attendance_records all via session"
  on public.attendance_records for all
  to authenticated
  using (
    public.owns_classroom(
      (select cs.classroom_id
       from public.class_sessions cs
       where cs.id = attendance_records.session_id)
    )
  )
  with check (
    public.owns_classroom(
      (select cs.classroom_id
       from public.class_sessions cs
       where cs.id = attendance_records.session_id)
    )
  );

-- teaching_modules -----------------------------------------------------------
-- Readable by any authenticated user (shared library); only the owner or an
-- admin may write.
create policy "teaching_modules select authenticated"
  on public.teaching_modules for select
  to authenticated
  using (true);

create policy "teaching_modules insert owner or admin"
  on public.teaching_modules for insert
  to authenticated
  with check (owner_id = auth.uid() or public.is_admin());

create policy "teaching_modules update owner or admin"
  on public.teaching_modules for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "teaching_modules delete owner or admin"
  on public.teaching_modules for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- Reporting view -------------------------------------------------------------
-- security_invoker so the caller's RLS still applies through the view.
create view public.v_class_roster
  with (security_invoker = true)
as
  select
    c.id as classroom_id,
    c.owner_id,
    c.course_name,
    c.course_code,
    s.id as student_id,
    s.student_no,
    s.last_name,
    s.first_name,
    s.middle_initial
  from public.classrooms c
  join public.students s on s.classroom_id = c.id;
