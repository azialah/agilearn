# Getting started

From a fresh clone to a running app with sample data. Allow about ten minutes,
most of it Docker pulling the local Supabase images.

## Prerequisites

| Tool                                                        | Version | Why                                            |
| ----------------------------------------------------------- | ------- | ---------------------------------------------- |
| [Node.js](https://nodejs.org)                               | 22 LTS  | Matches CI                                     |
| [pnpm](https://pnpm.io)                                     | 11.22+  | Pinned in `package.json` → `packageManager`    |
| [Supabase CLI](https://supabase.com/docs/guides/cli)        | latest  | Local stack, migrations, type generation       |
| [Docker](https://www.docker.com) (or OrbStack / Colima)     | any     | Runs the local Supabase stack                  |

> [!TIP]
> `corepack enable` picks up the exact pnpm version from `package.json` — no
> global install needed.

## 1. Install

```bash
git clone https://github.com/azialah/agilearn.git
cd agilearn
pnpm install
```

## 2. Start a local Supabase

```bash
supabase start        # boots Postgres, Auth, Storage, Studio in Docker
supabase db reset     # applies supabase/migrations/* then supabase/seed.sql
```

`supabase start` prints the local **API URL** and **anon key** — you need both next.
Studio (the local dashboard) runs at <http://localhost:54323>.

The seed creates one admin and two teachers (password `password123`), two
classrooms with ~15 students each, full gradebooks and attendance.

> [!WARNING]
> `seed.sql` writes straight into `auth.users`. Never run it against a hosted
> project.

## 3. Configure the app

```bash
cp .env.example .env
```

| Variable                 | Required | Value                                                     |
| ------------------------ | -------- | --------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | yes      | API URL from `supabase start` (or your hosted project)    |
| `VITE_SUPABASE_ANON_KEY` | yes      | anon key from `supabase start`                            |
| `VITE_BUGSNAG_API_KEY`   | no       | Leave blank locally — error reporting just switches off   |

Every `VITE_*` value is inlined into the browser bundle and is **public by design**.
Never put a secret in `.env`. See [Security](SECURITY.md).

## 4. Run it

```bash
pnpm dev
```

Open the printed URL (usually <http://localhost:5173>) and sign in with a seeded
account.

## 5. (Optional) Run the grade-email function

Only needed if you are working on posted-grade emails.

```bash
cp supabase/functions/.env.example supabase/functions/.env   # add a Resend *test* key
supabase functions serve send-grade-emails --env-file supabase/functions/.env
```

Details in [Grade emails](EMAIL.md).

---

## Daily workflow

| Command                  | Does                                              |
| ------------------------ | ------------------------------------------------- |
| `pnpm dev`               | Vite dev server with HMR; regenerates the route tree |
| `pnpm run test`          | Vitest, once                                      |
| `pnpm exec vitest`       | Vitest in watch mode                              |
| `pnpm run typecheck`     | `tsc -b --noEmit`                                 |
| `pnpm run format`        | Prettier, write                                   |
| `pnpm run build`         | Typecheck + production build into `dist/`         |
| `pnpm preview`           | Serve `dist/` locally — the only way to test the service worker |

### Before you push

```bash
pnpm run format:check && pnpm run typecheck && pnpm run test && pnpm run build
```

Same order as CI. All four must pass.

### After changing the schema

```bash
supabase migration new <descriptive_name>       # then rename to the next NNNN_ prefix
supabase db reset                               # re-apply everything locally
supabase gen types typescript --local > src/lib/database.types.ts
```

Then update [DATABASE.md](DATABASE.md) in the same PR.

---

## Where things live

```text
src/
├── routes/            file-based routes — thin wiring only
├── features/          all feature UI and logic
│   ├── teacher/       classrooms, grades, attendance, posted-grades, io, …
│   ├── admin/         users, domain requests, overview, audit log
│   ├── auth/          login, password reset, wizard primitives
│   └── settings/ landing/ public/
├── lib/
│   ├── queries/       every Supabase read/write (TanStack Query hooks + keys.ts)
│   ├── grading.ts     the only place grade math lives
│   ├── offlineQueue.ts, queryPersist.ts   offline support
│   └── supabase.ts    typed client
├── components/ui/     design-system primitives (Radix + Tailwind)
└── styles/app.css     Tailwind v4 tokens under @theme
supabase/
├── migrations/        0001 … 0040, the database source of truth
├── functions/         send-grade-emails (Deno)
├── checks/            pre-flight queries for risky migrations
└── seed.sql           local-only sample data
```

Next: [Architecture](ARCHITECTURE.md).
