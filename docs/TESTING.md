# Testing

Agilearn tests **logic, not pixels**. Anything that can produce a wrong grade, a
wrong import or a lost write is a pure function with a colocated test. Access
control is tested where it lives — in the database.

---

## Stack

| Tool                          | Role                                           |
| ----------------------------- | ---------------------------------------------- |
| Vitest 4                      | Runner (`globals: true`, `environment: jsdom`) |
| Testing Library + jest-dom    | Available for component tests; matchers loaded in `src/test/setup.ts` |
| Config                        | `test` block in `vite.config.ts` — no separate vitest config |

```bash
pnpm run test                       # once, as CI does
pnpm exec vitest                    # watch mode
pnpm exec vitest src/lib/grading    # one area
pnpm exec vitest -t "renormal"      # by test name
```

CI provides placeholder `VITE_SUPABASE_*` values because `src/lib/supabase.ts`
creates its client at import time. No test talks to a real project.

---

## What is covered

| Area                    | Tests                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **Grade engine**        | `src/lib/grading*.test.ts` — core, policy, DepEd transmutation, CHED, real class-record parity |
| **Spreadsheet import/export** | `features/teacher/io/*.test.ts` — parsing, workbook, column auto-mapping, import plan, lec/lab pairing, export layout |
| **Posted grades**       | `parsePostedGrades.test.ts`, `gradebookWrite.test.ts`                  |
| **Offline**             | `offlineQueue.test.ts` — conflict resolution                           |
| **Notifications**       | `evaluators.test.ts`, `queries/notifications.test.ts`                  |
| **Attendance, calendar, schedule** | `summary`, `participantsImport`, `calendar`, `schedule` tests |
| **Navigation & safety** | `safeRedirect`, `lastRoute`, `legalReturn`, `dockItems`, `navigation`  |
| **Utilities**           | `classroomColor`, `imageCrop`, `recentClassrooms`, `segmented`, `passwordStrength`, … |

34 test files, all colocated next to the code they cover.

---

## Writing a test

**Where:** next to the module — `foo.ts` → `foo.test.ts`.

**What to extract:** if a component contains a decision (a calculation, a parse, a
mapping), move it into a plain `.ts` function in the same feature folder and test
that. Components stay thin, tests stay fast.

```ts
import { describe, expect, it } from 'vitest'
import { computeCategoryPercent } from '@/lib/grading'

describe('computeCategoryPercent', () => {
  it('drops ungraded activities by default', () => {
    // 18/20 graded, second activity blank → 90%, not 45%
    expect(computeCategoryPercent(/* … */)).toBe(90)
  })
})
```

**Rules**

- No network, no Supabase. Pass plain objects in.
- Prefer real-world fixtures (an actual class-record layout) over synthetic ones
  when testing imports or grade parity.
- A bug fix lands with a test that failed before the fix.

---

## Database tests

RLS is verified against a local stack:

```bash
supabase db reset          # migrations + seed
```

Then run the isolation checklist in [SECURITY.md](SECURITY.md#pre-ship-checklist)
from Studio's SQL editor, impersonating each seeded user. Migrations that rewrite
existing data have a pre-flight query in `supabase/checks/` — run it against a
copy of production data first.

---

## Manual checks worth doing

| Change                        | Check by hand                                             |
| ----------------------------- | --------------------------------------------------------- |
| Service worker / caching      | `pnpm build && pnpm preview`, then offline — see [OFFLINE.md](OFFLINE.md#testing-offline-by-hand) |
| Phone layout                  | DevTools device mode at 375 px, plus an installed PWA — see [MOBILE.md](MOBILE.md) |
| Grade emails                  | `supabase functions serve` with a Resend test key         |
| Import of a new sheet format  | The real file, end to end, then compare with the teacher's own totals |
