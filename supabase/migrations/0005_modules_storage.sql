-- 0005_modules_storage.sql
-- Teaching modules metadata plus a private storage bucket and its policies.

create type public.module_kind as enum (
  'lesson_plan',
  'activity_story',
  'resource'
);

create table public.teaching_modules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  classroom_id uuid references public.classrooms (id) on delete set null,
  kind public.module_kind not null,
  title text not null,
  description text not null default '',
  storage_path text not null,
  file_size bigint not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create index teaching_modules_owner_id_idx
  on public.teaching_modules (owner_id);
create index teaching_modules_classroom_id_idx
  on public.teaching_modules (classroom_id);

-- Private storage bucket for module files ------------------------------------
-- Objects are laid out as `<user-uuid>/<filename>` so the first path segment
-- identifies the owner.

insert into storage.buckets (id, name, public)
values ('teaching-modules', 'teaching-modules', false)
on conflict (id) do nothing;

-- Any authenticated user may read module files (shared library).
create policy "teaching modules readable by authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'teaching-modules');

-- Only the owning folder (or an admin) may write.
create policy "teaching modules insert own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'teaching-modules'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "teaching modules update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'teaching-modules'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'teaching-modules'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

create policy "teaching modules delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'teaching-modules'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
