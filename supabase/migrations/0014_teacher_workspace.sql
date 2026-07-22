-- Teacher workspace metadata. Existing classrooms, grades, and storage rows remain valid.

alter table public.classrooms
  add column subject_code text not null default '',
  add column description text not null default '',
  add column school_level public.teaching_level,
  add column academic_year text not null default '',
  add column term_name text not null default '',
  add column schedule text not null default '',
  add column room text not null default '',
  add column grading_template text not null default 'custom'
    check (grading_template in ('basic_education', 'senior_high', 'higher_education', 'custom'));

alter table public.students
  add column student_email text,
  add column guardian_email text,
  add constraint students_student_email_format_check
    check (student_email is null or student_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  add constraint students_guardian_email_format_check
    check (guardian_email is null or guardian_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

alter type public.module_kind add value if not exists 'syllabus';
alter type public.module_kind add value if not exists 'teaching_material';

alter table public.teaching_modules
  add column tags text[] not null default '{}',
  add column grading_period_id uuid references public.grading_periods(id) on delete set null;

create index teaching_modules_grading_period_id_idx
  on public.teaching_modules (grading_period_id);

-- A period tag must remain inside a classroom the module writer may manage.
drop policy if exists "teaching_modules insert owner or admin" on public.teaching_modules;
create policy "teaching_modules insert owner or admin" on public.teaching_modules for insert to authenticated
  with check ((owner_id = auth.uid() or public.is_admin()) and (grading_period_id is null or public.owns_classroom((select classroom_id from public.grading_periods where id = grading_period_id))));
drop policy if exists "teaching_modules update owner or admin" on public.teaching_modules;
create policy "teaching_modules update owner or admin" on public.teaching_modules for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check ((owner_id = auth.uid() or public.is_admin()) and (grading_period_id is null or public.owns_classroom((select classroom_id from public.grading_periods where id = grading_period_id))));

-- Preserve relational tenant integrity for pre-existing grade tables.
drop policy if exists "activities all via grading period" on public.activities;
create policy "activities all via matching classroom" on public.activities for all to authenticated
  using (public.is_admin() or (public.owns_classroom((select classroom_id from public.grading_periods where id = grading_period_id)) and (select classroom_id from public.activity_categories where id = category_id) = (select classroom_id from public.grading_periods where id = grading_period_id)))
  with check (public.owns_classroom((select classroom_id from public.grading_periods where id = grading_period_id)) and (select classroom_id from public.activity_categories where id = category_id) = (select classroom_id from public.grading_periods where id = grading_period_id));
drop policy if exists "scores all via student" on public.scores;
create policy "scores all via matching classroom" on public.scores for all to authenticated
  using (public.is_admin() or (public.owns_classroom((select classroom_id from public.students where id = student_id)) and (select classroom_id from public.students where id = student_id) = (select gp.classroom_id from public.activities a join public.grading_periods gp on gp.id = a.grading_period_id where a.id = activity_id)))
  with check (public.owns_classroom((select classroom_id from public.students where id = student_id)) and (select classroom_id from public.students where id = student_id) = (select gp.classroom_id from public.activities a join public.grading_periods gp on gp.id = a.grading_period_id where a.id = activity_id));

comment on column public.students.student_email is 'Optional learner email used only for teacher-initiated private grade composition.';
comment on column public.students.guardian_email is 'Optional guardian email used only for teacher-initiated private grade composition.';
