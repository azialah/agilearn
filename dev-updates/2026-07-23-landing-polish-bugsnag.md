# 2026-07-23 — Landing page polish, testimonial stagger, and Bugsnag

This handoff records the **uncommitted** Agilearn work from 2026-07-23.
**Preserve the current worktree** — do not reset, checkout, or discard
unrelated modifications.

Note: the earlier same-day batch (auth screen pill-CTA polish, `PageLoader`
splash, `NetworkStatusWatcher`, real logo assets, maskable PWA icon) is
**already committed** as `d275c46 feat: add network status watcher and
loading components` and does not need to be redone. Everything below is
what's still sitting uncommitted on top of that.

## What landed

### Landing page — CTA, testimonial, footer

- `CallToAction` (bottom-of-page CTA in `LandingPage.tsx`): button now matches
  the hero's pill/arrow/shadow-glow treatment instead of a plain default
  button; added a small 3-item feature recap row (weighted grades, live
  attendance, shared modules) and a reassurance line ("Sign in with your
  school email — no setup, no waiting."); added a large (5% opacity) logo
  watermark bleeding off the card's top-right corner for quiet depth.
- Footer gained a fourth "Developer" nav column with real contact links:
  email (`mailto:`), WhatsApp (`https://wa.me/639474217919`), LinkedIn
  (`https://www.linkedin.com/in/johnneomlpz/`) — all via `lucide-react`
  `Mail`/`MessageCircle`/`ExternalLink` icons (no brand-logo icons available
  in the installed lucide version). These are personal contacts standing in
  until a Codexia-branded channel exists — noted in a code comment.
- `AuthShell`/`AuthRail` brand rows (`wizard-ui.tsx`, committed earlier) now
  additionally verified: clicking the logo+"Agilearn" wordmark on
  login/signup/forgot-password navigates to `/` (landing page).

### Testimonial — scroll-triggered word stagger

- Added `RevealWords` to `src/features/landing/Reveal.tsx`: reveals a string
  word-by-word via Motion `variants` + `whileInView`, same `staggerChildren`
  pattern as the auth `StaggerGroup` but scroll-triggered instead of
  mount-triggered. Falls back to static text under `prefers-reduced-motion`.
- `Testimonial`'s blockquote now uses `RevealWords`; the avatar/attribution
  block follows via the existing `Reveal` component with `delay={1}`.
- **Bug fix, unverified in-session**: the user reported the testimonial
  fading out again on scroll-up despite `viewport={{ once: true }}`. Root
  cause suspected: the `viewport` object was an inline literal recreated on
  every render of `Reveal`/`RevealWords`, which can make Motion's `once`
  tracking re-arm. Fixed by hoisting `revealViewport` and `wordViewport` to
  module-level constants in `Reveal.tsx` so the object identity is stable
  across re-renders. **I could not visually re-confirm this fix** — the
  browser tab in this session stayed in a backgrounded/throttled
  (`document.hidden === true`) state that prevents Motion's rAF-driven
  animations from playing, a repeated limitation this session. Codex/next
  session: manually verify by scrolling the testimonial in and out of view
  several times in a real (foregrounded) browser tab.

### Bugsnag (error + performance monitoring)

- Added `@bugsnag/js`, `@bugsnag/plugin-react`, `@bugsnag/browser-performance`
  via `pnpm add` (this modifies `package.json`/`pnpm-lock.yaml`, which
  `.claude/CLAUDE.md` §3 normally treats as off-limits — done here on an
  explicit, specific user request, flagged transparently at the time).
- New `src/lib/bugsnag.tsx`: starts Bugsnag + performance monitoring when
  `VITE_BUGSNAG_API_KEY` is present; degrades to a silent no-op passthrough
  `ErrorBoundary` with a console warning when the key is missing (e.g. a
  contributor without the key in their local env).
- `src/main.tsx` now wraps `<RouterProvider>` in `<ErrorBoundary>` from
  `bugsnag.tsx`.
- `VITE_BUGSNAG_API_KEY` added to `.env.local` (real key, gitignored) and
  `.env.example` (placeholder only); typed in `src/vite-env.d.ts`
  (`ImportMetaEnv`).
- Verified at the time: no console errors on load with the real key present
  (confirmed via `read_console_messages`), so the SDK initializes cleanly in
  dev. Not yet verified against an actual thrown error or a real Bugsnag
  dashboard event.

### Aside — not fixed, flagged only

- `.env.local` has a `SUPABASE_SERVICE_ROLE_KEY` entry whose value is
  actually just a copy-paste of the anon key (not a real elevated secret).
  Mislabeled, and harmless since it's not `VITE_`-prefixed (never reaches the
  client bundle), but worth cleaning up or renaming so it doesn't read as a
  live service-role leak on a future audit.

## Verification

**Per explicit user instruction ("temporarily do not lint, type check, and
build"), the CI gate was intentionally skipped for the Reveal.tsx viewport
fix** — this is the one thing in this handoff that has *not* been gated.
Everything before that (CTA/footer/Bugsnag wiring) was gated individually as
it landed:

- `pnpm run format` + `pnpm run typecheck` — passed, each time it was run.
- `pnpm run build` — passed, each time it was run (PWA precache count and
  size grew as expected with the new Bugsnag bundle and icon assets).
- Browser checks done via the preview pane: footer WhatsApp/LinkedIn hrefs
  confirmed correct and `target="_blank"`; CTA watermark confirmed rendering
  at the right opacity/size; RevealWords confirmed structurally correct
  (each word is its own `motion.span`, starts at `opacity: 0`) — but see the
  unverified fix note above.

**Before calling this done, Codex must**:

1. Run `pnpm run format` → `pnpm run typecheck` → `pnpm run build` (none of
   this has been re-gated since the `Reveal.tsx` edit).
2. Manually scroll the testimonial section up/down repeatedly in a real
   foregrounded browser tab to confirm the fade-on-scroll-up bug is actually
   fixed — this was not visually re-verified in this session.
3. Confirm the WhatsApp link (`https://wa.me/639474217919`) actually opens
   the correct chat — built from `+63 09474217919` by dropping the local
   leading `0` and prepending country code `63`; this format wasn't tested
   against a live device.

## Commit message (draft, once verified)

`feat(landing): polish CTA/testimonial, add developer contacts, wire Bugsnag`
