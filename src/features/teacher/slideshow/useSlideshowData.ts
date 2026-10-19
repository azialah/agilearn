import { useMemo } from 'react'
import { useClassroom } from '@/lib/queries/classrooms'
import { useStudents } from '@/lib/queries/students'
import {
  useGradebookStructure,
  useScores,
  useSubjectGradeCombinations,
  useSubjectGradebooks,
} from '@/lib/queries/grades'
import { useCourseSubjects } from '@/lib/queries/academicWorkspace'
import { usePostedGrades } from '@/lib/queries/postedGrades'
import {
  postedGradeSets,
  recordedTermGrades,
  type PostedGradeSet,
} from '@/features/teacher/posted-grades/postedGradeSets'
import {
  buildGradeSheetTable,
  recordedFor,
  weightLabel,
  type LecLabBooks,
} from '@/features/teacher/io/exportLayout'
import { findLecLabPair, type LecLabPair } from '@/features/teacher/io/lecLabPair'
import {
  computeConfiguredStudentGradebook,
  type ConfiguredStudentGradebook,
} from '@/lib/grading'
import type { ExportLayout } from '@/lib/gradeSheetConfig'
import {
  studentFullName,
  type Classroom,
  type CourseSubject,
  type GradeComponentRecord,
  type GradingPeriod,
} from '@/types/domain'
import type { Student } from '@/types/domain'

/** One labelled number on a class-record card, e.g. "MIDTERM GRADE LEC (40%)". */
export interface ClassRecordCell {
  label: string
  /** Whole number as printed on the grade sheet; null when not graded yet. */
  value: number | null
}

/** One period's card: its component cells, then the period grade last. */
export interface ClassRecordPeriod {
  name: string
  cells: ClassRecordCell[]
  /** The period grade is the one recorded on the teacher's sheet, not recomputed. */
  recorded: boolean
}

export interface SlideshowStudent {
  student: Student
  fullName: string
  gradebook: ConfiguredStudentGradebook
  /** The class-record columns of the grade sheet export, per period. */
  classRecord: ClassRecordPeriod[]
}

const EMPTY_GRADEBOOK: ConfiguredStudentGradebook = {
  perPeriod: {},
  components: {},
  final: null,
}

/** Only the class-record group — the slide shows exactly these export columns. */
const CLASS_RECORD_LAYOUT: ExportLayout = {
  sheetName: 'Slideshow',
  columns: [{ key: 'periodSheet', enabled: true, label: '' }],
}

export interface SlideshowData {
  classroom: Classroom | null | undefined
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  students: SlideshowStudent[]
  /** Imported Lecture / Laboratory / term grades, one set per subject + term. */
  postedSets: PostedGradeSet[]
  subjects: CourseSubject[]
  /** The subject whose gradebook is presented; undefined for a legacy
   *  classroom with no subjects, which presents the whole classroom. */
  gradebookSubjectId: string | undefined
  /** Set when the subject is half of a Lecture + Laboratory pair; the slides
   *  then read both subjects, as the grade sheet export does. */
  lecLab: LecLabPair | null
  /** "Lecture × 40% + Laboratory × 60%" — how a period grade is built. */
  periodFormula: string
  /** Roster, subjects and posted grades — the page waits for these. */
  isLoading: boolean
  /** The selected subject's grades, refetched on a subject switch while the
   *  player stays on screen. */
  gradesLoading: boolean
  isError: boolean
  error: unknown
}

/**
 * Read-only aggregate hook for the slideshow. Composes the shared classroom,
 * roster, gradebook-structure and scores queries, then computes every student's
 * grades with the pure engine in `@/lib/grading` — through the same
 * class-record table the grade sheet export prints, so the two never disagree.
 * No writes happen here; the slideshow only presents.
 */
