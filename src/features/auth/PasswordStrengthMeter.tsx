import { HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { passwordStrength } from './passwordStrength'

const SEGMENT_COLOR = [
  '', // score 0 → all segments stay muted
  'bg-[var(--color-danger)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-success)]',
] as const

const TIPS = [
  'Use at least 8 characters (12+ is stronger).',
  'Mix uppercase and lowercase letters.',
  'Add at least one number.',
  'Add a symbol like ! ? @ or #.',
]

/** Segmented strength bar with a help modal, shown under the password field. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password)

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5" aria-hidden>
        {[1, 2, 3].map((seg) => (
          <span
            key={seg}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              score >= seg ? SEGMENT_COLOR[score] : 'bg-[var(--color-surface-3)]',
            )}
          />
        ))}
      </div>
      {password && (
        <span className="text-xs text-[var(--color-ink-muted)]" aria-live="polite">
          {label}
        </span>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Password tips"
            className="rounded-full p-0.5 text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink)]"
          >
            <HelpCircle className="size-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password tips</DialogTitle>
            <DialogDescription>
              A stronger password is harder to guess. Aim for all of these:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--color-ink-muted)]">
            {TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  )
}
