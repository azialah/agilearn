# Contributing to Agilearn

Agilearn is a Vite + React 19 + TypeScript single-page app backed by Supabase.
This file is the contract every contributor (human or agent) follows.

## Project layout

```
src/
  routes/            File-based TanStack Router routes (generated tree: routeTree.gen.ts)
                      _auth/teacher/**, teacher.signup*.tsx = teacher; _auth/admin/** = admin
  features/<name>/   Feature UI + logic. Route files stay thin and delegate here.
                      teacher/<name>/ and admin/ group by role; shared code stays ungrouped
  components/ui/      Reusable design-system primitives
  components/layout/  App shell, top bar, page header
  lib/                supabase client, database.types, grading, queryClient
  lib/queries/        TanStack Query hooks + the query-key factory (keys.ts)
  types/domain.ts     Friendly aliases derived from database.types
supabase/migrations/  Ordered SQL schema (source of truth for the DB)
```

## Hard rules

- **Tailwind v4 is CSS-first.** All tokens live in `src/styles/app.css` under
  `@theme`. NEVER create `tailwind.config.js` or `postcss.config.js`.
- **Route files stay thin — no business logic.** Wire params/loaders and render
  a component from `src/features/<name>/`; all real UI and logic live there.
  Never hand-edit `src/routeTree.gen.ts` (it is generated and commit-tracked) —
  it regenerates automatically from `src/routes/**` on dev/build.
- **Never edit `package.json` or add dependencies.** Work with what is installed.
- **Thin routes, fat features.** A route file wires params/loaders and renders a
  component from `src/features/`. All real UI and logic live in the feature dir.
- **Grade math lives only in `src/lib/grading.ts`.** It is pure (no Supabase
  imports) and covered by `grading.test.ts`. Never recompute grades elsewhere.
- **Query keys come from `src/lib/queries/keys.ts`.** Never hand-write key
  tuples; use the `keys` factory so invalidation stays consistent.
- No AI attributions or signatures anywhere in code, comments, commits, or docs.

## Data access

- Import the typed client from `@/lib/supabase`. It is `createClient<Database>`,
  so `.from('table')` is fully typed.
- Wrap reads in `useQuery` and writes in `useMutation`, invalidating the
  relevant `keys.*` on success. See `src/lib/queries/classrooms.ts` for the
  pattern.
- Row/Insert/Update/Enum aliases come from `@/types/domain`.

## Before you finish

Run and make green:

```
pnpm run format      # prettier --write .
pnpm run typecheck   # tsc -b --noEmit
pnpm run test        # vitest run
pnpm run build       # tsc -b && vite build
```

Path alias `@/*` maps to `src/*`.
