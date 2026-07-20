import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/cn'

/** Branded auth page frame: backdrop, theme toggle, centered card. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh justify-center bg-[var(--color-surface-0)] md:items-center md:bg-[radial-gradient(var(--color-border-strong)_1.5px,transparent_1.5px)] md:px-4 md:py-10 md:[background-size:16px_16px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(50%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.14]" />
      <div className="absolute right-4 top-4 z-30">
        <ThemeToggle />
      </div>
      <Card className="relative w-full md:max-w-md max-md:min-h-dvh max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none">
        <div className="p-6 max-md:pb-[calc(7rem+env(safe-area-inset-bottom))]">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">Agilearn</span>
          </div>
          {children}
        </div>
      </Card>
    </div>
  )
}

/** Segmented progress bar for a wizard (current is 0-indexed). */
export function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-5 flex gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            i <= current ? 'bg-[var(--color-accent-400)]' : 'bg-[var(--color-surface-3)]',
          )}
        />
      ))}
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  optional?: boolean
  children: ReactNode
}

/** Label + control + inline error. */
export function Field({ label, htmlFor, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {optional && (
          <span className="ml-1 text-[var(--color-ink-faint)]">(optional)</span>
        )}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

/** Muted helper line explaining why we ask for profiling data. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
      {children}
    </p>
  )
}

/** Top-level form error box. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]"
    >
      {message}
    </p>
  )
}

interface StickyCtaProps {
  label: string
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
}

/**
 * Primary pill CTA that sticks to the bottom of the viewport on mobile and sits
 * inline on larger screens. Render inside the step's <form> so type="submit"
 * works.
 */
export function StickyCta({
  label,
  type = 'submit',
  loading,
  disabled,
  onClick,
}: StickyCtaProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pt-2 md:pb-0">
      <Button
        type={type}
        size="lg"
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        className="w-full rounded-full"
      >
        {label}
      </Button>
    </div>
  )
}
