import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { CSSVars } from '@/features/landing/bits'
import { useMagnetic } from './fx'
import { DEVELOPER, FOOTER_COLUMNS } from './site'

const WORD = 'Agilearn'.split('')

/** Variable-weight wordmark: letters near the pointer grow heavier. */
function onWordMove(e: React.PointerEvent<HTMLDivElement>) {
  e.currentTarget.querySelectorAll<HTMLElement>('span').forEach((l) => {
    const r = l.getBoundingClientRect()
    const d = Math.hypot(
      e.clientX - (r.left + r.width / 2),
      e.clientY - (r.top + r.height / 2),
    )
    l.style.setProperty('--w', String(Math.round(300 + 500 * Math.max(0, 1 - d / 280))))
  })
}
function onWordLeave(e: React.PointerEvent<HTMLDivElement>) {
  e.currentTarget
    .querySelectorAll<HTMLElement>('span')
    .forEach((l) => l.style.removeProperty('--w'))
}

/** Flag of the Philippines, kept separate from the Agilearn mark (RA 8491). */
function PhFlag() {
  return (
    <svg
      className="ph-flag"
      viewBox="0 0 60 30"
      role="img"
      aria-label="Flag of the Philippines"
    >
      <rect width="60" height="15" fill="#0038a8" />
      <rect y="15" width="60" height="15" fill="#ce1126" />
      <path d="M0 0 26 15 0 30z" fill="#fff" />
      <circle cx="8.7" cy="15" r="3" fill="#fcd116" />
      <path
        d="M8.7 9.6v2.2M8.7 18.2v2.2M3.3 15h2.2M11.9 15h2.2M4.9 11.2l1.5 1.5M11 17.3l1.5 1.5M4.9 18.8l1.5-1.5M11 12.7l1.5-1.5"
        stroke="#fcd116"
        strokeWidth="1.1"
      />
      <circle cx="2.6" cy="3.4" r="1.2" fill="#fcd116" />
      <circle cx="2.6" cy="26.6" r="1.2" fill="#fcd116" />
      <circle cx="22" cy="15" r="1.2" fill="#fcd116" />
    </svg>
  )
}

export function SiteFooter() {
  const magnetic = useMagnetic()
  const wordRef = useRef<HTMLDivElement>(null)

  // The wordmark's ambient weight wave (CSS, `.live`) runs only while it's on
  // screen; hovering hands control to the pointer-proximity effect above.
  useEffect(() => {
    const el = wordRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([en]) =>
      el.classList.toggle('live', en.isIntersecting),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <footer className="c-foot">
      <div className="c-wrap">
        <div className="c-foot-top">
          <div className="c-foot-lead">
            <Link to="/" className="c-foot-brand">
              <img src="/icon-192.png" alt="" width={48} height={48} loading="lazy" />
              <span>Agilearn</span>
            </Link>
            <p className="m-agila">
              <b>Why &quot;Agilearn&quot;?</b> Agila is Filipino for eagle: sharp-eyed and
              exact. It watches the numbers so you can watch the class.
            </p>
            <div className="c-foot-cta">
              <Link to="/teacher/signup" className="c-btn amber c-mag" {...magnetic}>
                Start as a teacher <ArrowRight className="ico" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <nav className="c-foot-cols" aria-label="Footer">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        to={l.to}
                        hash={l.hash}
                        className={l.to === '/' ? 'c-fl anchor' : 'c-fl page'}
                      >
                        <span>{l.label}</span>
                        <ArrowRight className="ico" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="c-foot-legal">
          <span className="c-foot-made">
            <span>© {new Date().getFullYear()} Agilearn</span>
            <span className="ph-badge">
              <PhFlag />
              Made in the Philippines for Filipino classrooms
            </span>
          </span>
          <span className="c-foot-dev">
            Designed and built by{' '}
            <Link to="/about" hash="developer">
              {DEVELOPER.name}
            </Link>
            <a href={DEVELOPER.portfolio} target="_blank" rel="noopener noreferrer">
              Portfolio ↗<span className="sr">(opens in a new tab)</span>
            </a>
            <a href={DEVELOPER.linkedin} target="_blank" rel="noopener noreferrer">
              LinkedIn ↗<span className="sr">(opens in a new tab)</span>
            </a>
          </span>
        </div>
        <div
          ref={wordRef}
          className="c-word"
          aria-hidden="true"
          onPointerMove={onWordMove}
          onPointerLeave={onWordLeave}
        >
          {WORD.map((ch, i) => (
            <span key={i} style={{ '--i': i } as CSSVars}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
