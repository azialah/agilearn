/**
 * Pairs a Lecture subject with its Laboratory subject for the class-record
 * grade sheet ("MIDTERM GRADE LEC (40%) | MIDTERM GRADE LAB (60%) | MIDTERM
 * GRADE"). Pure: decides which two subjects and which weights, never grades.
 *
 * Teachers set Lecture and Laboratory up as separate subjects (kind
 * 'lecture' / 'laboratory'), each with its own periods and scores, so the sheet
 * has to read both gradebooks.
 */

import { DEFAULT_WEIGHTS, hasExactWeightTotal } from '@/lib/grading'
import type { CourseSubject } from '@/types/domain'

type PairSubject = Pick<CourseSubject, 'id' | 'kind' | 'name' | 'course_code'>

export interface LecLabPair {
  lecture: PairSubject
  laboratory: PairSubject
  weights: { lecture: number; laboratory: number }
  /** Where the weights came from: a saved combination, or the 40/60 default. */
  source: 'combination' | 'default'
}

interface CombinationLike {
  items: readonly { course_subject_id: string; weight: number }[]
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\((lec|lab|lecture|laboratory)\)/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * The Lecture/Laboratory pair the active subject belongs to, or null when it
 * has no unambiguous partner.
 *
 * 1. A saved combination with exactly one Lecture and one Laboratory subject,
 *    including the active one, supplies the pair and its weights.
 * 2. Otherwise the partner is the one subject of the other kind with the same
 *    course code, else the same name, else the only one in the classroom —
 *    weighted Lecture 40% + Laboratory 60%.
 */
export function findLecLabPair(
  subjects: readonly PairSubject[],
  activeSubjectId: string | undefined,
  combinations: readonly CombinationLike[] = [],
): LecLabPair | null {
  const active = subjects.find((subject) => subject.id === activeSubjectId)
  if (!active || (active.kind !== 'lecture' && active.kind !== 'laboratory')) return null
  const byId = new Map(subjects.map((subject) => [subject.id, subject]))

  for (const combination of combinations) {
    if (combination.items.length !== 2) continue
    if (!combination.items.some((item) => item.course_subject_id === active.id)) continue
    const lectureItem = combination.items.find(
      (item) => byId.get(item.course_subject_id)?.kind === 'lecture',
    )
    const laboratoryItem = combination.items.find(
      (item) => byId.get(item.course_subject_id)?.kind === 'laboratory',
    )
    const lecture = lectureItem && byId.get(lectureItem.course_subject_id)
    const laboratory = laboratoryItem && byId.get(laboratoryItem.course_subject_id)
    if (
      lecture &&
      laboratory &&
      lectureItem &&
      laboratoryItem &&
      hasExactWeightTotal([lectureItem.weight, laboratoryItem.weight])
    ) {
      return {
        lecture,
        laboratory,
        weights: {
          lecture: Number(lectureItem.weight),
          laboratory: Number(laboratoryItem.weight),
        },
        source: 'combination',
      }
    }
  }

  const otherKind = active.kind === 'lecture' ? 'laboratory' : 'lecture'
  const candidates = subjects.filter((subject) => subject.kind === otherKind)
  const code = active.course_code.trim().toLowerCase()
  const byCode = code
    ? candidates.filter((subject) => subject.course_code.trim().toLowerCase() === code)
    : []
  const byName = candidates.filter(
    (subject) => normalize(subject.name) === normalize(active.name),
  )
  const partner =
    (byCode.length === 1 && byCode[0]) ||
    (byName.length === 1 && byName[0]) ||
    (candidates.length === 1 && candidates[0]) ||
    null
  if (!partner) return null

  return {
    lecture: active.kind === 'lecture' ? active : partner,
    laboratory: active.kind === 'laboratory' ? active : partner,
    weights: { ...DEFAULT_WEIGHTS },
    source: 'default',
  }
}
