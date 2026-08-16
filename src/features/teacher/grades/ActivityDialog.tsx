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
import { Input } from '@/components/ui/Input'
import { DateInput } from '@/components/ui/DateInput'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useCreateActivity, useUpdateActivity } from '@/lib/queries/grades'
import { useLocale } from '@/lib/locale'
import type { Activity, ActivityCategory } from '@/types/domain'

interface ActivityForm {
  name: string
  category_id: string
  max_score: string
  date: string
  position: string
}

function initialState(
  categories: ActivityCategory[],
  activity?: Activity,
  nextPosition = 0,
): ActivityForm {
  return {
    name: activity?.name ?? '',
    category_id: activity?.category_id ?? categories[0]?.id ?? '',
    max_score: String(activity?.max_score ?? 100),
    date: activity?.date ?? '',
    position: String(activity?.position ?? nextPosition),
  }
}

export function ActivityDialog({
  classroomId,
  periodId,
  categories,
  activity,
  nextPosition,
  trigger,
}: {
  classroomId: string
  periodId: string
  categories: ActivityCategory[]
  activity?: Activity
  nextPosition?: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ActivityForm>(
    initialState(categories, activity, nextPosition),
  )
  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const { toast } = useToast()
  const { t } = useLocale()
  const isEditing = !!activity

  useEffect(() => {
    if (open) setForm(initialState(categories, activity, nextPosition))
  }, [open, categories, activity, nextPosition])

  const maxScore = Number(form.max_score)
  const position = Number(form.position)
  const valid =
    form.name.trim().length > 0 &&
    !!form.category_id &&
    Number.isFinite(maxScore) &&
    maxScore > 0 &&
    Number.isFinite(position)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      const patch = {
        name: form.name.trim(),
        category_id: form.category_id,
        max_score: maxScore,
        date: form.date ? form.date : null,
        position,
      }
      if (isEditing) {
        await updateActivity.mutateAsync({ id: activity.id, patch, classroomId })
        toast({ title: t('activityDialogUpdatedToast'), tone: 'success' })
      } else {
        await createActivity.mutateAsync({
          input: { grading_period_id: periodId, ...patch },
          classroomId,
        })
        toast({ title: t('activityDialogAddedToast'), tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing
          ? t('activityDialogUpdateErrorToast')
          : t('activityDialogAddErrorToast'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createActivity.isPending || updateActivity.isPending
  const noCategories = categories.length === 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('activityDialogEditTitle') : t('activityDialogNewTitle')}
          </DialogTitle>
        </DialogHeader>
        {noCategories ? (
          <p className="text-sm text-(--color-ink-muted)">
            {t('activityDialogNoCategoriesHint')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="activity-name">{t('commonName')}</Label>
              <Input
                id="activity-name"
                required
                autoFocus
                placeholder={t('activityDialogNamePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activity-category">
                {t('activityDialogCategoryLabel')}
              </Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm({ ...form, category_id: value })}
              >
                <SelectTrigger id="activity-category">
                  <SelectValue placeholder={t('activityDialogCategoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.component})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="activity-max">{t('activityDialogMaxScoreLabel')}</Label>
                <Input
                  id="activity-max"
                  type="number"
                  min={1}
                  step={0.5}
                  required
                  value={form.max_score}
                  onChange={(e) => setForm({ ...form, max_score: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-position">
                  {t('activityDialogPositionLabel')}
                </Label>
                <Input
                  id="activity-position"
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-date">{t('activityDialogDateLabel')}</Label>
                <DateInput
                  id="activity-date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                {t('commonCancel')}
              </Button>
              <Button type="submit" loading={pending} disabled={!valid}>
                {isEditing ? t('commonSaveChanges') : t('activityDialogSubmitAdd')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
