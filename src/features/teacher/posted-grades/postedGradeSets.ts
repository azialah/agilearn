import type { CourseSubject, PostedGrade } from '@/types/domain'
import { periodKey } from '@/features/teacher/io/classRecordPlan'

/** One subject + term worth of posted grades, as picked in the UI. */
export interface PostedGradeSet {
  key: string
  courseSubjectId: string
  term: string
  subjectName: string
  subjectCode: string
  label: string
  rows: PostedGrade[]
  /** Latest updated_at in the set, for "most recent first" ordering. */
  updatedAt: string
}

/** Group posted grades by subject + term, most recently updated first. */
export function postedGradeSets(
  rows: readonly PostedGrade[],
  subjects: readonly Pick<
    CourseSubject,
    'id' | 'name' | 'subject_code' | 'course_code'
  >[],
): PostedGradeSet[] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))
  const sets = new Map<string, PostedGradeSet>()
  for (const row of rows) {
    const key = `${row.course_subject_id}::${row.term}`
    let set = sets.get(key)
    if (!set) {
      const subject = byId.get(row.course_subject_id)
      const subjectName = subject?.name ?? 'Subject'
      set = {
        key,
        courseSubjectId: row.course_subject_id,
        term: row.term,
        subjectName,
        subjectCode: subject?.subject_code || subject?.course_code || '',
        label: `${subjectName} — ${row.term}`,
        rows: [],
        updatedAt: row.updated_at,
      }
      sets.set(key, set)
    }
    set.rows.push(row)
    if (row.updated_at > set.updatedAt) set.updatedAt = row.updated_at
  }
  return [...sets.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Key of a recorded term grade: student + period name, matched loosely. */
export function recordedGradeKey(studentId: string, periodName: string): string {
  return `${studentId}|${periodKey(periodName)}`
}

/**
 * The term grades teachers recorded on their own sheets (posted_grades), for
 * the subjects being presented, keyed by {@link recordedGradeKey}. The
 * gradebook view shows these instead of recomputing: the sheet's grade was
 * worked out from unrounded raw grades the sheet does not carry, so recomputing
 * from its whole-number Lecture and Laboratory can land a point away.
 */
export function recordedTermGrades(
  rows: readonly PostedGrade[],
  subjectIds: readonly string[],
): Map<string, number> {
  const map = new Map<string, number>()
  // Newest first, so a re-import for the other half of the pair wins.
  const sorted = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  for (const row of sorted) {
    if (row.term_grade === null || !subjectIds.includes(row.course_subject_id)) continue
    const key = recordedGradeKey(row.student_id, row.term)
    if (!map.has(key)) map.set(key, Number(row.term_grade))
  }
  return map
}
