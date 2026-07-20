import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

/*
 * Page backdrop whose warm wash shifts as you scroll. Three orange gradient
 * layers cross-fade and drift with scroll progress, so the background colour
 * visibly moves down the page. Only opacity/transform animate (compositor-only),
 * so it stays smooth while scrolling. Holds still under reduced motion.
 */
export function ScrollGradient() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()

  const o1 = useTransform(scrollYProgress, [0, 0.4], [0.2, 0])
  const o2 = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 0.18, 0])
  const o3 = useTransform(scrollYProgress, [0.55, 1], [0, 0.22])
  const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '-22%'])
  const y3 = useTransform(scrollYProgress, [0, 1], ['0%', '16%'])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Fine grid, fading toward the bottom. */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(120% 70% at 50% 0%, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(120% 70% at 50% 0%, black 30%, transparent 75%)',
        }}
      />

      <motion.div
        style={reduce ? { opacity: 0.16 } : { opacity: o1, y: y1 }}
        className="absolute -left-[15%] -top-[20%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,var(--color-accent-400),transparent_62%)] blur-3xl"
      />
      <motion.div
        style={reduce ? { opacity: 0 } : { opacity: o2, y: y2 }}
        className="absolute right-[-10%] top-[35%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,var(--color-accent-500),transparent_62%)] blur-3xl"
      />
      <motion.div
        style={reduce ? { opacity: 0 } : { opacity: o3, y: y3 }}
        className="absolute bottom-[-20%] left-[20%] h-[80vh] w-[80vh] rounded-full bg-[radial-gradient(circle,var(--color-accent-600),transparent_62%)] blur-3xl"
      />
    </div>
  )
}
