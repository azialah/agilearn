import { useId, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Who can sign up for Agilearn?',
    a: 'Teachers with an approved school email domain can self-onboard. Admins are set up separately by the Agilearn team.',
  },
  {
    q: "My school isn't listed yet. How do I join?",
    a: 'Use the “Request access” form above with your school’s domain (e.g. gordoncollege.edu.ph). We’ll add it and let you know once you can sign up.',
  },
  {
    q: 'How are final grades calculated?',
    a: 'Agilearn weights your lecture and laboratory components and keeps the final grade computed live as you enter scores, with no spreadsheet formulas to maintain.',
  },
  {
    q: 'Is my class data private?',
    a: 'Yes. Postgres row-level security scopes every teacher to only their own classrooms, regardless of the UI, so no one else can see your rosters or grades.',
  },
  {
    q: 'Can I import my roster and export grades?',
    a: 'You can import rosters from Excel and export grades to PDF or a spreadsheet, so Agilearn fits alongside the tools you already use.',
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'On the sign-in screen, use “Forgot password?” and we’ll email a 6-digit code to reset it.',
  },
  {
    q: 'Does Agilearn work on my phone?',
    a: 'Yes. It’s an installable progressive web app with an offline-ready shell, so you can add it to your home screen and open it like a native app.',
  },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: 'easeOut' }}
      className="border-b border-(--color-border)"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium text-(--color-ink)"
      >
        {q}
        <ChevronDown
          className={
            open
              ? 'size-4 shrink-0 rotate-180 text-(--color-accent-350) transition-transform duration-300'
              : 'size-4 shrink-0 text-(--color-ink-muted) transition-transform duration-300'
          }
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-(--color-ink-muted)">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-(--color-accent-350)">
          Questions & answers
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Frequently asked
        </h2>
      </motion.div>

      {/* Each item reveals itself on scroll — self-contained rather than a
          parent-orchestrated stagger, which could leave an item stuck hidden
          if it re-rendered out of sync with the parent. */}
      <div className="mt-10">
        {FAQS.map((faq, i) => (
          <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
        ))}
      </div>
    </section>
  )
}
