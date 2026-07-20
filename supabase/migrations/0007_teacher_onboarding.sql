-- 0007_teacher_onboarding.sql
-- Teacher self-onboarding: structured name fields on profiles, an email-domain
-- allowlist that gates public sign-up, and a domain guard baked into the
-- new-user trigger. There is no admin self-signup; admins are provisioned
-- out-of-band, but note the domain guard fires on EVERY auth.users insert, so
-- an admin's email domain must also be in allowed_email_domains (in practice the
-- school shares one domain across teachers and admins).

-- Structured name parts on profiles -----------------------------------------
-- full_name stays the display/sort column; the wizard composes it from these
-- parts in one UPDATE after email verification.
alter table public.profiles
  add column first_name text not null default '',
  add column last_name text not null default '',
  add column middle_name text,
  add column suffix text;

comment on column public.profiles.first_name is 'Given name (collected during onboarding).';
comment on column public.profiles.last_name is 'Family name (collected during onboarding).';
comment on column public.profiles.middle_name is 'Optional middle name.';
comment on column public.profiles.suffix is 'Optional name suffix (Jr., III, ...).';

-- Email-domain allowlist -----------------------------------------------------
-- Only emails whose domain is listed here may complete sign-up. Stored
-- lowercase, without the leading '@'.
create table public.allowed_email_domains (
  domain text primary key,
  created_at timestamptz not null default now()
);

comment on table public.allowed_email_domains is
  'Approved email domains for teacher self-sign-up. Enforced by handle_new_user().';

alter table public.allowed_email_domains enable row level security;

-- Admins manage the list.
create policy "allowed_email_domains admin all"
  on public.allowed_email_domains for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Readable by anyone (incl. anon) so the signup screen can pre-validate the
-- email domain before calling signUp(). The list is not sensitive.
create policy "allowed_email_domains readable"
  on public.allowed_email_domains for select
  to anon, authenticated
  using (true);

-- Gate new sign-ups by domain ------------------------------------------------
-- Replaces the 0001 version: same profile bootstrap, plus a domain check.
-- Raising here rolls back the auth.users insert, so signUp() returns the error.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_email_domains d
    where d.domain = lower(split_part(new.email, '@', 2))
  ) then
    raise exception 'Email domain not allowed';
  end if;

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
