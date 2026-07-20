-- 0010_domain_requests_sync.sql
-- Idempotent forward migration that (re)deploys the domain_requests feature and
-- the hardened submit_domain_request(). 0009 was edited after it may already
-- have been applied to the linked remote, and an applied migration must never be
-- edited in place — so this brings every environment (remote or a fresh local
-- reset) to the current definition safely. On an environment that already has
-- 0009's current content, every statement here is a harmless no-op.

create table if not exists public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text not null,
  domain text not null,
  message text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists domain_requests_ip_created_idx
  on public.domain_requests (ip, created_at);

alter table public.domain_requests enable row level security;

drop policy if exists "domain_requests admin all" on public.domain_requests;
create policy "domain_requests admin all"
  on public.domain_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Hardened submission entry point (last X-Forwarded-For entry, shared bucket for
-- an absent IP, length caps, search_path '').
create or replace function public.submit_domain_request(
  p_name text,
  p_school text,
  p_domain text,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := lower(trim(coalesce(p_domain, '')));
  v_ip text;
  v_recent int;
begin
  if length(trim(coalesce(p_name, ''))) = 0
     or length(trim(coalesce(p_school, ''))) = 0
     or length(v_domain) = 0 then
    raise exception 'Name, school, and domain are required.';
  end if;

  if length(p_name) > 200 or length(p_school) > 200
     or length(v_domain) > 253 or length(coalesce(p_message, '')) > 2000 then
    raise exception 'One or more fields are too long.';
  end if;

  if v_domain like '%@%'
     or v_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
    raise exception 'Enter a bare domain like gordoncollege.edu.ph (no @, no name).';
  end if;

  -- Trust only the LAST X-Forwarded-For entry (the edge appends the real client
  -- IP; leading entries are client-supplied). Best-effort anti-spam.
  v_ip := nullif(
    trim(split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',', -1
    )),
    ''
  );

  -- Max 3 per IP per rolling 24h; a missing IP shares one bucket.
  select count(*) into v_recent
  from public.domain_requests
  where ip is not distinct from v_ip
    and created_at > now() - interval '1 day';

  if v_recent >= 3 then
    raise exception 'Too many requests from your network today. Please try again tomorrow.';
  end if;

  insert into public.domain_requests (name, school, domain, message, ip)
  values (
    trim(p_name),
    trim(p_school),
    v_domain,
    nullif(trim(coalesce(p_message, '')), ''),
    v_ip
  );
end;
$$;

grant execute on function public.submit_domain_request(text, text, text, text)
  to anon, authenticated;
