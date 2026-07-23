/**
 * Selectable color themes for the slideshow, modeled on the legacy
 * ocean/forest/sunset/royal/mono sets and modernized with richer gradients.
 *
 * Each theme is expressed as a bag of CSS custom properties applied to the
 * player root, so slide components can reference them with Tailwind arbitrary
 * values such as `text-(--ss-accent)`. Keeping this as pure data (no React)
 * makes the palette trivial to extend and test.
 */

export type SlideshowThemeId = 'ocean' | 'forest' | 'sunset' | 'royal' | 'mono'

export interface SlideshowTheme {
  id: SlideshowThemeId
  label: string
  /** Small emoji glyph mirroring the legacy picker. */
  glyph: string
  /** Preview gradient for the theme picker swatch. */
  swatch: string
  /** CSS custom properties applied to the player root. */
  vars: Record<string, string>
}

/**
 * Build the CSS-variable bag for a theme. `breakdown`/`average` are the two
 * slide background gradients; `accent` styles breakdown figures; `avg` is the
 * celebratory final-average color; `glow` tints ambient lighting.
 */
function vars(input: {
  breakdown: [string, string]
  average: [string, string]
  accent: string
  avg: string
  glow: string
}): Record<string, string> {
  return {
    '--ss-bg-breakdown': `linear-gradient(135deg, ${input.breakdown[0]} 0%, ${input.breakdown[1]} 100%)`,
    '--ss-bg-average': `linear-gradient(135deg, ${input.average[0]} 0%, ${input.average[1]} 100%)`,
    '--ss-accent': input.accent,
    '--ss-avg': input.avg,
    '--ss-glow': input.glow,
  }
}

export const THEMES: readonly SlideshowTheme[] = [
  {
    id: 'ocean',
    label: 'Ocean',
    glyph: '🌊',
    swatch: 'linear-gradient(135deg, #1e3a5f, #0f3460)',
    vars: vars({
      breakdown: ['#1e3a5f', '#0f172a'],
      average: ['#0f3460', '#0b1e3a'],
      accent: '#60a5fa',
      avg: '#34d399',
      glow: 'rgba(96, 165, 250, 0.35)',
    }),
  },
  {
    id: 'forest',
    label: 'Forest',
    glyph: '🌿',
    swatch: 'linear-gradient(135deg, #14532d, #15803d)',
    vars: vars({
      breakdown: ['#14532d', '#052e16'],
      average: ['#15803d', '#0a3d1f'],
      accent: '#4ade80',
      avg: '#fbbf24',
      glow: 'rgba(74, 222, 128, 0.32)',
    }),
  },
  {
    id: 'sunset',
    label: 'Sunset',
    glyph: '🌅',
    swatch: 'linear-gradient(135deg, #7c2d12, #9a3412)',
    vars: vars({
      breakdown: ['#7c2d12', '#1c0a03'],
      average: ['#9a3412', '#2d1204'],
      accent: '#fb923c',
      avg: '#f472b6',
      glow: 'rgba(251, 146, 60, 0.32)',
    }),
  },
  {
    id: 'royal',
    label: 'Royal',
    glyph: '👑',
    swatch: 'linear-gradient(135deg, #3730a3, #4c1d95)',
    vars: vars({
      breakdown: ['#3730a3', '#1e1b4b'],
      average: ['#4c1d95', '#241056'],
      accent: '#a78bfa',
      avg: '#34d399',
      glow: 'rgba(167, 139, 250, 0.34)',
    }),
  },
  {
    id: 'mono',
    label: 'Mono',
    glyph: '⬛',
    swatch: 'linear-gradient(135deg, #374151, #111827)',
    vars: vars({
      breakdown: ['#1f2937', '#030712'],
      average: ['#374151', '#0b0f17'],
      accent: '#e5e7eb',
      avg: '#ffffff',
      glow: 'rgba(229, 231, 235, 0.2)',
    }),
  },
]

export const DEFAULT_THEME_ID: SlideshowThemeId = 'ocean'

export function themeById(id: SlideshowThemeId): SlideshowTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}
