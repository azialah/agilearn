import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-(--color-surface-3) text-(--color-ink-muted)',
  accent: 'bg-(--color-accent-500)/20 text-(--color-accent-300)',
  success: 'bg-(--color-success)/15 text-(--color-success)',
  warning: 'bg-(--color-warning)/15 text-(--color-warning)',
  danger: 'bg-(--color-danger)/15 text-(--color-danger)',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
