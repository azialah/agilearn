import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { useMagnetic, useScrollFrame, scrollToId } from './fx'
import { LANDING_SECTIONS, PAGE_LINKS } from './site'

interface Props {
  variant: 'landing' | 'page'
}

/**
 * The one public header. Landing: section links with a scroll-spy pill and a
 * "Week n of 18" scroll meter. Pages: route links with the current one marked.
 * Both hide on scroll-down past the hero and return on scroll-up, and open a
 * full-screen menu on phones.
 */
export function SiteNav({ variant }: Props) {
  const reduce = useReducedMotion() ?? false
  const magnetic = useMagnetic()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const spyRef = useRef<HTMLElement>(null)
  const linksRef = useRef<HTMLElement>(null)
  const termBar = useRef<HTMLElement>(null)
  const termWeek = useRef<HTMLElement>(null)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const lastY = useRef(0)

  useScrollFrame(() => {
    const nav = navRef.current
    if (!nav) return
    const y = window.scrollY
    nav.classList.toggle('scrolled', y > 24)
    if (y > 480 && y - lastY.current > 6) nav.classList.add('away')
    else if (lastY.current - y > 6 || y <= 480) nav.classList.remove('away')
    lastY.current = y

    if (variant !== 'landing') return
    const max = document.documentElement.scrollHeight - window.innerHeight
    const p = max > 0 ? Math.min(1, y / max) : 0
    if (termBar.current) termBar.current.style.width = `${(6 + p * 94).toFixed(1)}%`
    if (termWeek.current) termWeek.current.textContent = `Week ${1 + Math.round(p * 17)}`

    const links =
      linksRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-go]') ?? []
    let active: HTMLAnchorElement | null = null
    links.forEach((a) => {
      const el = document.getElementById(a.dataset.go ?? '')
      if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.4) active = a
    })
    links.forEach((a) => a.classList.toggle('on', a === active))
    const spy = spyRef.current
    if (spy) {
      const a = active as HTMLAnchorElement | null
      if (a) {
        spy.style.left = `${a.offsetLeft}px`
        spy.style.width = `${a.offsetWidth}px`
      }
      spy.classList.toggle('on', !!a)
    }
  })

  // Full-screen menu: lock page scroll, close on Escape, move focus in and back.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => closeBtn.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    // marketing.css hides the menu from a 700px container up; close it there so
    // a rotate/resize can't leave the page scroll-locked behind a hidden menu.
    const mq = window.matchMedia('(min-width: 700px)')
    const onMq = () => {
      if (mq.matches) setOpen(false)
    }
    mq.addEventListener('change', onMq)
    window.addEventListener('resize', onMq)
    // Modal: everything outside the menu is inert while it's open.
    const nav = navRef.current
    const background = [
      ...Array.from(nav?.parentElement?.children ?? []).filter((el) => el !== nav),
      ...Array.from(nav?.querySelectorAll('.c-nav-in') ?? []),
    ]
    background.forEach((el) => el.setAttribute('inert', ''))
    const btn = menuBtn.current
    return () => {
      document.body.style.overflow = prev
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
      window.removeEventListener('resize', onMq)
      background.forEach((el) => el.removeAttribute('inert'))
      btn?.focus()
    }
  }, [open])

  // Close the menu when the route changes (a menu link was followed).
  useEffect(() => setOpen(false), [path])

  function goSection(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setOpen(false)
    // Wait a frame so the body scroll lock is released before scrolling.
    requestAnimationFrame(() => scrollToId(id, reduce))
  }

  return (
    <header ref={navRef} className={cn('c-nav', open && 'menu-open')}>
      <div className="c-nav-in">
        <Link to="/" className="m-brand">
          <img className="brand-logo" src="/icon-192.png" alt="" width={30} height={30} />
          Agilearn
        </Link>
        <nav ref={linksRef} className="c-nav-links" aria-label="Main">
          {variant === 'landing' ? (
            <>
              <i ref={spyRef} className="c-spy" aria-hidden="true" />
              {LANDING_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  data-go={s.id}
                  onClick={(e) => goSection(e, s.id)}
                >
                  <span data-t={s.label}>{s.label}</span>
                </a>
              ))}
            </>
          ) : (
            PAGE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={cn(path === l.to && 'on')}
                aria-current={path === l.to ? 'page' : undefined}
              >
                <span data-t={l.label}>{l.label}</span>
              </Link>
            ))
          )}
        </nav>
        {variant === 'landing' && (
          <span className="c-term" aria-hidden="true">
            <i>
              <b ref={termBar} />
            </i>
            <em ref={termWeek}>Week 1</em> of 18
          </span>
        )}
        <Link to="/login" className="c-btn ghost">
          Sign in
        </Link>
        <Link to="/teacher/signup" className="c-btn c-mag" {...magnetic}>
          Start as a teacher
        </Link>
        <button
          ref={menuBtn}
          type="button"
          className="m-menu"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen(true)}
        >
          <span className="c-burger" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>
      <div
        id="site-menu"
        className="c-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="c-menu-top">
          <span className="c-menu-t">Menu</span>
          <button
            ref={closeBtn}
            type="button"
            className="c-menu-x"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className="c-menu-links" aria-label="Menu">
          {variant === 'landing' ? (
            LANDING_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={(e) => goSection(e, s.id)}>
                {s.id === 'how-it-works' ? (
                  <>
                    How it <em>works</em>
                  </>
                ) : (
                  s.label
                )}
              </a>
            ))
          ) : (
            <>
              <Link to="/">Home</Link>
              {PAGE_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={path === l.to ? 'page' : undefined}
                >
                  {l.to === '/how-it-works' ? (
                    <>
                      How it <em>works</em>
                    </>
                  ) : (
                    l.label
                  )}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="c-menu-cta">
          <Link to="/teacher/signup" className="c-btn">
            Start as a teacher
          </Link>
          <Link to="/login" className="c-btn ghost">
            Sign in
          </Link>
        </div>
        <span className="c-menu-foot">
          Made in the Philippines for Filipino classrooms
        </span>
      </div>
    </header>
  )
}
