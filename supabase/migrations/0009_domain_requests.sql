-- 0009_domain_requests.sql
-- Public "request my school's domain" submissions. Anonymous visitors submit
-- ONLY through submit_domain_request(), which captures the real client IP
-- server-side and enforces a per-IP daily cap (clients can't be trusted to
-- report their own IP or count). Admins review, then approve (add the domain to
-- allowed_email_domains) or dismiss.

create table public.domain_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text not null,
  domain text not null,
  message text,
  ip text,
  created_at timestamptz not null default now()
);

comment on table public.domain_requests is
  'Public requests to allowlist a school email domain. Insert only via submit_domain_request().';

create index domain_requests_ip_created_idx
  on public.domain_requests (ip, created_at);

alter table public.domain_requests enable row level security;

-- Admins review and clear requests. There is no anon/teacher table access and no
-- INSERT policy — submissions go through the SECURITY DEFINER function below.
create policy "domain_requests admin all"
  on public.domain_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public submission entry point. SECURITY DEFINER so it can read request headers,
-- count across all rows (past the admin-only RLS), and insert.
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

  -- Cheap length caps so a bad actor can't bloat the table / admin UI.
  if length(p_name) > 200 or length(p_school) > 200
     or length(v_domain) > 253 or length(coalesce(p_message, '')) > 2000 then
    raise exception 'One or more fields are too long.';
  end if;

  -- Bare domain only: no '@', at least two dot-separated labels.
  if v_domain like '%@%'
     or v_domain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' then
    raise exception 'Enter a bare domain like gordoncollege.edu.ph (no @, no name).';
  end if;

  -- Trust only the LAST X-Forwarded-For entry: the edge appends the real client
  -- IP, while any leading entries are client-supplied and spoofable. XFF parsing
  -- is environment-dependent — verify against your Supabase/CDN setup and treat
  -- this as best-effort anti-spam (a CDN/WAF rule is the real control).
  v_ip := nullif(
    trim(split_part(
      coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
      ',', -1
    )),
    ''
  );

  -- Max 3 submissions per IP per rolling 24h (any mix of domains). A missing IP
  -- shares one bucket (IS NOT DISTINCT FROM) so an absent header can't unlock
  -- unlimited inserts.
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
