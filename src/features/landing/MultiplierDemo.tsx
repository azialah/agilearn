import { useEffect, useState } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { computeFinalGrade } from '@/lib/grading'
import { cn } from '@/lib/cn'
import { Reveal } from './Reveal'

// Starting component grades for the demo — visitors can edit both.
const DEFAULT_LECTURE = 84
const DEFAULT_LABORATORY = 91

function clampGrade(raw: string): number {
  const n = Number(raw)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

const PRESETS = [
  { label: '40 / 60', lecture: 40 },
  { label: '50 / 50', lecture: 50 },
  { label: '30 / 70', lecture: 30 },
]

/** The final grade counts up on reveal, then tracks the slider. */
function AnimatedGrade({ value }: { value: number }) {
  const reduce = useReducedMotion()
  const spring = useSpring(0, { stiffness: 70, damping: 18 })
  const text = useTransform(spring, (v) => v.toFixed(2))

  useEffect(() => {
    if (reduce) spring.jump(value)
    else spring.set(value)
  }, [value, reduce, spring])

  return (
    <span className="tabular-nums">
      <motion.span>{text}</motion.span>
    </span>
  )
}

/**
 * Live demo of the core promise: pick how much lecture vs. laboratory counts,
 * and the final grade recomputes instantly. Uses the app's real grade engine
 * (computeFinalGrade), not a fake number.
 */
export function MultiplierDemo() {
  const [lectureWeight, setLectureWeight] = useState(40)
  const [lecture, setLecture] = useState(DEFAULT_LECTURE)
  const [laboratory, setLaboratory] = useState(DEFAULT_LABORATORY)
  const labWeight = 100 - lectureWeight

  const final =
    computeFinalGrade(lecture, laboratory, lectureWeight / 100, labWeight / 100) ?? 0

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Set the weight once. We compute the rest.
        </h2>
        <p className="mt-3 text-base text-[var(--color-ink-muted)]">
          Decide how much lecture and laboratory count, or drop in your own grades below.
          Every final grade updates the moment you do.
        </p>
      </Reveal>

      <Reveal delay={0.1} className="mt-12">
        <div className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-1)]/90 p-6 shadow-[var(--shadow-card)] sm:p-8 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-10">
          {/* Controls */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="lecture-weight" className="text-[var(--color-ink)]">
                Lecture weight
              </label>
              <span className="font-[family-name:var(--font-mono)] text-[var(--color-accent-350)]">
                {lectureWeight}% · Lab {labWeight}%
              </span>
            </div>
            <input
              id="lecture-weight"
              type="range"
              min={0}
              max={100}
              step={5}
              value={lectureWeight}
              onChange={(e) => setLectureWeight(Number(e.target.value))}
              aria-label="Lecture weight percentage"
              className="mt-3 w-full [accent-color:var(--color-accent-400)]"
            />

            <div className="mt-6 flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const active = preset.lecture === lectureWeight
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setLectureWeight(preset.lecture)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-[var(--color-accent-400)] bg-[var(--color-accent-400)] text-[var(--color-accent-fg)]'
                        : 'border-[var(--color-border-strong)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2.5 transition-colors focus-within:border-[var(--color-accent-400)]">
                <label htmlFor="demo-lecture" className="text-[var(--color-ink-faint)]">
                  Lecture average
                </label>
                <input
                  id="demo-lecture"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.01}
                  value={lecture}
                  onChange={(e) => setLecture(clampGrade(e.target.value))}
                  className="mt-0.5 w-full bg-transparent font-[family-name:var(--font-mono)] text-lg tabular-nums text-[var(--color-ink)] focus-visible:outline-none"
                />
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-0)] px-3 py-2.5 transition-colors focus-within:border-[var(--color-accent-400)]">
                <label
                  htmlFor="demo-laboratory"
                  className="text-[var(--color-ink-faint)]"
                >
                  Laboratory average
                </label>
                <input
                  id="demo-laboratory"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.01}
                  value={laboratory}
                  onChange={(e) => setLaboratory(clampGrade(e.target.value))}
                  className="mt-0.5 w-full bg-transparent font-[family-name:var(--font-mono)] text-lg tabular-nums text-[var(--color-ink)] focus-visible:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live result */}
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/[0.08] px-6 py-10 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">Final grade</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-6xl font-semibold text-[var(--color-accent-350)] sm:text-7xl">
              <AnimatedGrade value={final} />
            </p>
            <p className="mt-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-faint)]">
              {lecture} x {(lectureWeight / 100).toFixed(2)} + {laboratory} x{' '}
              {(labWeight / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
