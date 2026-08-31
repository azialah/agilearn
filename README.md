# Agilearn

**Agilearn** is a school-management platform for teachers and administrators. It brings classrooms, rosters, weighted gradebooks, attendance tracking, and a shared teaching-modules library into one calm, dark-leaning workspace.

Built as a **Vite + React single-page app** backed by **Supabase**, with **Postgres Row Level Security as the access-control boundary**. There is no application server — the browser holds the anon key, RLS enforces access per user, and Vercel serves the static frontend.

## 🎯 Product Capabilities

**For Teachers:**
- **Classrooms & rosters** — organize courses by year and block; bulk-import rosters from spreadsheets; manage students by name and identifier.
- **Weighted gradebook** — spreadsheet-like grading grid; organize by periods → categories (lecture/laboratory) → activities; final grade = lecture weight × lecture component + lab weight × lab component (default 40/60). All grade math is pure and unit-tested in one module.
- **Attendance tracking** — create class sessions; mark each student present, absent, late, or excused; view per-student summaries.
- **Teaching modules** — shared library of lesson plans, activity stories, and resources in a private storage bucket.
- **Analytics & calendar** — per-classroom insights, calendar view of sessions and grading periods.
- **Slideshow** — present classroom grades in a full-screen, themed slideshow.
- **Import/export** — read and write rosters and grades as Excel workbooks; export grades to PDF.

**For Administrators:**
- **User & role management** — manage teacher accounts, assign roles, view audit trail of admin actions.
- **Domain allowlist** — approve email domains for teacher self-signup; manage domain requests.
- **School-wide analytics** — overview dashboard; analytics on usage and grade distributions.
- **Audit log** — track admin actions for compliance and debugging.

**Platform:**
- **Installable PWA** — install as an app; works offline with automatic sync when reconnected.
- **Dark-leaning UI** — calm, focused interface; responsive across desktop and tablet.
- **Email auth** — teacher self-signup is domain-gated (self-serve); admins are provisioned out-of-band.
- **Security** — RLS enforces that teachers see only their own classrooms and data; admins see everything. No privileged backend path.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design and [CONTRIBUTING.md](./CONTRIBUTING.md) for contributor rules.

## 📊 Tech Stack

| Layer           | Technology                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Frontend**    | React 19 + TypeScript (strict mode) + Vite (dev server & build)                                                     |
| **Routing**     | TanStack Router (file-based, type-safe)                                                                             |
| **State**       | TanStack Query (server state + caching) + Zustand (local state)                                                     |
| **Tables**      | TanStack Table (virtualized gradebook & rosters) + TanStack Virtual                                                 |
| **Styling**     | Tailwind CSS v4 (CSS-first, no config file) + Radix UI primitives + Motion (animations)                            |
| **Backend**     | Supabase: Postgres (RLS enforces access) + Auth (email/OTP) + Storage (private bucket for teaching modules)         |
| **Import/Export** | pdf-lib (PDF generation) + xlsx (Excel read/write)                                                                  |
| **Observability** | Bugsnag (error tracking & performance monitoring)                                                                  |
| **Testing**     | Vitest (unit tests) + Testing Library (component testing)                                                           |
| **PWA**         | vite-plugin-pwa (service worker + offline shell)                                                                    |
| **Package Mgr** | pnpm v11.22+ (lockfile + workspace-aware runner)                                                                    |

## 🚀 Local Development

### Prerequisites

