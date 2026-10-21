import { motion, type Variants } from 'motion/react'
import type { Classroom, GradeComponentRecord, GradingPeriod } from '@/types/domain'
import { midtermFromComponents, postedGradeMismatch, roundWhole } from '@/lib/grading'
import { weightLabel } from '@/features/teacher/io/exportLayout'
import type { SlideshowStudent } from './useSlideshowData'

/** Two-decimal grade, or an em dash when the grade could not be computed. */
function formatGrade(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

/** Whole-number grade, as printed on the class-record grade sheet. */
function formatWhole(value: number | null): string {
  return value === null ? '—' : String(roundWhole(value))
}

/** "Lecture × 40% + Laboratory × 60%" from the subject's own weights. */
function weightedFormula(components: readonly GradeComponentRecord[]): string {
  return components
    .map((component) => `${component.name} × ${weightLabel(component.weight)}`)
    .join(' + ')
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

function CourseBadge({
  classroom,
  label,
}: {
  classroom: Classroom
  /** The presented subject, e.g. ["Data Structures", "IT 211"]. */
  label?: readonly [string, string]
}) {
  const [name, code] = label ?? [classroom.course_name, classroom.course_code]
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm sm:text-sm">
      {name}
      {code && (
        <>
          <span className="text-white/40">·</span>
          {code}
        </>
      )}
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
  /** Subject name + code for the badge; defaults to the classroom's course. */
  courseLabel?: readonly [string, string]
  /** "Lecture × 40% + Laboratory × 60%" — how a period grade is built. */
  periodFormula?: string
}

/**
 * Slide (a): the class-record row for each grading period — every component's
 * period grade and the period grade itself (e.g. MIDTERM GRADE LEC (40%),
 * MIDTERM GRADE LAB (60%), MIDTERM GRADE), as whole numbers. These are the
 * exact numbers the grade sheet export prints.
 */
export function GradeBreakdownSlide({
  student,
  classroom,
  reducedMotion,
  courseLabel,
  periodFormula,
}: SlideProps) {
  const { container, item } = useRevealVariants(reducedMotion)
  const periods = student.classRecord
  const hasPeriods = periods.length > 0

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-5xl flex-col items-center gap-8 text-center"
    >
      <motion.div variants={item}>
        <CourseBadge classroom={classroom} label={courseLabel} />
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <StudentIdentity student={student} classroom={classroom} />
      </motion.div>

      {hasPeriods ? (
        <motion.div
          variants={item}
          className={
            'grid w-full grid-cols-1 gap-4 ' +
            (periods.length > 1 ? 'lg:grid-cols-2' : '')
          }
        >
          {periods.map((period) => (
            <div
              key={period.name}
              className="rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                {period.name}
              </p>
              <div className="flex flex-wrap items-stretch justify-center gap-6">
                {period.cells.map((cell, index) => (
                  <GradeStat
                    key={cell.label}
                    label={cell.label}
                    value={cell.value}
                    whole
                    emphasis={index === period.cells.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.p variants={item} className="text-base text-white/50">
          No grading periods have been set up for this class yet.
        </motion.p>
      )}

      {hasPeriods && periodFormula && (
        <motion.p
          variants={item}
          className="max-w-2xl rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white/60 backdrop-blur-sm"
        >
          <span className="font-semibold text-white/80">How it&apos;s computed:</span>{' '}
          {periods.length === 1 ? capitalize(periods[0].name) : 'Each period'} Grade ={' '}
          {periodFormula}
          {periods.some((period) => period.recorded)
            ? ' — as recorded on the class record.'
            : ', rounded to a whole number.'}
        </motion.p>
      )}
    </motion.div>
  )
}

/**
 * How the worked example meets the grade on screen. "Rounded to 93" only when
 * rounding is what got there; a sheet grade computed from unrounded raw grades
 * (93.20 on screen, 94 on the sheet) is labelled as recorded, never as rounding.
 */
function workedSuffix(computed: number | null, termGrade: number | null): string {
  if (computed === null || termGrade === null || computed === termGrade) return ''
  if (Number.isInteger(termGrade) && roundWhole(computed) === termGrade)
    return `, rounded to ${termGrade}`
  return `; recorded as ${isWhole(termGrade) ? termGrade : termGrade.toFixed(2)} on the class record`
}

/** A sheet that records whole numbers is shown in whole numbers (92, not 92.00). */
function isWhole(value: number | null): boolean {
  return value !== null && Number.isInteger(value)
}

/** "MIDTERM" → "Midterm". */
function capitalize(value: string): string {
  const lower = value.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function GradeStat({
  label,
  value,
  whole = false,
  emphasis = false,
}: {
  label: string
  value: number | null
  /** Print as the grade sheet does: a whole number. */
  whole?: boolean
  /** The period grade — drawn in the average colour. */
  emphasis?: boolean
}) {
  return (
    <div className="min-w-22 flex-1">
      <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-widest text-white/45">
        {label}
      </p>
      <p
        className={
          'text-4xl font-black tabular-nums sm:text-5xl ' +
          (value === null
            ? 'text-white/30'
            : emphasis
              ? 'text-(--ss-avg)'
              : 'text-(--ss-accent)')
        }
      >
        {whole ? formatWhole(value) : formatGrade(value)}
      </p>
    </div>
  )
}

/** Slide (b): the celebratory final average. */
export function AverageSlide({
  student,
  classroom,
  components,
  reducedMotion,
  courseLabel,
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
        <CourseBadge classroom={classroom} label={courseLabel} />
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <StudentIdentity student={student} classroom={classroom} />
      </motion.div>

      <motion.div
        variants={item}
        className="relative flex flex-col items-center rounded-4xl border border-white/20 bg-white/6 px-10 py-10 backdrop-blur-sm sm:px-20 sm:py-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-4xl blur-3xl"
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
            (hasFinal ? 'text-(--ss-avg)' : 'text-white/40')
          }
        >
          {hasFinal ? final.toFixed(2) : 'N/A'}
        </motion.p>
        <p className="mt-4 text-xs text-white/40 sm:text-sm">
          {weightedFormula(components)}
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

interface PostedSlideProps {
  student: SlideshowStudent
  classroom: Classroom
  subjectName: string
  subjectCode: string
  term: string
  lecture: number | null
  laboratory: number | null
  termGrade: number | null
  reducedMotion: boolean
}

/**
 * Posted-grades slide: the Lecture and Laboratory grades imported from the
 * teacher's sheet, the resulting term grade, and a hint showing how the two
 * combine — Actual Lecture × 40% + Actual Laboratory × 60%.
 */
export function PostedGradeSlide({
  student,
  classroom,
  subjectName,
  subjectCode,
  term,
  lecture,
  laboratory,
  termGrade,
  reducedMotion,
}: PostedSlideProps) {
  const { container, item } = useRevealVariants(reducedMotion)
  const hasGrade = termGrade !== null
  const mismatch = postedGradeMismatch(lecture, laboratory, termGrade)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex w-full max-w-5xl flex-col items-center gap-8 text-center"
    >
      <motion.div variants={item}>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/85 backdrop-blur-sm sm:text-sm">
          {subjectName}
          {subjectCode && (
            <>
              <span className="text-white/40">·</span>
              {subjectCode}
            </>
          )}
        </span>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <StudentIdentity student={student} classroom={classroom} />
      </motion.div>

      <motion.div
        variants={item}
        className="grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr_auto_1.2fr]"
      >
        <div className="flex items-center rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm">
          <GradeStat
            label="Actual Lecture × 40%"
            value={lecture}
            whole={isWhole(lecture)}
          />
        </div>
        <span
          aria-hidden
          className="hidden self-center text-3xl font-light text-white/40 sm:block"
        >
          +
        </span>
        <div className="flex items-center rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm">
          <GradeStat
            label="Actual Laboratory × 60%"
            value={laboratory}
            whole={isWhole(laboratory)}
          />
        </div>
        <span
          aria-hidden
          className="hidden self-center text-3xl font-light text-white/40 sm:block"
        >
          =
        </span>
        <div className="relative flex flex-col items-center justify-center rounded-3xl border border-white/25 bg-white/10 p-6 backdrop-blur-sm">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl blur-3xl"
            style={{
              background: hasGrade
                ? 'radial-gradient(circle at 50% 40%, var(--ss-glow), transparent 70%)'
                : 'none',
            }}
          />
          <p className="mb-1 text-[0.7rem] font-medium uppercase tracking-widest text-white/55">
            {term} Grade
          </p>
          <p
            className={
              'text-6xl font-black leading-none tabular-nums sm:text-7xl ' +
              (hasGrade ? 'text-(--ss-avg)' : 'text-white/40')
            }
          >
            {hasGrade
              ? isWhole(termGrade)
                ? String(termGrade)
                : termGrade.toFixed(2)
              : 'N/A'}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={item}
        className="max-w-2xl space-y-1 rounded-2xl border border-white/10 bg-black/20 px-5 py-3 text-sm text-white/60 backdrop-blur-sm"
      >
        <p>
          <span className="font-semibold text-white/80">How it's computed:</span> Actual
          Lecture × 40% + Actual Laboratory × 60% = {term} Grade.
        </p>
        {/* The worked example only shows when it agrees with the posted grade —
            a sheet that rounds or adjusts differently would contradict the
            number on screen. The import preview flags those rows instead. */}
        {lecture !== null && laboratory !== null && !mismatch && (
          <p className="tabular-nums text-white/45">
            ({formatGrade(lecture)} × 0.40) + ({formatGrade(laboratory)} × 0.60) ={' '}
            {formatGrade(midtermFromComponents(lecture, laboratory))}
            {workedSuffix(midtermFromComponents(lecture, laboratory), termGrade)}
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}
