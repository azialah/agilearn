import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PlusIcon } from '@/components/icons'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useStudentsPage } from '@/lib/queries/students'
import { SubjectFormDialog } from './SubjectFormDialog'
import { KIND_LABEL, subjectLabel } from './SubjectTabs'
import type { CourseSubjectKind } from '@/types/domain'

/** "CS Elective 2 Lecture" + "Laboratory" -> "CS Elective 2 Laboratory". Falls
 * back to appending "(Laboratory)" when the sibling's label isn't in its
 * name, and to no suggestion at all if that would produce the sibling's own
 * name — never suggest one that would immediately collide. */
function suggestName(
  siblingName: string,
  siblingLabel: string,
  nextLabel: string,
): string | undefined {
  const trimmed = siblingName.trim()
  if (!trimmed) return undefined
  const pattern = new RegExp(siblingLabel, 'i')
  const candidate = pattern.test(trimmed)
    ? trimmed.replace(pattern, nextLabel)
    : `${trimmed} (${nextLabel})`
  return candidate.toLowerCase() === trimmed.toLowerCase() ? undefined : candidate
}

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
  const { data: allSlots = [] } = useMeetingSlots()

  // With exactly one subject so far, the next one is almost always its
  // lecture/laboratory counterpart — pre-select that instead of a bare "Other".
  const kinds = new Set(subjects.map((subject) => subject.kind))
  const suggestedKind: CourseSubjectKind | undefined =
    subjects.length === 1 && kinds.has('lecture') && !kinds.has('laboratory')
      ? 'laboratory'
      : subjects.length === 1 && kinds.has('laboratory') && !kinds.has('lecture')
        ? 'lecture'
        : undefined
  const addLabel = suggestedKind ? `Add ${suggestedKind}` : 'Add subject'
  const suggestedName =
    suggestedKind && subjects.length === 1
      ? suggestName(
          subjects[0].name,
          KIND_LABEL[subjects[0].kind],
          KIND_LABEL[suggestedKind],
        )
      : undefined

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
          defaultKind={suggestedKind}
          defaultName={suggestedName}
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
            >
              <PlusIcon className="size-3" /> {addLabel}
            </button>
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
