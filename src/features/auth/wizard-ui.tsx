import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Logo } from '@/components/ui/Logo'
import { useViewportLock } from './useViewportLock'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { BackgroundLines } from '@/components/ui/BackgroundLines'
import { cn } from '@/lib/cn'

/** True at `lg` and up — the breakpoint where the desktop rail + staggered
 * text reveal replace the plain mobile fade (per design: xs/sm/md keep their
 * existing subtle animation untouched). */
function useIsLargeScreen() {
  const [large, setLarge] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setLarge(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  return large
}

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

/**
 * Groups direct `StaggerItem` children so they reveal one after another on
 * `lg`+ screens, replaying on every mount (step change or refresh). Below
 * `lg` it renders children as-is — the existing per-page fade stays untouched.
 */
export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const isLarge = useIsLargeScreen()
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  if (!isLarge) {
    // Fade only — no transform. A transform here would become the containing
    // block for StickyCta's `position: fixed`, pinning the CTA to this box
    // (mid-screen) until the animation ends, then snapping it to the bottom.
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={className}
      >
        {children}
      </motion.div>
    )
  }
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** One reveal step inside a `StaggerGroup`; a no-op passthrough below `lg`. */
export function StaggerItem({ children }: { children: ReactNode }) {
  const isLarge = useIsLargeScreen()
  if (!isLarge) return <>{children}</>
  return <motion.div variants={staggerItem}>{children}</motion.div>
}

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
          className="flex items-center gap-2 text-(--color-rail-fg)"
        >
          <Link to="/" className="flex items-center gap-2">
            <Logo size={9} />
            <span className="text-lg font-semibold tracking-tight">Agilearn</span>
          </Link>
        </motion.div>

        <motion.div
          key={title}
          variants={staggerContainer}
          initial={reduce ? 'visible' : 'hidden'}
          animate="visible"
          className="my-auto py-12"
        >
          <motion.p
            variants={staggerItem}
            className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-rail-fg-muted)"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            variants={staggerItem}
            className="mt-4 max-w-md text-balance font-display text-4xl font-semibold leading-[1.02] tracking-tight text-(--color-rail-fg) xl:text-5xl"
          >
            {title}
          </motion.h2>
          <motion.p
            variants={staggerItem}
            className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-[color-mix(in_srgb,var(--color-rail-fg)_72%,transparent)]"
          >
            {body}
          </motion.p>

          {milestones && (
            <motion.ol
              variants={staggerItem}
              className="mt-10 space-y-3"
              aria-label="Account setup progress"
            >
              {milestones.map((milestone) => (
                <li key={milestone.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors',
                      milestone.state === 'complete' &&
                        'border-(--color-accent-400) bg-(--color-accent-400) text-(--color-accent-fg)',
                      milestone.state === 'current' &&
                        'border-(--color-rail-fg-muted) bg-(--color-rail-fg-muted)/15 text-(--color-rail-fg-muted)',
                      milestone.state === 'upcoming' &&
                        'border-[color-mix(in_srgb,var(--color-rail-fg)_20%,transparent)] text-[color-mix(in_srgb,var(--color-rail-fg)_45%,transparent)]',
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
                        ? 'text-[color-mix(in_srgb,var(--color-rail-fg)_45%,transparent)]'
                        : 'font-medium text-(--color-rail-fg)',
                    )}
                  >
                    {milestone.label}
                  </span>
                </li>
              ))}
            </motion.ol>
          )}
        </motion.div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : 0.3 }}
          className="max-w-xs text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-rail-fg)_58%,transparent)]"
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
  mobileBrandCentered = false,
  mobileViewportLocked = false,
  mobileHeaderAction,
  mobileHeaderActionPosition = 'end',
  mobileHeaderSupplement,
  mobileFormTypography = false,
  mobileFormCentered = false,
}: {
  children: ReactNode
  rail?: AuthRailContent
  mobileBrandCentered?: boolean
  mobileViewportLocked?: boolean
  mobileHeaderAction?: ReactNode
  mobileHeaderActionPosition?: 'start' | 'end'
  mobileHeaderSupplement?: ReactNode
  mobileFormTypography?: boolean
  mobileFormCentered?: boolean
}) {
  const reduce = useReducedMotion()
  useViewportLock(mobileViewportLocked)
  return (
    <div
      className={cn(
        'pwa-auth-shell relative grid min-h-dvh bg-(--color-surface-0) lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]',
        mobileViewportLocked && 'max-lg:h-dvh max-lg:min-h-0 max-lg:overflow-hidden',
      )}
    >
      {rail && <AuthRail {...rail} />}
      <div
        className={cn(
          'relative flex min-h-dvh justify-center bg-(--color-surface-0) md:items-center md:bg-[radial-gradient(var(--color-border-strong)_1.5px,transparent_1.5px)] md:px-4 md:py-10 md:bg-size-[16px_16px]',
          mobileViewportLocked && 'max-lg:h-dvh max-lg:min-h-0 max-lg:overflow-hidden',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(50%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.14]" />
        <div className="absolute right-4 top-4 z-30 hidden md:block">
          <ThemeToggle />
        </div>
        {/* opacity + margin-top (not a transform) so the card eases in on
          mount without giving StickyCta's `position: fixed` a new
          containing block. */}
        <motion.div
          initial={reduce ? false : { opacity: 0, marginTop: 12 }}
          animate={{ opacity: 1, marginTop: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn(
            'relative w-full md:max-w-md',
            mobileViewportLocked && 'max-lg:h-dvh max-lg:overflow-hidden',
          )}
        >
          <Card
            className={cn(
              'max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:shadow-none',
              mobileViewportLocked
                ? 'max-lg:h-dvh max-lg:overflow-hidden'
                : 'max-md:min-h-dvh',
            )}
          >
            <div
              className={cn(
                'p-6',
                mobileViewportLocked
                  ? 'max-lg:h-full max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:pb-6'
                  : 'max-md:pb-[calc(7rem+env(safe-area-inset-bottom))]',
              )}
            >
              <motion.div
                initial={reduce ? false : { opacity: 0, marginTop: 8 }}
                animate={{ opacity: 1, marginTop: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: reduce ? 0 : 0.08 }}
                className={cn(
                  'mb-6 flex items-center gap-2',
                  mobileHeaderAction
                    ? 'max-lg:sticky max-lg:top-0 max-lg:z-40 max-lg:-mx-6 max-lg:mb-0 max-lg:flex-wrap max-lg:justify-between max-lg:px-6 max-lg:pt-[max(0.75rem,env(safe-area-inset-top))] max-lg:pb-3'
                    : mobileBrandCentered &&
                        'max-lg:mt-[max(1.5rem,env(safe-area-inset-top))] max-lg:justify-center',
                )}
              >
                {mobileHeaderActionPosition === 'start' && mobileHeaderAction && (
                  <div className="max-lg:block lg:hidden">{mobileHeaderAction}</div>
                )}
                <Link to="/" className="flex items-center gap-2">
                  <Logo />
                  <span className="text-lg font-semibold tracking-tight">Agilearn</span>
                </Link>
                {mobileHeaderActionPosition === 'end' && mobileHeaderAction && (
                  <div className="max-lg:block lg:hidden">{mobileHeaderAction}</div>
                )}
                {mobileHeaderSupplement && (
                  <div className="basis-full max-lg:block lg:hidden">
                    {mobileHeaderSupplement}
                  </div>
                )}
              </motion.div>
              {/* opacity + margin-top (not a transform) — see the note on the
                card wrapper above: a transform here would re-anchor
                StickyCta's `position: fixed` to this box. */}
              <motion.div
                initial={reduce ? false : { opacity: 0, marginTop: 10 }}
                animate={{ opacity: 1, marginTop: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: reduce ? 0 : 0.14 }}
                className={cn(
                  mobileFormTypography &&
                    'max-lg:[&_h1]:text-3xl max-lg:[&_h1]:leading-[1.06] max-lg:[&_h1]:tracking-tight sm:max-lg:[&_h1]:text-4xl max-lg:[&_p]:text-base max-lg:[&_label]:text-base max-lg:[&_button]:text-base max-lg:[&_a]:text-base',
                  mobileFormCentered &&
                    'max-lg:mx-auto max-lg:w-full max-lg:max-w-md max-lg:pt-[clamp(2rem,calc(50dvh-22rem),10rem)]',
                )}
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
  className?: string
  children: ReactNode
}

/** Label + control + inline error. */
export function Field({
  label,
  htmlFor,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 text-(--color-ink-faint)">(optional)</span>}
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
  /** Submits an external <form> by id, when the CTA sits outside it. */
  form?: string
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
  form,
}: StickyCtaProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-transparent px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:z-auto md:px-0 md:pt-2 md:pb-0">
      <Button
        type={type}
        form={form}
        size="lg"
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        className="w-full !rounded-full"
      >
        {label}
      </Button>
    </div>
  )
}
