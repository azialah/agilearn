import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'solid' | 'danger'
  size?: 'sm' | 'md'
}

const variants = {
  ghost:
    'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]',
  solid:
    'bg-[var(--color-surface-3)] text-[var(--color-ink)] hover:bg-[var(--color-border)]',
  danger:
    'text-[var(--color-ink-muted)] hover:bg-[var(--color-danger)]/15 hover:text-[var(--color-danger)]',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = 'ghost', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-md)] transition-colors',
        'focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' ? 'size-7' : 'size-9',
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'
