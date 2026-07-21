-- Complete the academic hierarchy and add teacher planning/usage data.
-- This migration intentionally backfills existing teacher data in one transaction.

create type public.class_modality as enum ('face_to_face', 'online', 'hybrid');
create type public.calendar_event_kind as enum ('event', 'holiday', 'note');
create type public.calendar_event_visibility as enum ('private', 'organization');

alter table public.academic_periods
  add column starts_on date,
  add column ends_on date,
  add constraint academic_periods_date_range_check
    check (ends_on is null or starts_on is null or ends_on >= starts_on);

-- Create a stable period for every existing classroom, including incomplete
-- metadata, then preserve the existing classroom UUID as the cohort UUID.
insert into public.academic_periods (owner_id, school_year, semester_name)
select distinct
  c.owner_id,
  coalesce(nullif(c.academic_year, ''), 'Imported school year'),
  coalesce(nullif(c.term_name, ''), 'Imported term')
from public.classrooms c
left join public.academic_periods p
  on p.owner_id = c.owner_id
  and p.school_year = coalesce(nullif(c.academic_year, ''), 'Imported school year')
  and p.semester_name = coalesce(nullif(c.term_name, ''), 'Imported term')
where p.id is null;

update public.classrooms c
set academic_period_id = p.id,
    cohort_name = coalesce(nullif(c.cohort_name, ''), nullif(c.block, ''), nullif(c.year, ''), c.course_code)
from public.academic_periods p
where c.academic_period_id is null
  and p.owner_id = c.owner_id
  and p.school_year = coalesce(nullif(c.academic_year, ''), 'Imported school year')
  and p.semester_name = coalesce(nullif(c.term_name, ''), 'Imported term');

insert into public.course_subjects (
  classroom_id, name, course_code, subject_code, description, kind, schedule, room, grading_template
)
select c.id, c.course_name, c.course_code, c.subject_code, c.description, 'other', c.schedule, c.room, c.grading_template
from public.classrooms c
left join public.course_subjects s on s.classroom_id = c.id and s.name = c.course_name
where s.id is null;

update public.grading_periods p
set course_subject_id = s.id
from public.classrooms c
join public.course_subjects s on s.classroom_id = c.id and s.name = c.course_name
where c.id = p.classroom_id and p.course_subject_id is null;

update public.class_sessions cs
set course_subject_id = s.id
from public.classrooms c
join public.course_subjects s on s.classroom_id = c.id and s.name = c.course_name
where c.id = cs.classroom_id and cs.course_subject_id is null;

alter table public.grade_components
  add column course_subject_id uuid references public.course_subjects(id) on delete cascade;
alter table public.activity_categories
  add column course_subject_id uuid references public.course_subjects(id) on delete cascade;

update public.grade_components gc
set course_subject_id = s.id
from public.classrooms c
join public.course_subjects s on s.classroom_id = c.id and s.name = c.course_name
where c.id = gc.classroom_id and gc.course_subject_id is null;

update public.activity_categories ac
set course_subject_id = coalesce(gp.course_subject_id, gc.course_subject_id)
from public.grading_periods gp
left join public.grade_components gc on gc.id = ac.grade_component_id
where gp.id = ac.grading_period_id
  and ac.course_subject_id is null;

update public.activity_categories ac
set course_subject_id = s.id
from public.classrooms c
join public.course_subjects s on s.classroom_id = c.id and s.name = c.course_name
where c.id = ac.classroom_id and ac.course_subject_id is null;

alter table public.grade_components alter column course_subject_id set not null;
alter table public.activity_categories alter column course_subject_id set not null;
alter table public.grading_periods alter column course_subject_id set not null;
alter table public.class_sessions alter column course_subject_id set not null;

