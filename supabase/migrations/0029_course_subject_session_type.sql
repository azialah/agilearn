-- 0029_course_subject_session_type.sql
-- College majors are taught as a lecture plus a laboratory; minors are a single
-- session. Until now that distinction only existed in the teacher's head and in
-- whatever they typed into the subject name — real rows read
-- "CS Elective 1 — Website Application Development (Laboratory)".
--
-- session_type states it, kind stays the half-of-a-pair marker, and a CHECK
-- keeps the two from ever disagreeing.

create type public.course_subject_session as enum ('single', 'lecture_lab');

alter table public.course_subjects
  add column session_type public.course_subject_session not null default 'single';

comment on column public.course_subjects.session_type is
  'single = one session (a minor, or any non-college subject); lecture_lab = one half of a major offered as lecture + laboratory.';

-- Anything already marked lecture or laboratory is half of a major.
update public.course_subjects
set session_type = 'lecture_lab'
where kind <> 'other';

-- A lecture and its laboratory share one title, so the old key would reject the
-- cleanup below. Widen it to include kind: one lecture and one lab may share a
-- name, two lectures may not. The old name was auto-generated, so it is looked
-- up rather than guessed.
do $$
declare name_unique text;
begin
  select conname into name_unique
  from pg_constraint
  where conrelid = 'public.course_subjects'::regclass
    and contype = 'u'
    and conkey = array[
      (select attnum from pg_attribute
        where attrelid = conrelid and attname = 'classroom_id'),
      (select attnum from pg_attribute
        where attrelid = conrelid and attname = 'name')
    ]::smallint[];

  if name_unique is not null then
    execute format(
      'alter table public.course_subjects drop constraint %I', name_unique
    );
  end if;
end;
$$;

alter table public.course_subjects
  add constraint course_subjects_classroom_name_kind_key
  unique (classroom_id, name, kind);

-- The type now shows as a badge next to the title, so the suffix teachers typed
-- into the name is duplicated. Strip a trailing "(Lecture)" / "(Laboratory)" /
-- "(Lab)" — with any dash before it — only where kind already says the same
-- thing, so a subject genuinely called "... (Lab)" for another reason is left
-- alone. One-way: the previous text is not kept.
update public.course_subjects
set name = trim(
      regexp_replace(name, '\s*[-–—]?\s*\((lecture|laboratory|lab)\)\s*$', '', 'i')
    )
where kind <> 'other'
  and name ~* '\((lecture|laboratory|lab)\)\s*$'
  and trim(regexp_replace(name, '\s*[-–—]?\s*\((lecture|laboratory|lab)\)\s*$', '', 'i')) <> '';

-- The two columns describe the same fact and must agree. Non-college classrooms
-- are covered for free: 0026 already forbids kind <> 'other' there, so they can
-- only ever be 'single'.
alter table public.course_subjects
  add constraint course_subjects_session_matches_kind
  check (
    (session_type = 'single' and kind = 'other')
    or (session_type = 'lecture_lab' and kind in ('lecture', 'laboratory'))
  );
