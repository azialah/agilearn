import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  type Variants,
} from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import {
  CalendarIcon,
  ChevronRightIcon,
  GradeIcon,
  ModuleIcon,
  SlideshowIcon,
} from '@/components/icons'
import { ScrollGradient } from './ScrollGradient'
import { FlowingTextBackdrop } from './FlowingTextBackdrop'
import { Typewriter } from './Typewriter'
import { LayoutTextFlip } from './LayoutTextFlip'
import { MagneticButton } from './MagneticButton'
import { ProductMock } from './ProductMock'
import { AgilaStory } from './AgilaStory'
import { MultiplierDemo } from './MultiplierDemo'
import { Reveal } from './Reveal'
import { MoreFeatures } from './MoreFeatures'
import { Faq } from './Faq'
import { RequestAccess } from './RequestAccess'
import { HeroWorkspace } from './HeroWorkspace'

const HEADLINE = [
  'Grades,',
  'attendance,',
  'and',
  'modules.',
  'One',
  'calm',
  'workspace.',
]

const HERO_PHRASES = [
  'Import a roster in seconds.',
  'Weighted final grades, computed live.',
  'Attendance that adds itself up.',
  'A shared library for every module.',
] as const

const AUDIENCE_WORDS = [
  'Instructors',
  'Faculty',
  'Teachers',
  'Part-Time Instructors',
  'Professors',
  'Deans',
  'Program Coordinators',
] as const

const FEATURES = [
  {
    icon: GradeIcon,
    title: 'Grades',
    body: 'Weighted lecture and laboratory grading with final grades computed for you.',
  },
  {
    icon: CalendarIcon,
    title: 'Attendance',
    body: 'Run sessions and track per-student attendance with live class rates.',
  },
  {
    icon: ModuleIcon,
    title: 'Modules',
    body: 'A shared cloud library for lesson plans, activities, and resources.',
  },
  {
    icon: SlideshowIcon,
    title: 'Slideshow',
    body: 'Turn any class into a polished, presentable grade slideshow in a click.',
  },
]

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
        A
      </span>
      {!compact && <span className="text-lg font-semibold tracking-tight">Agilearn</span>}
    </div>
  )
}

