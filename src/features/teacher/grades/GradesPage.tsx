import { Suspense, useEffect, useMemo, useState, lazy } from 'react'
import { Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ClassroomHeader } from '@/features/teacher/classrooms/ClassroomHeader'
import { ClassroomMeta } from '@/features/teacher/classrooms/ClassroomMeta'
import { ClassroomTabs } from '@/features/teacher/classrooms/ClassroomTabs'
import { SubjectTabs } from '@/features/teacher/classrooms/SubjectTabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { GradeIcon, PlusIcon } from '@/components/icons'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import {
  useGradebookStructure,
  useScores,
  useSubjectGradeCombinations,
  useSubjectGradebooks,
  useTransmutationTable,
} from '@/lib/queries/grades'
import { reconcileNotificationIncident } from '@/lib/queries/notifications'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { computeConfiguredStudentGradebook } from '@/lib/grading'
import { studentFullName, type GradingTemplate } from '@/types/domain'
import {
  LOW_AVERAGE_THRESHOLD,
  shouldNotifyLowAverage,
} from '@/features/teacher/notifications/evaluators'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/lib/locale'
const ExportMenu = lazy(() =>
  import('@/features/teacher/io/ExportMenu').then((module) => ({
    default: module.ExportMenu,
  })),
)
import { StructurePanel } from './StructurePanel'
import { PeriodDialog } from './PeriodDialog'
import { GradeGrid } from './GradeGrid'
import { SummaryTable } from './SummaryTable'
import { GradeReportDialog } from './GradeReportDialog'
import { CombinedFinalPreview } from './CombinedFinalPreview'

type View = { kind: 'period'; periodId: string } | { kind: 'summary' }

