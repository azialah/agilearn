-- 0039_grade_sheet_configs.sql
-- Per-classroom grade sheet configuration, so a teacher's choices follow them
-- across devices:
--
--   grade_sheet_configs   one row per subject: how the on-screen grid is laid
--                         out (grid_view) and which columns the .xlsx export
--                         carries (export_layout).
--   grade_import_presets  saved column mappings for a custom class-record
--                         workbook, so the next file in the same format maps
--                         itself.
--
-- Both payloads are jsonb whose shape is owned and validated by the client
-- (src/lib/gradeSheetConfig.ts). The database only insists they are objects,
-- so an unknown or older shape degrades to defaults instead of failing a read.
-- Neither table stores grades: scores still live in public.scores and grade
-- math still happens only in src/lib/grading.ts.

create table public.grade_sheet_configs (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  course_subject_id uuid not null,
  grid_view jsonb not null default '{}'::jsonb
    check (jsonb_typeof(grid_view) = 'object'),
  export_layout jsonb not null default '{}'::jsonb
    check (jsonb_typeof(export_layout) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same composite FK the other subject-scoped tables use (0017), so a config
  -- can never point at a subject from a different classroom.
  constraint grade_sheet_configs_subject_classroom_fkey
    foreign key (course_subject_id, classroom_id)
    references public.course_subjects(id, classroom_id) on delete cascade,
  constraint grade_sheet_configs_subject_key unique (course_subject_id)
);
create index grade_sheet_configs_classroom_id_idx
  on public.grade_sheet_configs (classroom_id);

comment on column public.grade_sheet_configs.grid_view is
  'On-screen grade grid options: which column groups show, component order, density. Shape validated client-side; {} means defaults.';
comment on column public.grade_sheet_configs.export_layout is
  'Grade sheet .xlsx layout: ordered column list with optional header overrides and the sheet name. {} means the built-in default layout.';

create table public.grade_import_presets (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  mapping jsonb not null check (jsonb_typeof(mapping) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grade_import_presets_classroom_name_key unique (classroom_id, name)
);
create index grade_import_presets_classroom_id_idx
  on public.grade_import_presets (classroom_id);

comment on column public.grade_import_presets.mapping is
  'Column mapping for a class-record workbook, keyed by normalized header so it survives added rows. Used to auto-map the next import whose headers match.';

-- The client never sets timestamps; keep updated_at honest on every edit.
create function public.touch_grade_sheet_config_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger grade_sheet_configs_touch_updated_at
  before update on public.grade_sheet_configs
  for each row execute function public.touch_grade_sheet_config_updated_at();

create trigger grade_import_presets_touch_updated_at
  before update on public.grade_import_presets
  for each row execute function public.touch_grade_sheet_config_updated_at();

alter table public.grade_sheet_configs enable row level security;
alter table public.grade_import_presets enable row level security;

-- Teachers reach configs only through a classroom they own.
create policy "grade_sheet_configs_owner_rw" on public.grade_sheet_configs
  for all to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "grade_sheet_configs_admin_all" on public.grade_sheet_configs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "grade_import_presets_owner_rw" on public.grade_import_presets
  for all to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "grade_import_presets_admin_all" on public.grade_import_presets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
