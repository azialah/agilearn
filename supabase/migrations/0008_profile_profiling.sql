-- 0008_profile_profiling.sql
-- Optional profiling captured during onboarding (school, location, and the
-- levels a teacher handles). All nullable and skippable — collected to learn
-- about users, never used for access control.

create type public.teaching_level as enum (
  'preschool',
  'elementary',
  'high_school',
  'college'
);

alter table public.profiles
  add column school text,
  add column location text,
  add column teaching_levels public.teaching_level[];

comment on column public.profiles.school is 'School the teacher works at (onboarding).';
comment on column public.profiles.location is 'Free-text location (onboarding).';
comment on column public.profiles.teaching_levels is 'Levels the teacher handles (onboarding).';

-- No new RLS: the existing "profiles update own or admin" policy already covers
-- these columns, and a teacher only ever patches their own row.
