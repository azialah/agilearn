import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Classroom, GradeComponentRecord, GradingPeriod } from '@/types/domain'
import type { SlideshowStudent } from './useSlideshowData'
import { buildSlides, slideAt, slideCounter } from './sequencing'
import { AverageSlide, GradeBreakdownSlide } from './Slides'
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
}

export function SlidePlayer({
  classroom,
  students,
  periods,
  components,
}: SlidePlayerProps) {
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const {
    isFullscreen,
    supported: fullscreenSupported,
    toggle: toggleFullscreen,
  } = useFullscreen(rootRef)

  const slides = useMemo(() => buildSlides(students.length), [students.length])
  const total = slides.length

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

  const current = slideAt(index, total)
  const currentStudent = students[current.studentIndex]
  const counter = slideCounter(index, total)

  const slideTransition = reducedMotion
    ? { duration: 0.12 }
    : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }

  return (
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
                  current.kind === 'average'
                    ? 'var(--ss-bg-average)'
                    : 'var(--ss-bg-breakdown)',
              }}
            />
            <div className="relative flex w-full items-center justify-center">
              {currentStudent &&
                (current.kind === 'breakdown' ? (
                  <GradeBreakdownSlide
                    student={currentStudent}
                    classroom={classroom}
                    periods={periods}
                    components={components}
                    reducedMotion={reducedMotion}
                  />
                ) : (
                  <AverageSlide
                    student={currentStudent}
                    classroom={classroom}
                    periods={periods}
                    components={components}
                    reducedMotion={reducedMotion}
                  />
                ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Top controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-5">
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
          Student {counter.studentNumber} of {counter.totalStudents} · {counter.kindLabel}
        </span>
      </div>

      <ProgressBar
        durationMs={SLIDE_DURATION_MS}
        paused={paused}
        slideKey={index}
        onComplete={next}
      />
    </div>
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
