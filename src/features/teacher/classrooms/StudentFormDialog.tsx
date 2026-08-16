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
import { useLocale } from '@/lib/locale'
import { useCreateStudent, useUpdateStudent } from '@/lib/queries/students'
import { toInitial } from '@/features/teacher/io/parsing'
import type { Student } from '@/types/domain'

interface FormState {
  student_no: string
  last_name: string
  first_name: string
  middle_initial: string
  student_email: string
  guardian_email: string
}

function initialState(student?: Student): FormState {
  return {
    student_no: student?.student_no ?? '',
    last_name: student?.last_name ?? '',
    first_name: student?.first_name ?? '',
    middle_initial: student?.middle_initial ?? '',
    student_email: student?.student_email ?? '',
    guardian_email: student?.guardian_email ?? '',
  }
}

export function StudentFormDialog({
  classroomId,
  student,
  trigger,
}: {
  classroomId: string
  student?: Student
  trigger: ReactNode
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [raw, setForm] = useState<FormState>(initialState(student))
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const { toast } = useToast()
  const isEditing = !!student

  useEffect(() => {
    if (open) setForm(initialState(student))
  }, [open, student])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // The field accepts a full middle name; the roster keeps only the initial.
    const form = { ...raw, middle_initial: toInitial(raw.middle_initial) }
    try {
      if (isEditing) {
        await updateStudent.mutateAsync({
          id: student.id,
          patch: {
            ...form,
            student_email: form.student_email || null,
            guardian_email: form.guardian_email || null,
          },
        })
        toast({ title: t('studentDialogUpdateSuccess'), tone: 'success' })
      } else {
        await createStudent.mutateAsync({
          ...form,
          student_email: form.student_email || null,
          guardian_email: form.guardian_email || null,
          classroom_id: classroomId,
        })
        toast({ title: t('studentDialogAddSuccess'), tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? t('studentDialogUpdateError') : t('studentDialogAddError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createStudent.isPending || updateStudent.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('studentDialogEditTitle') : t('studentDialogAddTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="student_no">{t('studentDialogStudentNoLabel')}</Label>
            <Input
              id="student_no"
              required
              value={raw.student_no}
              onChange={(e) => setForm({ ...raw, student_no: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="student_email">
                {t('studentDialogStudentEmailLabel')}{' '}
                <span className="font-normal text-(--color-ink-faint)">
                  {t('commonOptional')}
                </span>
              </Label>
              <Input
                id="student_email"
                type="email"
                placeholder={t('studentDialogStudentEmailPlaceholder')}
                value={raw.student_email}
                onChange={(e) => setForm({ ...raw, student_email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guardian_email">
                {t('studentDialogGuardianEmailLabel')}{' '}
                <span className="font-normal text-(--color-ink-faint)">
                  {t('commonOptional')}
                </span>
              </Label>
              <Input
                id="guardian_email"
                type="email"
                placeholder={t('studentDialogGuardianEmailPlaceholder')}
                value={raw.guardian_email}
                onChange={(e) => setForm({ ...raw, guardian_email: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs leading-5 text-(--color-ink-faint)">
            {t('studentDialogContactsHint')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="last_name">{t('studentDialogLastNameLabel')}</Label>
              <Input
                id="last_name"
                required
                value={raw.last_name}
                onChange={(e) => setForm({ ...raw, last_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first_name">{t('studentDialogFirstNameLabel')}</Label>
              <Input
                id="first_name"
                required
                value={raw.first_name}
                onChange={(e) => setForm({ ...raw, first_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middle_initial">{t('studentDialogMiddleNameLabel')}</Label>
            <Input
              id="middle_initial"
              value={raw.middle_initial}
              onChange={(e) => setForm({ ...raw, middle_initial: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('commonCancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing
                ? t('studentDialogSaveChangesButton')
                : t('studentDialogAddButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
