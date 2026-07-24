import { Suspense, useEffect, useMemo, useState, lazy } from 'react'
import { Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { GradeIcon, PlusIcon } from '@/components/icons'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import { useGradebookStructure, useScores } from '@/lib/queries/grades'
import { reconcileNotificationIncident } from '@/lib/queries/notifications'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { computeConfiguredStudentGradebook } from '@/lib/grading'
import { studentFullName } from '@/types/domain'
import {
  LOW_AVERAGE_THRESHOLD,
  shouldNotifyLowAverage,
} from '@/features/teacher/notifications/evaluators'
import { useToast } from '@/components/ui/toast'
const ExportMenu = lazy(
  () => import('@/features/teacher/io/ExportMenu').then((module) => ({
    default: module.ExportMenu,
  })),
)
import { StructurePanel } from './StructurePanel'
import { PeriodDialog } from './PeriodDialog'
import { GradeGrid } from './GradeGrid'
import { SummaryTable } from './SummaryTable'
import { GradeReportDialog } from './GradeReportDialog'

type View = { kind: 'period'; periodId: string } | { kind: 'summary' }

export function GradesPage({
  classroomId,
  focusStudentId,
  initialSubjectId,
}: {
  classroomId: string
  focusStudentId?: string
  initialSubjectId?: string
}) {
  const classroomQuery = useClassroom(classroomId)
  const subjectsQuery = useCourseSubjects(classroomId)
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? '')
  const activeSubjectId = subjectId || subjectsQuery.data?.[0]?.id
  const structureQuery = useGradebookStructure(classroomId, activeSubjectId)
  const studentsQuery = useStudents(classroomId)

  const structure = structureQuery.data
  const activityIds = useMemo(
    () => structure?.activities.map((a) => a.id) ?? [],
    [structure],
  )
  const scoresQuery = useScores(classroomId, activityIds)
  const scores = scoresQuery.data ?? {}

  const periods = structure?.periods ?? []
  const [view, setView] = useState<View>({ kind: 'summary' })
  const [reportOpen, setReportOpen] = useState(false)
  const { toast } = useToast()
  const activeSubject = subjectsQuery.data?.find(
    (subject) => subject.id === activeSubjectId,
  )

  useEffect(() => {
    if (initialSubjectId) {
      setSubjectId(initialSubjectId)
    }
  }, [initialSubjectId])

  useEffect(() => {
    if (focusStudentId && periods[0]) {
      setView((current) =>
        current.kind === 'summary'
          ? { kind: 'period', periodId: periods[0].id }
          : current,
      )
    }
  }, [focusStudentId, periods])

  // Keep the selected period valid if periods change underneath us.
  useEffect(() => {
    if (periods.length === 0) return
    setView((current) => {
      if (current.kind === 'summary') return current
      const stillExists = periods.some((p) => p.id === current.periodId)
      return stillExists ? current : { kind: 'period', periodId: periods[0].id }
    })
  }, [periods])

  const loading =
    classroomQuery.isLoading ||
    subjectsQuery.isLoading ||
    structureQuery.isLoading ||
    studentsQuery.isLoading

  const students = studentsQuery.data ?? []
  const nextPeriodPosition = Math.max(-1, ...periods.map((p) => p.position)) + 1

  useEffect(() => {
    if (!structure || !activeSubjectId || !activeSubject || students.length === 0) return
    let cancelled = false
    const evaluations = students.map((student) => {
      const finalGrade = computeConfiguredStudentGradebook(
        structure,
        scores,
        student.id,
      ).final
      return reconcileNotificationIncident({
        type: 'low_average',
        classroomId,
        studentId: student.id,
        courseSubjectId: activeSubjectId,
        active: shouldNotifyLowAverage(finalGrade),
        payload: {
          studentName: studentFullName(student),
          value: finalGrade ?? LOW_AVERAGE_THRESHOLD,
          courseSubjectName: activeSubject.name,
        },
      })
    })
    void Promise.all(evaluations).catch((error: unknown) => {
      if (!cancelled) {
        toast({
          title: 'Could not refresh student alerts',
          description: error instanceof Error ? error.message : undefined,
          tone: 'error',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [activeSubject, activeSubjectId, classroomId, scores, structure, students, toast])

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {structure && (
        <StructurePanel
          classroomId={classroomId}
          courseSubjectId={activeSubjectId ?? ''}
          structure={structure}
          trigger={
            <Button variant="outline" size="sm">
              Structure
            </Button>
          }
        />
      )}
      <Suspense
        fallback={
          <Button variant="outline" size="sm" disabled>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
              Export
            </span>
          </Button>
        }
      >
        <ExportMenu classroomId={classroomId} />
      </Suspense>
      <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
        <Mail className="size-4" /> Preview report
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade sheet"
        description={
          activeSubject
            ? `${activeSubject.name} · Record scores and compute configured grades.`
            : 'Record activity scores and compute configured grades.'
        }
        actions={!loading && structure ? toolbar : undefined}
      />

      {(subjectsQuery.data?.length ?? 0) > 1 && (
        <div className="max-w-sm">
          <label htmlFor="grade-subject" className="mb-1.5 block text-sm font-medium">
            Course subject
          </label>
          <select
            id="grade-subject"
            aria-label="Course subject"
            value={activeSubjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="h-10 w-full rounded-full border border-(--color-border) bg-(--color-surface-1) px-4 text-sm"
          >
            {subjectsQuery.data?.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : structureQuery.isError ? (
        <EmptyState
          icon={<GradeIcon />}
          title="Could not load the grade sheet"
          description={
            structureQuery.error instanceof Error
              ? structureQuery.error.message
              : 'Please try again.'
          }
          action={
            <Button size="sm" onClick={() => structureQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : periods.length === 0 ? (
        <EmptyState
          icon={<GradeIcon />}
          title="Set up your grade sheet"
          description="Create grading periods, activity categories, and activities to start recording scores."
          action={
            <PeriodDialog
              classroomId={classroomId}
              courseSubjectId={activeSubjectId ?? ''}
              nextPosition={0}
              trigger={
                <Button size="sm">
                  <PlusIcon className="size-4" /> Add first grading period
                </Button>
              }
            />
          }
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<GradeIcon />}
          title="No students yet"
          description="Add students to this classroom to start recording their scores."
        />
      ) : (
        <div className="space-y-4">
          <ViewTabs periods={periods} view={view} onChange={setView} />

          <AnimatePresence mode="wait">
            <motion.div
              key={view.kind === 'summary' ? 'summary' : view.periodId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {view.kind === 'summary' ? (
                <SummaryTable
                  structure={structure!}
                  scores={scores}
                  students={students}
                />
              ) : (
                <GradeGrid
                  classroomId={classroomId}
                  structure={structure!}
                  scores={scores}
                  students={students}
                  periodId={view.periodId}
                  focusStudentId={focusStudentId}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {structure!.categories.length === 0 && (
            <p className="text-sm text-(--color-ink-muted)">
              Add activity categories from the{' '}
              <span className="font-medium text-(--color-ink)">Structure</span> panel
              before recording scores.
            </p>
          )}

          {view.kind === 'period' && (
            <div className="flex justify-end">
              <PeriodDialog
                classroomId={classroomId}
                courseSubjectId={activeSubjectId ?? ''}
                nextPosition={nextPeriodPosition}
                trigger={
                  <Button variant="ghost" size="sm">
                    <PlusIcon className="size-4" /> Add grading period
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}
      {structure && classroomQuery.data && (
        <GradeReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          classroomName={activeSubject?.name ?? classroomQuery.data.course_name}
          structure={structure}
          scores={scores}
          students={students}
        />
      )}
    </div>
  )
}

function ViewTabs({
  periods,
  view,
  onChange,
}: {
  periods: { id: string; name: string }[]
  view: View
  onChange: (view: View) => void
}) {
  return (
    <div
      role="tablist"
      className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-(--color-border) pb-px"
    >
      {periods.map((period) => {
        const active = view.kind === 'period' && view.periodId === period.id
        return (
          <TabButton
            key={period.id}
            active={active}
            onClick={() => onChange({ kind: 'period', periodId: period.id })}
          >
            {period.name}
          </TabButton>
        )
      })}
      <TabButton
        active={view.kind === 'summary'}
        onClick={() => onChange({ kind: 'summary' })}
      >
        Summary
      </TabButton>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'relative whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'text-(--color-ink)'
          : 'text-(--color-ink-muted) hover:text-(--color-ink)')
      }
    >
      {children}
      {active && (
        <motion.span
          layoutId="grade-tab-underline"
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-(--color-accent-400)"
        />
      )}
    </button>
  )
}

function GridSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
