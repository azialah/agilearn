import { Link } from '@tanstack/react-router'
import { Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { LinkedInIcon } from '@/components/icons'
import { Logo } from '@/components/ui/Logo'

const footerLinkClass =
  'text-sm text-(--color-ink-muted) transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-(--color-ink)'

/**
 * The one public footer, shared by the landing page and every public shell page
 * (features / about / privacy / terms) so they no longer diverge.
 *
 * The Request-access and FAQ entries use `<Link to="/" hash>` rather than bare
 * `#anchor` hrefs — those sections only exist on the landing page, so a plain
 * anchor would be a dead link everywhere else.
 */
export function PublicFooter() {
  return (
    <footer className="relative mt-16 border-t border-(--color-border)">
      {/* Warm wash bleeding up from the fold for depth. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.06]" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-lg font-semibold tracking-tight">Agilearn</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-(--color-ink-muted)">
              Named for the Philippine eagle, the Haribon: sharp-eyed and exact. Grades,
              attendance, and modules in one calm workspace.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-ink-faint)">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/features" className={footerLinkClass}>
                  Features
                </Link>
              </li>
              <li>
                <Link to="/about" className={footerLinkClass}>
                  About Agilearn
                </Link>
              </li>
              <li>
                <Link to="/" hash="request-access" className={footerLinkClass}>
                  Request access
                </Link>
              </li>
              <li>
                <Link to="/" hash="faq" className={footerLinkClass}>
                  FAQ
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-ink-faint)">
              Account
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/login" className={footerLinkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/forgot-password" className={footerLinkClass}>
                  Forgot password
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-ink-faint)">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/privacy" className={footerLinkClass}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className={footerLinkClass}>
                  Terms
                </Link>
              </li>
            </ul>
          </nav>

          {/* Personal contacts for now — will move to a Codexia-branded
              email/channel once that's set up. */}
          <nav aria-label="Developer">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-(--color-ink-faint)">
              Developer
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="mailto:johnneomanuel@gmail.com"
                  className={cn(footerLinkClass, 'flex items-center gap-2')}
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">Email</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/639474217919"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(footerLinkClass, 'flex items-center gap-2')}
                >
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">WhatsApp</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/johnneomlpz/"
                  target="_blank"
                  rel="noreferrer"
                  className={cn(footerLinkClass, 'flex items-center gap-2')}
                >
                  <LinkedInIcon className="size-4 shrink-0" />
                  <span className="truncate">LinkedIn</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-(--color-border) pt-6 sm:flex-row">
          <p className="text-sm text-(--color-ink-faint)">
            © {new Date().getFullYear()} Agilearn. Built for teachers.
          </p>
          <p className="font-mono text-xs text-(--color-ink-faint)">
            Agila + Learn = Agilearn
          </p>
        </div>
      </div>
    </footer>
  )
}
