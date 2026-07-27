# Formatting gate cleanup — 2026-07-27

## Scope

Applied the repository formatter to the two files that previously blocked the
formatting gate:

- `src/components/layout/AppShell.tsx`
- `src/features/teacher/calendar/CalendarPage.tsx`

This is formatting-only work. No application behavior, routing, data access, or
visual design decisions were changed intentionally.

## Verification

- `pnpm run format:check`: passed
