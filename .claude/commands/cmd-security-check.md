# /security-check Command

## Purpose

Pre-deploy security pass for Agilearn. The threat surface is small: an anon-key
SPA where RLS does all access control and a private storage bucket holds uploads.
This checklist targets exactly those.

## Usage

```text
/security-check
```

---

## Automated grep checks

```bash
# 1. No service-role key or secrets in the client bundle. Any hit is CRITICAL —
#    this app has NO backend, so a service-role key here bypasses RLS entirely.
grep -rn "service_role\|SERVICE_ROLE_KEY\|sk_live_\|sk_test_\|BEGIN PRIVATE KEY\|password=" src/ \
  && echo "FAIL: secret in client code" || echo "OK: no secrets in src/"

# 2. Only the anon key + URL should be the client env. Anything else in the
#    bundle is suspect.
grep -rn "import.meta.env.VITE_" src/

# 3. Auth session is owned by the Supabase client — no hand-managed tokens.
grep -rn "localStorage.*token\|setItem.*auth" src/ \
  && echo "REVIEW: manual token handling" || echo "OK: client owns the session"

# 4. Prefer explicit columns; every query must be RLS-covered.
grep -rn "\.select('\*')" src/lib/queries || echo "OK: no select('*') in queries"

# 5. TypeScript strict is on.
grep -q '"strict": true' tsconfig*.json && echo "OK: strict" || echo "REVIEW: strict mode"
```

---

## Manual checklist

### Env & secrets

- [ ] `.env` is git-ignored and never committed
- [ ] Client bundle contains only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] No service-role key anywhere in the repo's app code

### Database & RLS (the real boundary — run `/rls-audit`)

- [ ] All ten tables: RLS ON + ≥1 policy
- [ ] Teacher A cannot read Teacher B's classrooms/students/scores (tested)
- [ ] Teacher cannot self-promote to admin (tested — trigger raises)
- [ ] Admin sees everything (tested)
- [ ] Policies use `owns_classroom()` / `is_admin()`, never `auth.users` joins

### Storage

- [ ] `teaching-modules` bucket is **private** (`public = false`)
- [ ] Read allowed for authenticated users; write/delete scoped to owning folder or admin
- [ ] No long-lived public URLs generated for module files

### Auth

- [ ] No public sign-up (admins create users)
- [ ] Sign-out fully clears the session
- [ ] Email confirmation configured appropriately for the environment

### Transport (Vercel)

- [ ] Site served over HTTPS (Vercel default); HTTP redirects to HTTPS
- [ ] SPA rewrite in `vercel.json` doesn't expose anything unexpected

---

## Before deploy

Run the full gate and `/rls-audit`:

```bash
pnpm run format:check && pnpm run typecheck && pnpm run test && pnpm run build
```
