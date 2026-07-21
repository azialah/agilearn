import { useTheme, type Theme } from '@/lib/theme'
import { MonitorIcon, MoonIcon, SunIcon } from '@/components/icons'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

const CalmWhiteIcon = () => <Sparkles />
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
        'inline-flex items-center gap-0.5 rounded-full border border-[var(--color-border)]',
        'bg-[var(--color-surface-1)] p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-full text-[0.95rem] transition-colors',
              active
                ? 'bg-[var(--color-accent-400)] text-[var(--color-accent-fg)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}
