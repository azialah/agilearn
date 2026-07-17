# /create-migration Command

## Purpose

Scaffold a new Supabase Postgres migration for Agilearn with RLS wired through the
project's helper functions.

## Usage

```
/create-migration <name>
Example: /create-migration add_lesson_tags
```

## File

Continue the existing numbered sequence (`0001`–`0006` today):

```
supabase/migrations/NNNN_<name>.sql
```

Pick the next free `NNNN`. Two files sharing a number collide on apply.

---

## Template

```sql
-- Migration: <descriptive_name>
-- Purpose: [ONE LINE describing what this migration does]

create table if not exists <table_name> (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  -- columns here
  created_at timestamptz not null default now()
);

comment on table <table_name> is '[what this table stores]';

create index if not exists <table_name>_classroom_id_idx on <table_name>(classroom_id);

-- RLS: every table gets it, scoped through the helper functions.
alter table <table_name> enable row level security;

-- Teachers reach classroom-scoped rows only through a classroom they own.
create policy "<table_name>_owner_rw" on <table_name> for all
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

-- Admins see everything. Never query auth.users directly in a policy (42501).
create policy "<table_name>_admin_all" on <table_name> for all
  using (public.is_admin());
```

If a table is not classroom-scoped (e.g. it hangs off `profiles`), scope its
policy to `auth.uid()` on the owning column instead of `owns_classroom`.

---

## Real example: how `students` is scoped (migration 0002 + 0006)

```sql
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  student_no text not null,
  last_name text not null,
  first_name text not null,
  middle_initial text not null default '',
  created_at timestamptz not null default now(),
  unique (classroom_id, student_no)
);

create index if not exists students_classroom_id_idx on students(classroom_id);

alter table students enable row level security;

create policy "students_owner_rw" on students for all
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id));

create policy "students_admin_all" on students for all
  using (public.is_admin());
```

---

## Apply & regenerate types

```bash
# Local stack
supabase db reset            # re-runs all migrations (+ seed.sql locally)
# or, against a hosted project:
supabase db push

# ALWAYS regenerate types after a schema change:
supabase gen types typescript --local > src/lib/database.types.ts
#   (hosted: --project-id <ref>)
```

Then add any friendly aliases to `src/types/domain.ts`.

## Checklist

- [ ] Next free number in the `NNNN_` sequence
- [ ] Index on frequently-queried FK columns (`classroom_id`, etc.)
- [ ] RLS ENABLED + policies via `owns_classroom()` / `is_admin()` (never `auth.users`)
- [ ] `timestamptz ... default now()` for time columns; client never sets timestamps
- [ ] No data mutations here (seed data goes in `supabase/seed.sql`)
- [ ] `src/lib/database.types.ts` regenerated and `src/types/domain.ts` updated
- [ ] snake_case names throughout
