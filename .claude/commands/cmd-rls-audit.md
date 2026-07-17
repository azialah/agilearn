# /rls-audit Command

## Purpose

Verify every table has RLS enabled with working policies. In Agilearn, RLS is the
**only** access-control boundary (anon-key SPA, no backend) — this audit is the
security review.

## Usage

```text
/rls-audit
```

---

## Part 1: RLS enabled + policy count (one query)

Run in Supabase Studio → SQL Editor:

```sql
with rls_check as (
  select t.tablename, t.rowsecurity, count(p.policyname) as policy_count
  from pg_tables t
  left join pg_policies p on p.tablename = t.tablename and p.schemaname = t.schemaname
  where t.schemaname = 'public'
  group by t.tablename, t.rowsecurity
)
select
  tablename,
  case
    when rowsecurity = false then 'RLS NOT ENABLED'
    when policy_count = 0 then 'RLS ENABLED but NO POLICIES'
    else 'OK: ' || policy_count || ' policies'
  end as status
from rls_check
order by tablename;
```

Expected `OK` for all ten tables: `profiles`, `classrooms`, `students`,
`grading_periods`, `activity_categories`, `activities`, `scores`,
`class_sessions`, `attendance_records`, `teaching_modules`.

---

## Part 2: Tenant-isolation tests (run as a real teacher JWT)

```sql
-- A teacher cannot see another teacher's classrooms.
select count(*) from classrooms where not public.owns_classroom(id);
-- Expected: 0

-- A teacher cannot see students outside their classrooms.
select count(*) from students where not public.owns_classroom(classroom_id);
-- Expected: 0

-- A teacher cannot self-promote (should raise, not update).
update profiles set role = 'admin' where id = auth.uid();
-- Expected: error "Only administrators may change a user role"

-- As an admin JWT: full visibility.
select count(*) from profiles;   -- Expected: all rows
```

---

## Part 3: Policy shape review

For each policy (from `pg_policies`), confirm:

- [ ] `USING` returns a boolean (not a bare column) tied to the caller
- [ ] Write / `FOR ALL` policies also have `WITH CHECK`
- [ ] Ownership uses `public.owns_classroom(classroom_id)` (teachers) or the
      owning `auth.uid()` column — never a direct `auth.users` join (42501)
- [ ] Admin access uses `public.is_admin()`

---

## Part 4: Storage bucket

```sql
select id, public from storage.buckets where id = 'teaching-modules';
-- Expected: public = false
```

Confirm storage policies (migration 0005) let authenticated users read but only
the owning folder / an admin write or delete.

---

## Part 5: Client-side hygiene

```bash
# Prefer explicit columns; every select must be RLS-covered.
grep -rn "\.select('\*')" src/lib/queries
```

---

## Checklist

- [ ] All ten tables: RLS ON + ≥1 policy
- [ ] Teacher A cannot read Teacher B's data (tested)
- [ ] Teacher cannot self-promote (tested)
- [ ] Admin sees everything (tested)
- [ ] `teaching-modules` bucket is private
- [ ] Policies use `owns_classroom()` / `is_admin()`, never `auth.users` joins
