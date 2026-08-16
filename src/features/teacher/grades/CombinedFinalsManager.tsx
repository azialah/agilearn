import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { EditIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useToast } from '@/components/ui/toast'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import {
  useDeleteSubjectGradeCombination,
  useSaveSubjectGradeCombination,
  useSubjectGradeCombinations,
  type SubjectGradeCombinationWithItems,
} from '@/lib/queries/grades'
import { useLocale } from '@/lib/locale'

function defaultWeights(subjectIds: string[]) {
  return Object.fromEntries(
    subjectIds.map((id, index) => [
      id,
      subjectIds.length === 2 ? (index === 0 ? '40' : '60') : '',
    ]),
  )
}

function CombinationDialog({
  classroomId,
  combination,
  trigger,
}: {
  classroomId: string
  combination?: SubjectGradeCombinationWithItems
  trigger: ReactNode
}) {
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const save = useSaveSubjectGradeCombination()
  const { toast } = useToast()
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [weights, setWeights] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const existingIds = combination?.items.map((item) => item.course_subject_id) ?? []
    const suggestedIds =
      existingIds.length > 0
        ? existingIds
        : subjects
            .filter(
              (subject) => subject.kind === 'lecture' || subject.kind === 'laboratory',
            )
            .slice(0, 2)
            .map((subject) => subject.id)
    const ids =
      suggestedIds.length >= 2 ? suggestedIds : subjects.slice(0, 2).map((s) => s.id)
    setName(combination?.name ?? 'Combined final')
    setSelectedIds(ids)
    setWeights(
      combination
        ? Object.fromEntries(
            combination.items.map((item) => [
              item.course_subject_id,
              String(item.weight * 100),
            ]),
          )
        : defaultWeights(ids),
    )
  }, [combination, open, subjects])

  const total = useMemo(
    () =>
      selectedIds.reduce((sum, id) => {
        const value = Number(weights[id])
        return sum + (Number.isFinite(value) ? value : 0)
      }, 0),
    [selectedIds, weights],
  )
  const valid =
    name.trim().length > 0 && selectedIds.length >= 2 && Math.abs(total - 100) < 0.0001

  function toggleSubject(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      const next = [...current, id]
      setWeights((existing) => ({ ...defaultWeights(next), ...existing }))
      return next
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      await save.mutateAsync({
        id: combination?.id,
        classroomId,
        name: name.trim(),
        items: selectedIds.map((courseSubjectId) => ({
          courseSubjectId,
          weight: Number(weights[courseSubjectId]) / 100,
        })),
      })
      toast({
        title: combination
          ? t('combinedFinalsUpdatedToast')
          : t('combinedFinalsCreatedToast'),
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: t('combinedFinalsSaveErrorToast'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {combination ? t('combinedFinalsEditTitle') : t('combinedFinalsNewTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="combined-grade-name">{t('commonName')}</Label>
            <Input
              id="combined-grade-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('combinedFinalsNamePlaceholder')}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t('combinedFinalsSubjectsLegend')}
            </legend>
            {subjects.map((subject) => {
              const selected = selectedIds.includes(subject.id)
              return (
                <div
                  key={subject.id}
                  className="flex items-center gap-3 rounded-md border border-(--color-border) px-3 py-2"
                >
                  <input
                    id={`combined-subject-${subject.id}`}
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSubject(subject.id)}
                    className="size-4 accent-(--color-accent-400)"
                  />
                  <Label htmlFor={`combined-subject-${subject.id}`} className="flex-1">
                    {subject.name}
                  </Label>
                  {selected && (
                    <Input
                      aria-label={t('combinedFinalsWeightAriaLabel', {
                        subject: subject.name,
                      })}
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={weights[subject.id] ?? ''}
                      onChange={(event) =>
                        setWeights((current) => ({
                          ...current,
                          [subject.id]: event.target.value,
                        }))
                      }
                      className="h-9 w-24 text-right"
                    />
                  )}
                </div>
              )
            })}
          </fieldset>
          <p
            className={
              total === 100 ? 'text-xs text-(--color-ink-muted)' : 'text-xs text-red-600'
            }
          >
            {t('combinedFinalsWeightTotal', { total })}{' '}
            {total === 100
              ? t('combinedFinalsReadyToCalculate')
              : t('combinedFinalsMustEqual')}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('commonCancel')}
            </Button>
            <Button type="submit" loading={save.isPending} disabled={!valid}>
              {combination ? t('commonSaveChanges') : t('combinedFinalsSubmitCreate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CombinedFinalsManager({ classroomId }: { classroomId: string }) {
  const combinations = useSubjectGradeCombinations(classroomId)
  const remove = useDeleteSubjectGradeCombination()
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const { toast } = useToast()
  const { t } = useLocale()

  async function removeCombination(id: string) {
    try {
      await remove.mutateAsync({ id, classroomId })
      toast({ title: t('combinedFinalsRemovedToast'), tone: 'success' })
    } catch (error) {
      toast({
        title: t('combinedFinalsRemoveErrorToast'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const subjectName = (id: string) =>
    subjects.find((subject) => subject.id === id)?.name ??
    t('combinedFinalsSubjectFallback')

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-(--color-ink-faint)">
          {t('combinedFinalsHeading')}
        </h4>
        <CombinationDialog
          classroomId={classroomId}
          trigger={
            <Button size="sm" variant="secondary">
              <PlusIcon className="size-4" /> {t('combinedFinalsAddButton')}
            </Button>
          }
        />
      </div>
      <p className="text-xs text-(--color-ink-faint)">{t('combinedFinalsDescription')}</p>
      {(combinations.data ?? []).map((combination) => (
        <div
          key={combination.id}
          className="flex items-center justify-between gap-3 rounded-md border border-(--color-border) px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{combination.name}</p>
            <p className="truncate text-xs text-(--color-ink-faint)">
              {combination.items
                .map(
                  (item) =>
                    `${subjectName(item.course_subject_id)} ${item.weight * 100}%`,
                )
                .join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge tone="accent">100%</Badge>
            <CombinationDialog
              classroomId={classroomId}
              combination={combination}
              trigger={
                <IconButton label={t('combinedFinalsEditButtonLabel')} size="sm">
                  <EditIcon className="size-4" />
                </IconButton>
              }
            />
            <ConfirmDialog
              title={t('combinedFinalsDeleteConfirmTitle')}
              description={t('combinedFinalsDeleteConfirmDescription', {
                name: combination.name,
              })}
              onConfirm={() => void removeCombination(combination.id)}
              trigger={
                <IconButton
                  label={t('combinedFinalsDeleteButtonLabel')}
                  size="sm"
                  variant="danger"
                >
                  <TrashIcon className="size-4" />
                </IconButton>
              }
            />
          </div>
        </div>
      ))}
    </section>
  )
}
