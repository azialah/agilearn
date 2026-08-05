-- 0027_classroom_subject_mirror.sql
-- classrooms.course_name / course_code duplicate the classroom's primary course
-- subject. Both were written by the client on create, but only the classrooms
-- copy was written on edit, so the two drifted apart on the first rename.
--
-- Twenty-odd read sites use the classrooms copy (dashboard, breadcrumbs,
-- command palette, exports, the modules embedded select), so rewriting them all
-- to join buys nothing. Instead there is now exactly one writer: this trigger.
-- The columns become a read-only mirror.

-- The client no longer sends these on insert, so they need a default. A new
-- classroom holds '' for the moment between its own insert and its first
-- subject's insert, which the trigger below then fills.
alter table public.classrooms
  alter column course_name set default '',
  alter column course_code set default '';

create or replace function public.sync_classroom_subject_mirror()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target uuid := coalesce(new.classroom_id, old.classroom_id);
  primary_name text;
  primary_code text;
begin
  -- Primary subject = lowest position, oldest as the tie-break.
  select name, course_code into primary_name, primary_code
  from public.course_subjects
  where classroom_id = target
  order by position, created_at, id
  limit 1;

  update public.classrooms
  set course_name = coalesce(primary_name, course_name),
      course_code = coalesce(primary_code, course_code),
      updated_at = now()
  where id = target;

  return null;
end;
$$;

revoke all on function public.sync_classroom_subject_mirror() from public, anon;

-- Re-runnable: the first push of this file failed partway through, and a
-- rolled-back transaction is easier to trust when the DDL is idempotent.
drop trigger if exists course_subjects_mirror_to_classroom on public.course_subjects;

create trigger course_subjects_mirror_to_classroom
  after insert or delete or update of name, course_code, position, classroom_id
  on public.course_subjects
  for each row execute function public.sync_classroom_subject_mirror();

comment on column public.classrooms.course_name is
  'Read-only mirror of the primary course_subject name, maintained by trigger. Do not write from the client.';
comment on column public.classrooms.course_code is
  'Read-only mirror of the primary course_subject course_code, maintained by trigger. Do not write from the client.';

-- Reconcile the rows that already drifted.
-- Correlated subqueries, not a LATERAL join: UPDATE ... FROM cannot reference
-- the update target's own alias, which is what 42P10 was complaining about.
update public.classrooms c
set course_name = coalesce(
      (
        select s.name from public.course_subjects s
        where s.classroom_id = c.id
        order by s.position, s.created_at, s.id
        limit 1
      ),
      c.course_name
    ),
    course_code = coalesce(
      (
        select s.course_code from public.course_subjects s
        where s.classroom_id = c.id
        order by s.position, s.created_at, s.id
        limit 1
      ),
      c.course_code
    )
where exists (
  select 1 from public.course_subjects s where s.classroom_id = c.id
);
