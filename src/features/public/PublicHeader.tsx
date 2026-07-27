import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const navLinkClass =
  'rounded-full px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)'

/**
 * The one public header, shared by the landing page and every public shell page
 * so the nav never differs between them. Floating pill: large by default,
 * shrinks on scroll-down, grows on scroll-up.
 */
export function PublicHeader() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [compact, setCompact] = useState(false)
  const prev = useRef(0)

  useMotionValueEvent(scrollY, 'change', (y) => {
    if (reduce) {
      setCompact(false)
      return
    }
    if (y < 40) setCompact(false)
    else if (Math.abs(y - prev.current) > 6) setCompact(y > prev.current)
    prev.current = y
  })

  return (
    <header className="sticky top-0 z-40 px-4 pt-3">
      <div
        className={cn(
          'mx-auto flex items-center justify-between rounded-full border border-(--color-border) bg-(--color-surface-1)/85 backdrop-blur-md transition-all duration-300 ease-out',
          compact
            ? 'max-w-md gap-2 px-3 py-1.5 shadow-(--shadow-pop)'
            : 'max-w-3xl gap-4 px-5 py-3 shadow-(--shadow-card)',
        )}
      >
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
        >
          {/* shrink-0: in a tight flex row the mark would otherwise be
              compressed to 0px wide and vanish. */}
          <Logo className="shrink-0" />
          {!compact && (
            <span className="hidden text-lg font-semibold tracking-tight sm:inline">
              Agilearn
            </span>
          )}
        </Link>
        <nav aria-label="Public navigation" className="flex items-center gap-1">
          {/* Visible on phones too: the public shell pages previously exposed
              these on mobile, and hiding them would leave those pages with no
              navigation at all. Only the scrolled/compact pill hides them. */}
          <Link
            to="/features"
            className={cn(
              navLinkClass,
              'max-sm:px-2 max-sm:text-[13px]',
              compact && 'hidden',
            )}
          >
            Features
          </Link>
          <Link
            to="/about"
            className={cn(
              navLinkClass,
              'max-sm:px-2 max-sm:text-[13px]',
              compact && 'hidden',
            )}
          >
            About
          </Link>
          {/* Wrapped rather than passing `hidden` into ThemeToggle: cn() is
              clsx without tailwind-merge, so a `hidden` prop loses to the
              component's own `inline-flex` and the toggle stayed visible. */}
          <span className={cn('hidden sm:inline-flex', compact && 'sm:hidden')}>
            <ThemeToggle />
          </span>
          <Link to="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
