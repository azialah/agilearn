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
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/toast'
import { useCreateGradeComponent, useUpdateGradeComponent } from '@/lib/queries/grades'
import { useLocale } from '@/lib/locale'
import type { GradeComponentRecord } from '@/types/domain'

export function GradeComponentDialog({
  classroomId,
  courseSubjectId,
  component,
  nextPosition = 0,
  trigger,
}: {
  classroomId: string
  courseSubjectId: string
  component?: GradeComponentRecord
  nextPosition?: number
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(component?.name ?? '')
  const [weight, setWeight] = useState(String((component?.weight ?? 1) * 100))
  const create = useCreateGradeComponent()
  const update = useUpdateGradeComponent()
  const { toast } = useToast()
  const { t } = useLocale()
  useEffect(() => {
    if (open) {
      setName(component?.name ?? '')
      setWeight(String((component?.weight ?? 1) * 100))
    }
  }, [open, component])
  const percentWeight = Number(weight)
  const numericWeight = percentWeight / 100
  const valid =
    name.trim().length > 0 &&
    Number.isFinite(percentWeight) &&
    percentWeight > 0 &&
    percentWeight <= 100
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    try {
      if (component)
        await update.mutateAsync({
          id: component.id,
          patch: { name: name.trim(), weight: numericWeight },
        })
      else
        await create.mutateAsync({
          classroom_id: classroomId,
          course_subject_id: courseSubjectId,
          name: name.trim(),
          weight: numericWeight,
          position: nextPosition,
        })
      toast({
        title: component
          ? t('componentDialogUpdatedToast')
          : t('componentDialogAddedToast'),
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: t('componentDialogSaveErrorToast'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {component ? t('componentDialogEditTitle') : t('componentDialogNewTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="component-name">{t('commonName')}</Label>
            <Input
              id="component-name"
              value={name}
              placeholder={t('componentDialogNamePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="component-weight">{t('commonWeightLabel')}</Label>
            <Input
              id="component-weight"
              type="number"
              min={1}
              max={100}
              step={1}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </div>
          <p className="text-xs text-(--color-ink-faint)">
            {t('componentDialogWeightHint')}
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('commonCancel')}
            </Button>
            <Button
              type="submit"
              loading={create.isPending || update.isPending}
              disabled={!valid}
            >
              {component ? t('commonSaveChanges') : t('componentDialogSubmitAdd')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
