import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'solid' | 'danger'
  size?: 'sm' | 'md'
  /** Opt out when the control already sits inside its own labelled context. */
  showTooltip?: boolean
}

const variants = {
  ghost: 'text-(--color-ink-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)',
  solid: 'bg-(--color-surface-3) text-(--color-ink) hover:bg-(--color-border)',
  danger:
    'text-(--color-ink-muted) hover:bg-(--color-danger)/15 hover:text-(--color-danger)',
}

/**
 * Icon-only button. `label` is both the accessible name and the tooltip text —
 * a native `title` was used before, which never appears on keyboard focus, so
 * anyone not using a mouse had no way to learn what the icon meant.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, label, variant = 'ghost', size = 'md', showTooltip = true, ...props },
    ref,
  ) => {
    const button = (
      <button
        ref={ref}
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)',
          'disabled:cursor-not-allowed disabled:opacity-40',
          size === 'sm' ? 'size-7' : 'size-9',
          variants[variant],
          className,
        )}
        {...props}
      />
    )

    // A disabled button never receives focus or hover, so a tooltip on it would
    // be unreachable anyway.
    if (!showTooltip || props.disabled) return button
    return <Tooltip content={label}>{button}</Tooltip>
  },
)
IconButton.displayName = 'IconButton'
