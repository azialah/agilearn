-- 0026_subject_kind_level_rule.sql
-- Only college subjects split into lecture and laboratory. Elementary, junior
-- and senior high subjects are single-session, and preschool likewise.
--
-- The rule spans two tables (course_subjects.kind vs classrooms.school_level),
-- so a CHECK cannot express it. Triggers can, and unlike a constraint they are
-- forward-only: legacy rows are left alone until someone edits them, which
-- matters because pre-0026 data may already hold a lecture kind on a non-college
-- classroom.

create or replace function public.course_subject_kind_matches_level()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare level public.teaching_level;
begin
  if new.kind = 'other' then
    return new;
  end if;

  select school_level into level from public.classrooms where id = new.classroom_id;

  -- NULL level is legacy data; treat it as not-college rather than assuming.
  if level is distinct from 'college' then
    raise exception
      'Lecture and laboratory subjects are only available for college classrooms'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.course_subject_kind_matches_level() from public, anon;

create trigger course_subjects_kind_matches_level
  before insert or update of kind, classroom_id
  on public.course_subjects
  for each row execute function public.course_subject_kind_matches_level();

-- The other direction: demoting a college classroom would otherwise strand its
-- lecture/laboratory subjects in a state the rule forbids.
create or replace function public.classroom_level_allows_kinds()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.school_level is distinct from 'college'
    and exists (
      select 1 from public.course_subjects
      where classroom_id = new.id and kind <> 'other'
    )
  then
    raise exception
      'Set this classroom''s lecture and laboratory subjects to Other before changing its level'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.classroom_level_allows_kinds() from public, anon;

create trigger classrooms_level_allows_kinds
  before update of school_level
  on public.classrooms
  for each row
  when (new.school_level is distinct from old.school_level)
  execute function public.classroom_level_allows_kinds();
