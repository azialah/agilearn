import type { ReactNode } from 'react'
import { Label } from '@/components/ui/Label'
import { cn } from '@/lib/cn'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-(--color-danger)">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-(--color-ink-faint)">{hint}</p>
      ) : null}
    </div>
  )
}
