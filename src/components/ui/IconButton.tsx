import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'solid' | 'danger'
  size?: 'sm' | 'md'
}

const variants = {
  ghost: 'text-(--color-ink-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)',
  solid: 'bg-(--color-surface-3) text-(--color-ink) hover:bg-(--color-border)',
  danger:
    'text-(--color-ink-muted) hover:bg-(--color-danger)/15 hover:text-(--color-danger)',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = 'ghost', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
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
