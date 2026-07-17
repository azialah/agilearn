import { motion, useReducedMotion } from 'motion/react'

/**
 * A performant decorative backdrop: a fixed grid overlay plus two soft,
 * slowly-drifting light-blue gradient blobs. Purely transform/opacity based so
 * it stays cheap; it holds still when reduced motion is requested.
 */
export function AnimatedBackdrop() {
  const reduce = useReducedMotion()

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Fine grid, fading out toward the bottom. */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(120% 70% at 50% 0%, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(120% 70% at 50% 0%, black 30%, transparent 75%)',
        }}
      />

      {/* Top accent wash. */}
      <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(59,155,245,0.18),transparent)]" />

      <motion.div
        className="absolute -left-24 top-[-6rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(92,179,255,0.20),transparent_60%)] blur-2xl"
        animate={
          reduce ? undefined : { x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-8rem] top-[16rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(31,129,224,0.18),transparent_60%)] blur-2xl"
        animate={
          reduce ? undefined : { x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
