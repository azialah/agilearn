import { useState, type ReactNode } from 'react'
import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useScrollFrame } from './fx'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import './marketing.css'

interface Props {
  variant: 'landing' | 'page'
  children: ReactNode
}

/**
 * Page frame for the public marketing surface: header, footer, the floating
 * back-to-top button (after the first screen).
 */
export function MarketingShell({ variant, children }: Props) {
  const reduce = useReducedMotion() ?? false
  const [fab, setFab] = useState(false)

  useScrollFrame(() => {
    const y = window.scrollY
    setFab(y > window.innerHeight * 0.9)
  })

  return (
    <div className="c-root">
      <div className={cn('m c', variant === 'page' && 'pg')}>
        <a href="#main" className="c-skip">
          Skip to content
        </a>
        <SiteNav variant={variant} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <div className={cn('c-fab', fab && 'show')} inert={!fab}>
          <button
            type="button"
            aria-label="Back to top"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
            }
          >
            <ArrowRight className="ico" aria-hidden="true" />
            <span aria-hidden="true">Back to top</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/** Back = in-app history when there is some, Home when the page was opened directly. */
export function BackButton() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return (
    <button
      type="button"
      className="pg-back"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: '/' }))}
    >
      <ArrowRight className="ico" aria-hidden="true" />
      Back
    </button>
  )
}

/** Hero for a public page: Back + breadcrumb, kicker, h1 and lead. */
export function PageHero({
  crumb,
  kicker,
  title,
  lead,
  children,
}: {
  crumb: string
  kicker: string
  title: ReactNode
  lead: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="c-hero pg-hero">
      <div className="c-wrap">
        <div className="pg-crumbs">
          <BackButton />
          <ol aria-label="Breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <span aria-current="page">{crumb}</span>
            </li>
          </ol>
        </div>
        <span className="c-kick pg-kick">
          <i />
          {kicker}
        </span>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {children}
      </div>
    </section>
  )
}

/** "Next page" card at the bottom of each public page. */
export function NextPage({
  to,
  label,
}: {
  to: '/how-it-works' | '/features' | '/about' | '/privacy' | '/terms'
  label: string
}) {
  return (
    <div className="c-wrap">
      <Link to={to} className="pg-next">
        <span>
          <small>Next page</small>
          <b>{label}</b>
        </span>
        <ArrowRight className="ico" aria-hidden="true" />
      </Link>
    </div>
  )
}
