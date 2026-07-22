import { motion, type Variants } from 'motion/react'
import type { Classroom, GradeComponentRecord, GradingPeriod } from '@/types/domain'
import type { SlideshowStudent } from './useSlideshowData'

/** Two-decimal grade, or an em dash when the grade could not be computed. */
function formatGrade(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

function useRevealVariants(reducedMotion: boolean): {
  container: Variants
  item: Variants
} {
  if (reducedMotion) {
    return {
      container: { hidden: {}, show: {} },
      item: { hidden: { opacity: 1 }, show: { opacity: 1 } },
    }
  }
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
    },
    item: {
      hidden: { opacity: 0, y: 26 },
      show: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 320, damping: 28 },
      },
    },
  }
}

function CourseBadge({ classroom }: { classroom: Classroom }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm sm:text-sm">
      {classroom.course_name}
      <span className="text-white/40">·</span>
      {classroom.course_code}
    </span>
  )
}

function StudentIdentity({
  student,
  classroom,
}: {
  student: SlideshowStudent
  classroom: Classroom
}) {
  const facts = [
    student.student.student_no,
    classroom.year,
    `Block ${classroom.block}`,
  ].filter(Boolean)
  return (
    <>
      <motion.h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
        {student.fullName}
      </motion.h1>
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/55 sm:text-base">
        {facts.map((fact, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            {i > 0 && <span className="text-white/25">|</span>}
            {fact}
          </span>
        ))}
      </p>
    </>
  )
}

interface SlideProps {
  student: SlideshowStudent
  classroom: Classroom
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  reducedMotion: boolean
}

/** Slide (a): per-period lecture/laboratory breakdown plus component totals. */
export function GradeBreakdownSlide({
  student,
  classroom,
  periods,
  components,
  reducedMotion,
}: SlideProps) {
  const { container, item } = useRevealVariants(reducedMotion)
  const { gradebook } = student
  const hasPeriods = periods.length > 0

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-5xl flex-col items-center gap-8 text-center"
    >
      <motion.div variants={item}>
        <CourseBadge classroom={classroom} />
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <StudentIdentity student={student} classroom={classroom} />
      </motion.div>

      {hasPeriods ? (
        <motion.div
          variants={item}
          className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {periods.map((period) => {
            const grade = gradebook.perPeriod[period.id] ?? {}
            return (
              <div
                key={period.id}
                className="rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm"
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                  {period.name}
                </p>
                <div className="flex flex-wrap items-stretch justify-center gap-6">
                  {components.map((component) => (
                    <GradeStat
                      key={component.id}
                      label={component.name}
                      value={grade[component.id] ?? null}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </motion.div>
      ) : (
        <motion.p variants={item} className="text-base text-white/50">
          No grading periods have been set up for this class yet.
        </motion.p>
      )}

      <motion.div
        variants={item}
        className="flex flex-wrap items-center justify-center gap-3 text-sm"
      >
        {components.map((component) => (
          <ComponentPill
            key={component.id}
            label={`${component.name} overall`}
            value={gradebook.components[component.id] ?? null}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}

function GradeStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="min-w-[5.5rem] flex-1">
      <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-white/45">
        {label}
      </p>
      <p
        className={
          'text-4xl font-black tabular-nums sm:text-5xl ' +
          (value === null ? 'text-white/30' : 'text-[var(--ss-accent)]')
        }
      >
        {formatGrade(value)}
      </p>
    </div>
  )
}

function ComponentPill({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-2 text-white/70">
      <span className="text-xs uppercase tracking-[0.1em] text-white/45">{label}</span>
      <span
        className={
          'font-bold tabular-nums ' + (value === null ? 'text-white/40' : 'text-white')
        }
      >
        {formatGrade(value)}
      </span>
    </span>
  )
}

/** Slide (b): the celebratory final average. */
export function AverageSlide({
  student,
  classroom,
  components,
  reducedMotion,
}: SlideProps) {
  const { container, item } = useRevealVariants(reducedMotion)
  const final = student.gradebook.final
  const hasFinal = final !== null

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-3xl flex-col items-center gap-8 text-center"
    >
      <motion.div variants={item}>
        <CourseBadge classroom={classroom} />
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <StudentIdentity student={student} classroom={classroom} />
      </motion.div>

      <motion.div
        variants={item}
        className="relative flex flex-col items-center rounded-[2rem] border border-white/20 bg-white/[0.06] px-10 py-10 backdrop-blur-sm sm:px-20 sm:py-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[2rem] blur-3xl"
          style={{
            background: hasFinal
              ? 'radial-gradient(circle at 50% 40%, var(--ss-glow), transparent 70%)'
              : 'none',
          }}
        />
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-white/50">
          Final Average
        </p>
        <motion.p
          variants={
            reducedMotion
              ? undefined
              : {
                  hidden: { opacity: 0, scale: 0.7 },
                  show: {
                    opacity: 1,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 220, damping: 18 },
                  },
                }
          }
          className={
            'text-7xl font-black leading-none tabular-nums sm:text-8xl lg:text-9xl ' +
            (hasFinal ? 'text-[var(--ss-avg)]' : 'text-white/40')
          }
        >
          {hasFinal ? final.toFixed(2) : 'N/A'}
        </motion.p>
        <p className="mt-4 text-xs text-white/40 sm:text-sm">
          {components
            .map((component) => `${component.name} ${component.weight}`)
            .join(' + ')}
        </p>
        {!hasFinal && (
          <p className="mt-2 max-w-xs text-xs text-white/35">
            A final average needs all required component scores recorded.
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
