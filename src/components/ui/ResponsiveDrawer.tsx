import { createContext, useContext } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'

/** Radix unmounts on close, which would cut the exit animation off. The content
 *  is force-mounted and kept alive by AnimatePresence instead, so it needs to
 *  know `open` — Radix's own context is private. */
const OpenContext = createContext(false)

export function ResponsiveDrawer({
  open,
  children,
  ...props
}: DialogPrimitive.DialogProps) {
  return (
    <DialogPrimitive.Root open={open} {...props}>
      <OpenContext.Provider value={!!open}>{children}</OpenContext.Provider>
    </DialogPrimitive.Root>
  )
}

export const ResponsiveDrawerTrigger = DialogPrimitive.Trigger

export function ResponsiveDrawerContent({
  children,
  className,
  onInteractOutside,
  onEscapeKeyDown,
}: {
  children: React.ReactNode
  className?: string
  /** Forwarded to Radix — preventDefault() here to keep the drawer open. */
  onInteractOutside?: DialogPrimitive.DialogContentProps['onInteractOutside']
  onEscapeKeyDown?: DialogPrimitive.DialogContentProps['onEscapeKeyDown']
}) {
  const reducedMotion = useReducedMotion()
  const open = useContext(OpenContext)
  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content
            asChild
            forceMount
            onInteractOutside={onInteractOutside}
            onEscapeKeyDown={onEscapeKeyDown}
          >
            <motion.section
              initial={
                reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }
              }
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.99 }}
              transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className={cn(
                // `overflow-hidden` so the footer's solid background is clipped to
                // the radius instead of painting square over the bottom corners.
                'fixed z-50 flex flex-col overflow-hidden border border-(--color-border) bg-(--color-surface-1) shadow-(--shadow-pop) outline-none',
                // Bottom sheet below md. Scoped with max-md: because `bottom-0`
                // leaking past md left the element anchored top-1/2 AND bottom-0 —
                // a fixed box pinned at both edges stretches, so every centred
                // modal was forced to half the viewport height.
                'max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[92dvh] max-md:min-h-[60dvh] max-md:rounded-t-4xl',
                // Centred modal at md+.
                'md:left-1/2 md:top-1/2 md:max-h-[86dvh] md:w-[min(42rem,calc(100%-3rem))] md:rounded-4xl md:[translate:-50%_-50%]',
                'lg:max-h-[88dvh] lg:w-[min(52rem,calc(100%-4rem))] xl:w-[min(60rem,calc(100%-8rem))]',
                className,
              )}
            >
              <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-(--color-border-strong) md:hidden" />
              {children}
            </motion.section>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
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
    <header className="shrink-0 border-b border-(--color-border) px-5 pb-4 pt-5 sm:px-6">
      {step && (
        <div className="mb-3 flex items-center justify-between text-xs text-(--color-ink-faint)">
          <span>{step.label}</span>
          <span>
            {step.current} of {step.total}
          </span>
        </div>
      )}
      <DialogPrimitive.Title className="text-xl font-semibold tracking-tight text-(--color-ink)">
        {title}
      </DialogPrimitive.Title>
      {description && (
        <DialogPrimitive.Description className="mt-1 text-sm leading-6 text-(--color-ink-muted)">
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
  primaryVariant,
  onPrimary,
  secondaryLabel = 'Cancel',
  onSecondary,
  nudgeSecondary = 0,
}: {
  primaryLabel: string
  primaryDisabled?: boolean
  primaryLoading?: boolean
  primaryVariant?: React.ComponentProps<typeof Button>['variant']
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary: () => void
  /** Bump this counter to shake the secondary button — used to point a
   *  backdrop click at the only real way out of a dismissal-locked drawer. */
  nudgeSecondary?: number
}) {
  const reducedMotion = useReducedMotion()
  return (
    <footer className="flex shrink-0 gap-2 border-t border-(--color-border) bg-(--color-surface-1) px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:justify-end">
      <motion.div
        key={nudgeSecondary}
        animate={
          nudgeSecondary > 0 && !reducedMotion ? { x: [0, -6, 6, -4, 4, 0] } : undefined
        }
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="flex-1 md:flex-none"
      >
        <Button
          type="button"
          variant="outline"
          className="w-full md:w-auto"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </Button>
      </motion.div>
      <Button
        type="button"
        variant={primaryVariant}
        className="flex-1 md:flex-none"
        loading={primaryLoading}
        disabled={primaryDisabled}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Button>
    </footer>
  )
}
