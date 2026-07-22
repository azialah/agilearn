-- Academic workspace hierarchy: school year/semester -> classroom cohort -> course subject.
-- Existing classroom-owned data stays valid while teachers adopt the hierarchy.

create type public.academic_period_status as enum ('active', 'archived');
create type public.course_subject_kind as enum ('lecture', 'laboratory', 'other');

create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  school_year text not null,
  semester_name text not null,
  status public.academic_period_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, school_year, semester_name)
);
create index academic_periods_owner_status_idx
  on public.academic_periods(owner_id, status, created_at desc);
alter table public.academic_periods enable row level security;
create policy "academic_periods owner or admin" on public.academic_periods for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

alter table public.classrooms
  add column academic_period_id uuid references public.academic_periods(id) on delete set null,
  add column cohort_name text not null default '';
create index classrooms_academic_period_id_idx on public.classrooms(academic_period_id);

drop policy if exists "classrooms all owner or admin" on public.classrooms;
create policy "classrooms all owner or admin" on public.classrooms for all to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (
    (owner_id = auth.uid() or public.is_admin())
    and (
      academic_period_id is null
      or owner_id = (select owner_id from public.academic_periods where id = academic_period_id)
      or public.is_admin()
    )
  );

create table public.course_subjects (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null,
  course_code text not null default '',
  subject_code text not null default '',
  description text not null default '',
  kind public.course_subject_kind not null default 'other',
  schedule text not null default '',
  room text not null default '',
  grading_template text not null default 'custom'
    check (grading_template in ('basic_education', 'senior_high', 'higher_education', 'custom')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (classroom_id, name)
);
create index course_subjects_classroom_id_idx on public.course_subjects(classroom_id, position);
alter table public.course_subjects enable row level security;
create policy "course_subjects via classroom" on public.course_subjects for all to authenticated
  using (public.is_admin() or public.owns_classroom(classroom_id))
  with check (public.is_admin() or public.owns_classroom(classroom_id));

-- New subject-aware records use these columns. Legacy classroom keys remain in
-- place until a teacher adopts a subject, preserving existing data and links.
alter table public.grading_periods
  add column course_subject_id uuid references public.course_subjects(id) on delete cascade;
alter table public.class_sessions
  add column course_subject_id uuid references public.course_subjects(id) on delete cascade;
create index grading_periods_course_subject_id_idx on public.grading_periods(course_subject_id);
create index class_sessions_course_subject_id_idx on public.class_sessions(course_subject_id);

create table public.course_subject_modules (
  course_subject_id uuid not null references public.course_subjects(id) on delete cascade,
  module_id uuid not null references public.teaching_modules(id) on delete cascade,
  imported_at timestamptz not null default now(),
  primary key (course_subject_id, module_id)
);
alter table public.course_subject_modules enable row level security;
create policy "course_subject_modules owner subject and module" on public.course_subject_modules for all to authenticated
  using (
    public.is_admin() or (
      public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id))
      and exists (select 1 from public.teaching_modules where id = module_id and owner_id = auth.uid())
    )
  )
  with check (
    public.is_admin() or (
      public.owns_classroom((select classroom_id from public.course_subjects where id = course_subject_id))
      and exists (select 1 from public.teaching_modules where id = module_id and owner_id = auth.uid())
    )
  );

alter table public.teaching_modules add column folder text not null default 'Library';
drop policy if exists "teaching_modules select authenticated" on public.teaching_modules;
create policy "teaching_modules select owner or admin" on public.teaching_modules for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
drop policy if exists "teaching modules readable by authenticated" on storage.objects;
create policy "teaching modules readable by owner or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'teaching-modules'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Client-invoked, security-invoker adoption keeps schema migrations data-free.
-- It creates the first period and subject for one classroom only when the
-- authenticated owner chooses to adopt it.
create function public.adopt_legacy_classroom(p_classroom_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  legacy_classroom public.classrooms;
  period_id uuid;
  subject_id uuid;
begin
  select * into legacy_classroom from public.classrooms where id = p_classroom_id;
  if legacy_classroom.id is null then
    raise exception 'Classroom not found';
  end if;
  if legacy_classroom.owner_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not allowed to adopt this classroom';
  end if;

  if legacy_classroom.academic_period_id is null then
    insert into public.academic_periods (owner_id, school_year, semester_name)
    values (
      legacy_classroom.owner_id,
      coalesce(nullif(legacy_classroom.academic_year, ''), 'Imported school year'),
      coalesce(nullif(legacy_classroom.term_name, ''), 'Imported term')
    )
    on conflict (owner_id, school_year, semester_name) do update set updated_at = now()
    returning id into period_id;

    update public.classrooms
    set academic_period_id = period_id,
        cohort_name = coalesce(nullif(block, ''), nullif(year, ''), course_code)
    where id = p_classroom_id;
  end if;

  insert into public.course_subjects (
    classroom_id, name, course_code, subject_code, description, kind, schedule, room, grading_template
  )
  values (
    p_classroom_id, legacy_classroom.course_name, legacy_classroom.course_code,
    legacy_classroom.subject_code, legacy_classroom.description, 'other',
    legacy_classroom.schedule, legacy_classroom.room, legacy_classroom.grading_template
  )
  on conflict (classroom_id, name) do update set updated_at = now()
  returning id into subject_id;

  update public.grading_periods set course_subject_id = subject_id
    where classroom_id = p_classroom_id and course_subject_id is null;
  update public.class_sessions set course_subject_id = subject_id
    where classroom_id = p_classroom_id and course_subject_id is null;

  return subject_id;
end;
$$;
revoke all on function public.adopt_legacy_classroom(uuid) from public, anon;
grant execute on function public.adopt_legacy_classroom(uuid) to authenticated;
