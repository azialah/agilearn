import { useMemo } from 'react'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import { useGradebookStructure, useScores } from '@/lib/queries/grades'
import {
  computeConfiguredStudentGradebook,
  type ConfiguredStudentGradebook,
} from '@/lib/grading'
import {
  studentFullName,
  type Classroom,
  type GradeComponentRecord,
  type GradingPeriod,
} from '@/types/domain'
import type { Student } from '@/types/domain'

export interface SlideshowStudent {
  student: Student
  fullName: string
  gradebook: ConfiguredStudentGradebook
}

export interface SlideshowData {
  classroom: Classroom | null | undefined
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  students: SlideshowStudent[]
  isLoading: boolean
  isError: boolean
  error: unknown
}

/**
 * Read-only aggregate hook for the slideshow. Composes the shared classroom,
 * roster, gradebook-structure and scores queries, then computes every student's
 * grade breakdown with the pure engine in `@/lib/grading`. No writes happen
 * here — the slideshow only presents.
 */
export function useSlideshowData(classroomId: string): SlideshowData {
  const classroomQuery = useClassroom(classroomId)
  const studentsQuery = useStudents(classroomId)
  const structureQuery = useGradebookStructure(classroomId)

  const structure = structureQuery.data
  const activityIds = useMemo(
    () => (structure ? structure.activities.map((a) => a.id) : []),
    [structure],
  )
  const scoresQuery = useScores(classroomId, activityIds)

  const students = useMemo<SlideshowStudent[]>(() => {
    if (!structure || !studentsQuery.data) return []
    // Scores may be disabled (no activities yet) — treat as an empty map so the
    // grading engine reports every grade as missing rather than crashing.
    const scores = scoresQuery.data ?? {}
    return studentsQuery.data.map((student) => ({
      student,
      fullName: studentFullName(student),
      gradebook: computeConfiguredStudentGradebook(structure, scores, student.id),
    }))
  }, [structure, studentsQuery.data, scoresQuery.data])

  // The scores query is intentionally disabled until activity ids are known; a
  // disabled query reports `isLoading` in React Query v5, so only treat it as
  // loading once it is actually enabled.
  const scoresLoading = activityIds.length > 0 && scoresQuery.isLoading

  return {
    classroom: classroomQuery.data,
    periods: structure?.periods ?? [],
    components: structure?.components ?? [],
    students,
    isLoading:
      classroomQuery.isLoading ||
      studentsQuery.isLoading ||
      structureQuery.isLoading ||
      scoresLoading,
    isError:
      classroomQuery.isError ||
      studentsQuery.isError ||
      structureQuery.isError ||
      scoresQuery.isError,
    error:
      classroomQuery.error ??
      studentsQuery.error ??
      structureQuery.error ??
      scoresQuery.error,
  }
}
