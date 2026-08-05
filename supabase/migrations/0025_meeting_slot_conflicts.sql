-- 0025_meeting_slot_conflicts.sql
-- A teacher cannot be in two places at once. Until now nothing enforced that:
-- subject_meeting_slots only had an exact-duplicate unique key, so a lecture
-- and its own laboratory could sit on top of each other, as could two sections.
--
-- EXCLUDE cannot join to another table, and the conflict scope is the teacher,
-- not the subject. So the owner is denormalized onto the row by a trigger and
-- the constraint keys on that. A lookup trigger would have needed an advisory
-- lock to be race-safe; a GiST index is race-safe for free.
--
-- PRE-FLIGHT: run 0025_preflight_overlaps.sql first. Existing overlaps abort
-- this migration (EXCLUDE has no NOT VALID), so they are quarantined below
-- rather than deleted.

-- Supabase keeps extensions out of public. The EXCLUDE below needs btree_gist's
-- operator classes for uuid and smallint resolvable at DDL time, so the search
-- path is widened for this transaction.
create extension if not exists btree_gist with schema extensions;
set local search_path = public, extensions;

-- Owner, derived ---------------------------------------------------------

alter table public.subject_meeting_slots
  add column owner_id uuid references public.profiles (id) on delete cascade;

update public.subject_meeting_slots m
set owner_id = c.owner_id
from public.course_subjects s
join public.classrooms c on c.id = s.classroom_id
where s.id = m.course_subject_id;

alter table public.subject_meeting_slots alter column owner_id set not null;

create index subject_meeting_slots_owner_weekday_idx
  on public.subject_meeting_slots (owner_id, weekday, starts_at);

comment on column public.subject_meeting_slots.owner_id is
  'Derived from the owning classroom by trigger so the overlap EXCLUDE can key on it. Never trusted from the client.';

-- A client-supplied owner_id is always overwritten.
create or replace function public.set_meeting_slot_owner()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  select c.owner_id into new.owner_id
  from public.course_subjects s
  join public.classrooms c on c.id = s.classroom_id
  where s.id = new.course_subject_id;

  if new.owner_id is null then
    raise exception 'Meeting slot has no owning classroom'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function public.set_meeting_slot_owner() from public, anon;

create trigger subject_meeting_slots_set_owner
  before insert or update of course_subject_id
  on public.subject_meeting_slots
  for each row execute function public.set_meeting_slot_owner();

-- Quarantine for pre-existing overlaps -----------------------------------
-- Losing rows are archived, never dropped: a teacher's timetable is data they
-- entered, and silently deleting it to satisfy a new constraint is not a fix.

create table public.subject_meeting_slot_conflicts (
  like public.subject_meeting_slots including defaults,
  archived_at timestamptz not null default now(),
  primary key (id)
);

alter table public.subject_meeting_slot_conflicts enable row level security;

create policy "archived slots owner or admin"
  on public.subject_meeting_slot_conflicts for all
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Keep the earliest slot in each overlapping run; archive the rest. Repeats
-- until stable, so a teacher with three mutually overlapping slots resolves to
-- one kept row rather than needing several passes by hand.
do $$
declare moved int;
begin
  loop
    with ordered as (
      select id, owner_id, weekday, starts_at, ends_at,
             lag(ends_at) over (
               partition by owner_id, weekday
               order by starts_at, created_at, id
             ) as previous_end
      from public.subject_meeting_slots
    ),
    losers as (
      select id from ordered where previous_end is not null and previous_end > starts_at
    ),
    archived as (
      insert into public.subject_meeting_slot_conflicts
      select s.*, now() from public.subject_meeting_slots s
      join losers l on l.id = s.id
      returning 1
    )
    delete from public.subject_meeting_slots s
    using losers l where l.id = s.id;

    get diagnostics moved = row_count;
    exit when moved = 0;
  end loop;
end;
$$;

-- The rule ---------------------------------------------------------------
-- tsrange defaults to [), so a class ending at 11:00 and one starting at 11:00
-- do not conflict. src/features/teacher/calendar/calendar.ts uses strict `<`
-- for the same reason — the two must agree or the UI promises what the DB
-- rejects. The anchor date is arbitrary; weekday equality carries the day.

alter table public.subject_meeting_slots
  add constraint subject_meeting_slots_no_teacher_overlap
  exclude using gist (
    owner_id with =,
    weekday with =,
    tsrange(date '2000-01-01' + starts_at, date '2000-01-01' + ends_at) with &&
  );

-- Any exact duplicate is also an overlap, so the old tuple unique is dead.
-- Its name was auto-generated and would have been 69 characters, past the 63
-- identifier limit, so Postgres truncated it in a way that is not worth
-- guessing — look it up instead of hard-coding it.
do $$
declare tuple_unique text;
begin
  select conname into tuple_unique
  from pg_constraint
  where conrelid = 'public.subject_meeting_slots'::regclass
    and contype = 'u'
    and conkey @> array[
      (select attnum from pg_attribute
        where attrelid = conrelid and attname = 'course_subject_id')
    ]::smallint[];

  if tuple_unique is not null then
    execute format(
      'alter table public.subject_meeting_slots drop constraint %I', tuple_unique
    );
  end if;
end;
$$;

-- RLS ---------------------------------------------------------------------
-- owner_id is trigger-derived before WITH CHECK runs, so it cannot be spoofed
-- and the old subselect through course_subjects is redundant.

drop policy "subject meeting slots via subject" on public.subject_meeting_slots;

create policy "subject meeting slots owner or admin"
  on public.subject_meeting_slots for all
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
