# Mobile & PWA conventions

Rules that keep the app — especially the onboarding flow — feeling native on
phones and as an installed PWA. Honor these when touching auth/onboarding UI.

## No zoom on focus — inputs are 16px on mobile

iOS Safari **auto-zooms** the viewport when a focused input has a font-size below
16px, which then leaves the page scrolled/offset. To prevent it, every text input
renders at **16px on mobile** and drops to 14px density on `md+`:

```
text-base md:text-sm   // 16px < md, 14px ≥ md
```

This lives in the shared [`Input`](../src/components/ui/Input.tsx) and
[`PasswordInput`](../src/components/ui/PasswordInput.tsx). `PinInput` is already
`text-lg` (18px). **Do not** add `maximum-scale=1` / `user-scalable=no` to the
viewport to stop zoom — that breaks pinch-to-zoom accessibility. The 16px rule is
the accessible fix; keep user zoom enabled.

## No scroll on onboarding

Each onboarding screen should fit one viewport height with the primary CTA pinned
to the bottom:

- The auth frame ([`AuthShell`](../src/features/auth/wizard-ui.tsx)) is `min-h-dvh`
  and full-bleed under `md` (a centered card at `md+`).
- The primary CTA (`StickyCta`) is a **fixed bottom bar** under `md`, inline at
  `md+`. Content reserves bottom padding so nothing hides behind the bar.

## iPhone safe areas

`index.html` sets `viewport-fit=cover` so `env(safe-area-inset-*)` is available.
The fixed bottom CTA adds the home-indicator inset:

```
pb-[calc(1rem+env(safe-area-inset-bottom))]
```

## Installed PWA (no browser chrome)

The manifest is `display: standalone` (see `vite.config.ts`). iOS additionally
requires meta tags in `index.html` to run without the Safari URL/link bar:

- `apple-mobile-web-app-capable` / `mobile-web-app-capable` = `yes`
- `apple-mobile-web-app-status-bar-style` = `default`
- `apple-mobile-web-app-title`, and an `apple-touch-icon`

All in-app navigation is client-side (TanStack Router), so links stay inside the
standalone window — no external Safari tab opens. Manifest `theme_color` /
`background_color` track the light palette (`#faf5ec`).
