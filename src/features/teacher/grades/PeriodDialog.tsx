import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { ChoiceButton } from '@/components/ui/ChoiceButton'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast'
import { useCreatePeriod, useUpdatePeriod } from '@/lib/queries/grades'
import { useLocale } from '@/lib/locale'
import type { GradingPeriod } from '@/types/domain'

/** What Philippine terms are actually called, so nobody types them by hand. */
const NAME_SUGGESTIONS = [
  'Prelim',
  'Midterm',
  'Semi-Final',
  'Finals',
  '1st Quarter',
  '2nd Quarter',
  '3rd Quarter',
  '4th Quarter',
] as const

interface PeriodForm {
  name: string
  /** '' means an equal share with the other periods. */
  sharePercent: string
}

function initialState(period?: GradingPeriod): PeriodForm {
  return {
    name: period?.name ?? '',
    sharePercent:
      period && period.weight !== 1
        ? String(Math.round(period.weight * 10000) / 100)
        : '',
  }
}

export function PeriodDialog({
  classroomId,
  courseSubjectId,
  period,
  nextPosition,
  siblings = [],
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  period?: GradingPeriod
  nextPosition?: number
  /** The subject's other periods, used to show the resulting split. */
  siblings?: readonly GradingPeriod[]
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PeriodForm>(initialState(period))
  const createPeriod = useCreatePeriod()
  const updatePeriod = useUpdatePeriod()
  const { toast } = useToast()
  const { t } = useLocale()
  const isEditing = !!period

  useEffect(() => {
    if (open) setForm(initialState(period))
  }, [open, period])

  const custom = form.sharePercent.trim() !== ''
  const share = Number(form.sharePercent)
  const weight = custom ? share / 100 : 1
  const valid =
    form.name.trim().length > 0 && (!custom || (Number.isFinite(share) && share > 0))

  // What this period will actually be worth once every weight is renormalized —
  // the number the teacher cares about, which "weight: 1" never showed them.
  const others = siblings.filter((item) => item.id !== period?.id)
  const total = others.reduce((sum, item) => sum + item.weight, 0) + (weight || 0)
  const resultingShare = total > 0 ? Math.round((weight / total) * 100) : 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      const patch = {
        name: form.name.trim(),
        weight,
        // Position is an ordering detail, not a teacher's decision: new periods
        // go last, and an edited one stays where it is.
        position: period?.position ?? nextPosition ?? others.length,
      }
      if (isEditing) {
        await updatePeriod.mutateAsync({ id: period.id, patch })
        toast({ title: t('periodDialogUpdatedToast'), tone: 'success' })
      } else {
        await createPeriod.mutateAsync({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          ...patch,
        })
        toast({ title: t('periodDialogAddedToast'), tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing
          ? t('periodDialogUpdateErrorToast')
          : t('periodDialogAddErrorToast'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createPeriod.isPending || updatePeriod.isPending
  const unused = NAME_SUGGESTIONS.filter(
    (name) => !others.some((item) => item.name.toLowerCase() === name.toLowerCase()),
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('periodDialogEditTitle') : t('periodDialogNewTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('commonName')} htmlFor="period-name">
            <Input
              id="period-name"
              required
              autoFocus
              placeholder={t('periodDialogNamePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {unused.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unused.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setForm({ ...form, name })}
                    className="rounded-full border border-(--color-border) px-2.5 py-1 text-xs text-(--color-ink-muted) transition-colors hover:border-(--color-accent-400) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-350)"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-(--color-ink-muted)">
              {t('periodDialogHowMuchLegend')}
            </legend>
            <div className="flex gap-2">
              <ChoiceButton
                selected={!custom}
                onSelect={() => setForm({ ...form, sharePercent: '' })}
                className="flex-1"
              >
                {t('periodDialogEqualShare')}
              </ChoiceButton>
              <ChoiceButton
                selected={custom}
                onSelect={() =>
                  setForm({ ...form, sharePercent: String(resultingShare || 30) })
                }
                className="flex-1"
              >
                {t('periodDialogSetPercentage')}
              </ChoiceButton>
            </div>
            {custom && (
              <div className="flex items-center gap-2">
                <Input
                  id="period-share"
                  aria-label={t('periodDialogShareAriaLabel')}
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  className="w-24"
                  value={form.sharePercent}
                  onChange={(e) => setForm({ ...form, sharePercent: e.target.value })}
                />
                <span className="text-sm text-(--color-ink-muted)">
                  {t('periodDialogPercentOfFinal')}
                </span>
              </div>
            )}
          </fieldset>

          {valid && (
            <div className="space-y-1 rounded-xl bg-(--color-surface-2) px-3 py-2 text-sm">
              {others.length === 0 ? (
                <p className="text-(--color-ink)">
                  <span className="font-medium">{form.name.trim()}</span>{' '}
                  {t('periodDialogOnlyPeriodText')}
                </p>
              ) : (
                <p className="text-(--color-ink)">
                  <span className="font-medium">
                    {t('periodDialogWorthAbout', {
                      name: form.name.trim(),
                      percent: resultingShare,
                    })}
                  </span>{' '}
                  {t('periodDialogNextToSuffix', {
                    names: others.map((item) => item.name).join(', '),
                  })}
                </p>
              )}
              {/* The rule teachers actually get surprised by: an ungraded period
                  is skipped, not counted as zero. */}
              <p className="text-(--color-ink-muted)">{t('periodDialogRuleHint')}</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('commonCancel')}
            </Button>
            <Button type="submit" loading={pending} disabled={!valid}>
              {isEditing ? t('commonSaveChanges') : t('periodDialogSubmitAdd')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
