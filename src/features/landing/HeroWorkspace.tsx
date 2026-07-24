import { motion, useReducedMotion, type Transition } from 'motion/react'
import { CalendarIcon, GradeIcon, ModuleIcon } from '@/components/icons'

const enter = (delay: number) => {
  const transition: Transition = { delay, duration: 0.7, ease: 'easeOut' }
  return {
    initial: { opacity: 0, y: 22, rotate: delay === 0.3 ? -2 : 0 },
    animate: { opacity: 1, y: 0, rotate: 0 },
    transition,
  }
}

/** A non-interactive preview of the three teaching workflows Agilearn joins. */
export function HeroWorkspace() {
  const reduce = useReducedMotion()
  const settled = reduce ? { opacity: 1, y: 0, rotate: 0 } : undefined

  return (
    <motion.div
      aria-label="A preview showing grade, attendance, and teaching-module activity"
      className="relative mx-auto mt-12 w-full max-w-3xl text-left sm:mt-14"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.7, duration: 0.7, ease: 'easeOut' }}
    >
      <div className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,var(--color-accent-500),transparent)] opacity-[0.12] blur-3xl" />
      <div className="overflow-hidden rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface-1)/90 p-3 shadow-(--shadow-pop) backdrop-blur-sm sm:p-4">
        <div className="flex items-center justify-between border-b border-(--color-border) px-2 pb-3 text-xs text-(--color-ink-faint)">
          <div className="flex items-center gap-2 font-mono uppercase tracking-[0.14em]">
            <span className="size-2 rounded-full bg-(--color-accent-400)" />
            Today’s teaching flow
          </div>
          <span>Tuesday · 3 tasks</span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            {...enter(0.3)}
            animate={settled ?? enter(0.3).animate}
            className="rounded-lg border border-(--color-border) bg-(--color-surface-0) p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-8 items-center justify-center rounded-md bg-(--color-accent-500)/15 text-(--color-accent-350)">
                  <GradeIcon />
                </span>
                Final grade · Statistics 101
              </div>
              <span className="rounded-full bg-(--color-success)/15 px-2 py-1 text-xs font-medium text-(--color-success)">
                Live
              </span>
            </div>
            <div className="mt-5 flex items-end gap-2" aria-hidden>
              {['h-11', 'h-17', 'h-13.5', 'h-20.5', 'h-18', 'h-23.5', 'h-21.5'].map(
                (heightClass) => (
                  <span
                    key={heightClass}
                    className={`flex-1 rounded-t-sm bg-(--color-accent-400)/20 ${heightClass}`}
                  >
                    <span className="block size-full origin-bottom rounded-t-sm bg-(--color-accent-400)" />
                  </span>
                ),
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-(--color-ink-muted)">
              <span>42 students</span>
              <span className="font-medium text-(--color-ink)">89.4% class average</span>
            </div>
          </motion.div>

          <div className="grid gap-3">
            <motion.div
              {...enter(0.48)}
              animate={settled ?? enter(0.48).animate}
              className="rounded-lg border border-(--color-border) bg-(--color-surface-0) p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-8 items-center justify-center rounded-md bg-(--color-success)/15 text-(--color-success)">
                  <CalendarIcon />
                </span>
                Attendance
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">38 / 42</p>
              <p className="text-xs text-(--color-ink-muted)">
                Present in today’s session
              </p>
            </motion.div>
            <motion.div
              {...enter(0.62)}
              animate={settled ?? enter(0.62).animate}
              className="rounded-lg border border-(--color-border) bg-(--color-surface-0) p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-8 items-center justify-center rounded-md bg-(--color-accent-500)/15 text-(--color-accent-350)">
                  <ModuleIcon />
                </span>
                Next up
              </div>
              <p className="mt-3 text-sm font-medium">Probability lab: sampling</p>
              <p className="mt-1 text-xs text-(--color-ink-muted)">
                Module ready for 10:30 AM
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
