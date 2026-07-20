-- 0011_admin_bootstrap.sql
-- Seeds the real teacher domain (gordoncollege.edu.ph, missing from every
-- prior migration) and special-cases exactly one literal admin email so it
-- self-provisions as admin, bypassing the domain-allowlist gate. Every other
-- email still goes through the existing gate in handle_new_user() and lands
-- with the profiles.role column default ('teacher'). Replaces 0007's
-- handle_new_user(); the on_auth_user_created trigger (0001) already points
-- at this function by name, so no trigger change is needed.

insert into public.allowed_email_domains (domain)
values ('gordoncollege.edu.ph')
on conflict (domain) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- One literal bootstrap admin address, case-insensitive. Bypasses the
  -- domain allowlist entirely and inserts with role = 'admin' directly.
  -- Every other address still requires an allowlisted domain (below) and
  -- lands as 'teacher' (the profiles.role column default). Order matters:
  -- this check must run BEFORE the domain gate, since gmail.com is
  -- deliberately never added to allowed_email_domains.
  if lower(new.email) = 'johnneomanuel@gmail.com' then
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      'admin'
    )
    on conflict (id) do nothing;
    return new;
  end if;

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
