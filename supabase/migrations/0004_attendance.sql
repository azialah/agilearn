-- 0004_attendance.sql
-- Class sessions and per-student attendance records.

create type public.attendance_status as enum (
  'present',
  'absent',
  'late',
  'excused'
);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms (id) on delete cascade,
  session_date date not null,
  title text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint class_sessions_classroom_date_title_key
    unique (classroom_id, session_date, title)
);

create index class_sessions_classroom_id_idx
  on public.class_sessions (classroom_id);

create table public.attendance_records (
  session_id uuid not null
    references public.class_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.attendance_status not null default 'present',
  remarks text not null default '',
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create index attendance_records_student_id_idx
  on public.attendance_records (student_id);
