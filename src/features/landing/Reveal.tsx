import type { ReactNode } from 'react'
import { motion, useReducedMotion, type Variants } from 'motion/react'

// Hoisted so `once: true` tracks against a stable object across re-renders —
// an inline literal here gets recreated every render, which can make Motion
// re-arm the viewport observer and fade the block again on scroll-up.
const revealViewport = { once: true, amount: 0.3 }

/** Fade-and-rise a block as it scrolls into view. Static under reduced motion. */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  y?: number
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={revealViewport}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

const wordContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
}

const wordItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

const wordViewport = { once: true, amount: 0.4 }

/** Reveals `text` word-by-word as it scrolls into view. Static under reduced motion. */
export function RevealWords({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <span className={className}>{text}</span>

  const words = text.split(' ')
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={wordViewport}
      variants={wordContainer}
    >
      {words.map((word, i) => (
        <motion.span key={i} variants={wordItem} className="inline-block">
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </motion.span>
  )
}
