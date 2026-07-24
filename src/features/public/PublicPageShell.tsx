import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Button } from '@/components/ui/Button'

const navLinkClass =
  'rounded-full px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)'

const footerLinkClass =
  'text-sm text-(--color-ink-muted) underline decoration-(--color-border-strong) underline-offset-4 transition-colors hover:text-(--color-ink)'

export function PublicPageShell({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="min-h-dvh bg-(--color-surface-0) text-(--color-ink)">
      <header className="sticky top-0 z-40 px-4 pt-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-(--color-border) bg-(--color-surface-1)/85 px-3 py-2 shadow-(--shadow-card) backdrop-blur-md sm:px-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
          >
            <Logo />
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              Agilearn
            </span>
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-1">
            <Link to="/features" className={navLinkClass}>
              <span className="hidden sm:inline">Features</span>
              <span className="sm:hidden">Explore</span>
            </Link>
            <Link to="/about" className={navLinkClass}>
              <span className="hidden sm:inline">About</span>
              <span className="sm:hidden">About</span>
            </Link>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link to="/login">
              <Button size="sm" className="!rounded-full">
                Sign in
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden px-6 pb-14 pt-20 sm:pb-18 sm:pt-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[min(52rem,120vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-accent-400),transparent_68%)] opacity-12 blur-3xl"
          />
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-(--color-accent-350)">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-(--color-ink-muted) sm:text-lg">
              {description}
            </p>
          </div>
        </section>

        {children}
      </main>

      <footer className="mt-16 border-t border-(--color-border)">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-8 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-sm text-(--color-ink-faint)">
            © {new Date().getFullYear()} Agilearn. Built for teachers.
          </p>
          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap justify-center gap-x-5 gap-y-3 sm:justify-end"
          >
            <Link to="/features" className={footerLinkClass}>
              Features
            </Link>
            <Link to="/about" className={footerLinkClass}>
              About
            </Link>
            <Link to="/privacy" className={footerLinkClass}>
              Privacy
            </Link>
            <Link to="/terms" className={footerLinkClass}>
              Terms
            </Link>
            <Link to="/" className={footerLinkClass}>
              Home <ArrowUpRight className="ml-1 inline size-3" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
