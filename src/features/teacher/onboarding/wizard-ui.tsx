import { cn } from '@/lib/cn'

/** Segmented progress bar for a wizard (current is 0-indexed). */
export function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div
      className="mb-5 flex gap-1.5 lg:hidden"
      role="progressbar"
      aria-label="Account setup progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-valuetext={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            i <= current ? 'bg-(--color-accent-400)' : 'bg-(--color-surface-3)',
          )}
        />
      ))}
    </div>
  )
}
