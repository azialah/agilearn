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

In **Authentication → Providers**, enable **Email**. There is no public
sign-up in Agilearn — administrators create users. For internal testing you may
keep "Confirm email" off; otherwise confirm invited users.

## 5. Create the first admin

1. **Authentication → Users → Add user** — set an email and password, and
   confirm the user.
2. The `on_auth_user_created` trigger creates a matching `profiles` row with
   role `teacher`. Promote it in the **SQL editor**:

   ```sql
   update public.profiles
     set role = 'admin'
     where email = 'you@example.com';
   ```

3. Sign in — the **Users** admin page is now available for managing other roles.

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