export function GradesPage({
  classroomId,
  focusStudentId,
  initialSubjectId,
  onSubjectChange,
}: {
  classroomId: string
  focusStudentId?: string
  initialSubjectId?: string
  /** Lets the route sync the selection into the URL — kept as a callback so
   *  this component doesn't need to import its own route. */
  onSubjectChange?: (subjectId: string) => void
}) {
  const { t } = useLocale()
  const classroomQuery = useClassroom(classroomId)
  const subjectsQuery = useCourseSubjects(classroomId)
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? '')
  const activeSubjectId = subjectId || subjectsQuery.data?.[0]?.id
  function handleSubjectChange(id: string) {
    setSubjectId(id)
    onSubjectChange?.(id)
  }
  const structureQuery = useGradebookStructure(classroomId, activeSubjectId)
  const studentsQuery = useStudents(classroomId)

  const structure = structureQuery.data
  const activityIds = useMemo(
    () => structure?.activities.map((a) => a.id) ?? [],
    [structure],
  )
  const scoresQuery = useScores(classroomId, activityIds, activeSubjectId)
  const scores = scoresQuery.data ?? {}

  const periods = structure?.periods ?? []
  const [view, setView] = useState<View>({ kind: 'summary' })
  const [reportOpen, setReportOpen] = useState(false)
  const { toast } = useToast()
  const activeSubject = subjectsQuery.data?.find(
    (subject) => subject.id === activeSubjectId,
  )
  const gradingTemplate = activeSubject?.grading_template as GradingTemplate | undefined
  const needsTransmutation =
    gradingTemplate === 'basic_education' || gradingTemplate === 'senior_high'
  const transmutationQuery = useTransmutationTable(
    activeSubject?.transmutation_table_id ?? undefined,
    needsTransmutation,
  )
  const combinationsQuery = useSubjectGradeCombinations(classroomId)
  const subjectGradebooks = useSubjectGradebooks(
    classroomId,
    subjectsQuery.data?.map((subject) => subject.id) ?? [],
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
          title: t('gradesAlertsRefreshErrorToast'),
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
              {t('gradesStructureLabel')}
            </Button>
          }
        />
      )}
      <Suspense
        fallback={
          <Button variant="outline" size="sm" disabled>
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
              {t('gradesExportButton')}
            </span>
          </Button>
        }
      >
        <ExportMenu classroomId={classroomId} />
      </Suspense>
      <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
        <Mail className="size-4" /> {t('gradesPreviewReportButton')}
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <ClassroomHeader classroomId={classroomId} />
      <ClassroomMeta classroomId={classroomId} />
      <ClassroomTabs classroomId={classroomId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-(--color-ink-muted)">
            {t('gradesSheetTitle')}
          </h2>
          <p className="text-sm text-(--color-ink-faint)">
            {activeSubject
              ? t('gradesSheetDescriptionWithSubject', { subject: activeSubject.name })
              : t('gradesSheetDescriptionDefault')}
          </p>
        </div>
        {!loading && structure ? toolbar : null}
      </div>

      {(subjectsQuery.data?.length ?? 0) > 1 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">{t('gradesCourseSubjectLabel')}</p>
          <SubjectTabs
            subjects={subjectsQuery.data ?? []}
            value={activeSubjectId ?? ''}
            onChange={handleSubjectChange}
          />
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : structureQuery.isError ? (
        <EmptyState
          icon={<GradeIcon />}
          title={t('gradesLoadErrorTitle')}
          description={
            structureQuery.error instanceof Error
              ? structureQuery.error.message
              : t('gradesLoadErrorFallback')
          }
          action={
            <Button size="sm" onClick={() => structureQuery.refetch()}>
              {t('commonRetry')}
            </Button>
          }
        />
      ) : periods.length === 0 ? (
        <EmptyState
          icon={<GradeIcon />}
          title={t('gradesSetupTitle')}
          description={t('gradesSetupDescription')}
          action={
            <PeriodDialog
              classroomId={classroomId}
              courseSubjectId={activeSubjectId ?? ''}
              nextPosition={0}
              siblings={periods}
              trigger={
                <Button size="sm">
                  <PlusIcon className="size-4" /> {t('gradesAddFirstPeriodButton')}
                </Button>
              }
            />
          }
        />
      ) : students.length === 0 ? (
        <EmptyState
          icon={<GradeIcon />}
          title={t('gradesNoStudentsTitle')}
          description={t('gradesNoStudentsDescription')}
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
                  gradingTemplate={gradingTemplate}
                  transmutationTable={
                    needsTransmutation ? transmutationQuery.data : undefined
                  }
                  chedIncrement={activeSubject?.ched_increment}
                />
              ) : (
                <GradeGrid
                  classroomId={classroomId}
                  courseSubjectId={activeSubjectId}
                  structure={structure!}
                  scores={scores}
                  students={students}
                  periodId={view.periodId}
                  focusStudentId={focusStudentId}
                  gradingTemplate={gradingTemplate}
                  transmutationTable={
                    needsTransmutation ? transmutationQuery.data : undefined
                  }
                  chedIncrement={activeSubject?.ched_increment}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {(combinationsQuery.data?.length ?? 0) > 0 && (
            <CombinedFinalPreview
              combinations={combinationsQuery.data ?? []}
              subjects={subjectsQuery.data ?? []}
              gradebooks={subjectGradebooks.gradebooks}
              loading={subjectGradebooks.isLoading}
              students={students}
            />
          )}

          {structure!.categories.length === 0 && (
            <p className="text-sm text-(--color-ink-muted)">
              {t('gradesAddCategoriesHintPrefix')}{' '}
              <span className="font-medium text-(--color-ink)">
                {t('gradesStructureLabel')}
              </span>{' '}
              {t('gradesAddCategoriesHintSuffix')}
            </p>
          )}

          {view.kind === 'period' && (
            <div className="flex justify-end">
              <PeriodDialog
                classroomId={classroomId}
                courseSubjectId={activeSubjectId ?? ''}
                nextPosition={nextPeriodPosition}
                siblings={periods}
                trigger={
                  <Button variant="ghost" size="sm">
                    <PlusIcon className="size-4" /> {t('gradesAddPeriodButton')}
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
  const { t } = useLocale()
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
        {t('gradesSummaryTabLabel')}
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
