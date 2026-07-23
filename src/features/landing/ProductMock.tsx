import { motion, useReducedMotion, type Variants } from 'motion/react'

const ROWS = [
  { name: 'Alvarez, Mia', lecture: 92, lab: 88 },
  { name: 'Chen, Noah', lecture: 78, lab: 84 },
  { name: 'Diallo, Awa', lecture: 95, lab: 91 },
  { name: 'Okafor, Emeka', lecture: 71, lab: 80 },
  { name: 'Santos, Lia', lecture: 88, lab: 86 },
]

function tone(score: number) {
  if (score >= 90) return 'var(--color-success)'
  if (score >= 78) return 'var(--color-accent-350)'
  return 'var(--color-warning)'
}

/**
 * A stylized, entirely hand-built product surface — no screenshots. It hints at
 * the gradebook: a header, a weighted-average chip, and animated grade bars.
 */
export function ProductMock() {
  const reduce = useReducedMotion()

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.1 },
    },
  }
  const row: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-4xl"
    >
      <div className="rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface-1)/90 p-3 shadow-(--shadow-pop) backdrop-blur-sm sm:p-4">
        {/* Faux window chrome */}
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="size-2.5 rounded-full bg-(--color-surface-3)" />
          <span className="size-2.5 rounded-full bg-(--color-surface-3)" />
          <span className="size-2.5 rounded-full bg-(--color-surface-3)" />
          <span className="ml-3 text-xs text-(--color-ink-faint)">
            Agilearn · Gradebook
          </span>
        </div>

        <div className="rounded-lg border border-(--color-border) bg-(--color-surface-0) p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-(--color-ink)">
                CS 201 · Data Structures
              </p>
              <p className="text-xs text-(--color-ink-faint)">Prelim · Block B</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-2) px-3 py-1 text-xs text-(--color-ink-muted)">
              <span className="size-1.5 rounded-full bg-(--color-accent-400)" />
              Lecture 40% · Lab 60%
            </span>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="space-y-2.5"
          >
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-1 text-[10px] uppercase tracking-wide text-(--color-ink-faint)">
              <span>Student</span>
              <span className="hidden sm:block">Lecture · Lab</span>
            </div>
            {ROWS.map((student) => {
              const final = Math.round(student.lecture * 0.4 + student.lab * 0.6)
              return (
                <motion.div
                  key={student.name}
                  variants={row}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-(--color-ink)">{student.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-(--color-surface-3)">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: tone(final) }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${final}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                        />
                      </div>
                      <span
                        className="w-8 shrink-0 text-right text-xs font-medium tabular-nums"
                        style={{ color: tone(final) }}
                      >
                        {final}
                      </span>
                    </div>
                  </div>
                  <div className="hidden items-center gap-1.5 text-xs tabular-nums text-(--color-ink-muted) sm:flex">
                    <span className="rounded bg-(--color-surface-3) px-1.5 py-0.5">
                      {student.lecture}
                    </span>
                    <span className="rounded bg-(--color-surface-3) px-1.5 py-0.5">
                      {student.lab}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>

      {/* Floating attendance chip */}
      <motion.div
        initial={{ opacity: 0, y: reduce ? 0 : 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="absolute -bottom-5 -right-2 hidden rounded-lg border border-(--color-border) bg-(--color-surface-2) px-4 py-3 shadow-(--shadow-pop) sm:block"
      >
        <p className="text-xs text-(--color-ink-faint)">Attendance today</p>
        <p className="text-lg font-semibold text-(--color-success)">96%</p>
      </motion.div>
    </motion.div>
  )
}
