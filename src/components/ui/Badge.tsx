import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<BadgeTone, string> = {
  // ink, not ink-muted: muted on surface-3 measures 3.93:1 in the light theme and
  // 4.23:1 in calm-white, both under the 4.5:1 floor for text this size.
  neutral: 'bg-(--color-surface-3) text-(--color-ink)',
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
