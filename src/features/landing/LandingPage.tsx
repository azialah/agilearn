import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { computeFinalGrade } from '@/lib/grading'
import { MarketingShell } from '@/features/public/MarketingShell'
import { FaqAccordion } from '@/features/public/FaqAccordion'
import { LANDING_FAQ } from '@/features/public/faq'
import { useMagnetic, useScrollFrame } from '@/features/public/fx'
import { usePageMeta } from '@/features/public/usePageMeta'
import { RollingNumber, SplitFlap } from './bits'
import { StartCta } from './StartCta'
import {
  ClassRecordSection,
  FeaturesBento,
  PrivacyBand,
  TermSection,
} from './LandingSections'

const BOARD_WORDS = ['FINALS', 'GRADES', 'ROSTERS', 'MODULES', 'RECORDS']

export function LandingPage() {
  usePageMeta(
    'Agilearn | Class records, attendance and weighted grades for Filipino teachers',
    'Rosters, attendance and weighted lecture and lab grades in one place. Every final is computed as you go, so posting grades takes minutes, not a weekend.',
    '/',
  )
  useLandingMotion()

  return (
    <MarketingShell variant="landing">
      <Hero />
      <Marquee />
      <ClassRecordSection />
      <TermSection />
      <WeightsEngine />
      <FeaturesBento />
      <PrivacyBand />
      <section className="c-faq" id="faq" aria-label="FAQ">
        <div className="c-wrap c-faq-grid">
          <div className="c-sec-head c-sec-head-grid">
            <h2>
              Questions <span className="it">teachers ask.</span>
            </h2>
            <Link to="/about" hash="faq" className="c-open">
              Open page <ArrowRight className="ico" aria-hidden="true" />
            </Link>
          </div>
          <FaqAccordion items={LANDING_FAQ} />
        </div>
      </section>
      <StartCta />
    </MarketingShell>
  )
}

/**
 * Page-wide scroll motion, one rAF per frame: the class-record frame tilts flat
 * as it enters (--p), stacked term cards shrink and dim as the next covers them
 * (--s/--b), hero chips drift (data-par), and [data-inview] blocks get `.in` once.
 */
