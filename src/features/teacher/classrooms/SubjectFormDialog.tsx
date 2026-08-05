import { useEffect, useState, type ReactNode } from 'react'
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
  useCourseSubjects,
  useCreateCourseSubject,
  useDeleteCourseSubject,
  useUpdateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import { useClassroom } from '@/lib/queries/classrooms'
import {
  useCreateMeetingSlot,
  useDeleteMeetingSlot,
  useMeetingSlots,
  useUpdateMeetingSlot,
} from '@/lib/queries/calendar'
import {
  addHours,
  DEFAULT_DURATION_HOURS,
  WEEKDAY_LABELS,
} from '@/features/teacher/calendar/calendar'
import type { CourseSubject, CourseSubjectKind } from '@/types/domain'

interface FormState {
  name: string
  courseCode: string
  subjectCode: string
  kind: CourseSubjectKind
  description: string
  room: string
  /** '' = no meeting scheduled yet. */
  weekday: string
  startTime: string
  endTime: string
}

function initialState(
  subject?: CourseSubject,
  defaultKind?: CourseSubjectKind,
  defaultName?: string,
): FormState {
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
  defaultKind,
  defaultName,
  trigger,
}: {
  classroomId: string
  subject?: CourseSubject
  /** Pre-selects Subject type when adding — e.g. the classroom already has a
   *  lecture, so the next likely subject is its laboratory. */
  defaultKind?: CourseSubjectKind
  /** Pre-fills Course subject when adding — e.g. the sibling's name with the
   *  kind swapped in. Always editable, never applied when editing. */
  defaultName?: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialState(subject))
  const update = useUpdateCourseSubject()
  const create = useCreateCourseSubject()
  const deleteSubject = useDeleteCourseSubject()
  const meetingSlots = useMeetingSlots(subject?.id)
  const createSlot = useCreateMeetingSlot()
  const updateSlot = useUpdateMeetingSlot()
  const deleteSlot = useDeleteMeetingSlot()
  const { toast } = useToast()
  const isEditing = !!subject
  // Lecture/Laboratory is a college concept — hide the choice entirely for
  // any other level, same as the classroom creation wizard.
  const { data: classroom } = useClassroom(classroomId)
  const isCollege = classroom?.school_level === 'college'

  // A subject can have several meeting slots in the schema, but this form only
  // manages one — the first is what "the schedule" means here.
  const existingSlot = meetingSlots.data?.[0]

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
        title: isEditing
          ? 'Course subject updated'
          : draft.sessionType === 'lecture_lab'
            ? 'Lecture and laboratory added'
            : 'Course subject added',
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

  // A title already used by this classroom for the same kind would hit the
  // unique key, so say so here rather than after a failed save.
  const duplicate =
    !isEditing &&
    kindsFor(draft.sessionType).some((kind) =>
      siblings.some(
        (item) =>
          item.kind === kind &&
          item.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
      ),
    )

  return (
    <ResponsiveDrawer open={open} onOpenChange={setOpen}>
      <ResponsiveDrawerTrigger asChild>{trigger}</ResponsiveDrawerTrigger>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={isEditing ? 'Edit course subject' : 'Add a course subject'}
          description={
            isEditing
              ? 'Renaming this updates it everywhere the subject appears.'
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

      {/* Bottom sheet on phones, centred modal at md+ — same pattern as the
          sign-out confirmation in TopBar. */}
      {subject && (
        <ResponsiveDrawer
          open={confirmDelete}
          onOpenChange={(next) => !deleteSubject.isPending && setConfirmDelete(next)}
        >
          <ResponsiveDrawerContent className="!min-h-0 md:max-w-md">
            <ResponsiveDrawerHeader
              title="Delete subject"
              description={`This permanently deletes "${subject.name}" — its schedule, grading periods, activities, scores, and attendance sessions all go with it. The shared roster and students stay untouched. This can't be undone.`}
            />
            <ResponsiveDrawerFooter
              primaryLabel="Delete"
              primaryVariant="danger"
              primaryLoading={deleteSubject.isPending}
              onPrimary={() => void handleDelete()}
              onSecondary={() => setConfirmDelete(false)}
            />
          </ResponsiveDrawerContent>
        </ResponsiveDrawer>
      )}
    </ResponsiveDrawer>
  )
}
