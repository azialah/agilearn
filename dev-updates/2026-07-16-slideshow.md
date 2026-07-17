# Grade Slideshow — rebuild

Rebuilt the legacy Blade "grade slideshow" as a React feature under
`src/features/slideshow/`. Replaces the placeholder `SlideshowPage` (same
exported name); the route file was left untouched.

## What was built

- **`sequencing.ts`** — pure slide-sequencing engine. Two slides per student
  (grade breakdown, then final average). Exposes `buildSlides`, `wrapIndex`,
  `slideAt`, and `slideCounter`. Fully unit tested (`sequencing.test.ts`, 10
  cases covering ordering, index wrapping, counter labels, and empty rosters).
- **`useSlideshowData.ts`** — read-only aggregate hook. Composes the shared
  classroom / roster / gradebook-structure / scores queries and computes each
  student's grade breakdown with the pure engine in `@/lib/grading`. No new
  query-key tuples or `lib/queries` files were added. Component weights come
  from the classroom row (falling back to the grading defaults).
- **`themes.ts`** — five CSS-variable palettes (ocean / forest / sunset /
  royal / mono) modeled on the legacy sets, each supplying breakdown/average
  background gradients, an accent, a final-average color, and an ambient glow.
- **`SlidePlayer.tsx`** — fullscreen-feeling player rendered as a fixed overlay
  so the app chrome is hidden without touching the route or shell. 15s
  auto-advance, prev/next, pause/resume, a live slide counter, an optional real
  Fullscreen API toggle, and keyboard controls (←/→ navigate, space pauses,
  Esc exits). Slide transitions use `motion` (scale + fade + blur) with
  staggered text reveals.
- **`ProgressBar.tsx`** — isolated auto-advance bar with its own
  `requestAnimationFrame` loop that writes width straight to the DOM, so the
  60fps animation never re-renders the player. Pausing freezes elapsed time and
  resuming continues from where it stopped.
- **`Slides.tsx`** — the two slide layouts. Breakdown shows per-period
  lecture/laboratory grades plus overall component totals; average shows the
  large, celebratory final grade. Missing period grades render as an em dash and
  a null final renders as `N/A` with an explanatory note.
- **`ThemePicker.tsx`** — swatch popover for switching palette live.
- **`hooks.ts`** — `usePrefersReducedMotion` and a `useFullscreen` wrapper.

## Behavior parity + modernization

- Matches the legacy 15s cadence, two-slides-per-student structure, five themes,
  progress bar, slide counter, and keyboard/controls model.
- Adapted to the current schema: student identity uses `student_no` plus the
  classroom's year/block (the legacy per-student course/year fields no longer
  exist). Per-period breakdown replaces the legacy single lecture/lab pair.
- `prefers-reduced-motion` disables the scale/stagger animations and shortens
  transitions. Layout is mobile-first and scales up to projector-friendly type.

## Edge cases handled

- Empty classroom → in-shell empty state with a link back to the classroom.
- Load/error states → spinner and a graceful error empty state.
- Students with incomplete grades → shows whatever exists, marks the rest
  missing rather than failing.
- Scores query stays disabled until activity ids are known, so a class with no
  activities does not fire an empty `.in()` query and is not treated as loading.

## Verification

- `bunx tsc --noEmit` — clean.
- `bunx vitest run src/features/slideshow` — 1 file, 10 tests passing.
- `bunx prettier --write src/features/slideshow/` — formatted.
