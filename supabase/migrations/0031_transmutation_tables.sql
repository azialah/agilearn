-- 0031_transmutation_tables.sql
-- Shared reference data for DepEd-style grade transmutation (Initial Grade →
-- Quarterly Grade). Not classroom-owned — same shape as allowed_email_domains
-- (0007): admins write, every authenticated teacher reads. A course_subject
-- picks a table explicitly or falls back to the one marked is_default (wired
-- in 0033). No data here — see 0032 for the seeded DepEd Order 8 s.2015 table.

create table public.transmutation_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint transmutation_tables_name_key unique (name)
);

comment on table public.transmutation_tables is
  'Named DepEd-style transmutation tables (e.g. "DepEd Order 8, s. 2015"). Shared reference data, not owned by any classroom.';

-- Only one table may be the implicit default a subject resolves to when it
-- hasn't picked one explicitly.
create unique index transmutation_tables_one_default
  on public.transmutation_tables (is_default)
  where is_default;

create table public.transmutation_bands (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.transmutation_tables (id) on delete cascade,
  min_percent numeric(5, 2) not null check (min_percent >= 0 and min_percent <= 100),
  max_percent numeric(5, 2) not null check (max_percent >= min_percent and max_percent <= 100),
  transmuted_grade numeric(5, 2) not null check (transmuted_grade >= 0 and transmuted_grade <= 100),
  constraint transmutation_bands_table_id_min_percent_key unique (table_id, min_percent)
);

comment on table public.transmutation_bands is
  'One inclusive percentage band per row. A table may leave gaps (e.g. below its lowest band) — grading.ts treats an uncovered percentage as null, not an error.';

-- No separate (table_id, min_percent) index needed: the unique constraint
-- above already backs that exact lookup shape.

alter table public.transmutation_tables enable row level security;
alter table public.transmutation_bands enable row level security;

create policy "transmutation_tables admin write"
  on public.transmutation_tables for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "transmutation_tables read"
  on public.transmutation_tables for select
  to authenticated
  using (true);

create policy "transmutation_bands admin write"
  on public.transmutation_bands for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "transmutation_bands read"
  on public.transmutation_bands for select
  to authenticated
  using (true);
