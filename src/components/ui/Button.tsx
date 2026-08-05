import { forwardRef, useState, type ButtonHTMLAttributes, type PointerEvent } from 'react'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

// No `focus-visible:outline-none` here: it used to suppress the global
// :focus-visible outline in app.css without replacing it, leaving every button
// in the app — Sign in, Save, Add student — with no keyboard focus indicator.
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium ' +
  'transition-[background-color,box-shadow,transform] duration-150 ' +
  'motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ' +
  'disabled:active:scale-100 whitespace-nowrap select-none'

const variants: Record<ButtonVariant, string> = {
  // Tinted shadow, not a generic gray one — the app's one accent color
  // carries its own depth instead of a default drop shadow.
  primary:
    'bg-(--color-accent-400) text-(--color-accent-fg) shadow-(--shadow-accent) hover:bg-(--color-accent-500)',
  secondary: 'bg-(--color-surface-3) text-(--color-ink) hover:bg-(--color-border)',
  outline:
    'border border-(--color-border-strong) bg-(--color-surface-2) text-(--color-ink) hover:bg-(--color-surface-3)',
  ghost: 'text-(--color-ink-muted) hover:bg-(--color-surface-2) hover:text-(--color-ink)',
  danger: 'bg-(--color-danger) text-white hover:brightness-110',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

let nextRippleId = 0

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      children,
      disabled,
      onPointerDown,
      ...props
    },
    ref,
  ) => {
    const reduce = useReducedMotion()
    const [ripples, setRipples] = useState<Ripple[]>([])

    function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (
        variant === 'primary' &&
        !reduce &&
        !disabled &&
        !loading &&
        event.button === 0
      ) {
        const rect = event.currentTarget.getBoundingClientRect()
        const size = Math.max(rect.width, rect.height) * 2
        setRipples((prev) => [
          ...prev,
          {
            id: nextRippleId++,
            x: event.clientX - rect.left - size / 2,
            y: event.clientY - rect.top - size / 2,
            size,
          },
        ])
      }
      onPointerDown?.(event)
    }

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          variant === 'primary' && 'ripple-btn',
          className,
        )}
        disabled={disabled || loading}
        onPointerDown={handlePointerDown}
        {...props}
      >
        {loading && <Spinner className="size-4" />}
        {children}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden="true"
            className="ripple"
            style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
            onAnimationEnd={() =>
              setRipples((prev) => prev.filter((ripple) => ripple.id !== r.id))
            }
          />
        ))}
      </button>
    )
  },
)
Button.displayName = 'Button'
