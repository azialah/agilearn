import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { BackgroundLines } from '@/components/ui/BackgroundLines'
import { cn } from '@/lib/cn'

export interface AuthRailMilestone {
  label: string
  state: 'complete' | 'current' | 'upcoming'
}

export interface AuthRailContent {
  eyebrow: string
  title: string
  body: string
  milestones?: readonly AuthRailMilestone[]
}

function AuthRail({ eyebrow, title, body, milestones }: AuthRailContent) {
  const reduce = useReducedMotion()
  return (
    <BackgroundLines className="hidden min-h-dvh text-(--color-accent-300) lg:block">
      <div className="absolute inset-0 z-10 bg-[linear-gradient(145deg,#1d120c_0%,#302016_52%,#4b260d_100%)] opacity-90" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_20%_20%,var(--color-accent-400),transparent_38%)] opacity-25" />
      <div className="relative z-20 flex min-h-dvh max-w-xl flex-col px-10 py-10 xl:px-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center gap-2 text-(--color-surface-1)"
        >
          <span className="flex size-9 items-center justify-center rounded-md bg-(--color-accent-400) text-sm font-bold text-(--color-accent-fg)">
            A
          </span>
          <span className="text-lg font-semibold tracking-tight">Agilearn</span>
        </motion.div>

        <motion.div
          key={title}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: reduce ? 0 : 0.12 }}
          className="my-auto py-12"
        >
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-accent-200)">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-md text-balance font-display text-4xl font-semibold leading-[1.02] tracking-tight text-(--color-surface-1) xl:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-[color-mix(in_srgb,var(--color-surface-1)_72%,transparent)]">
            {body}
          </p>

          {milestones && (
            <ol className="mt-10 space-y-3" aria-label="Account setup progress">
              {milestones.map((milestone) => (
                <li key={milestone.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
                      milestone.state === 'complete' &&
                        'border-(--color-accent-400) bg-(--color-accent-400) text-(--color-accent-fg)',
                      milestone.state === 'current' &&
                        'border-(--color-accent-200) bg-(--color-accent-200)/15 text-(--color-accent-100)',
                      milestone.state === 'upcoming' &&
                        'border-[color-mix(in_srgb,var(--color-surface-1)_20%,transparent)] text-[color-mix(in_srgb,var(--color-surface-1)_45%,transparent)]',
                    )}
                  >
                    {milestone.state === 'complete' ? (
                      <Check aria-hidden className="size-3.5" />
                    ) : null}
                    {milestone.state === 'current' ? (
                      <span className="size-1.5 rounded-full bg-current" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      milestone.state === 'upcoming'
                        ? 'text-[color-mix(in_srgb,var(--color-surface-1)_45%,transparent)]'
                        : 'font-medium text-(--color-surface-1)',
                    )}
                  >
                    {milestone.label}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </motion.div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 }}
          className="max-w-xs text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-surface-1)_58%,transparent)]"
        >
          One place for grades, attendance, and the materials that make class happen.
        </motion.p>
      </div>
    </BackgroundLines>
  )
}

/** Branded auth page frame: a desktop narrative rail and centered form card. */
export function AuthShell({
  children,
  rail,
}: {
  children: ReactNode
  rail?: AuthRailContent
}) {
  const reduce = useReducedMotion()
  return (
    <div className="relative grid min-h-dvh bg-(--color-surface-0) lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
      {rail && <AuthRail {...rail} />}
      <div className="relative flex min-h-dvh justify-center bg-(--color-surface-0) md:items-center md:bg-[radial-gradient(var(--color-border-strong)_1.5px,transparent_1.5px)] md:px-4 md:py-10 md:bg-size-[16px_16px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(50%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.14]" />
        <div className="absolute right-4 top-4 z-30">
          <ThemeToggle />
        </div>
        {/* opacity + margin-top (not a transform) so the card eases in on
          mount without giving StickyCta's `position: fixed` a new
          containing block. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, marginTop: 12 }}
          animate={{ opacity: 1, marginTop: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full md:max-w-md"
        >
          <Card className="max-md:min-h-dvh max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none">
            <div className="p-6 max-md:pb-[calc(7rem+env(safe-area-inset-bottom))]">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.08 }}
                className="mb-6 flex items-center gap-2"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-(--color-accent-400) text-sm font-bold text-(--color-accent-fg)">
                  A
                </span>
                <span className="text-lg font-semibold tracking-tight">Agilearn</span>
              </motion.div>
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.14 }}
              >
                {children}
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
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
          <span className="ml-1 text-(--color-ink-faint)">(optional)</span>
        )}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  )
}

/** Muted helper line explaining why we ask for profiling data. */
export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-(--color-surface-2) px-3 py-2 text-xs text-(--color-ink-muted)">
      {children}
    </p>
  )
}

/** Top-level form error box. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-(--color-danger)/40 bg-(--color-danger)/10 px-3 py-2 text-sm text-(--color-danger)"
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
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-(--color-border) bg-(--color-surface-1) px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:z-auto md:border-0 md:bg-transparent md:px-0 md:pt-2 md:pb-0">
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
