import { useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { hasExactWeightTotal, round2 } from '@/lib/grading'
import {
  useDeleteActivity,
  useDeleteCategory,
  useDeleteGradeComponent,
  useDeletePeriod,
  useSeedGradeTemplate,
} from '@/lib/queries/grades'
import type { GradingPeriod } from '@/types/domain'
import { PeriodDialog } from './PeriodDialog'
import { CategoryDialog } from './CategoryDialog'
import { ActivityDialog } from './ActivityDialog'
import { GradeComponentDialog } from './GradeComponentDialog'
import { CombinedFinalsManager } from './CombinedFinalsManager'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-(--color-ink-faint)">
      {children}
    </h4>
  )
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

function formatPercent(weight: number) {
  return `${round2(weight * 100)}%`
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
  const seedTemplate = useSeedGradeTemplate()
  const { toast } = useToast()

  const selectedPeriod =
    structure.periods.find((p) => p.id === activePeriodId) ?? structure.periods[0]
  const nextPeriodPosition = Math.max(-1, ...structure.periods.map((p) => p.position)) + 1
  const periodWeightTotal = structure.periods.reduce(
    (sum, period) => sum + period.weight,
    0,
  )
  const componentWeightTotal = structure.components.reduce(
    (sum, component) => sum + component.weight,
    0,
  )

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

  async function applyPreset(template: 'higher_education' | 'basic_education') {
    try {
      await seedTemplate.mutateAsync({ classroomId, courseSubjectId, template })
      toast({ title: 'Grade preset applied', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not apply grade preset',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const canApplyPreset =
    structure.periods.length === 0 && structure.categories.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader className="rounded-lg border border-(--color-border) bg-(--color-surface-1) p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle>Grade sheet structure</DialogTitle>
              <DialogDescription>
                Build a clear, complete formula for this subject.
              </DialogDescription>
            </div>
            <Badge tone="accent">Exact 100% totals</Badge>
          </div>
          <DialogDescription>
            Manage periods, components, categories, and activities. Use an editor&apos;s
            Save changes button to apply an update; destructive changes always ask for
            confirmation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {canApplyPreset && (
            <section className="rounded-lg border border-(--color-border) bg-(--color-surface-2) p-4">
              <SectionTitle>Start from a preset</SectionTitle>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
                Presets are a starting point. You can edit the periods, categories, and
                weights afterwards.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => void applyPreset('higher_education')}
                  loading={seedTemplate.isPending}
                >
                  College 20 / 40 / 40
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void applyPreset('basic_education')}
                  disabled={seedTemplate.isPending}
                >
                  School quarters
                </Button>
              </div>
            </section>
          )}
          {/* Grading periods */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Grading periods</SectionTitle>
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    hasExactWeightTotal(structure.periods.map((period) => period.weight))
                      ? 'accent'
                      : 'danger'
                  }
                >
                  Σ {formatPercent(periodWeightTotal)}
                </Badge>
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
            </div>
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
                      <Badge tone="neutral">{formatPercent(period.weight)}</Badge>
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
                        confirmLabel="Confirm delete"
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
              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    hasExactWeightTotal(
                      structure.components.map((component) => component.weight),
                    )
                      ? 'accent'
                      : 'danger'
                  }
                >
                  Σ {formatPercent(componentWeightTotal)}
                </Badge>
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
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {structure.components.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-3"
                >
                  <div>
                    <span className="text-sm font-medium">{component.name}</span>
                    <p className="mt-0.5 text-xs text-(--color-ink-faint)">
                      {component.name === 'Overall'
                        ? 'Primary subject final'
                        : 'Weighted subject component'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone="accent">{formatPercent(component.weight)}</Badge>
                    {!component.id.startsWith('legacy-') && (
                      <>
                        <GradeComponentDialog
                          classroomId={classroomId}
                          courseSubjectId={courseSubjectId}
                          component={component}
                          trigger={
                            component.name === 'Overall' ? (
                              <Button size="sm" variant="outline">
                                <EditIcon className="size-4" /> Edit overall
                              </Button>
                            ) : (
                              <IconButton label="Edit component" size="sm">
                                <EditIcon className="size-4" />
                              </IconButton>
                            )
                          }
                        />
                        <ConfirmDialog
                          title="Delete grade component?"
                          confirmLabel="Confirm delete"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {structure.components.map((component) => {
                const categories = structure.categories.filter(
                  (c) =>
                    belongsToComponent(c, component.id) &&
                    (c.grading_period_id === selectedPeriod?.id ||
                      c.grading_period_id === null),
                )
                const weightSum = categories.reduce((sum, c) => sum + c.weight, 0)
                const hasExactTotal = hasExactWeightTotal(
                  categories.map((category) => category.weight),
                )
                return (
                  <div key={component.id} className="space-y-2">
                    <div className="flex items-baseline justify-between border-b border-(--color-border) pb-1">
                      <span className="text-sm font-medium text-(--color-ink)">
                        {component.name}
                      </span>
                      <Badge
                        tone={
                          categories.length === 0
                            ? 'neutral'
                            : hasExactTotal
                              ? 'accent'
                              : 'danger'
                        }
                      >
                        Σ {formatPercent(weightSum)}
                      </Badge>
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
                                ({formatPercent(category.weight)})
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
                                confirmLabel="Confirm delete"
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
              Each period and component needs a 100% total before Agilearn can publish a
              final grade. The Σ badge turns red when a category set is incomplete.
            </p>
          </section>

          <CombinedFinalsManager classroomId={classroomId} />

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
                                  confirmLabel="Confirm delete"
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
        <DialogFooter className="sticky bottom-0 border-t border-(--color-border) bg-(--color-surface-2) pt-4">
          <p className="mr-auto text-xs text-(--color-ink-faint)">
            Changes are saved per editor.
          </p>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setOpen(false)}>
            Save &amp; close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
