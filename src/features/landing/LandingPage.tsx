import { Link } from '@tanstack/react-router'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Button } from '@/components/ui/Button'
import { CalendarIcon, GradeIcon, ModuleIcon, SlideshowIcon } from '@/components/icons'
import { AnimatedBackdrop } from './AnimatedBackdrop'
import { MagneticButton } from './MagneticButton'
import { ProductMock } from './ProductMock'

const HEADLINE = [
  'Grades,',
  'attendance,',
  'and',
  'modules',
  '—',
  'one',
  'calm',
  'workspace.',
]

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

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
        A
      </span>
      <span className="text-lg font-semibold tracking-tight">Agilearn</span>
    </div>
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
    <section className="mx-auto max-w-3xl px-6 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center"
      >
        <motion.p
          variants={fade}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)]/70 px-3 py-1 text-xs text-[var(--color-ink-muted)] backdrop-blur-sm"
        >
          <span className="size-1.5 rounded-full bg-[var(--color-accent-400)]" />
          School management, reimagined
        </motion.p>

        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {HEADLINE.map((token, index) => (
            <span key={`${token}-${index}`} className="inline-block overflow-hidden">
              <motion.span
                variants={word}
                className={
                  token === '—'
                    ? 'mr-[0.25em] inline-block text-[var(--color-accent-350)]'
                    : 'mr-[0.25em] inline-block'
                }
              >
                {token}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          variants={fade}
          className="mx-auto mt-6 max-w-xl text-pretty text-lg text-[var(--color-ink-muted)]"
        >
          Agilearn helps teachers run their classrooms end to end — from the first roster
          import to the final grade presentation.
        </motion.p>

        <motion.div
          variants={fade}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <Link to="/login">
            <MagneticButton className="inline-block">
              <Button size="lg" className="shadow-[var(--shadow-card)]">
                Get started
              </Button>
            </MagneticButton>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline">
              Explore features
            </Button>
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
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
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-accent-350)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
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
        {FEATURES.map((feature) => {
          const IconComp = feature.icon
          return (
            <motion.div
              key={feature.title}
              variants={card}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)]/80 p-5 backdrop-blur-sm"
            >
              <div className="mb-4 flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)]/15 text-xl text-[var(--color-accent-300)] transition-colors group-hover:bg-[var(--color-accent-500)]/25">
                <IconComp />
              </div>
              <h3 className="font-medium text-[var(--color-ink)]">{feature.title}</h3>
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
        eyebrow="See it in motion"
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(59,155,245,0.16),transparent)]" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
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

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Logo />
        <p className="text-sm text-[var(--color-ink-faint)]">
          © {new Date().getFullYear()} Agilearn. Built for teachers.
        </p>
        <Link
          to="/login"
          className="text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          Sign in
        </Link>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="relative min-h-dvh bg-[var(--color-surface-0)] text-[var(--color-ink)]">
      <AnimatedBackdrop />

      <header className="sticky top-0 z-40">
        <div className="border-b border-[var(--color-border)]/60 bg-[var(--color-surface-0)]/70 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <Logo />
            <nav className="flex items-center gap-2">
              <a
                href="#features"
                className="hidden rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)] sm:inline-block"
              >
                Features
              </a>
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Sign in
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="relative">
        <Hero />
        <Features />
        <Showcase />
        <CallToAction />
      </main>

      <Footer />
    </div>
  )
}
