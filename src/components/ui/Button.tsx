import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium ' +
  'transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ' +
  'whitespace-nowrap select-none'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent-400)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-350)]',
  secondary:
    'bg-[var(--color-surface-3)] text-[var(--color-ink)] hover:bg-[var(--color-border)]',
  outline:
    'border border-[var(--color-border-strong)] text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]',
  ghost:
    'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-110',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
