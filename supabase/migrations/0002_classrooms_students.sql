-- 0002_classrooms_students.sql
-- Classrooms (owned by a teacher) and their student rosters.

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  course_name text not null,
  course_code text not null,
  year text not null default '',
  block text not null default '',
  lecture_weight numeric(4, 3) not null default 0.400,
  laboratory_weight numeric(4, 3) not null default 0.600,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classrooms_weights_sum_check
    check (lecture_weight + laboratory_weight = 1.000)
);

create index classrooms_owner_id_idx on public.classrooms (owner_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  student_no text not null,
  last_name text not null,
  first_name text not null,
  middle_initial text not null default '',
  created_at timestamptz not null default now(),
  constraint students_classroom_student_no_key unique (classroom_id, student_no)
);

create index students_classroom_id_idx on public.students (classroom_id);
