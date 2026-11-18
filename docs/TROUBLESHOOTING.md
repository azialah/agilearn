# Troubleshooting

Known failure modes, what causes them, and the fix. Add an entry whenever you lose
more than half an hour to something.

---

## Setup and build

<details>
<summary><b>App crashes at import with "supabaseUrl is required"</b></summary>

`src/lib/supabase.ts` creates its client at module load. `.env` is missing or the
`VITE_SUPABASE_*` values are empty. Copy `.env.example`, fill both values, restart
`pnpm dev` (Vite reads env only at startup).

</details>

<details>
<summary><b>CI fails on Prettier but the build passes locally</b></summary>

Formatting is a separate gate. Run `pnpm run format`, commit, push.

</details>

<details>
<summary><b>Type errors after pulling a new migration</b></summary>

`src/lib/database.types.ts` is behind the schema.

```bash
supabase db reset
supabase gen types typescript --local > src/lib/database.types.ts
```

</details>

<details>
<summary><b>A new route 404s or doesn't type-check</b></summary>

The route tree regenerates when `pnpm dev` or `pnpm build` runs. Start the dev
server once, and commit the updated `src/routeTree.gen.ts`. Never edit it by hand.

</details>

<details>
<summary><b>Works locally, fails on Vercel</b></summary>

Check, in order: the Vercel build log (not just the status), that both
`VITE_SUPABASE_*` variables are set for **that** environment (Preview and
Production are separate), and that the lockfile is committed —
`pnpm install --frozen-lockfile` fails on any drift.

</details>

---

## Auth

<details>
<summary><b>Sign-up rejected with a domain error</b></summary>

`handle_new_user()` only admits domains in `allowed_email_domains`. Add the domain
from **Admin → Domain requests**, or locally:

```sql
insert into public.allowed_email_domains (domain) values ('school.edu') on conflict do nothing;
```

</details>

<details>
<summary><b>No OTP code in the verification or reset email</b></summary>

The Supabase **Confirm signup** and **Reset password** templates must include
`{{ .Token }}`, and "Confirm email" must be on. Locally, read mail in the mail
viewer (Inbucket / Mailpit) whose URL `supabase start` prints.

</details>

<details>
<summary><b>"Only administrators may change a user role"</b></summary>

Working as intended — `enforce_role_change()`. Promote from the Users page as an
admin. Bootstrapping the very first admin is covered in
[DEPLOYMENT.md](DEPLOYMENT.md#5-create-the-first-admin).

</details>

<details>
<summary><b>Installed PWA keeps signing out</b></summary>

It shouldn't — standalone mode always persists the session. If it does, check
that `isStandalone()` in `src/lib/supabase.ts` matches on that platform.

</details>

---

## Data

<details>
<summary><b>A query returns an empty list, no error</b></summary>

That is what RLS denial looks like for a `select`. Confirm the signed-in user owns
the classroom (`owns_classroom()`), or is an admin.

</details>

<details>
<summary><b>Insert fails with 42501 / "new row violates row-level security policy"</b></summary>

The `WITH CHECK` clause rejected the row — usually a `classroom_id` the caller
doesn't own, or a student from another classroom's roster.

</details>

<details>
<summary><b>Score rejected even though it looks valid</b></summary>

`enforce_score_within_activity_max()` requires `0 ≤ score ≤ max_score`. Lowering an
activity's `max_score` below an existing score is also blocked.

</details>

<details>
<summary><b>Gradebook shows a warning about weights</b></summary>

The configured weights don't total 100%. Grades still compute (weights are
renormalised); fix the split in the structure panel. See [GRADING.md](GRADING.md#rules-that-matter).

</details>

<details>
<summary><b>CHED grade is blank for some students</b></summary>

The seeded CHED table has a deliberate gap at 80.50–88.49%. Fill those bands or use
the formula fallback. See [GRADING.md](GRADING.md#transmutation-tables).

</details>

<details>
<summary><b>Upload fails near 500 MB</b></summary>

The per-teacher storage quota. See
[STORAGE_QUOTA_ADMIN_HANDOFF.md](STORAGE_QUOTA_ADMIN_HANDOFF.md).

</details>

---

## Offline

<details>
<summary><b>Offline edits didn't sync</b></summary>

Open the sync bar — the write is probably parked as a conflict because the row
changed on the server. Resolve it there. See [OFFLINE.md](OFFLINE.md#sync-and-conflicts).

</details>

<details>
<summary><b>Old version keeps loading after a deploy</b></summary>

The service worker updates on the next load. Close every tab of the app, reopen.
In DevTools: Application → Service workers → Update / Unregister.

</details>

---

## Grade emails

<details>
<summary><b>"Email sending is not configured."</b></summary>

`RESEND_API_KEY` isn't set for the function. `supabase secrets set RESEND_API_KEY=…`
(hosted) or add it to `supabase/functions/.env` (local).

</details>

<details>
<summary><b>"Set the student email domain before sending."</b></summary>

`classrooms.student_email_domain` is empty. Set it in the classroom's email
settings.

</details>

<details>
<summary><b>Some students skipped</b></summary>

The response lists a reason per student — no posted grade for that term, no usable
SchoolID, or already sent (tick "send again" to override). See
[EMAIL.md](EMAIL.md#the-request-carries-ids-only).

</details>
