import { useState, type ReactNode } from 'react'
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
import type { GradingPeriod } from '@/types/domain'
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

/**
 * Weights are stored as relative numbers and renormalized at grade time, so a
 * raw "1" or "0.2" tells a teacher nothing. Everything on this panel is shown
 * as the share it actually carries.
 */
function shareOf(
  siblings: readonly { weight: number }[],
  item: { weight: number },
): string {
  const total = siblings.reduce((sum, entry) => sum + entry.weight, 0)
  return total > 0 ? `${Math.round((item.weight / total) * 100)}%` : '—'
}

/**
 * A step that cannot start yet. It names what is missing and carries the fix, so
 * the teacher never has to scroll back up to unblock themselves.
 */
function NeedsPeriod({
  classroomId,
  courseSubjectId,
  nextPosition,
  periods,
  children,
}: {
  classroomId: string
  courseSubjectId: string
  nextPosition: number
  periods: readonly GradingPeriod[]
  children: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-(--color-surface-3) px-3 py-2">
      <p className="text-sm text-(--color-ink)">{children}</p>
      <PeriodDialog
        classroomId={classroomId}
        courseSubjectId={courseSubjectId}
        nextPosition={nextPosition}
        siblings={periods}
        trigger={
          <Button size="sm" variant="secondary">
            <PlusIcon className="size-4" /> Add a period
          </Button>
        }
      />
    </div>
  )
}

/** Section heading that also says where this step sits in the sequence. */
function Step({
  index,
  title,
  hint,
  action,
}: {
  index: number
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold text-(--color-ink)">
          <span className="text-(--color-ink-faint)">{index}.</span> {title}
        </h4>
        {hint && <p className="mt-0.5 text-xs text-(--color-ink-muted)">{hint}</p>}
      </div>
      {action}
    </div>
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
            <Step
              index={1}
              title="Grading periods"
              hint="Prelim, Midterm, Finals — the terms this subject is graded in."
              action={
                <PeriodDialog
                  classroomId={classroomId}
                  courseSubjectId={courseSubjectId}
                  nextPosition={nextPeriodPosition}
                  siblings={structure.periods}
                  trigger={
                    <Button size="sm" variant="secondary">
                      <PlusIcon className="size-4" /> Add period
                    </Button>
                  }
                />
              }
            />
            {structure.periods.length === 0 ? (
              <p className="rounded-xl bg-(--color-surface-3) px-3 py-2 text-sm text-(--color-ink)">
                Start here — everything below hangs off a grading period.
              </p>
            ) : (
              <ul className="divide-y divide-(--color-border) rounded-md border border-(--color-border)">
                {structure.periods.map((period) => (
                  <li
                    key={period.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-(--color-ink)">{period.name}</span>
                      <Badge tone="neutral">
                        {shareOf(structure.periods, period)} of the grade
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <PeriodDialog
                        classroomId={classroomId}
                        courseSubjectId={courseSubjectId}
                        period={period}
                        siblings={structure.periods}
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
            <Step
              index={2}
              title="Grade components"
              hint="The big buckets a final grade splits into, like Lecture and Laboratory."
              action={
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
              }
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {structure.components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between rounded-md border border-(--color-border) px-3 py-2"
                >
                  <span className="text-sm font-medium">{component.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge tone="accent">
                      {shareOf(structure.components, component)}
                    </Badge>
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
            <Step
              index={3}
              title={
                selectedPeriod ? `Categories in ${selectedPeriod.name}` : 'Categories'
              }
              hint={
                selectedPeriod
                  ? 'How each component is split — quizzes, projects, exams.'
                  : 'Add a grading period first; categories belong to one.'
              }
            />
            {!selectedPeriod && (
              <NeedsPeriod
                classroomId={classroomId}
                courseSubjectId={courseSubjectId}
                nextPosition={nextPeriodPosition}
                periods={structure.periods}
              >
                Categories are set per grading period, so they open up once you have one.
              </NeedsPeriod>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {structure.components.map((component) => {
                const categories = structure.categories.filter(
                  (c) =>
                    belongsToComponent(c, component.id) &&
                    (c.grading_period_id === selectedPeriod?.id ||
                      c.grading_period_id === null),
                )
                return (
                  <div key={component.id} className="space-y-2">
                    <div className="flex items-baseline justify-between border-b border-(--color-border) pb-1">
                      <span className="text-sm font-medium text-(--color-ink)">
                        {component.name}
                      </span>
                      {categories.length > 0 && (
                        <span className="text-xs text-(--color-ink-faint)">
                          {categories.length}{' '}
                          {categories.length === 1 ? 'category' : 'categories'}
                        </span>
                      )}
                    </div>
                    {categories.length === 0 ? (
                      <p className="text-xs text-(--color-ink-faint)">
                        Nothing here yet — all of {component.name} comes from one pool.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {categories.map((category) => (
                          <li
                            key={category.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="min-w-0 truncate text-sm text-(--color-ink-muted)">
                              {category.name}{' '}
                              <span className="text-(--color-ink-faint)">
                                {shareOf(categories, category)}
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
            <p className="text-xs text-(--color-ink-faint)">
              Percentages are worked out from the weights you set, so they always add up
              to 100% within a component — you never have to make them balance yourself.
            </p>
          </section>

          {/* Activities for a selected period */}
          <section className="space-y-3">
            <Step
              index={4}
              title="Activities"
              hint="The quizzes and projects students are actually scored on."
              action={
                selectedPeriod && (
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
                )
              }
            />

            {structure.periods.length === 0 ? (
              <NeedsPeriod
                classroomId={classroomId}
                courseSubjectId={courseSubjectId}
                nextPosition={nextPeriodPosition}
                periods={structure.periods}
              >
                Activities live inside a grading period, so there is nowhere to put one
                yet.
              </NeedsPeriod>
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
                          'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
                          (active
                            ? 'bg-(--color-accent-400) text-(--color-accent-fg)'
                            : 'bg-(--color-surface-3) text-(--color-ink) hover:text-(--color-ink)')
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
                        <p className="text-sm text-(--color-ink-muted)">
                          No activities in {selectedPeriod.name} yet.
                        </p>
                      )
                    }
                    return (
                      <ul className="divide-y divide-(--color-border) rounded-md border border-(--color-border)">
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
                                <p className="truncate text-sm text-(--color-ink)">
                                  {activity.name}
                                </p>
                                <p className="text-xs text-(--color-ink-faint)">
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
