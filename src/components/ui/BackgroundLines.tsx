import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

const PATHS = [
  'M-80 620C165 520 264 440 472 490C680 540 680 260 940 284C1120 300 1240 160 1530 80',
  'M-90 694C156 556 340 618 500 510C666 398 746 614 932 498C1115 384 1234 360 1535 162',
  'M-80 310C150 372 322 214 472 332C620 450 702 280 890 338C1090 400 1200 246 1524 310',
  'M-80 795C130 630 316 760 488 636C656 514 742 768 926 646C1114 522 1270 600 1530 450',
  'M-120 154C130 90 290 210 472 136C652 62 756 226 940 132C1124 38 1280 124 1550 40',
  'M-80 456C152 430 286 540 472 438C654 336 744 474 942 408C1140 342 1294 424 1530 320',
] as const

interface BackgroundLinesProps {
  children?: ReactNode
  className?: string
  duration?: number
}

/** Decorative, low-contrast animated paths for feature and auth backdrops. */
export function BackgroundLines({
  children,
  className,
  duration = 18,
}: BackgroundLinesProps) {
  const reduce = useReducedMotion()

  return (
    <div className={cn('relative isolate overflow-hidden', className)}>
      <motion.svg
        aria-hidden
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        className="pointer-events-none absolute inset-0 z-0 size-full opacity-60"
      >
        {PATHS.map((path, index) => (
          <motion.path
            key={path}
            d={path}
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0.22 : 0 }}
            animate={
              reduce
                ? undefined
                : {
                    pathLength: [0, 1, 1],
                    opacity: [0, 0.32, 0.12],
                  }
            }
            transition={
              reduce
                ? undefined
                : {
                    duration,
                    delay: index * 1.15,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    repeatDelay: 3.5,
                  }
            }
          />
        ))}
      </motion.svg>
      {children}
    </div>
  )
}
