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
import { useCreateStudent, useUpdateStudent } from '@/lib/queries/students'
import type { Student } from '@/types/domain'

interface FormState {
  student_no: string
  last_name: string
  first_name: string
  middle_initial: string
}

function initialState(student?: Student): FormState {
  return {
    student_no: student?.student_no ?? '',
    last_name: student?.last_name ?? '',
    first_name: student?.first_name ?? '',
    middle_initial: student?.middle_initial ?? '',
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
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialState(student))
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const { toast } = useToast()
  const isEditing = !!student

  useEffect(() => {
    if (open) setForm(initialState(student))
  }, [open, student])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (isEditing) {
        await updateStudent.mutateAsync({ id: student.id, patch: form })
        toast({ title: 'Student updated', tone: 'success' })
      } else {
        await createStudent.mutateAsync({ ...form, classroom_id: classroomId })
        toast({ title: 'Student added', tone: 'success' })
      }
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update student' : 'Could not add student',
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
          <DialogTitle>{isEditing ? 'Edit student' : 'Add student'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="student_no">Student number</Label>
            <Input
              id="student_no"
              required
              value={form.student_no}
              onChange={(e) => setForm({ ...form, student_no: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middle_initial">Middle initial</Label>
            <Input
              id="middle_initial"
              maxLength={4}
              value={form.middle_initial}
              onChange={(e) => setForm({ ...form, middle_initial: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {isEditing ? 'Save changes' : 'Add student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