export function useSlideshowData(
  classroomId: string,
  /** Subject picked in the player; defaults to the classroom's first subject. */
  subjectId?: string,
): SlideshowData {
  const classroomQuery = useClassroom(classroomId)
  const studentsQuery = useStudents(classroomId)
  const subjectsQuery = useCourseSubjects(classroomId)
  const postedQuery = usePostedGrades(classroomId)
  const combinationsQuery = useSubjectGradeCombinations(classroomId)

  // One subject at a time, the same structure and scores the grade sheet export
  // reads — never every subject's periods and components mixed together. Wait
  // for the subject list so the unscoped, whole-classroom structure is only
  // fetched for a legacy classroom that has no subjects.
  const subjects = subjectsQuery.data
  const gradebookSubjectId =
    subjects?.find((subject) => subject.id === subjectId)?.id ?? subjects?.[0]?.id
  const structureQuery = useGradebookStructure(
    subjects ? classroomId : '',
    gradebookSubjectId,
  )

  const postedSets = useMemo(
    () => postedGradeSets(postedQuery.data ?? [], subjects ?? []),
    [postedQuery.data, subjects],
  )

  const structure = structureQuery.data
  const activityIds = useMemo(
    () => (structure ? structure.activities.map((a) => a.id) : []),
    [structure],
  )
  const scoresQuery = useScores(classroomId, activityIds, gradebookSubjectId)

  const lecLab = useMemo(
    () =>
      findLecLabPair(subjects ?? [], gradebookSubjectId, combinationsQuery.data ?? []),
    [subjects, gradebookSubjectId, combinationsQuery.data],
  )
  const pairIds = useMemo(
    () => (lecLab ? [lecLab.lecture.id, lecLab.laboratory.id] : []),
    [lecLab],
  )
  const pairBooks = useSubjectGradebooks(classroomId, pairIds)
  const pair = useMemo<LecLabBooks | undefined>(() => {
    if (!lecLab) return undefined
    const lecture = pairBooks.gradebooks.get(lecLab.lecture.id)
    const laboratory = pairBooks.gradebooks.get(lecLab.laboratory.id)
    return lecture && laboratory
      ? { lecture, laboratory, weights: lecLab.weights }
      : undefined
  }, [lecLab, pairBooks.gradebooks])

  // MIDTERM GRADEs the teacher recorded on their own sheet win over recomputing.
  const recorded = useMemo(
    () =>
      recordedTermGrades(
        postedQuery.data ?? [],
        pairIds.length ? pairIds : gradebookSubjectId ? [gradebookSubjectId] : [],
      ),
    [postedQuery.data, pairIds, gradebookSubjectId],
  )

  const students = useMemo<SlideshowStudent[]>(() => {
    const roster = studentsQuery.data
    if (!roster) return []
    // Scores may be disabled (no activities yet) — treat as an empty map so the
    // grading engine reports every grade as missing rather than crashing.
    const scores = scoresQuery.data ?? {}
    const table = structure
      ? buildGradeSheetTable(
          roster,
          structure,
          scores,
          {},
          CLASS_RECORD_LAYOUT,
          pair,
          recorded,
        )
      : null
    return roster.map((student, index) => ({
      student,
      fullName: studentFullName(student),
      gradebook: structure
        ? computeConfiguredStudentGradebook(structure, scores, student.id)
        : EMPTY_GRADEBOOK,
      classRecord: table
        ? table.bands.map((band) => ({
            name: band.label,
            cells: table.header
              .slice(band.start, band.start + band.span)
              .map((label, i) => {
                const value = table.rows[index]?.[band.start + i]
                return { label, value: typeof value === 'number' ? value : null }
              }),
            recorded: recordedFor(recorded, student.id, band.label) !== undefined,
          }))
        : [],
    }))
  }, [structure, studentsQuery.data, scoresQuery.data, pair, recorded])

  const components = structure?.components ?? []
  const periodFormula = lecLab
    ? `Lecture × ${weightLabel(lecLab.weights.lecture)} + Laboratory × ${weightLabel(lecLab.weights.laboratory)}`
    : components
        .map((component) => `${component.name} × ${weightLabel(component.weight)}`)
        .join(' + ')

  // The scores query is intentionally disabled until activity ids are known; a
  // disabled query reports `isLoading` in React Query v5, so only treat it as
  // loading once it is actually enabled.
  const scoresLoading = activityIds.length > 0 && scoresQuery.isLoading

  return {
    classroom: classroomQuery.data,
    periods: structure?.periods ?? [],
    components,
    students,
    postedSets,
    subjects: subjects ?? [],
    gradebookSubjectId,
    lecLab,
    periodFormula,
    isLoading:
      classroomQuery.isLoading ||
      subjectsQuery.isLoading ||
      postedQuery.isLoading ||
      studentsQuery.isLoading,
    // No data yet for this subject's key (first load or a fresh switch).
    gradesLoading:
      !structure || scoresLoading || (!!lecLab && (!pair || pairBooks.isLoading)),
    isError:
      classroomQuery.isError ||
      studentsQuery.isError ||
      structureQuery.isError ||
      postedQuery.isError ||
      scoresQuery.isError,
    error:
      classroomQuery.error ??
      studentsQuery.error ??
      structureQuery.error ??
      scoresQuery.error,
  }
}
