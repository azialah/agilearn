import { useMemo } from 'react'
import { useMeetingSlots } from '@/lib/queries/calendar'
import { useAllCourseSubjects } from '@/lib/queries/academicWorkspace'
import { useClassrooms } from '@/lib/queries/classrooms'
import { conflictReason, findSlotConflicts, type SlotLike } from './calendar'

/**
 * Human-readable reasons the proposed meeting clashes with the teacher's own
 * timetable. `useMeetingSlots()` with no argument returns every slot RLS lets
 * this teacher see — their whole week across every classroom — so a clash with
 * a different section is caught, not just one within the same subject.
 *
 * Advisory only. The database's EXCLUDE constraint is the real boundary; this
 * exists so the teacher finds out before pressing save rather than after.
 */
export function useSlotConflicts(proposed: SlotLike, ignoreSlotId?: string): string[] {
  const { data: slots = [] } = useMeetingSlots()
  const { data: subjects = [] } = useAllCourseSubjects()
  const { data: classrooms = [] } = useClassrooms()

  return useMemo(() => {
    const candidates = ignoreSlotId
      ? slots.filter((slot) => slot.id !== ignoreSlotId)
      : slots
    return findSlotConflicts(proposed, candidates).map((slot) => {
      const subject = subjects.find((item) => item.id === slot.course_subject_id)
      const classroom = classrooms.find((item) => item.id === subject?.classroom_id)
      const cohort = classroom?.cohort_name || classroom?.block
      const label = [subject?.name ?? 'another subject', cohort && `(${cohort})`]
        .filter(Boolean)
        .join(' ')
      return conflictReason(proposed, slot, label)
    })
  }, [proposed, slots, subjects, classrooms, ignoreSlotId])
}
