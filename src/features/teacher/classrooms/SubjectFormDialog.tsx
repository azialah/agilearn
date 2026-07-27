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
    name: subject?.name ?? defaultName ?? '',
    courseCode: subject?.course_code ?? '',
    subjectCode: subject?.subject_code ?? '',
    kind: subject?.kind ?? defaultKind ?? 'other',
    description: subject?.description ?? '',
    room: subject?.room ?? '',
    weekday: '',
    startTime: '',
    endTime: '',
  }
}

/** A Postgres unique-violation on the course_subjects name, distinguished
 * from the meeting slot's own unique constraint (a different failure —
 * "this time slot already exists" — that save() can also hit via
 * saveSchedule right after this). */
function isNameCollision(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.includes(
      'course_subjects_classroom_id_name_key',
    )
  )
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<FormState>(
    initialState(subject, defaultKind, defaultName),
  )
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
    if (!open) return
    setForm({
      ...initialState(subject, defaultKind, defaultName),
      weekday: existingSlot ? String(existingSlot.weekday) : '',
      startTime: existingSlot?.starts_at.slice(0, 5) ?? '',
      endTime: existingSlot?.ends_at.slice(0, 5) ?? '',
    })
    // existingSlot intentionally excluded: it should only seed the form once,
    // right after the slots for this subject finish loading — not on every
    // keystroke re-render while the drawer stays open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject, defaultKind, defaultName, meetingSlots.data])

  const scheduleComplete = Boolean(form.weekday !== '' && form.startTime && form.endTime)
  const scheduleStarted = Boolean(form.weekday !== '' || form.startTime || form.endTime)
  const scheduleInvalid = scheduleStarted && !scheduleComplete

  async function saveSchedule(subjectId: string) {
    if (scheduleComplete) {
      const patch = {
        weekday: Number(form.weekday),
        starts_at: form.startTime,
        ends_at: form.endTime,
      }
      if (existingSlot) await updateSlot.mutateAsync({ id: existingSlot.id, patch })
      else await createSlot.mutateAsync({ course_subject_id: subjectId, ...patch })
    } else if (existingSlot) {
      await deleteSlot.mutateAsync(existingSlot)
    }
  }

  async function save() {
    if (!form.name.trim() || scheduleInvalid) return
    const fields = {
      name: form.name.trim(),
      course_code: form.courseCode.trim(),
      subject_code: form.subjectCode.trim(),
      kind: form.kind,
      description: form.description.trim(),
      room: form.room.trim(),
    }
    try {
      const savedId = subject
        ? (await update.mutateAsync({ id: subject.id, patch: fields })).id
        : (await create.mutateAsync({ classroom_id: classroomId, ...fields })).id
      await saveSchedule(savedId)
      toast({
        title: isEditing ? 'Course subject updated' : 'Course subject added',
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update the subject' : 'Could not add the subject',
        description: isNameCollision(error)
          ? `A subject named "${form.name.trim()}" already exists in this classroom — pick a different name.`
          : error instanceof Error
            ? error.message
            : undefined,
        tone: 'error',
      })
    }
  }

  async function handleDelete() {
    if (!subject) return
    try {
      await deleteSubject.mutateAsync({ id: subject.id, classroomId })
      toast({ title: 'Course subject deleted', tone: 'success' })
      setConfirmDelete(false)
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Could not delete the subject',
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {isCollege && (
              <div className="space-y-1.5">
                <Label htmlFor="subject-edit-kind">Subject type</Label>
                <select
                  id="subject-edit-kind"
                  aria-label="Subject type"
                  value={form.kind}
                  onChange={(event) => {
                    const kind = event.target.value as CourseSubjectKind
                    setForm({
                      ...form,
                      kind,
                      endTime:
                        form.endTime ||
                        (form.startTime
                          ? addHours(form.startTime, DEFAULT_DURATION_HOURS[kind])
                          : ''),
                    })
                  }}
                  className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                >
                  <option value="other">Other</option>
                  <option value="lecture">Lecture</option>
                  <option value="laboratory">Laboratory</option>
                </select>
              </div>
            )}
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
            <div className="space-y-1.5">
              <Label htmlFor="subject-edit-day">Schedule</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <select
                  id="subject-edit-day"
                  aria-label="Meeting day"
                  value={form.weekday}
                  onChange={(event) => setForm({ ...form, weekday: event.target.value })}
                  className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                >
                  <option value="">Day</option>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={(event) => {
                    const startTime = event.target.value
                    setForm({
                      ...form,
                      startTime,
                      endTime:
                        form.endTime ||
                        (startTime
                          ? addHours(startTime, DEFAULT_DURATION_HOURS[form.kind])
                          : ''),
                    })
                  }}
                />
                <Input
                  aria-label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                />
              </div>
              {scheduleInvalid && (
                <p role="alert" className="text-xs text-(--color-danger)">
                  Set the day, start time, and end time together, or leave all three
                  empty.
                </p>
              )}
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
            {isEditing && (
              <div className="border-t border-(--color-border) pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-sm font-medium text-(--color-danger) hover:underline"
                >
                  Delete subject
                </button>
              </div>
            )}
          </div>
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={isEditing ? 'Save subject' : 'Add subject'}
          primaryDisabled={!form.name.trim() || scheduleInvalid}
          primaryLoading={
            update.isPending ||
            create.isPending ||
            createSlot.isPending ||
            updateSlot.isPending ||
            deleteSlot.isPending
          }
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
