import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { EditIcon, PlusIcon, TrashIcon } from '@/components/icons'
import type { GradebookStructure } from '@/lib/grading'
import { round2 } from '@/lib/grading'
import {
  useDeleteActivity,
  useDeleteCategory,
  useDeleteGradeComponent,
  useDeletePeriod,
} from '@/lib/queries/grades'
import { PeriodDialog } from './PeriodDialog'
import { CategoryDialog } from './CategoryDialog'
import { ActivityDialog } from './ActivityDialog'
import { GradeComponentDialog } from './GradeComponentDialog'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-faint)]">
      {children}
    </h4>
  )
}

function belongsToComponent(
  category: GradebookStructure['categories'][number],
  componentId: string,
) {
  return (
    category.grade_component_id === componentId ||
    (category.grade_component_id === null &&
      ((componentId === 'legacy-lecture' && category.component === 'lecture') ||
        (componentId === 'legacy-laboratory' && category.component === 'laboratory')))
  )
}

export function StructurePanel({
  classroomId,
  courseSubjectId,
  structure,
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  structure: GradebookStructure
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activePeriodId, setActivePeriodId] = useState<string>(
    structure.periods[0]?.id ?? '',
  )
  const deletePeriod = useDeletePeriod()
  const deleteCategory = useDeleteCategory()
  const deleteComponent = useDeleteGradeComponent()
  const deleteActivity = useDeleteActivity()
  const { toast } = useToast()

  const selectedPeriod =
    structure.periods.find((p) => p.id === activePeriodId) ?? structure.periods[0]
  const nextPeriodPosition = Math.max(-1, ...structure.periods.map((p) => p.position)) + 1

  async function removePeriod(id: string) {
    try {
      await deletePeriod.mutateAsync({ id, classroomId })
      toast({ title: 'Period deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete period',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function removeCategory(id: string) {
    try {
      await deleteCategory.mutateAsync({ id, classroomId })
      toast({ title: 'Category deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete category',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function removeActivity(id: string) {
    try {
      await deleteActivity.mutateAsync({ id, classroomId })
      toast({ title: 'Activity deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete activity',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function removeComponent(id: string) {
    try {
      await deleteComponent.mutateAsync({ id, classroomId })
      toast({ title: 'Component deleted', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not delete component',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade sheet structure</DialogTitle>
          <DialogDescription>
            Manage grading periods, categories, and activities. Deletes cascade to any
            scores recorded under them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Grading periods */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Grading periods</SectionTitle>
              <PeriodDialog
                classroomId={classroomId}
                courseSubjectId={courseSubjectId}
                nextPosition={nextPeriodPosition}
                trigger={
                  <Button size="sm" variant="secondary">
                    <PlusIcon className="size-4" /> Add
                  </Button>
                }
              />
            </div>
            {structure.periods.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">No periods yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                {structure.periods.map((period) => (
                  <li
                    key={period.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[var(--color-ink)]">
                        {period.name}
                      </span>
                      <Badge tone="neutral">w {round2(period.weight)}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <PeriodDialog
                        classroomId={classroomId}
                        courseSubjectId={courseSubjectId}
                        period={period}
                        trigger={
                          <IconButton label="Edit period" size="sm">
                            <EditIcon className="size-4" />
                          </IconButton>
                        }
                      />
                      <ConfirmDialog
                        title="Delete grading period?"
                        description={`"${period.name}" and all its activities and scores will be permanently removed.`}
                        onConfirm={() => removePeriod(period.id)}
                        trigger={
                          <IconButton label="Delete period" size="sm" variant="danger">
                            <TrashIcon className="size-4" />
                          </IconButton>
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Components and period-scoped categories */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Grade components</SectionTitle>
              <GradeComponentDialog
                classroomId={classroomId}
                courseSubjectId={courseSubjectId}
                nextPosition={structure.components.length}
                trigger={
                  <Button size="sm" variant="secondary">
                    <PlusIcon className="size-4" /> Add component
                  </Button>
                }
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {structure.components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
                >
                  <span className="text-sm font-medium">{component.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge tone="accent">w {round2(component.weight)}</Badge>
                    {!component.id.startsWith('legacy-') && (
                      <>
                        <GradeComponentDialog
                          classroomId={classroomId}
                          courseSubjectId={courseSubjectId}
                          component={component}
                          trigger={
                            <IconButton label="Edit component" size="sm">
                              <EditIcon className="size-4" />
                            </IconButton>
                          }
                        />
                        <ConfirmDialog
                          title="Delete grade component?"
                          description="Its categories must be moved or deleted first."
                          onConfirm={() => removeComponent(component.id)}
                          trigger={
                            <IconButton
                              label="Delete component"
                              size="sm"
                              variant="danger"
                            >
                              <TrashIcon className="size-4" />
                            </IconButton>
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <SectionTitle>
              Categories for {selectedPeriod?.name ?? 'this period'}
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {structure.components.map((component) => {
                const categories = structure.categories.filter(
                  (c) =>
                    belongsToComponent(c, component.id) &&
                    (c.grading_period_id === selectedPeriod?.id ||
                      c.grading_period_id === null),
                )
                const weightSum = round2(categories.reduce((sum, c) => sum + c.weight, 0))
                return (
                  <div
                    key={component.id}
                    className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {component.name}
                      </span>
                      <Badge tone={categories.length === 0 ? 'neutral' : 'accent'}>
                        Σ {weightSum}
                      </Badge>
                    </div>
                    {categories.length === 0 ? (
                      <p className="text-xs text-[var(--color-ink-faint)]">
                        No categories.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {categories.map((category) => (
                          <li
                            key={category.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-sm text-[var(--color-ink-muted)]">
                              {category.name}{' '}
                              <span className="text-[var(--color-ink-faint)]">
                                ({round2(category.weight)})
                              </span>
                            </span>
                            <div className="flex items-center gap-1">
                              <CategoryDialog
                                classroomId={classroomId}
                                courseSubjectId={courseSubjectId}
                                periodId={
                                  selectedPeriod?.id ?? category.grading_period_id ?? ''
                                }
                                components={structure.components}
                                category={category}
                                trigger={
                                  <IconButton label="Edit category" size="sm">
                                    <EditIcon className="size-4" />
                                  </IconButton>
                                }
                              />
                              <ConfirmDialog
                                title="Delete category?"
                                description={`"${category.name}" and its activities and scores will be permanently removed.`}
                                onConfirm={() => removeCategory(category.id)}
                                trigger={
                                  <IconButton
                                    label="Delete category"
                                    size="sm"
                                    variant="danger"
                                  >
                                    <TrashIcon className="size-4" />
                                  </IconButton>
                                }
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedPeriod && !component.id.startsWith('legacy-') && (
                      <CategoryDialog
                        classroomId={classroomId}
                        courseSubjectId={courseSubjectId}
                        periodId={selectedPeriod.id}
                        components={structure.components}
                        defaultComponentId={component.id}
                        trigger={
                          <Button size="sm" variant="ghost" className="w-full">
                            <PlusIcon className="size-4" /> Add{' '}
                            {component.name.toLowerCase()} category
                          </Button>
                        }
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-[var(--color-ink-faint)]">
              Weights need not sum to exactly 1 — they are normalized per component when
              grades are computed. The Σ badge is a convenience check.
            </p>
          </section>

          {/* Activities for a selected period */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Activities</SectionTitle>
              {selectedPeriod && (
                <ActivityDialog
                  classroomId={classroomId}
                  periodId={selectedPeriod.id}
                  categories={structure.categories.filter(
                    (category) =>
                      category.grading_period_id === selectedPeriod.id ||
                      category.grading_period_id === null,
                  )}
                  nextPosition={
                    Math.max(
                      -1,
                      ...structure.activities
                        .filter((a) => a.grading_period_id === selectedPeriod.id)
                        .map((a) => a.position),
                    ) + 1
                  }
                  trigger={
                    <Button size="sm" variant="secondary">
                      <PlusIcon className="size-4" /> Add activity
                    </Button>
                  }
                />
              )}
            </div>

            {structure.periods.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                Add a grading period first.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
                  {structure.periods.map((period) => {
                    const active = period.id === selectedPeriod?.id
                    return (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => setActivePeriodId(period.id)}
                        className={
                          'rounded-[var(--radius-md)] px-3 py-1 text-xs font-medium transition-colors ' +
                          (active
                            ? 'bg-[var(--color-accent-400)] text-[var(--color-accent-fg)]'
                            : 'bg-[var(--color-surface-3)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]')
                        }
                      >
                        {period.name}
                      </button>
                    )
                  })}
                </div>

                {selectedPeriod &&
                  (() => {
                    const activities = structure.activities.filter(
                      (a) => a.grading_period_id === selectedPeriod.id,
                    )
                    if (activities.length === 0) {
                      return (
                        <p className="text-sm text-[var(--color-ink-muted)]">
                          No activities in {selectedPeriod.name} yet.
                        </p>
                      )
                    }
                    return (
                      <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                        {activities.map((activity) => {
                          const category = structure.categories.find(
                            (c) => c.id === activity.category_id,
                          )
                          return (
                            <li
                              key={activity.id}
                              className="flex items-center justify-between gap-2 px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm text-[var(--color-ink)]">
                                  {activity.name}
                                </p>
                                <p className="text-xs text-[var(--color-ink-faint)]">
                                  {category?.name ?? 'Uncategorized'} · max{' '}
                                  {activity.max_score}
                                  {activity.date ? ` · ${activity.date}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <ActivityDialog
                                  classroomId={classroomId}
                                  periodId={selectedPeriod.id}
                                  categories={structure.categories.filter(
                                    (category) =>
                                      category.grading_period_id === selectedPeriod.id ||
                                      category.grading_period_id === null,
                                  )}
                                  activity={activity}
                                  trigger={
                                    <IconButton label="Edit activity" size="sm">
                                      <EditIcon className="size-4" />
                                    </IconButton>
                                  }
                                />
                                <ConfirmDialog
                                  title="Delete activity?"
                                  description={`"${activity.name}" and its scores will be permanently removed.`}
                                  onConfirm={() => removeActivity(activity.id)}
                                  trigger={
                                    <IconButton
                                      label="Delete activity"
                                      size="sm"
                                      variant="danger"
                                    >
                                      <TrashIcon className="size-4" />
                                    </IconButton>
                                  }
                                />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )
                  })()}
              </>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
