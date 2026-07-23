import { useTheme, type Theme } from '@/lib/theme'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Tooltip } from '@/components/ui/Tooltip'

// Match the sibling 1em custom glyphs (size + 1.8 stroke) instead of lucide's
// fixed 24px / stroke-2 defaults, which render oversized in this text-sized slot.
const CalmWhiteIcon = () => <Sparkles size="1em" strokeWidth={1.8} />
const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'white', label: 'Calm White', Icon: CalmWhiteIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
]

/** Three-way system / light / dark theme control. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-(--color-border)',
        'bg-(--color-surface-1) p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <Tooltip key={value} content={label}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-full text-[0.95rem] transition-colors',
                active
                  ? 'bg-(--color-accent-400) text-(--color-accent-fg)'
                  : 'text-(--color-ink-muted) hover:text-(--color-ink)',
              )}
            >
              <Icon />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
