import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)]',
        'border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-1)]/40',
        'px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="text-3xl text-[var(--color-ink-faint)]">{icon}</div>}
      <div className="space-y-1">
        <p className="font-medium text-[var(--color-ink)]">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-[var(--color-ink-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