/** Floating pill header: large by default, shrinks on scroll-down, grows on up. */
function Header() {
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
          'mx-auto flex items-center justify-between rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)]/80 backdrop-blur-md transition-all duration-300 ease-out',
          compact
            ? 'max-w-md gap-2 px-3 py-1.5 shadow-[var(--shadow-pop)]'
            : 'max-w-3xl gap-4 px-5 py-3 shadow-[var(--shadow-card)]',
        )}
      >
        <Logo compact={compact} />
        <nav className="flex items-center gap-2">
          <a
            href="#features"
            className={cn(
              'rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]',
              compact ? 'hidden' : 'hidden sm:inline-block',
            )}
          >
            Features
          </a>
          <ThemeToggle className={compact ? 'hidden' : 'hidden sm:inline-flex'} />
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  const reduce = useReducedMotion()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: 0.1 } },
  }
  const word: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : '0.6em' },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  }
  const fade: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  }

  return (
    <section className="relative isolate mx-auto flex min-h-[80dvh] max-w-4xl flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[85dvh]">
      <FlowingTextBackdrop />

      {/* Warm focus glow behind the headline for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] -z-[5] h-64 w-[38rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-accent-400),transparent_70%)] opacity-[0.13] blur-2xl"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center"
      >
        <motion.p
          variants={fade}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)]/70 px-3 py-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] backdrop-blur-sm"
        >
          <span className="size-1.5 rounded-full bg-[var(--color-accent-400)]" />
          Built for
          <LayoutTextFlip
            words={AUDIENCE_WORDS}
            wordClassName="text-[var(--color-accent-350)] normal-case tracking-normal"
          />
        </motion.p>

        <h1 className="text-balance font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
          {HEADLINE.map((token, index) => {
            const highlight = token === 'workspace.'
            return (
              <span key={`${token}-${index}`} className="inline-block overflow-hidden">
                <motion.span
                  variants={word}
                  className={
                    highlight
                      ? 'relative mr-[0.25em] inline-block text-[var(--color-accent-350)]'
                      : 'mr-[0.25em] inline-block'
                  }
                >
                  {token}
                  {highlight && (
                    <motion.span
                      aria-hidden
                      className="absolute -bottom-1 left-0 h-[0.08em] w-full origin-left rounded-full bg-[var(--color-accent-400)]"
                      initial={{ scaleX: reduce ? 1 : 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        delay: reduce ? 0 : 1,
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  )}
                </motion.span>
              </span>
            )
          })}
        </h1>

        <motion.p
          variants={fade}
          className="mx-auto mt-6 flex min-h-[1.6em] max-w-xl items-center justify-center font-[family-name:var(--font-mono)] text-base text-[var(--color-ink-muted)] sm:text-lg"
        >
          <Typewriter phrases={HERO_PHRASES} />
        </motion.p>

        <motion.div
          variants={fade}
          className="mt-9 flex flex-col items-center justify-center gap-3 lg:flex-row"
        >
          <Link to="/login">
            <MagneticButton className="inline-block">
              <Button
                size="lg"
                className="group gap-2.5 rounded-full pr-2.5 shadow-[0_10px_30px_-10px_var(--color-accent-500)] active:scale-[0.98]"
              >
                Get started
                <span className="flex size-6 items-center justify-center rounded-full bg-[var(--color-accent-fg)]/15 text-base transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                  <ChevronRightIcon />
                </span>
              </Button>
            </MagneticButton>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="rounded-full">
              Explore features
            </Button>
          </a>
        </motion.div>

        <motion.div
          variants={fade}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--color-ink-muted)] sm:text-sm"
        >
          {['Weighted grades', 'Live attendance', 'Shared teaching modules'].map(
            (item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[var(--color-accent-400)]" />
                {item}
              </span>
            ),
          )}
        </motion.div>
      </motion.div>

      <HeroWorkspace />
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mx-auto max-w-2xl text-center"
    >
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent-350)]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base text-[var(--color-ink-muted)]">{subtitle}</p>
      )}
    </motion.div>
  )
}

function Features() {
  const reduce = useReducedMotion()
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  }
  const card: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
      <SectionHeading
        eyebrow="Everything in one place"
        title="Four tools, one flow"
        subtitle="No spreadsheets stitched together. Grades, attendance, modules, and presentations that all know about each other."
      />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {FEATURES.map((feature, index) => {
          const IconComp = feature.icon
          // Alternate surface vs. faint-accent tint so the row reads as a
          // rhythm rather than four identical tiles.
          const tinted = index % 2 === 1
          return (
            <motion.div
              key={feature.title}
              variants={card}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={
                // No backdrop-blur here: cards sit over a near-solid surface, so
                // the blur is barely visible but costs compositing on every paint.
                tinted
                  ? 'group rounded-[var(--radius-lg)] border border-[var(--color-accent-500)]/25 bg-[var(--color-accent-500)]/[0.08] p-5'
                  : 'group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)]/95 p-5'
              }
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)]/15 text-xl text-[var(--color-accent-300)] transition-colors group-hover:bg-[var(--color-accent-500)]/25">
                <IconComp />
              </div>
              <h3 className="font-[family-name:var(--font-display)] font-medium text-[var(--color-ink)]">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                {feature.body}
              </p>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}

function Showcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionHeading
        title="A gradebook that does the math"
        subtitle="Enter scores; Agilearn keeps the weighted final grade current and ready to present."
      />
      <div className="mt-14">
        <ProductMock />
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-6 py-14 text-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.12]" />
        <div className="relative">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready when your class is.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-[var(--color-ink-muted)]">
            Sign in and pick up right where your teaching leaves off.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/login">
              <MagneticButton className="inline-block">
                <Button size="lg">Sign in to Agilearn</Button>
              </MagneticButton>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Testimonial() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
      <Reveal className="text-center">
        <blockquote className="text-balance font-[family-name:var(--font-display)] text-2xl font-medium leading-snug tracking-tight text-[var(--color-ink)] sm:text-3xl">
          “Grade season used to eat my weekends. I set the weights once, and every final
          was ready before the deadline.”
        </blockquote>
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent-500)]/20 text-sm font-semibold text-[var(--color-accent-300)]">
            MS
          </span>
          <div className="text-left text-sm">
            <p className="font-medium text-[var(--color-ink)]">Maribeth Suarez</p>
            <p className="text-[var(--color-ink-faint)]">Senior high math teacher</p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const footerLinkClass =
  'text-sm text-[var(--color-ink-muted)] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[var(--color-ink)]'

function Footer() {
  return (
    <footer className="relative mt-16 border-t border-[var(--color-border)]">
      {/* Warm wash bleeding up from the fold for depth. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.06]" />

      <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-ink-muted)]">
              Named for the Philippine eagle, the Haribon: sharp-eyed and exact. Grades,
              attendance, and modules in one calm workspace.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#features" className={footerLinkClass}>
                  Features
                </a>
              </li>
              <li>
                <a href="#request-access" className={footerLinkClass}>
                  Request access
                </a>
              </li>
              <li>
                <a href="#faq" className={footerLinkClass}>
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Account">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-ink-faint)]">
              Account
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/login" className={footerLinkClass}>
                  Sign in
                </Link>
              </li>
              <li>
                <a href="mailto:johnneomanuel@gmail.com" className={footerLinkClass}>
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 sm:flex-row">
          <p className="text-sm text-[var(--color-ink-faint)]">
            © {new Date().getFullYear()} Agilearn. Built for teachers.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-faint)]">
            Agila + Learn = Agilearn
          </p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="relative min-h-dvh bg-[var(--color-surface-0)] text-[var(--color-ink)]">
      <ScrollGradient />

      <Header />

      <main className="relative">
        <Hero />
        <AgilaStory />
        <MultiplierDemo />
        <Features />
        <Showcase />
        <MoreFeatures />
        <Testimonial />
        <Faq />
        <RequestAccess />
        <CallToAction />
      </main>

      <Footer />
    </div>
  )
}
