import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

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
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