function useLandingMotion() {
  const reduce = useReducedMotion() ?? false

  useScrollFrame(() => {
    const vh = window.innerHeight
    const frame = document.querySelector<HTMLElement>('[data-reveal]')
    if (frame) {
      const top = frame.getBoundingClientRect().top
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh - top) / (vh * 0.75)))
      frame.style.setProperty('--p', p.toFixed(3))
    }
    if (reduce) return
    const y = window.scrollY
    document.querySelectorAll<HTMLElement>('[data-par]').forEach((el) => {
      el.style.transform = `translateY(${(-y * Number(el.dataset.par)).toFixed(1)}px)`
    })
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.c-card'))
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect()
      let cover = 0
      for (let j = i + 1; j < cards.length; j++) {
        const rj = cards[j].getBoundingClientRect()
        cover += Math.min(1, Math.max(0, (r.bottom - rj.top) / r.height))
      }
      c.style.setProperty('--s', (1 - 0.05 * cover).toFixed(3))
      c.style.setProperty('--b', (1 - 0.1 * cover).toFixed(3))
    })
  })

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-inview], .c-card')
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          en.target.classList.add('in')
          io.unobserve(en.target)
        })
      },
      // threshold 0 + bottom margin: blocks taller than the viewport still reveal.
      { threshold: 0, rootMargin: '0px 0px -25% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function Hero() {
  const magnetic = useMagnetic()
  return (
    <section className="c-hero" aria-label="Overview">
      <span className="c-sticker">
        <span className="l">Made for Filipino classrooms</span>
        <span className="s">For Filipino classrooms</span>
      </span>
      <div className="c-chip a" data-par="0.18" aria-hidden="true">
        <small>Final grade · live</small>
        <b>88.20</b>
        <span className="pill live">Live</span>
      </div>
      <div className="c-chip b" data-par="0.32" aria-hidden="true">
        <small>Present today</small>
        <b>38 / 42</b>
      </div>
      <div className="c-wrap">
        <span className="c-kick">
          <i />
          For teachers with a school email
        </span>
        <h1 className="c-h1">
          <span className="sr">Your grades, rosters and finals, handled.</span>
          <span aria-hidden="true">
            <span className="row">Your</span>
            <SplitFlap words={BOARD_WORDS} />
            <span className="row it">handled.</span>
          </span>
        </h1>
        <div className="c-hero-foot">
          <div className="c-hf-l">
            <p className="sub">
              Rosters, attendance and weighted lecture and lab grades in one place. Every
              final is computed as you go, so posting grades takes minutes, not a weekend.
            </p>
            <div className="c-ctas">
              <Link to="/teacher/signup" className="c-btn amber c-mag" {...magnetic}>
                Start as a teacher <ArrowRight className="ico" aria-hidden="true" />
              </Link>
              <Link to="/login" className="c-btn ghost">
                Sign in
              </Link>
            </div>
          </div>
          <div className="c-proof" role="img" aria-label="Sample live numbers">
            <div className="c-pchip">
              <b>88.20</b>
              <small>
                Final grade
                <br />
                live
              </small>
            </div>
            <div className="c-pchip">
              <b>38 / 42</b>
              <small>
                Present
                <br />
                today
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const ROW_A = ['Prelim', '*to', 'Midterm', '*to', 'Finals', '*without the weekend']
const ROW_B = [
  'Class records',
  'Attendance',
  'Weighted finals',
  'Modules',
  'Grade emails',
  'Slideshow',
]

function Star() {
  return (
    <svg className="c-star" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0c.8 6.4 4.6 10.9 12 12-7.4 1.1-11.2 5.6-12 12-.8-6.4-4.6-10.9-12-12 7.4-1.1 11.2-5.6 12-12z" />
    </svg>
  )
}

function MarqueeItems({ items }: { items: string[] }) {
  return items.map((t, i) =>
    t.startsWith('*') ? (
      <span key={i}>
        <em>{t.slice(1)}</em>
        {t === '*without the weekend' && <Star />}
      </span>
    ) : (
      <span key={i}>
        {t}
        <Star />
      </span>
    ),
  )
}

/**
 * Two crossing ribbons. Speed follows scroll velocity (and reverses when you
 * scroll up); paused on hover, off-screen, and under reduced motion.
 */
function Marquee() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root || reduce) return
    const rows = Array.from(root.querySelectorAll<HTMLElement>('.c-row')).map((el) => ({
      el,
      x: 0,
      dir: Number(el.dataset.dir),
      speed: Number(el.dataset.speed),
    }))
    let paused = false
    let visible = true
    let lastY = window.scrollY
    let vel = 0
    let raf = 0
    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting
    })
    io.observe(root)
    const enter = () => (paused = true)
    const leave = () => (paused = false)
    root.addEventListener('pointerenter', enter)
    root.addEventListener('pointerleave', leave)
    const loop = () => {
      const y = window.scrollY
      vel += (y - lastY - vel) * 0.12
      lastY = y
      if (!paused && visible && !document.hidden) {
        const boost = 1 + Math.min(7, Math.abs(vel) * 0.35)
        const flip = vel < -0.4 ? -1 : 1
        rows.forEach((r) => {
          const third = r.el.scrollWidth / 3
          r.x += r.dir * flip * r.speed * boost
          if (r.x <= -third) r.x += third
          if (r.x > 0) r.x -= third
          r.el.style.transform = `translateX(${r.x.toFixed(1)}px)`
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
    }
  }, [reduce])

  return (
    <section ref={ref} className="c-marq" aria-hidden="true">
      <div className="c-marq-in">
        <div className="c-band two">
          <div className="c-row" data-dir="1" data-speed="0.6">
            {[0, 1, 2].map((k) => (
              <MarqueeItems key={k} items={ROW_A} />
            ))}
          </div>
        </div>
        <div className="c-band one">
          <div className="c-row" data-dir="-1" data-speed="0.9">
            {[0, 1, 2].map((k) => (
              <MarqueeItems key={k} items={ROW_B} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

type EngineKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/** Keycap weights demo. The final uses computeFinalGrade, same as the gradebook. */
function WeightsEngine() {
  const [w, setW] = useState(40)
  const [lab, setLab] = useState(91)
  const [down, setDown] = useState<EngineKey | null>(null)
  const lec = 84
  const armed = useRef(false)
  const final = computeFinalGrade(lec, lab, w / 100, (100 - w) / 100) ?? 0

  function press(k: string): boolean {
    if (k === 'ArrowLeft') setW((v) => Math.max(0, v - 5))
    else if (k === 'ArrowRight') setW((v) => Math.min(100, v + 5))
    else if (k === 'ArrowUp') setLab((v) => Math.min(100, v + 1))
    else if (k === 'ArrowDown') setLab((v) => Math.max(0, v - 1))
    else return false
    setDown(k)
    return true
  }

  useEffect(() => {
    if (!down) return
    const t = window.setTimeout(() => setDown(null), 140)
    return () => window.clearTimeout(t)
  }, [down])

  // Arrow keys drive the demo only while the pointer (or focus) is on the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!armed.current) return
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select')) return
      if (press(e.key)) e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const keyProps = (k: EngineKey, cls: string, label: string, glyph: string) => (
    <button
      type="button"
      className={`c-key ${cls}${down === k ? ' down' : ''}`}
      aria-label={label}
      onClick={() => press(k)}
    >
      {glyph}
    </button>
  )

  return (
    <section className="c-engine" id="weights" aria-label="Grade weights">
      <div className="c-wrap c-eng">
        <div>
          <span className="eyebrow">Weighted the way your syllabus is</span>
          <div className="c-split c-mt-14">
            <RollingNumber value={String(w)} />
            <span className="sl">/</span>
            <RollingNumber value={String(100 - w)} />
          </div>
          <p className="sr" aria-live="polite">
            Lecture {w} percent, laboratory {100 - w} percent. Final grade{' '}
            {final.toFixed(2)}.
          </p>
          <div className="c-split-lab">
            <span>Lecture</span>
            <span>Laboratory</span>
          </div>
          <Link to="/how-it-works" hash="weights" className="c-open">
            Open page <ArrowRight className="ico" aria-hidden="true" />
          </Link>
        </div>
        <div
          className="c-eng-panel"
          onPointerEnter={() => (armed.current = true)}
          onPointerLeave={() => (armed.current = false)}
          onFocus={() => (armed.current = true)}
          onBlur={() => (armed.current = false)}
        >
          <div className="c-keys" role="group" aria-label="Adjust weights and lab score">
            {keyProps('ArrowUp', 'up-k', 'Raise lab score', '↑')}
            {keyProps('ArrowLeft', 'left-k', 'Lower lecture weight', '←')}
            {keyProps('ArrowDown', 'down-k', 'Lower lab score', '↓')}
            {keyProps('ArrowRight', 'right-k', 'Raise lecture weight', '→')}
          </div>
          <p className="c-hint">
            Hover here and press <kbd>←</kbd>
            <kbd>→</kbd> to shift the split, <kbd>↑</kbd>
            <kbd>↓</kbd> to change the lab score. Or tap the keys.
          </p>
          <div className="c-final">
            <small>Ramos, K. · final grade</small>
            <RollingNumber value={final.toFixed(2)} />
            <span data-formula>
              {(w / 100).toFixed(2)} × {lec} + {((100 - w) / 100).toFixed(2)} × {lab}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
