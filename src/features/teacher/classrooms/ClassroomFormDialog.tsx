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
import { useCreateClassroom, useUpdateClassroom } from '@/lib/queries/classrooms'
import type { Classroom } from '@/types/domain'

interface FormState {
  course_name: string
  course_code: string
  year: string
  block: string
  lecture_weight: number
  laboratory_weight: number
}

function initialState(classroom?: Classroom): FormState {
  return {
    course_name: classroom?.course_name ?? '',
    course_code: classroom?.course_code ?? '',
    year: classroom?.year ?? '',
    block: classroom?.block ?? '',
    lecture_weight: classroom?.lecture_weight ?? 0.4,
    laboratory_weight: classroom?.laboratory_weight ?? 0.6,
  }
}

export function ClassroomFormDialog({
  ownerId,
  classroom,
  trigger,
}: {
  ownerId: string
  classroom?: Classroom
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialState(classroom))
  const createClassroom = useCreateClassroom()
  const updateClassroom = useUpdateClassroom()
  const { toast } = useToast()
  const isEditing = !!classroom

  useEffect(() => {
    if (open) setForm(initialState(classroom))
  }, [open, classroom])

  const weightsValid = Math.abs(form.lecture_weight + form.laboratory_weight - 1) < 0.0005

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!weightsValid) return
    try {
      if (isEditing) {
        await updateClassroom.mutateAsync({ id: classroom.id, patch: form })
        toast({ title: 'Classroom updated', tone: 'success' })
      } else {
        await createClassroom.mutateAsync({ ...form, owner_id: ownerId })
        toast({ title: 'Classroom created', tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update classroom' : 'Could not create classroom',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  const pending = createClassroom.isPending || updateClassroom.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit classroom' : 'New classroom'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="course_name">Course name</Label>
            <Input
              id="course_name"
              required
              value={form.course_name}
              onChange={(e) => setForm({ ...form, course_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course_code">Course code</Label>
              <Input
                id="course_code"
                required
                value={form.course_code}
                onChange={(e) => setForm({ ...form, course_code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="block">Block</Label>
              <Input
                id="block"
                required
                value={form.block}
                onChange={(e) => setForm({ ...form, block: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lecture_weight">Lecture weight</Label>
              <Input
                id="lecture_weight"
                type="number"
                min={0}
                max={1}
                step={0.001}
                value={form.lecture_weight}
                onChange={(e) =>
                  setForm({
                    ...form,
                    lecture_weight: Number(e.target.value),
                    laboratory_weight: Number((1 - Number(e.target.value)).toFixed(3)),
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="laboratory_weight">Laboratory weight</Label>
              <Input
                id="laboratory_weight"
                type="number"
                min={0}
                max={1}
                step={0.001}
                value={form.laboratory_weight}
                onChange={(e) =>
                  setForm({
                    ...form,
                    laboratory_weight: Number(e.target.value),
                    lecture_weight: Number((1 - Number(e.target.value)).toFixed(3)),
                  })
                }
              />
            </div>
          </div>
          {!weightsValid && (
            <p className="text-sm text-[var(--color-danger)]">
              Lecture and laboratory weights must sum to 1.000.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={!weightsValid}>
              {isEditing ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