alter table public.grade_components drop constraint if exists grade_components_classroom_id_name_key;
alter table public.grade_components add constraint grade_components_subject_name_key unique (course_subject_id, name);
create index grade_components_course_subject_id_idx on public.grade_components(course_subject_id);
create index activity_categories_course_subject_id_idx on public.activity_categories(course_subject_id);
alter table public.course_subjects add constraint course_subjects_id_classroom_key unique (id, classroom_id);
alter table public.grading_periods add constraint grading_periods_subject_classroom_fkey foreign key (course_subject_id, classroom_id) references public.course_subjects(id, classroom_id) on delete cascade;
alter table public.class_sessions add constraint class_sessions_subject_classroom_fkey foreign key (course_subject_id, classroom_id) references public.course_subjects(id, classroom_id) on delete cascade;
alter table public.grade_components add constraint grade_components_subject_classroom_fkey foreign key (course_subject_id, classroom_id) references public.course_subjects(id, classroom_id) on delete cascade;
alter table public.activity_categories add constraint activity_categories_subject_classroom_fkey foreign key (course_subject_id, classroom_id) references public.course_subjects(id, classroom_id) on delete cascade;

drop policy if exists "activity_categories all via matching classroom" on public.activity_categories;
create policy "activity categories via matching subject" on public.activity_categories for all to authenticated
  using (public.is_admin() or public.owns_classroom(classroom_id))
  with check (
    public.is_admin() or (
      public.owns_classroom(classroom_id)
      and (grading_period_id is null or course_subject_id = (select course_subject_id from public.grading_periods where id = grading_period_id))
      and (grade_component_id is null or course_subject_id = (select course_subject_id from public.grade_components where id = grade_component_id))
    )
  );

drop trigger if exists classrooms_default_grade_component on public.classrooms;
drop function if exists public.create_default_grade_component();
create function public.create_subject_default_grade_component()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.grade_components (classroom_id, course_subject_id, name, weight, position)
  values (new.classroom_id, new.id, 'Overall', 1, 0);
  return new;
end;
$$;
create trigger course_subjects_default_grade_component
  after insert on public.course_subjects
  for each row execute function public.create_subject_default_grade_component();

insert into public.course_subject_modules (course_subject_id, module_id)
select coalesce(gp.course_subject_id, legacy_subject.id), tm.id
from public.teaching_modules tm
left join public.grading_periods gp on gp.id = tm.grading_period_id
left join public.classrooms c on c.id = tm.classroom_id
left join public.course_subjects legacy_subject on legacy_subject.classroom_id = c.id and legacy_subject.name = c.course_name
join public.course_subjects target_subject on target_subject.id = coalesce(gp.course_subject_id, legacy_subject.id)
join public.classrooms target_classroom on target_classroom.id = target_subject.classroom_id
where target_subject.id is not null and tm.owner_id = target_classroom.owner_id
on conflict do nothing;

alter table public.classrooms drop constraint if exists classrooms_weights_sum_check;
alter table public.classrooms drop column lecture_weight;
alter table public.classrooms drop column laboratory_weight;

create table public.subject_meeting_slots (
  id uuid primary key default gen_random_uuid(),
  course_subject_id uuid not null references public.course_subjects(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  modality public.class_modality not null default 'face_to_face',
  location_label text not null default '',
  created_at timestamptz not null default now(),
  unique (course_subject_id, weekday, starts_at, ends_at)
);
create index subject_meeting_slots_subject_weekday_idx on public.subject_meeting_slots(course_subject_id, weekday, starts_at);
alter table public.subject_meeting_slots enable row level security;
create policy "subject meeting slots via subject" on public.subject_meeting_slots for all to authenticated
  using (public.is_admin() or public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id)))
  with check (public.is_admin() or public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id)));

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  academic_period_id uuid references public.academic_periods(id) on delete set null,
  classroom_id uuid references public.classrooms(id) on delete set null,
  course_subject_id uuid references public.course_subjects(id) on delete set null,
  kind public.calendar_event_kind not null default 'event',
  visibility public.calendar_event_visibility not null default 'private',
  title text not null,
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check ((kind = 'holiday') = (visibility = 'organization'))
);
create index calendar_events_owner_starts_idx on public.calendar_events(owner_id, starts_at);
create index calendar_events_visibility_starts_idx on public.calendar_events(visibility, starts_at);
alter table public.calendar_events enable row level security;
create policy "calendar events readable by owner or organization" on public.calendar_events for select to authenticated
  using (owner_id = auth.uid() or visibility = 'organization' or public.is_admin());
