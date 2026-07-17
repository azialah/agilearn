-- 0001_profiles_roles.sql
-- Roles, the profiles table, authorization helper functions, and the triggers
-- that keep profiles in sync with auth.users and guard role changes.

-- owns_classroom() below references public.classrooms, which is created in
-- 0002. Defer SQL-function body validation so this forward reference is allowed;
-- the table exists by the time any policy actually calls the function.
set check_function_bodies = off;

create type public.app_role as enum ('admin', 'teacher');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'teacher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for every auth user, including their role.';

-- Authorization helpers ------------------------------------------------------
-- SECURITY DEFINER so RLS policies can call them without recursing into the
-- policies of the tables they read. search_path pinned to public for safety.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the current user has the admin role. Used by RLS policies.';

create or replace function public.owns_classroom(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classrooms c
    where c.id = cid
      and c.owner_id = auth.uid()
  ) or public.is_admin();
$$;

comment on function public.owns_classroom(uuid) is
  'True when the current user owns the classroom (or is an admin).';

-- Keep profiles in sync with auth.users --------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Prevent non-admins from changing their own role ----------------------------

create or replace function public.enforce_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators may change a user role';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row
  execute function public.enforce_role_change();
