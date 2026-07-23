# 2026-07-22 — Mobile Settings search and iOS input sizing

This handoff records today’s responsive Settings refinement. Preserve the
current worktree and all earlier uncommitted Agilearn changes.

## Delivered

- Replaced the mobile Settings footer button that opened the global command
  palette with the existing inline `SettingsSearchBar`.
- Settings search now filters Settings sections in place and navigates directly
  to a matching section; it does not trigger the modal search experience.
- The global `CommandPalette` is not mounted while Settings is active below
  `lg`, so Cmd/Ctrl+K cannot open the global search modal from mobile Settings.
- Set the Settings search input to an explicit `16px` text size for iOS PWA
  behavior and to prevent Safari focus zoom on XS/SM/MD screens.

## Verification

- The change is scoped to the responsive Settings shell and search input.
- `pnpm run typecheck` — passed.
- `pnpm run test -- --reporter=dot` — 7 files, 97 tests passed.
- `pnpm run build` — passed; the existing non-blocking `ExportMenu` chunk-size
  warning remains.

## Commit message

`fix(settings): keep mobile search inline and prevent iOS input zoom`
