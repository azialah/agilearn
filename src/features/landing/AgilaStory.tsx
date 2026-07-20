import { motion, useReducedMotion, type Variants } from 'motion/react'
import { Sparkles } from './Sparkles'

// "Agilearn" splits as Agil (0-3, accent) + earn (4-7, ink) — not "Agila" +
// "learn" (that spells "Agilalearn"). One word, unambiguous, still nods to
// the portmanteau via color.
const WORD = 'Agilearn'.split('')
const ACCENT_LETTERS = 4

/**
 * Brand-story section. Agila is the Philippine eagle; the full "Agilearn"
 * name reveals letter-by-letter on scroll, then the meaning lands beneath
 * it. Editorial, centered, distinct from the hero.
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
        <motion.p
          variants={fade}
          className="font-[family-name:var(--font-script)] text-3xl text-[var(--color-accent-350)] sm:text-4xl"
        >
          Agila
        </motion.p>

        <div className="relative mx-auto mt-2 w-fit">
          <Sparkles className="-inset-x-12 -inset-y-6" />
          <motion.h2
            aria-label="Agilearn"
            className="relative font-[family-name:var(--font-display)] text-7xl font-semibold leading-none tracking-tight sm:text-8xl md:text-9xl"
          >
            {WORD.map((char, i) => (
              <motion.span
                key={i}
                variants={letter}
                aria-hidden="true"
                className={
                  i < ACCENT_LETTERS
                    ? 'inline-block text-[var(--color-accent-400)]'
                    : 'inline-block'
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
          In 1995, President Fidel V. Ramos declared the Philippine eagle{' '}
          <em>Pithecophaga jefferyi</em> the country&apos;s national bird. Filipinos call
          it Haribon, a portmanteau of <em>haring ibon</em>: bird king. One of the
          largest, most powerful eagles alive, it watches over the forests of Luzon,
          Samar, Leyte, and Mindanao: critically endangered, monogamous for life,
          impossible to miss once it locks onto something.
        </motion.p>

        <motion.p
          variants={fade}
          className="mx-auto mt-4 max-w-xl text-pretty text-lg text-[var(--color-ink-muted)] sm:text-xl"
        >
          That&apos;s the eagle in Agilearn: sharp-eyed and exact, watching the numbers so
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
