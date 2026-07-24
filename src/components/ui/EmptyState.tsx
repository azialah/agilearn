import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  title,
  description,
  icon,
  action,
  preview,
  className,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  /**
   * Optional ghosted preview of the populated UI, rendered faded + blurred
   * behind the call to action so new users can see what the page becomes.
   */
  preview?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        'border border-dashed border-(--color-border-strong) bg-(--color-surface-1)/40',
        className,
      )}
    >
      {preview && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 select-none opacity-40 blur-[1.5px] mask-[linear-gradient(to_bottom,transparent,black_16%,black_62%,transparent)]"
          >
            {preview}
          </div>
          {/* Surface-tinted scrim keeps the CTA legible over the preview. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_52%,var(--color-surface-1),transparent)]"
          />
        </>
      )}
      <div className="relative flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        {icon && <div className="text-(--color-ink-faint) [&>svg]:size-8">{icon}</div>}
        <div className="space-y-1">
          <p className="text-base font-semibold text-(--color-ink)">{title}</p>
          {description && (
            <p className="mx-auto max-w-sm text-sm text-(--color-ink-muted)">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}
