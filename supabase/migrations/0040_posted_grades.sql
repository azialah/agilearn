-- 0040_posted_grades.sql
-- Posted grades: finished Lecture / Laboratory / term grades a teacher imports
-- from their own sheet, so they can be presented in the slideshow and emailed
-- to each student.
--
--   classrooms.student_email_domain   domain appended to students.student_no to
--                                     build a student's school address
--                                     (202110190 + gordoncollege.edu.ph).
--   classrooms.grade_email_cc/_bcc    copy recipients added to every grade
--                                     email (e.g. the teacher's school email).
--   posted_grades                     one row per subject, student and term.
--                                     Stored exactly as imported; they never
--                                     feed public.scores or the grade engine.
--   grade_email_log                   append-only record of every grade email
--                                     the send-grade-emails function attempted.

alter table public.classrooms
  add column student_email_domain text
    check (student_email_domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'),
  add column grade_email_cc text[] not null default '{}'
    check (cardinality(grade_email_cc) <= 3),
  add column grade_email_bcc text[] not null default '{}'
    check (cardinality(grade_email_bcc) <= 3);

comment on column public.classrooms.student_email_domain is
  'Lowercase domain without @ appended to students.student_no for grade emails, e.g. gordoncollege.edu.ph. Null until the teacher sets it.';
comment on column public.classrooms.grade_email_cc is
  'Up to 3 addresses CC''d on every grade email for this classroom.';
comment on column public.classrooms.grade_email_bcc is
  'Up to 3 addresses BCC''d on every grade email for this classroom.';

-- Lets posted_grades / grade_email_log pin a student to the row's classroom with
-- a composite FK, the same way they pin the subject. A plain FK on students(id)
-- would let a teacher reference another classroom's student (FK checks ignore
-- RLS).
alter table public.students
  add constraint students_id_classroom_key unique (id, classroom_id);

create table public.posted_grades (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_subject_id uuid not null,
  student_id uuid not null,
  term text not null default 'Midterm' check (length(trim(term)) > 0),
  lecture numeric(5,2) check (lecture between 0 and 100),
  laboratory numeric(5,2) check (laboratory between 0 and 100),
  term_grade numeric(5,2) check (term_grade between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same composite FK the other subject-scoped tables use (0017), so a posted
  -- grade can never point at a subject from a different classroom.
  constraint posted_grades_subject_classroom_fkey
    foreign key (course_subject_id, classroom_id)
    references public.course_subjects(id, classroom_id) on delete cascade,
  constraint posted_grades_student_classroom_fkey
    foreign key (student_id, classroom_id)
    references public.students(id, classroom_id) on delete cascade,
  constraint posted_grades_subject_student_term_key
    unique (course_subject_id, student_id, term)
);
create index posted_grades_classroom_id_idx on public.posted_grades (classroom_id);
create index posted_grades_student_id_idx on public.posted_grades (student_id);

comment on table public.posted_grades is
  'Finished grades imported from a teacher''s sheet (Lecture, Laboratory, term grade). Presented and emailed as-is; never recomputed.';

create trigger posted_grades_touch_updated_at
  before update on public.posted_grades
  for each row execute function public.touch_grade_sheet_config_updated_at();

create table public.grade_email_log (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_subject_id uuid not null,
  student_id uuid not null,
  term text not null,
  recipient text not null,
  status text not null check (status in ('sent', 'failed')),
  error text,
  resend_id text,
  sent_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint grade_email_log_subject_classroom_fkey
    foreign key (course_subject_id, classroom_id)
    references public.course_subjects(id, classroom_id) on delete cascade,
  constraint grade_email_log_student_classroom_fkey
    foreign key (student_id, classroom_id)
    references public.students(id, classroom_id) on delete cascade
);
create index grade_email_log_subject_term_idx
  on public.grade_email_log (course_subject_id, term);
create index grade_email_log_classroom_id_idx on public.grade_email_log (classroom_id);
create index grade_email_log_student_id_idx on public.grade_email_log (student_id);

alter table public.posted_grades enable row level security;
alter table public.grade_email_log enable row level security;

-- Teachers reach posted grades only through a classroom they own.
create policy "posted_grades_owner_rw" on public.posted_grades
  for all to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "posted_grades_admin_all" on public.posted_grades
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The send log is append-only for owners: read and insert, never rewrite. It is
-- written by send-grade-emails running as the teacher, so a teacher could also
-- insert rows by hand; treat it as the teacher's own history and send quota, not
-- as a tamper-proof audit trail.
create policy "grade_email_log_owner_select" on public.grade_email_log
  for select to authenticated
  using (public.owns_classroom(classroom_id));

create policy "grade_email_log_owner_insert" on public.grade_email_log
  for insert to authenticated
  with check (public.owns_classroom(classroom_id) and sent_by = auth.uid());

create policy "grade_email_log_admin_all" on public.grade_email_log
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
