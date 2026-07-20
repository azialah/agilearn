import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Sparkles } from './Sparkles'

const LETTERS = 'Agila'.split('')

/**
 * Brand-story section. "Agila" is the Philippine eagle; the name reveals
 * letter-by-letter on scroll, then the meaning lands beneath it. Editorial,
 * centered, distinct from the hero.
 */
export function AgilaStory() {
  const reduce = useReducedMotion()

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.05 } },
  }
  const letter: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : '0.4em', rotate: reduce ? 0 : -6 },
    show: {
      opacity: 1,
      y: 0,
      rotate: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  }
  const fade: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="relative mx-auto w-fit">
          <Sparkles className="-inset-x-12 -inset-y-6" />
          <motion.h2
            aria-label="Agila"
            className="relative font-[family-name:var(--font-display)] text-7xl font-semibold leading-none tracking-tight sm:text-8xl md:text-9xl"
          >
            {LETTERS.map((char, i) => (
              <motion.span
                key={i}
                variants={letter}
                aria-hidden="true"
                className={
                  i === 0 ? 'inline-block text-[var(--color-accent-400)]' : 'inline-block'
                }
              >
                {char}
              </motion.span>
            ))}
          </motion.h2>
        </div>

        <motion.p
          variants={fade}
          className="mx-auto mt-8 max-w-xl text-pretty text-lg text-[var(--color-ink-muted)] sm:text-xl"
        >
          Agila is the Philippine eagle: sharp-eyed and exact. It watches the numbers so
          you can watch the class.
        </motion.p>

        <motion.p
          variants={fade}
          className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[var(--color-ink-faint)]"
        >
          Agila + Learn = Agilearn
        </motion.p>
      </motion.div>
    </section>
  )
}
