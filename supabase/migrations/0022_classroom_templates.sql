-- Reusable presets for the classroom creation wizard.
--
-- `payload` is jsonb on purpose: a template is opaque wizard state that tracks
-- the form, not the schema. Mirroring the ~14 form fields as columns would mean
-- a migration every time the wizard gains a field, and nothing in the database
-- ever reads inside the blob. The client parses it with a zod schema on read,
-- so unknown or stale keys are stripped rather than trusted.
create table if not exists public.classroom_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_templates_name_not_blank check (length(btrim(name)) > 0),
  constraint classroom_templates_owner_name_key unique (owner_id, name)
);

comment on column public.classroom_templates.payload is
  'Classroom wizard form state. Shape is owned by the client (zod-validated on read).';

-- The unique constraint already indexes (owner_id, name); listing a teacher's
-- templates uses its leading column, so no separate owner_id index is needed.

alter table public.classroom_templates enable row level security;

-- A template is private to the teacher who saved it.
create policy "classroom_templates_owner_rw" on public.classroom_templates for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "classroom_templates_admin_all" on public.classroom_templates for all
  using (public.is_admin());
