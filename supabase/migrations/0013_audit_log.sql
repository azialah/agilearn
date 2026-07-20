-- 0013_audit_log.sql
-- Admin audit log: who changed what, and when. Populated entirely by
-- SECURITY DEFINER triggers (never by direct client writes — see the RLS
-- note below), so it reflects real data-layer activity regardless of which
-- feature UI triggered it.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is
  'Append-only record of admin-relevant data changes, written by SECURITY DEFINER triggers only.';
comment on column public.audit_log.actor_id is 'auth.uid() of the user who made the change.';
comment on column public.audit_log.action is
  'Short machine-readable label, e.g. role_change, classrooms_insert, scores_update.';
comment on column public.audit_log.target_table is 'Table the change was made on.';
comment on column public.audit_log.target_id is 'Primary key (or best-available id) of the affected row.';
comment on column public.audit_log.detail is 'Optional extra context, e.g. old/new values.';

create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- RLS -------------------------------------------------------------------
-- Admin-only SELECT. There is deliberately no insert/update/delete policy:
-- all writes come from SECURITY DEFINER trigger functions below, which
-- bypass RLS entirely. With no client-write policy, teachers (and admins,
-- from the client) get zero rows on direct writes — the trigger path is the
-- only way rows land here.
alter table public.audit_log enable row level security;

create policy "audit_log admin select"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());

-- Trigger: role changes on profiles --------------------------------------

create or replace function public.log_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (
    auth.uid(),
    'role_change',
    'profiles',
    new.id,
    jsonb_build_object('old', old.role, 'new', new.role)
  );

  return new;
end;
$$;

comment on function public.log_role_change() is
  'Records profiles.role changes into audit_log. Fires only when role actually changes.';

create trigger audit_role_change
  after update on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.log_role_change();

-- Trigger: generic insert/update/delete for tables with a uuid id PK ------
-- Used by classrooms and students, both of which have a plain `id` column.

create or replace function public.log_data_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (
    v_actor,
    TG_TABLE_NAME || '_' || lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    null
  );

  return coalesce(new, old);
end;
$$;

comment on function public.log_data_change() is
  'Generic audit trigger for tables with a uuid id primary key (classrooms, students).';

create trigger audit_classrooms_change
  after insert or update or delete on public.classrooms
  for each row
  execute function public.log_data_change();

create trigger audit_students_change
  after insert or update or delete on public.students
  for each row
  execute function public.log_data_change();

-- Trigger: scores ----------------------------------------------------------
-- scores has no uuid `id` column (its primary key is the composite
-- (activity_id, student_id) — see 0003_grade_sheets.sql), so it cannot use
-- log_data_change() above: `new.id` / `old.id` would fail at runtime with
-- "record has no field id". target_id uses activity_id instead, and the
-- student_id is carried in detail.

create or replace function public.log_score_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (
    v_actor,
    'scores_' || lower(TG_OP),
    'scores',
    coalesce(new.activity_id, old.activity_id),
    jsonb_build_object('student_id', coalesce(new.student_id, old.student_id))
  );

  return coalesce(new, old);
end;
$$;

comment on function public.log_score_change() is
  'Audit trigger for scores, whose primary key is composite (activity_id, student_id).';

create trigger audit_scores_change
  after insert or update or delete on public.scores
  for each row
  execute function public.log_score_change();
