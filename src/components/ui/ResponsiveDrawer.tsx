import * as DialogPrimitive from '@radix-ui/react-dialog'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

export const ResponsiveDrawer = DialogPrimitive.Root
export const ResponsiveDrawerTrigger = DialogPrimitive.Trigger

export function ResponsiveDrawerContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reducedMotion = useReducedMotion()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
      <DialogPrimitive.Content asChild>
        <motion.section
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.99 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: 'easeOut' }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] min-h-[74dvh] flex-col rounded-t-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-[var(--shadow-pop)] outline-none',
            'md:inset-x-auto md:left-1/2 md:top-1/2 md:min-h-0 md:w-[min(42rem,calc(100%-3rem))] md:max-h-[86dvh] md:[translate:-50%_-50%] md:rounded-[2rem]',
            className,
          )}
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--color-border-strong)] md:hidden" />
          {children}
        </motion.section>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function ResponsiveDrawerHeader({
  title,
  description,
  step,
}: {
  title: string
  description?: string
  step?: { current: number; total: number; label: string }
}) {
  return (
    <header className="shrink-0 border-b border-[var(--color-border)] px-5 pb-4 pt-5 sm:px-6">
      {step && (
        <div className="mb-3 flex items-center justify-between text-xs text-[var(--color-ink-faint)]">
          <span>{step.label}</span>
          <span>
            {step.current} of {step.total}
          </span>
        </div>
      )}
      <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
        {title}
      </DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-[var(--color-ink-muted)]">
          {description}
        </DialogPrimitive.Description>
      )}
    </header>
  )
}

export function ResponsiveDrawerBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
  )
}

export function ResponsiveDrawerFooter({
  primaryLabel,
  primaryDisabled,
  primaryLoading,
  onPrimary,
  secondaryLabel = 'Cancel',
  onSecondary,
}: {
  primaryLabel: string
  primaryDisabled?: boolean
  primaryLoading?: boolean
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary: () => void
}) {
  return (
    <footer className="flex shrink-0 gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-1)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:justify-end">
      <Button
        type="button"
        variant="ghost"
        className="flex-1 rounded-full md:flex-none"
        onClick={onSecondary}
      >
        {secondaryLabel}
      </Button>
      <Button
        type="button"
        className="flex-1 rounded-full md:flex-none"
        loading={primaryLoading}
        disabled={primaryDisabled}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
    </footer>
  )
}
