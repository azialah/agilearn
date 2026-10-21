import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from '@tanstack/react-router'
import type {
  Classroom,
  CourseSubject,
  GradeComponentRecord,
  GradingPeriod,
} from '@/types/domain'
import type { PostedGradeSet } from '@/features/teacher/posted-grades/postedGradeSets'
import type { LecLabPair } from '@/features/teacher/io/lecLabPair'
import type { SlideshowStudent } from './useSlideshowData'
import { buildSlides, slideAt, slideCounter } from './sequencing'
import { AverageSlide, GradeBreakdownSlide, PostedGradeSlide } from './Slides'
import { ProgressBar } from './ProgressBar'
import { ThemePicker } from './ThemePicker'
import { DEFAULT_THEME_ID, themeById, type SlideshowThemeId } from './themes'
import { useFullscreen, usePrefersReducedMotion } from './hooks'

const SLIDE_DURATION_MS = 15_000

interface SlidePlayerProps {
  classroom: Classroom
  students: SlideshowStudent[]
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  postedSets: PostedGradeSet[]
  subjects: CourseSubject[]
  gradebookSubjectId: string | undefined
  onGradebookSubjectChange: (subjectId: string) => void
  lecLab: LecLabPair | null
  periodFormula: string
  gradesLoading: boolean
}

/** Source values for the computed gradebook (vs. a posted set's key). */
const GRADEBOOK_PREFIX = 'gradebook:'
const gradebookSource = (subjectId: string | undefined) =>
  `${GRADEBOOK_PREFIX}${subjectId ?? ''}`

const KIND_SUFFIX: Record<string, string> = {
  lecture: ' (Lecture)',
  laboratory: ' (Laboratory)',
}

