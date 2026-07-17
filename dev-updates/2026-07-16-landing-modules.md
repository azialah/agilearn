# Landing page & Teaching modules

Date: 2026-07-16

## Landing page (`src/features/landing/`)

Replaced the placeholder marketing page with a full, motion-driven landing
experience. Exported name `LandingPage` is unchanged; the route file was not
touched.

- `LandingPage.tsx` — sticky, blurred nav (logo + Features anchor + Sign in →
  `/login`), hero, features grid, product showcase, CTA, footer.
- `AnimatedBackdrop.tsx` — fixed decorative layer: masked grid overlay, top
  accent wash, and two slowly-drifting light-blue gradient blobs (transform /
  opacity only, so it stays cheap).
- `MagneticButton.tsx` — pointer-following wrapper (motion values + spring) used
  on the primary CTAs.
- `ProductMock.tsx` — hand-built gradebook surface (no screenshots): faux window
  chrome, weighted-average chip, and grade bars that animate on scroll, plus a
  floating attendance stat.

Motion details:

- Hero headline reveals per word with a staggered clip-up; badge, subcopy, and
  CTAs fade in on the same timeline.
- Section headings, feature cards, showcase, and CTA use `whileInView` reveals
  with `once` viewports (no re-trigger, no layout shift).
- Feature cards and CTAs lift on hover (spring).
- Everything honors `prefers-reduced-motion` via `useReducedMotion` — offsets
  collapse to 0 and the ambient blobs hold still.

Palette and tokens come entirely from `src/styles/app.css`; layout is
mobile-first and responsive at `sm`/`lg`.

## Teaching modules (`src/features/modules/`, `src/lib/queries/modules.ts`)

A shared "cloud folder" for teaching materials backed by the
`teaching_modules` table and the private `teaching-modules` storage bucket.

Query layer (`src/lib/queries/modules.ts`), following the existing hook +
`keys` factory conventions:

- `useModules()` — all modules with owner (`profiles`) and classroom joins,
  newest first.
- `useUploadModule()` — generates a UUID, uploads to
  `{ownerId}/{moduleId}/{filename}` (first segment matches the storage RLS owner
  check), then inserts the metadata row. On insert failure the just-uploaded
  object is removed so no orphan remains. Filenames are sanitized to a single
  clean path segment.
- `useUpdateModule()` / `useDeleteModule()` — metadata edit and delete (delete
  removes the storage object first, then the row).
- `createModuleSignedUrl()` — 60s signed URL with a `download` disposition.

UI:

- `ModulesPage.tsx` — responsive card grid. Each card shows kind badge, title,
  description, owner, optional classroom link, file size, and date. Filters:
  title/description/owner search, kind select, and a "Mine only" toggle.
  Download uses a signed URL; owner or admin sees edit/delete. Loading skeletons,
  empty states (no modules vs. no matches), and toasts throughout.
- `ModuleUploadDialog.tsx` — file picker (with size readout), kind, title,
  description, optional classroom select, and an animated indeterminate progress
  bar while uploading.
- `ModuleEditDialog.tsx` — metadata editing for kind, title, description, and
  classroom.

Pure helpers live in `helpers.ts` (`formatFileSize`, `formatModuleDate`,
`filterModules`, kind metadata) and are covered by `helpers.test.ts`
(13 tests).

## Verification

- `tsc -b --noEmit` — clean.
- `vitest run src/features/modules` — 13 passed.
- `prettier --check` on all created files — clean.