- **Node.js** 18+ (pnpm requires Node for the package manager)
- **pnpm** 11+ (install globally or use `npm install -g pnpm@11`)
- **Supabase project** with credentials (get URL + anon key from [supabase.com](https://supabase.com))

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/azialah/agilearn.git
cd agilearn
pnpm install

# Copy the environment template and add Supabase credentials
cp .env.example .env
# Edit .env: fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start the dev server
pnpm dev
```

Open the printed local URL (usually `http://localhost:5173`).

### Common Commands

| Command              | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `pnpm dev`           | Start the Vite dev server with HMR              |
| `pnpm build`         | Typecheck (`tsc -b`) + build for production     |
| `pnpm preview`       | Preview the production build locally            |
| `pnpm run test`      | Run the test suite (Vitest)                     |
| `pnpm run typecheck` | Type-check without emitting (quick CI feedback) |
| `pnpm run format`    | Format code with Prettier                       |
| `pnpm run lint`      | Check formatting (CI gate, no ESLint)           |

### Environment Variables

Create `.env` from `.env.example`. Required variables:

- `VITE_SUPABASE_URL` — your Supabase project URL (public, Vite-inlined)
- `VITE_SUPABASE_ANON_KEY` — the anon public key (public, used in the browser)

⚠️ **Security note:** Both are public — they're inlined into the browser bundle. The security model relies on **RLS in Postgres**, not keeping the key secret. Never put a `service_role` key, database password, or any other secret in this file or the app.

## 📁 Repository Structure

```
src/
  routes/               TanStack Router file-based routes (routeTree.gen.ts is auto-generated)
    _auth/              Authenticated routes (gated by Supabase session)
      teacher/          Teaching surfaces (dashboard, classrooms, grades, attendance, modules, analytics)
      admin/            Admin surfaces (users, domain requests, overview, audit log)
      settings.*        Account settings (both roles)
    teacher.signup.*    Domain-gated teacher onboarding wizard (pre-auth)
    index.tsx           Landing page
    login.tsx           Sign-in page
    forgot-password.tsx Password recovery (OTP)
    about.tsx, features.tsx, privacy.tsx, terms.tsx  Public pages
  
  features/             Feature UI + business logic (one dir per major feature)
    teacher/            Teaching features
      dashboard/        Home dashboard (grade/attendance summary)
      classrooms/       Classroom management, roster
      grades/           Weighted gradebook grid
      attendance/       Session tracking + attendance records
      modules/          Teaching modules library
      slideshow/        Grade slideshow presentation
      analytics/        Per-classroom analytics
      calendar/         Calendar view
      profile/          Teacher profile
      usage/            Usage stats
      io/               Import/export helpers (PDF/xlsx generation)
      notifications/    Notification system
      onboarding/       Teacher signup wizard
    admin/              Admin features
    auth/               Shared auth UI (login, signup, password reset flows)
    settings/           Account settings (shared across roles)
    landing/            Marketing landing page
    public/             Public legal pages
  
  lib/
    supabase.ts         Typed Supabase client (createClient<Database>)
    database.types.ts   Postgres schema as TypeScript types (keep in sync with migrations)
    grading.ts          Grade calculation logic (pure, no Supabase imports, unit-tested)
    queries/            TanStack Query hooks (the only place Supabase is read/written)
      keys.ts           Query-key factory (used for cache invalidation)
    theme.ts, locale.tsx, cn.ts  Utility modules
  
  components/
    ui/                 Reusable design-system primitives (built on Radix UI + Tailwind)
    layout/             App shell, top bar, page layouts
  
  types/
    domain.ts           Friendly type aliases derived from database.types
  
  styles/
    app.css             Global styles + Tailwind v4 CSS-first tokens under @theme
  
  test/                 Test utilities and mocks

supabase/
  migrations/           Ordered SQL files (source of truth for DB schema)
    0001_profiles_roles.sql  auth users, roles, RLS helper functions
    0002_classrooms.sql      courses, year, block, weights
    ... (through 0038_performance_indexes.sql)
  seed.sql              Sample data for local development only
  config.toml           Supabase local configuration

.github/workflows/ci.yml  CI pipeline: format:check → typecheck → test → build
vercel.json             Vercel deployment config (build command, output directory, SPA rewrite)
.env.example            Template environment variables
package.json            Dependencies (do not edit; use pnpm install)
```

**Generated files (do not edit):**
- `src/routeTree.gen.ts` — auto-generated from `src/routes/**`; regenerates on dev/build
- `dist/` — build output; generated by `pnpm build`

## 🔐 Security & Architecture

**Access Control:**
- RLS in Postgres is the real security boundary. Teachers only ever see their own classrooms; admins see everything.
- Two helper functions (`is_admin()`, `owns_classroom()`) enforce access in every table policy.
- No server backend, no service-role key in the client.

**Data Model:**
- 10 tables: profiles, classrooms, students, grading_periods, activity_categories, activities, scores, class_sessions, attendance_records, teaching_modules.
- 1 view: v_class_roster (classroom × students, security-invoker).

**Grade Math:**
- Lives in one pure module: `src/lib/grading.ts` (no Supabase imports, fully tested in `grading.test.ts`).
- Rollup: activities → categories → per-component totals → final grade = lecture component × lecture_weight + lab component × lab_weight.

**Offline:**
- Installed as a PWA; service worker caches the shell and API responses.
- Mutations queue locally when offline; sync when reconnected (via `offlineQueue.ts`).

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design.

## 📦 Deployment

**Frontend:** Vercel (static SPA with SPA rewrite)  
**Backend:** Supabase (Postgres + Auth + Storage)

Full setup walkthrough: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

```bash
# Vercel deployment
# Push to GitHub; Vercel auto-deploys from main (configured in .vercelignore for non-runtime files)
git push origin main
```

Environment on Vercel:
- `VITE_SUPABASE_URL` — Project URL
- `VITE_SUPABASE_ANON_KEY` — Anon public key

No database migrations or secrets ship in the app — manage Supabase separately via the dashboard or CLI.

## 📚 Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — System design, layers, data model, auth, storage, deployment pipeline
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — Supabase provisioning, schema application, first admin setup, Vercel deploy
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Contributor contract, project layout, hard rules, CI gate, naming conventions
- **[BACKLOG.md](./docs/BACKLOG.md)** — Three-milestone roadmap with acceptance criteria and implementation context
- **[EMAIL_DELIVERY_ROADMAP.md](./docs/EMAIL_DELIVERY_ROADMAP.md)** — Email notification system design
- **[MOBILE.md](./docs/MOBILE.md)** — Mobile-first design and responsive behavior
- **[STORAGE_QUOTA_ADMIN_HANDOFF.md](./docs/STORAGE_QUOTA_ADMIN_HANDOFF.md)** — Supabase storage quotas and admin responsibilities

## ✅ Quality Gate

Before committing, run the CI order locally:

```bash
pnpm run format:check  # Check formatting (Prettier)
pnpm run typecheck     # Check types (TypeScript)
pnpm run test          # Run tests (Vitest)
pnpm run build         # Build for production
```

All must pass. There is no ESLint — Prettier is the only lint gate.

## 🤝 Contributing

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the contributor contract (layout, rules, commands).
2. Create a feature branch from `main`.
3. Make changes; run the quality gate above.
4. Open a pull request with a clear description.
5. Address review feedback; re-run the gate before merge.

**Key rules:**
- Keep routes thin, features fat.
- Grade math lives only in `src/lib/grading.ts`.
- Query keys come from `src/lib/queries/keys.ts`.
- Never add dependencies; use pnpm's existing packages.
- No AI attributions in code or comments.

## 📝 License

[LICENSE](./LICENSE) (if applicable)

---

**Last updated:** 2026-08-31  
**Project status:** Active development, production-ready for school management
