import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

/**
 * Dependency-free, hand-rolled equivalent of the Aceternity "LayoutTextFlip"
 * effect: a word that cross-fades between values on an interval, using
 * motion/react's AnimatePresence + layout (an on-brand nod, same spirit as
 * Sparkles.tsx — no new package, no shadcn import). Degrades to a static
 * first word under reduced motion.
 */
export function LayoutTextFlip({
  words,
  duration = 2200,
  className,
  wordClassName,
}: {
  words: readonly string[]
  duration?: number
  className?: string
  wordClassName?: string
}) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce || words.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), duration)
    return () => clearInterval(id)
  }, [reduce, words.length, duration])

  if (reduce) {
    return <span className={className}>{words[0]}</span>
  }

  return (
    <span
      className={cn('relative inline-grid items-center justify-items-start', className)}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={words[index]}
          layout
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn('col-start-1 row-start-1 whitespace-nowrap', wordClassName)}
          aria-hidden="true"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{words.join(', ')}</span>
    </span>
  )
}
