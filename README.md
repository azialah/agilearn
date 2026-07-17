# Agilearn

Agilearn is a school-management platform for teachers and administrators. It
brings classrooms, rosters, weighted gradebooks, attendance, and shared
teaching modules into one calm, dark-leaning workspace.

## Features

- **Classrooms & rosters** — organize courses by year and block; add students by
  number and name, or bulk-import a roster from a spreadsheet.
- **Weighted gradebook** — a spreadsheet-like grid built from grading periods →
  categories (lecture / laboratory) → activities → per-student scores. Lecture and
  laboratory components combine into a final grade (default 40% / 60%). All grade
  math lives in one pure, fully tested module (`src/lib/grading.ts`) so the numbers
  never drift.
- **Attendance** — create class sessions and mark each student present, absent,
  late, or excused, with running per-student summaries.
- **Teaching modules** — a shared library of lesson plans, activity stories, and
  resources, uploaded to a private Supabase Storage bucket.
- **Slideshow** — present a classroom's grades in a themed, full-screen slideshow.
- **Import / export** — read and write rosters and grades as Excel workbooks
  (`xlsx`) and export to PDF (`pdf-lib`).
- **Admin & roles** — admin and teacher roles enforced end to end with Postgres
  Row Level Security; teachers only ever see their own classrooms. Admins manage
  users from a dedicated page — there is no public sign-up.
- **Installable PWA** — offline-ready shell with an auto-updating service worker.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how these fit together.

## Stack

- Vite, React 19, TypeScript (strict)
- TanStack Router (file-based), Query, Table, Virtual
- Supabase (Postgres, Auth, Storage, RLS)
- Tailwind CSS v4 (CSS-first tokens), Radix UI primitives, Motion
- Vitest + Testing Library
- pnpm as the package manager and runner

## Quickstart

```bash
pnpm install
cp .env.example .env    # then fill in your Supabase URL + anon key
pnpm dev
```

Then open the printed local URL.

Common scripts:

| Script              | Purpose                      |
| ------------------- | ---------------------------- |
| `pnpm dev`           | Start the dev server         |
| `pnpm run build`     | Typecheck and build for prod |
| `pnpm run preview`   | Preview the production build |
| `pnpm run test`      | Run the test suite           |
| `pnpm run typecheck` | Type-check without emitting  |
| `pnpm run format`    | Format with Prettier         |

## Setup

Provisioning Supabase (schema, auth, storage, first admin) and deploying to
Vercel are documented step by step in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before making changes — it describes the project
layout and the conventions that keep the codebase consistent.
