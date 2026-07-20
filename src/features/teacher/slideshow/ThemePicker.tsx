import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { THEMES, type SlideshowThemeId } from './themes'

interface ThemePickerProps {
  value: SlideshowThemeId
  onChange: (id: SlideshowThemeId) => void
  reducedMotion: boolean
}

/**
 * Compact swatch popover for switching the slideshow palette. Closes on outside
 * click or Escape (Escape is stopped from bubbling so it does not also exit the
 * show).
 */
export function ThemePicker({ value, onChange, reducedMotion }: ThemePickerProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const active = THEMES.find((t) => t.id === value) ?? THEMES[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20"
      >
        <span
          aria-hidden
          className="size-3.5 rounded-full ring-1 ring-white/40"
          style={{ background: active.swatch }}
        />
        <span className="hidden sm:inline">{active.label}</span>
        <span aria-hidden className="text-white/50">
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reducedMotion ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border border-white/15 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md"
          >
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={theme.id === value}
                onClick={() => {
                  onChange(theme.id)
                  setOpen(false)
                }}
                className={
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ' +
                  (theme.id === value
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white')
                }
              >
                <span
                  aria-hidden
                  className="size-4 rounded-full ring-1 ring-white/30"
                  style={{ background: theme.swatch }}
                />
                <span className="flex-1">{theme.label}</span>
                <span aria-hidden>{theme.glyph}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