create policy "calendar events insert owner or admin holidays" on public.calendar_events for insert to authenticated
  with check (
    (owner_id = auth.uid() and visibility = 'private' and kind <> 'holiday'
      and (academic_period_id is null or exists (select 1 from public.academic_periods where id = academic_period_id and owner_id = auth.uid()))
      and (classroom_id is null or public.owns_classroom(classroom_id))
      and (course_subject_id is null or public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id))))
    or (public.is_admin() and (visibility = 'organization' or owner_id = auth.uid()))
  );
create policy "calendar events update owner or admin" on public.calendar_events for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (
    (owner_id = auth.uid() and visibility = 'private' and kind <> 'holiday'
      and (academic_period_id is null or exists (select 1 from public.academic_periods where id = academic_period_id and owner_id = auth.uid()))
      and (classroom_id is null or public.owns_classroom(classroom_id))
      and (course_subject_id is null or public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id))))
    or public.is_admin()
  );
create policy "calendar events delete owner or admin" on public.calendar_events for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create function public.module_storage_usage()
returns table (used_bytes bigint, quota_bytes bigint)
language sql stable security invoker set search_path = public, storage as $$
  select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0), 524288000::bigint
  from storage.objects o
  where o.bucket_id = 'teaching-modules'
    and (storage.foldername(o.name))[1] = auth.uid()::text;
$$;
revoke all on function public.module_storage_usage() from public, anon;
grant execute on function public.module_storage_usage() to authenticated;

-- The Storage schema itself remains service-owned. This policy helper only
-- reads object metadata and serializes quota checks per owner.
create function public.module_storage_quota_allows(p_name text, p_metadata jsonb, p_existing_name text default null)
returns boolean
language plpgsql security definer set search_path = public, storage as $$
declare
  target_owner text := (storage.foldername(p_name))[1];
  incoming_size bigint := coalesce((p_metadata ->> 'size')::bigint, 0);
  existing_size bigint := 0;
  used_size bigint := 0;
begin
  if auth.uid() is null or target_owner is null or (target_owner <> auth.uid()::text and not public.is_admin()) then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_owner, 0));
  if p_existing_name is not null then
    if (storage.foldername(p_existing_name))[1] <> target_owner then
      return false;
    end if;
    select coalesce((metadata ->> 'size')::bigint, 0) into existing_size
    from storage.objects where bucket_id = 'teaching-modules' and name = p_existing_name and (storage.foldername(name))[1] = target_owner;
  end if;
  select coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0) into used_size
  from storage.objects
  where bucket_id = 'teaching-modules' and (storage.foldername(name))[1] = target_owner;
  return used_size - existing_size + incoming_size <= 524288000;
end;
$$;
revoke all on function public.module_storage_quota_allows(text, jsonb, text) from public, anon;
grant execute on function public.module_storage_quota_allows(text, jsonb, text) to authenticated;

drop policy if exists "teaching modules insert own folder" on storage.objects;
create policy "teaching modules insert owner within quota" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'teaching-modules'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    and public.module_storage_quota_allows(name, metadata)
  );
drop policy if exists "teaching modules update own folder" on storage.objects;
create policy "teaching modules update owner within quota" on storage.objects for update to authenticated
  using (bucket_id = 'teaching-modules' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (
    bucket_id = 'teaching-modules'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
    and public.module_storage_quota_allows(name, metadata, name)
  );

revoke all on function public.adopt_legacy_classroom(uuid) from public, anon;
grant execute on function public.adopt_legacy_classroom(uuid) to authenticated;
