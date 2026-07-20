import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
        // 16px on mobile prevents iOS auto-zoom on focus; 14px density on desktop.
        'bg-[var(--color-surface-1)] px-3 text-base md:text-sm text-[var(--color-ink)]',
        'placeholder:text-[var(--color-ink-faint)] transition-colors',
        'focus-visible:border-[var(--color-accent-400)] focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
