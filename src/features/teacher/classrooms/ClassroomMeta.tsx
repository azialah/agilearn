import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PlusIcon } from '@/components/icons'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useStudentsPage } from '@/lib/queries/students'
import { MeetingSlotDialog } from '@/features/teacher/calendar/MeetingSlotDialog'
import { SubjectFormDialog } from './SubjectFormDialog'

/**
 * Roster size, the subjects sharing that roster, and their weekly meetings.
 * Rendered under the header on every classroom tab so the context does not
 * disappear when you move from Roster to Grades or Attendance.
 *
 * Page 0 of the roster query is reused purely for its exact count — the roster
 * table already holds it in cache, so this costs no extra request there.
 */
export function ClassroomMeta({ classroomId }: { classroomId: string }) {
  const { data: subjects = [] } = useCourseSubjects(classroomId)
  const { data: roster } = useStudentsPage(classroomId, 0)

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-surface-1) px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-xs font-medium text-(--color-ink-faint)">
          Course subjects · one shared roster
        </p>
        <Badge>{roster?.total ?? 0} students</Badge>
        {subjects.map((subject) => (
          <Badge key={subject.id} tone="accent">
            {subject.name}
          </Badge>
        ))}
        <SubjectFormDialog
          classroomId={classroomId}
          trigger={
            <Button variant="ghost" size="sm">
              <PlusIcon /> Add subject
            </Button>
          }
        />
      </div>

      {subjects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-(--color-border) pt-2">
          {subjects.map((subject) => (
            <MeetingSlotDialog
              key={subject.id}
              subject={subject}
              trigger={
                <Button variant="ghost" size="sm">
                  <PlusIcon />
                  {subjects.length > 1
                    ? `Schedule ${subject.name}`
                    : 'Schedule a meeting'}
                </Button>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
