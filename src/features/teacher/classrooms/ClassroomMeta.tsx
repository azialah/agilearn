import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { ChevronRightIcon, EditIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/lib/locale'
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
  const { t } = useLocale()
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const { data: roster } = useStudentsPage(classroomId, 0)
  const { data: allSlots = [] } = useMeetingSlots()

  const slotsFor = (subjectId: string) =>
    allSlots.filter((slot) => slot.course_subject_id === subjectId)

  // The meeting times a teacher actually needs at a glance, folded into the
  // closed state so this panel stops eating the top of Roster, Grades and
  // Attendance alike.
  const schedule = subjects
    .flatMap((subject) => slotsFor(subject.id))
    .map((slot) => `${WEEKDAY_LABELS[slot.weekday]} ${to12Hour(slot.starts_at)}`)
    .join(', ')

  return (
    <section
      aria-label={t('classroomsSubjectsSectionLabel')}
      className="relative rounded-2xl border border-(--color-border) bg-(--color-surface-1)"
    >
      {/* Sits over the summary rather than inside it: a button nested in a
          <summary> swallows the click that should toggle the panel. Placed
          before <details> so tab order matches the visual order — after it, a
          keyboard user had to pass every subject row to reach this. */}
      <div className="absolute right-2 top-2">
        <SubjectFormDialog
          classroomId={classroomId}
          trigger={
            <Button variant="ghost" size="sm">
              <PlusIcon /> {t('classroomsAddSubjectButton')}
            </Button>
          }
        />
      </div>

      {/* Native <details>: correct keyboard and screen-reader behaviour, and it
          opens for in-page find, none of which a div-and-state version gets. */}
      <details className="group/panel">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-3 pl-4 pr-32 text-sm text-(--color-ink-muted) [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon className="size-4 shrink-0 text-(--color-ink-faint) transition-transform group-open/panel:rotate-90" />
          <span className="line-clamp-2 min-w-0 flex-1">
            <span className="font-medium text-(--color-ink)">
              {roster?.total ?? 0} {t('students')}
            </span>{' '}
            {t(
              subjects.length === 1
                ? 'classroomsSharedBySubjectsOne'
                : 'classroomsSharedBySubjectsOther',
              { n: subjects.length },
            )}
            {schedule && ` · ${schedule}`}
          </span>
        </summary>

        {subjects.length > 0 && (
          <ul className="divide-y divide-(--color-border) border-t border-(--color-border)">
            {subjects.map((subject) => (
              <SubjectRow
                key={subject.id}
                classroomId={classroomId}
                subject={subject}
                slots={slotsFor(subject.id)}
              />
            ))}
          </ul>
        )}
      </details>
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
  const { t } = useLocale()
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
          <p className="mt-1 text-xs text-(--color-ink-faint)">
            {t('classroomsNoMeetingScheduled')}
          </p>
        )}
      </div>
      <MeetingSlotDialog
        subject={subject}
        trigger={
          <Button variant="ghost" size="sm">
            <PlusIcon /> {t('classroomsAddMeetingButton')}
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
  const { t } = useLocale()
  const remove = useDeleteMeetingSlot()
  const { toast } = useToast()
  const when = `${WEEKDAY_LABELS[slot.weekday]} ${to12Hour(slot.starts_at)}–${to12Hour(slot.ends_at)}`

  async function handleDelete() {
    try {
      await remove.mutateAsync(slot)
      toast({ title: t('classroomsMeetingRemovedToast'), tone: 'success' })
    } catch (error) {
      toast({
        title: t('classroomsRemoveMeetingError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  return (
    <li className="group flex items-center gap-2 text-xs text-(--color-ink-muted)">
      <span className="font-medium text-(--color-ink)">{when}</span>
      {slot.location_label && <span>{slot.location_label}</span>}
      {/* The row already names the subject, so these only need the time. Always
          shown on touch, where hover never fires and they were unreachable. */}
      <span className="flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        <MeetingSlotDialog
          subject={subject}
          slot={slot}
          trigger={
            <IconButton label={t('classroomsEditMeetingLabel', { when })} size="sm">
              <EditIcon />
            </IconButton>
          }
        />
        <ConfirmDialog
          title={t('classroomsRemoveMeetingTitle')}
          description={t('classroomsRemoveMeetingDescription', {
            subject: subject.name,
            when,
          })}
          confirmLabel={t('commonRemove')}
          onConfirm={handleDelete}
          trigger={
            <IconButton
              label={t('classroomsRemoveMeetingLabel', { when })}
              size="sm"
              variant="danger"
            >
              <TrashIcon />
            </IconButton>
          }
        />
      </span>
    </li>
  )
}