export function SlidePlayer({
  classroom,
  students,
  periods,
  components,
  postedSets,
  subjects,
  gradebookSubjectId,
  onGradebookSubjectChange,
  lecLab,
  periodFormula,
  gradesLoading,
}: SlidePlayerProps) {
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    isFullscreen,
    supported: fullscreenSupported,
    toggle: toggleFullscreen,
  } = useFullscreen(rootRef)

  // Posted grades (imported Lecture / Laboratory / term grade) take over when
  // the classroom has any; the computed gradebook stays one pick away.
  const [source, setSource] = useState(
    postedSets[0]?.key ?? gradebookSource(gradebookSubjectId),
  )
  const postedSet = postedSets.find((set) => set.key === source) ?? null
  const subject = subjects.find((row) => row.id === gradebookSubjectId)
  const courseLabel = subject
    ? ([subject.name, subject.subject_code || subject.course_code] as const)
    : undefined
  // A Lecture + Laboratory pair is presented as one class-record slide per
  // student; the Final Average slide would only cover one of the two subjects.
  const onePerStudent = !postedSet && !!lecLab
  const postedStudents = useMemo(() => {
    if (!postedSet) return []
    const byStudent = new Map(postedSet.rows.map((row) => [row.student_id, row]))
    return students.flatMap((student) => {
      const posted = byStudent.get(student.student.id)
      return posted ? [{ student, posted }] : []
    })
  }, [postedSet, students])

  const slides = useMemo(() => buildSlides(students.length), [students.length])
  const total = postedSet
    ? postedStudents.length
    : onePerStudent
      ? students.length
      : slides.length

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [themeId, setThemeId] = useState<SlideshowThemeId>(DEFAULT_THEME_ID)

  const theme = themeById(themeId)

  const exit = useCallback(() => {
    navigate({
      to: '/teacher/classrooms/$classroomId',
      params: { classroomId: classroom.id },
    })
  }, [navigate, classroom.id])

  const next = useCallback(() => {
    setIndex((i) => (total === 0 ? 0 : (i + 1) % total))
  }, [total])

  const prev = useCallback(() => {
    setIndex((i) => (total === 0 ? 0 : (i - 1 + total) % total))
  }, [total])

  // Keyboard controls: arrows navigate, space toggles pause, Esc exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case ' ':
        case 'Spacebar':
          e.preventDefault()
          setPaused((p) => !p)
          break
        case 'Escape':
          e.preventDefault()
          exit()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, exit])

  const current = onePerStudent
    ? { studentIndex: index % Math.max(total, 1), kind: 'breakdown' as const }
    : slideAt(index, slides.length)
  const currentStudent = students[current.studentIndex]
  const counter = slideCounter(index, slides.length)
  const currentPosted = postedSet ? postedStudents[index % Math.max(total, 1)] : undefined
  const position = total === 0 ? 0 : (index % total) + 1
  const counterText = postedSet
    ? `Student ${position} of ${total} · ${postedSet.term} Grade`
    : onePerStudent
      ? `Student ${position} of ${total} · Lecture + Laboratory`
      : `Student ${counter.studentNumber} of ${counter.totalStudents} · ${counter.kindLabel}`

  const selectSource = (value: string) => {
    setSource(value)
    setIndex(0)
    if (value.startsWith(GRADEBOOK_PREFIX)) {
      const subjectId = value.slice(GRADEBOOK_PREFIX.length)
      if (subjectId) onGradebookSubjectChange(subjectId)
    }
  }
  // Offer the picker whenever there is more than one thing to present.
  const sourceCount = postedSets.length + Math.max(subjects.length, 1)

  const slideTransition = reducedMotion
    ? { duration: 0.12 }
    : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }

  // Portalled to <body>: the app's page-enter animation leaves a transform on
  // <main>, which would turn this full-screen `fixed inset-0` stage into a box
  // the width of the content column.
  return createPortal(
    <div
      ref={rootRef}
      style={theme.vars as React.CSSProperties}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950 text-white"
    >
      {/* Slide stage */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, filter: 'blur(6px)' }
            }
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 1.03, filter: 'blur(6px)' }
            }
            transition={slideTransition}
            className="absolute inset-0 flex items-center justify-center px-6 py-20 sm:px-10"
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  postedSet || current.kind === 'average'
                    ? 'var(--ss-bg-average)'
                    : 'var(--ss-bg-breakdown)',
              }}
            />
            <div className="relative flex w-full items-center justify-center">
              {postedSet ? (
                currentPosted ? (
                  <PostedGradeSlide
                    student={currentPosted.student}
                    classroom={classroom}
                    subjectName={postedSet.subjectName}
                    subjectCode={postedSet.subjectCode}
                    term={postedSet.term}
                    lecture={currentPosted.posted.lecture}
                    laboratory={currentPosted.posted.laboratory}
                    termGrade={currentPosted.posted.term_grade}
                    reducedMotion={reducedMotion}
                  />
                ) : (
                  <p className="text-white/60">
                    None of this classroom's students have {postedSet.term} grades posted.
                  </p>
                )
              ) : gradesLoading ? (
                <p className="text-white/60">Loading grades…</p>
              ) : (
                currentStudent &&
                (current.kind === 'breakdown' ? (
                  <GradeBreakdownSlide
                    student={currentStudent}
                    classroom={classroom}
                    periods={periods}
                    components={components}
                    reducedMotion={reducedMotion}
                    courseLabel={courseLabel}
                    periodFormula={periodFormula}
                  />
                ) : (
                  <AverageSlide
                    student={currentStudent}
                    classroom={classroom}
                    periods={periods}
                    components={components}
                    reducedMotion={reducedMotion}
                    courseLabel={courseLabel}
                  />
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Top controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-5">
        {sourceCount > 1 && (
          <select
            aria-label="Grades source"
            value={source}
            onChange={(event) => selectSource(event.target.value)}
            className="h-8 max-w-56 truncate rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white backdrop-blur-sm"
          >
            {postedSets.map((set) => (
              <option key={set.key} value={set.key} className="text-black">
                {set.label}
              </option>
            ))}
            {subjects.length > 0 ? (
              subjects.map((row) => (
                <option
                  key={row.id}
                  value={gradebookSource(row.id)}
                  className="text-black"
                >
                  {row.name}
                  {KIND_SUFFIX[row.kind] ?? ''} — gradebook
                </option>
              ))
            ) : (
              <option value={gradebookSource(undefined)} className="text-black">
                Gradebook (computed)
              </option>
            )}
          </select>
        )}
        <ThemePicker
          value={themeId}
          onChange={setThemeId}
          reducedMotion={reducedMotion}
        />
        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
          <ControlButton onClick={prev} label="Previous slide">
            ◀
          </ControlButton>
          <ControlButton
            onClick={() => setPaused((p) => !p)}
            label={paused ? 'Resume' : 'Pause'}
            wide
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </ControlButton>
          <ControlButton onClick={next} label="Next slide">
            ▶
          </ControlButton>
        </div>
        {fullscreenSupported && (
          <ControlButton
            onClick={toggleFullscreen}
            label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            standalone
          >
            {isFullscreen ? '⤢' : '⤡'}
          </ControlButton>
        )}
        <Link
          to="/teacher/classrooms/$classroomId"
          params={{ classroomId: classroom.id }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          ✕ Exit
        </Link>
      </div>

      {/* Slide counter */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center">
        <span className="rounded-full border border-white/10 bg-black/30 px-4 py-1 text-xs text-white/55 backdrop-blur-sm">
          {counterText}
        </span>
      </div>

      <ProgressBar
        durationMs={SLIDE_DURATION_MS}
        paused={paused}
        slideKey={index}
        onComplete={next}
      />
    </div>,
    document.body,
  )
}

function ControlButton({
  onClick,
  label,
  children,
  wide,
  standalone,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  wide?: boolean
  standalone?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        'inline-flex h-8 items-center justify-center rounded-md text-sm text-white/90 transition-colors hover:bg-white/15 ' +
        (wide ? 'px-3 ' : 'w-9 ') +
        (standalone
          ? 'border border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/20'
          : '')
      }
    >
      {children}
    </button>
  )
}
