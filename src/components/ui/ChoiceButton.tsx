import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Selectable pill/card button, shared by every "pick one of a few options"
 * fieldset (subject session type, grading-period share). Two content shapes:
 * `title`/`detail` for a two-line card, or `children` for a single-line pill
 * — padding and the selected-state text treatment follow whichever shape is
 * used, so neither shape's original look changes.
 */
export function ChoiceButton({
  selected,
  onSelect,
  title,
  detail,
  className,
  children,
}: {
  selected: boolean
  onSelect: () => void
  title?: string
  detail?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'rounded-xl border text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-350)',
        children != null ? 'px-3 py-2' : 'p-3',
        selected
          ? 'border-(--color-accent-400) bg-(--color-accent-400)/10'
          : 'border-(--color-border) hover:border-(--color-border-strong)',
        children != null &&
          (selected
            ? 'font-medium text-(--color-ink)'
            : 'text-(--color-ink-muted) hover:text-(--color-ink)'),
        className,
      )}
    >
      {children ?? (
        <>
          <span className="block text-sm font-medium text-(--color-ink)">{title}</span>
          {detail && (
            <span className="mt-0.5 block text-xs text-(--color-ink-muted)">
              {detail}
            </span>
          )}
        </>
      )}
    </button>
  )
}
