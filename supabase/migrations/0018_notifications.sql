-- Persisted, recipient-owned in-app notification incidents.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('low_average', 'absence_streak')),
  student_id uuid not null references public.students(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_subject_id uuid references public.course_subjects(id) on delete cascade,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null and resolved_at is null;

create unique index notifications_active_dedupe_key_idx
  on public.notifications (dedupe_key)
  where resolved_at is null;

alter table public.notifications enable row level security;

create policy "notifications select own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy "notifications update own"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Grade and streak calculations stay in the React client. This function only
-- validates access and transitions a deduplicated incident row.
create function public.reconcile_notification_incident(
  p_type text,
  p_classroom_id uuid,
  p_student_id uuid,
  p_course_subject_id uuid,
  p_active boolean,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_dedupe_key text;
  v_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_type not in ('low_average', 'absence_streak') then
    raise exception 'Unsupported notification type';
  end if;

  -- Attendance incidents are intentionally classroom-level. Do not allow a
  -- caller to partition them by subject and bypass the active-incident dedupe.
  if p_type = 'absence_streak' then
    p_course_subject_id := null;
  end if;

  select owner_id into v_recipient_id
  from public.classrooms
  where id = p_classroom_id;

  if v_recipient_id is null then
    raise exception 'Classroom not found';
  end if;

  if not public.owns_classroom(p_classroom_id) and not public.is_admin() then
    raise exception 'Not authorized for this classroom';
  end if;

  if not exists (
    select 1 from public.students
    where id = p_student_id and classroom_id = p_classroom_id
  ) then
    raise exception 'Student does not belong to classroom';
  end if;

  if p_course_subject_id is not null and not exists (
    select 1 from public.course_subjects
    where id = p_course_subject_id and classroom_id = p_classroom_id
  ) then
    raise exception 'Course subject does not belong to classroom';
  end if;

  v_dedupe_key := concat_ws(
    ':',
    p_type,
    p_classroom_id::text,
    coalesce(p_course_subject_id::text, 'classroom'),
    p_student_id::text
  );

  if not p_active then
    update public.notifications
    set resolved_at = now(), updated_at = now()
    where dedupe_key = v_dedupe_key and resolved_at is null;
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    type,
    student_id,
    classroom_id,
    course_subject_id,
    dedupe_key,
    payload
  )
  values (
    v_recipient_id,
    p_type,
    p_student_id,
    p_classroom_id,
    p_course_subject_id,
    v_dedupe_key,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (dedupe_key) where resolved_at is null
  do update set payload = excluded.payload, updated_at = now()
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.reconcile_notification_incident(text, uuid, uuid, uuid, boolean, jsonb) from public, anon;
grant execute on function public.reconcile_notification_incident(text, uuid, uuid, uuid, boolean, jsonb) to authenticated;
