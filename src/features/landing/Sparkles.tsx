import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

/*
 * Lightweight, dependency-free sparkle field (an on-brand nod to the Aceternity
 * sparkles effect). A handful of accent dots twinkle via opacity/scale only, so
 * it stays cheap. Renders nothing under reduced motion.
 */
export function Sparkles({
  count = 30,
  className,
}: {
  count?: number
  className?: string
}) {
  const reduce = useReducedMotion()

  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 3,
        duration: 2 + Math.random() * 2.5,
      })),
    [count],
  )

  if (reduce) return null

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full bg-(--color-accent-400)"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
