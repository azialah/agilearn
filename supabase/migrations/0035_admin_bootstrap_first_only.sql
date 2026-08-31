-- 0035_admin_bootstrap_first_only.sql
-- Narrows the literal-email admin bootstrap introduced in 0011.
--
-- 0011 special-cased one address so it self-provisions as admin ahead of the
-- domain-allowlist gate. That was deliberate and it is how the first admin got
-- created, but the exemption is unconditional and permanent: anyone who ever
-- controls that mailbox can mint a production admin at any time, and the
-- address is committed to the repository.
--
-- The bootstrap is still needed for a fresh database (someone has to be the
-- first admin), so this keeps it and adds the one condition that makes it
-- self-retiring: it fires only while no admin exists. On any project that
-- already has one -- production included -- the branch is now dead, and the
-- address falls through to the ordinary domain gate like every other email.
--
-- Replaces 0011's handle_new_user(); the on_auth_user_created trigger (0001)
-- points at this function by name, so no trigger change is needed.
--
-- Consequence to know about before you need it: on a database that already has
-- an admin, this address now falls through to the ordinary domain gate below
-- and is rejected, because gmail.com is deliberately never allowlisted. If the
-- last admin's auth.users row is ever deleted, recovery is a SQL-editor job:
--   insert into public.allowed_email_domains (domain) values ('gmail.com');
--   -- sign up through the app, then:
--   update public.profiles set role = 'admin' where email = '...';
--   delete from public.allowed_email_domains where domain = 'gmail.com';
-- The promotion has to happen in the SQL editor: enforce_role_change() (0001)
-- blocks a client from doing it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Bootstrap path: one literal address, case-insensitive, AND only while the
  -- profiles table holds no admin yet. Bypasses the domain allowlist because
  -- gmail.com is deliberately never allowlisted. Once any admin row exists
  -- this is unreachable and the address is treated like any other.
  if lower(new.email) = 'johnneomanuel@gmail.com'
     and not exists (select 1 from public.profiles p where p.role = 'admin')
  then
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
