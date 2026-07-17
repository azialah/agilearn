-- 0003_grade_sheets.sql
-- Grading periods, activity categories, activities, and per-student scores.

create type public.grade_component as enum ('lecture', 'laboratory');

create table public.grading_periods (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  name text not null,
  weight numeric(5, 4) not null default 1.0,
  position int not null default 0,
  constraint grading_periods_classroom_name_key unique (classroom_id, name)
);

create index grading_periods_classroom_id_idx
  on public.grading_periods (classroom_id);

create table public.activity_categories (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  component public.grade_component not null,
  name text not null,
  weight numeric(5, 4) not null,
  constraint activity_categories_classroom_component_name_key
    unique (classroom_id, component, name)
);

create index activity_categories_classroom_id_idx
  on public.activity_categories (classroom_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  grading_period_id uuid not null
    references public.grading_periods (id) on delete cascade,
  category_id uuid not null
    references public.activity_categories (id) on delete restrict,
  name text not null,
  max_score numeric(7, 2) not null check (max_score > 0),
  date date,
  position int not null default 0
);

create index activities_grading_period_id_idx
  on public.activities (grading_period_id);
create index activities_category_id_idx on public.activities (category_id);

create table public.scores (
  activity_id uuid not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  score numeric(7, 2) check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (activity_id, student_id)
);

create index scores_student_id_idx on public.scores (student_id);
