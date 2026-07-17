import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { GradeIcon, PlusIcon } from '@/components/icons'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import { useGradebookStructure, useScores } from '@/lib/queries/grades'
import { DEFAULT_WEIGHTS, type ComponentWeights } from '@/lib/grading'
import { ExportMenu } from '@/features/io/ExportMenu'
import { StructurePanel } from './StructurePanel'
import { PeriodDialog } from './PeriodDialog'
import { GradeGrid } from './GradeGrid'
import { SummaryTable } from './SummaryTable'

type View = { kind: 'period'; periodId: string } | { kind: 'summary' }

export function GradesPage({ classroomId }: { classroomId: string }) {
  const classroomQuery = useClassroom(classroomId)
  const structureQuery = useGradebookStructure(classroomId)
  const studentsQuery = useStudents(classroomId)

  const structure = structureQuery.data
  const activityIds = useMemo(
    () => structure?.activities.map((a) => a.id) ?? [],
    [structure],
  )
  const scoresQuery = useScores(classroomId, activityIds)
  const scores = scoresQuery.data ?? {}

  const weights: ComponentWeights = classroomQuery.data
    ? {
        lecture: classroomQuery.data.lecture_weight,
        laboratory: classroomQuery.data.laboratory_weight,
      }
    : DEFAULT_WEIGHTS

  const periods = structure?.periods ?? []
  const [view, setView] = useState<View>({ kind: 'summary' })

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
    classroomQuery.isLoading || structureQuery.isLoading || studentsQuery.isLoading

  const students = studentsQuery.data ?? []
  const nextPeriodPosition = Math.max(-1, ...periods.map((p) => p.position)) + 1

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {structure && (
        <StructurePanel
          classroomId={classroomId}
          structure={structure}
          trigger={
            <Button variant="outline" size="sm">
              Structure
            </Button>
          }
        />
      )}
      <ExportMenu classroomId={classroomId} />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grade sheet"
        description="Record activity scores and compute lecture, laboratory, and final grades."
        actions={!loading && structure ? toolbar : undefined}
      />

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
                  weights={weights}
                />
              ) : (
                <GradeGrid
                  classroomId={classroomId}
                  structure={structure!}
                  scores={scores}
                  students={students}
                  periodId={view.periodId}
                  weights={weights}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {structure!.categories.length === 0 && (
            <p className="text-sm text-[var(--color-ink-muted)]">
              Add activity categories from the{' '}
              <span className="font-medium text-[var(--color-ink)]">Structure</span> panel
              before recording scores.
            </p>
          )}

          {view.kind === 'period' && (
            <div className="flex justify-end">
              <PeriodDialog
                classroomId={classroomId}
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
      className="scrollbar-thin flex gap-1 overflow-x-auto border-b border-[var(--color-border)] pb-px"
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
        'relative whitespace-nowrap rounded-t-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]')
      }
    >
      {children}
      {active && (
        <motion.span
          layoutId="grade-tab-underline"
          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-accent-400)]"
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
