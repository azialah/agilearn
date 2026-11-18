import { useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { MarketingShell } from '@/features/public/MarketingShell'
import { FaqAccordion } from '@/features/public/FaqAccordion'
import { LANDING_FAQ } from '@/features/public/faq'
import { useMagnetic, useScrollFrame } from '@/features/public/fx'
import { usePageMeta } from '@/features/public/usePageMeta'
import { SplitFlap } from './bits'
import { WeightsEngine } from './WeightsEngine'
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
            <Link to="/faq" className="c-open">
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
