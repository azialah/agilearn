import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-9 w-full rounded-md border border-(--color-border)',
        // 16px on mobile prevents iOS auto-zoom on focus; 14px density on desktop.
        'bg-(--color-surface-1) px-3 text-base md:text-sm text-(--color-ink)',
        'placeholder:text-(--color-ink-faint) transition-colors',
        'focus-visible:border-(--color-accent-400) focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
