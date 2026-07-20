# Agilearn deployment

End-to-end setup: provision Supabase, load the schema, create your first admin,
regenerate types, and deploy to Vercel. No credentials ship in this repo — you
create your own.

> For how the pieces fit together, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com).
2. Create (or select) the organization **"Codexia (Personal)"**.
3. **New project** inside that org:
   - Name: `agilearn`
   - Database password: generate and store it safely.
   - Region: pick an **Asia** region, e.g. **Southeast Asia (Singapore)**.
4. Wait for provisioning to finish.

## 2. Get your API credentials

In **Project Settings → API**, copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Create a local `.env` from the template and paste them in:

```bash
cp .env.example .env
```

## 3. Apply the database schema

The ordered migrations in `supabase/migrations/` are the source of truth.

**Option A — Dashboard SQL editor.** Open **SQL Editor** and run each file in
order (`0001` → `0006`), pasting and executing one at a time.

**Option B — Supabase CLI.**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### Optional: seed sample data (local only)

`supabase/seed.sql` inserts directly into `auth.users` and is intended for a
**local** stack only:

```bash
supabase start
supabase db reset      # runs migrations, then seed.sql
```

It creates one admin and two teachers (password `password123`), two classrooms
with ~15 students each, full gradebooks, and attendance. Do **not** run it
against a hosted project.

## 4. Enable email auth

In **Authentication → Providers**, enable **Email**. Teacher sign-up is
self-serve but gated: the `handle_new_user()` trigger only admits emails whose
domain is listed in `public.allowed_email_domains` (seed your school domains
there). Keep **"Confirm email" on** so the signup wizard's 6-digit OTP fires, and
make sure the **Confirm signup** and **Reset password** email templates include
`{{ .Token }}`. Admins are still created out-of-band (next step) — their email
domain must also be allowlisted.

## 5. Create the first admin

There is no admin self-sign-up, and two DB guards are in play: `handle_new_user()`
rejects users whose email domain isn't allowlisted, and `enforce_role_change()`
blocks role changes made without an admin identity (so a plain `update` in the SQL
editor fails).

> **Note:** `johnneomanuel@gmail.com` is auto-provisioned as admin via
> migration `0011_admin_bootstrap.sql` — signing up through the normal
> `/signup` flow with that address bypasses the domain gate below and lands
> with `role = 'admin'` automatically. It does not need the manual steps that
> follow. The steps below remain the path for provisioning any **other**
> future admin.

Bootstrap the first admin like this:

1. **Allowlist the admin's domain** (SQL editor) so the new user is accepted:

   ```sql
   insert into public.allowed_email_domains (domain)
   values ('example.com')          -- the admin's email domain, lowercase
   on conflict (domain) do nothing;
   ```

2. **Authentication → Users → Add user** — set the email and password, and tick
   **Auto Confirm User**. The `on_auth_user_created` trigger creates a matching
   `profiles` row with role `teacher`.

3. **Promote to admin** (SQL editor). The role-change trigger has to be bypassed
   for this one bootstrap write — the SQL editor has no admin identity yet:

   ```sql
   alter table public.profiles disable trigger profiles_before_update;
   update public.profiles set role = 'admin' where email = 'you@example.com';
   alter table public.profiles enable trigger profiles_before_update;
   ```

4. Verify, then sign in — the **Users** admin page can now promote everyone else
   (an existing admin passes the trigger, so no disabling is needed after this):

   ```sql
   select id, email, role from public.profiles where email = 'you@example.com';
   ```

## 6. Regenerate the database types

After any schema change, regenerate the typed client definitions:

```bash
supabase gen types typescript --project-id <your-project-ref> \
  > src/lib/database.types.ts
```

Against a local stack, `supabase/config.toml` lets you use `--local` instead of
`--project-id`:

```bash
supabase start
supabase gen types typescript --local > src/lib/database.types.ts
```

Keep `src/lib/database.types.ts` in sync with the migrations.

## 7. Deploy to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Framework preset: **Vite** (the repo also ships `vercel.json` with SPA
   rewrites and a pnpm install/build config).
3. Add environment variables **VITE_SUPABASE_URL** and
   **VITE_SUPABASE_ANON_KEY** (Production + Preview).
4. Deploy. SPA routes fall back to `/index.html` automatically.

## 8. Verify Row Level Security

Confirm the policies actually isolate tenants:

- [ ] Teacher **A** cannot read Teacher **B**'s classroom, students, or scores
      (query them as A — expect zero rows).
- [ ] A teacher **cannot** promote themselves: running
      `update profiles set role = 'admin' where id = auth.uid()` as a teacher
      raises `Only administrators may change a user role`.
- [ ] A teacher can read and write only within their own classrooms
      (students, grades, attendance).
- [ ] An admin can read every profile and classroom.
- [ ] Any authenticated user can read the shared `teaching-modules` bucket, but
      only the owning folder (or an admin) can upload/modify/delete.
