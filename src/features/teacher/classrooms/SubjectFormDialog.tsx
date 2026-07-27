import { useEffect, useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTrigger,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import {
  useCreateCourseSubject,
  useUpdateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import type { CourseSubject, CourseSubjectKind } from '@/types/domain'

interface FormState {
  name: string
  courseCode: string
  subjectCode: string
  kind: CourseSubjectKind
  description: string
  schedule: string
  room: string
}

function initialState(subject?: CourseSubject): FormState {
  return {
    name: subject?.name ?? '',
    courseCode: subject?.course_code ?? '',
    subjectCode: subject?.subject_code ?? '',
    kind: subject?.kind ?? 'other',
    description: subject?.description ?? '',
    schedule: subject?.schedule ?? '',
    room: subject?.room ?? '',
  }
}

/**
 * Add or edit a course subject. Adding one reuses the classroom's existing
 * roster — a lecture and its laboratory are two subjects over the same students.
 */
export function SubjectFormDialog({
  classroomId,
  subject,
  trigger,
}: {
  classroomId: string
  subject?: CourseSubject
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialState(subject))
  const update = useUpdateCourseSubject()
  const create = useCreateCourseSubject()
  const { toast } = useToast()
  const isEditing = !!subject

  useEffect(() => {
    if (open) setForm(initialState(subject))
  }, [open, subject])

  async function save() {
    if (!form.name.trim()) return
    const fields = {
      name: form.name.trim(),
      course_code: form.courseCode.trim(),
      subject_code: form.subjectCode.trim(),
      kind: form.kind,
      description: form.description.trim(),
      schedule: form.schedule.trim(),
      room: form.room.trim(),
    }
    try {
      if (subject) await update.mutateAsync({ id: subject.id, patch: fields })
      else await create.mutateAsync({ classroom_id: classroomId, ...fields })
      toast({
        title: isEditing ? 'Course subject updated' : 'Course subject added',
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update the subject' : 'Could not add the subject',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <ResponsiveDrawer open={open} onOpenChange={setOpen}>
      <ResponsiveDrawerTrigger asChild>{trigger}</ResponsiveDrawerTrigger>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={isEditing ? 'Edit course subject' : 'Add a course subject'}
          description={
            isEditing
              ? 'Lecture and laboratory are separate subjects, not grade weights.'
              : 'It shares this classroom’s roster — no need to add the students again.'
          }
        />
        <ResponsiveDrawerBody>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject-edit-name">Course subject</Label>
              <Input
                id="subject-edit-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subject-edit-course-code">Course code</Label>
                <Input
                  id="subject-edit-course-code"
                  value={form.courseCode}
                  onChange={(event) =>
                    setForm({ ...form, courseCode: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-edit-subject-code">Subject code</Label>
                <Input
                  id="subject-edit-subject-code"
                  value={form.subjectCode}
                  onChange={(event) =>
                    setForm({ ...form, subjectCode: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-edit-kind">Subject type</Label>
              <select
                id="subject-edit-kind"
                aria-label="Subject type"
                value={form.kind}
                onChange={(event) =>
                  setForm({ ...form, kind: event.target.value as CourseSubjectKind })
                }
                className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
              >
                <option value="other">Other</option>
                <option value="lecture">Lecture</option>
                <option value="laboratory">Laboratory</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject-edit-description">Description</Label>
              <textarea
                id="subject-edit-description"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subject-edit-schedule">Schedule</Label>
                <Input
                  id="subject-edit-schedule"
                  value={form.schedule}
                  placeholder="Mon 3–5 PM"
                  onChange={(event) => setForm({ ...form, schedule: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject-edit-room">Room</Label>
                <Input
                  id="subject-edit-room"
                  value={form.room}
                  placeholder="Room 505"
                  onChange={(event) => setForm({ ...form, room: event.target.value })}
                />
              </div>
            </div>
          </div>
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={isEditing ? 'Save subject' : 'Add subject'}
          primaryDisabled={!form.name.trim()}
          primaryLoading={update.isPending || create.isPending}
          onPrimary={() => void save()}
          onSecondary={() => setOpen(false)}
        />
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
