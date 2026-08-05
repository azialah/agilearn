import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { EditIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useStudentsPage } from '@/lib/queries/students'
import { useDeleteMeetingSlot, useMeetingSlots } from '@/lib/queries/calendar'
import { MeetingSlotDialog } from '@/features/teacher/calendar/MeetingSlotDialog'
import { to12Hour, WEEKDAY_LABELS } from '@/features/teacher/calendar/calendar'
import type { CourseSubject, SubjectMeetingSlot } from '@/types/domain'
import { KIND_LABEL } from './SubjectFields'
import { SubjectFormDialog } from './SubjectFormDialog'

/**
 * The classroom's subjects and their weekly meetings — one list, not five.
 *
 * This used to render each subject three times over: a chip, a "Schedule
 * <subject>" button, and a meeting row that repeated the name again. With real
 * subject names running past seventy characters, one classroom filled the screen
 * with the same string. Each subject now owns a single row that carries its
 * identity, its meetings, and its actions.
 *
 * The subject's kind/code header doubles as the entry point into editing (or
 * deleting) the subject itself — opening SubjectFormDialog in edit mode, the
 * same dialog used for adding one. There is no separate "rename this subject"
 * flow to keep in sync with it.
 */
export function ClassroomMeta({ classroomId }: { classroomId: string }) {
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const { data: roster } = useStudentsPage(classroomId, 0)
  const { data: allSlots = [] } = useMeetingSlots()

  return (
    <section
      aria-label="Course subjects"
      className="rounded-2xl border border-(--color-border) bg-(--color-surface-1)"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm text-(--color-ink-muted)">
          <span className="font-medium text-(--color-ink)">
            {roster?.total ?? 0} students
          </span>{' '}
          shared by {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
        </p>
        <SubjectFormDialog
          classroomId={classroomId}
          trigger={
            <Button variant="ghost" size="sm">
              <PlusIcon /> Add subject
            </Button>
          }
        />
      </header>

      {subjects.length > 0 && (
        <ul className="divide-y divide-(--color-border) border-t border-(--color-border)">
          {subjects.map((subject) => (
            <SubjectRow
              key={subject.id}
              classroomId={classroomId}
              subject={subject}
              slots={allSlots.filter((slot) => slot.course_subject_id === subject.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function SubjectRow({
  classroomId,
  subject,
  slots,
}: {
  classroomId: string
  subject: CourseSubject
  slots: SubjectMeetingSlot[]
}) {
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <SubjectFormDialog
          classroomId={classroomId}
          subject={subject}
          trigger={
            <button
              type="button"
              className="flex flex-wrap items-baseline gap-x-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-(--color-accent-350)">
                {KIND_LABEL[subject.kind]}
              </span>
              {subject.course_code && (
                <span className="font-mono text-xs text-(--color-ink-muted)">
                  {subject.course_code}
                </span>
              )}
            </button>
          }
        />
        {/* Long names are the norm here, so one truncated line with the full
            text on hover beats wrapping four lines of repeated words. */}
        <p className="truncate text-sm text-(--color-ink)" title={subject.name}>
          {subject.name}
        </p>
        {slots.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {slots.map((slot) => (
              <MeetingRow key={slot.id} slot={slot} subject={subject} />
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-(--color-ink-faint)">No meeting scheduled</p>
        )}
      </div>
      <MeetingSlotDialog
        subject={subject}
        trigger={
          <Button variant="ghost" size="sm">
            <PlusIcon /> Meeting
          </Button>
        }
      />
    </li>
  )
}

function MeetingRow({
  slot,
  subject,
}: {
  slot: SubjectMeetingSlot
  subject: CourseSubject
}) {
  const remove = useDeleteMeetingSlot()
  const { toast } = useToast()
  const when = `${WEEKDAY_LABELS[slot.weekday]} ${to12Hour(slot.starts_at)}–${to12Hour(slot.ends_at)}`

  async function handleDelete() {
    try {
      await remove.mutateAsync(slot)
      toast({ title: 'Meeting removed', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not remove the meeting',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <li className="group flex items-center gap-2 text-xs text-(--color-ink-muted)">
      <span className="font-medium text-(--color-ink)">{when}</span>
      {slot.location_label && <span>{slot.location_label}</span>}
      {/* The row already names the subject, so these only need the time. */}
      <span className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <MeetingSlotDialog
          subject={subject}
          slot={slot}
          trigger={
            <IconButton label={`Edit the ${when} meeting`} size="sm">
              <EditIcon />
            </IconButton>
          }
        />
        <ConfirmDialog
          title="Remove this meeting?"
          description={`${subject.name} on ${when} disappears from your Calendar. The subject and its grades stay.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          trigger={
            <IconButton label={`Remove the ${when} meeting`} size="sm" variant="danger">
              <TrashIcon />
            </IconButton>
          }
        />
      </span>
    </li>
  )
}
