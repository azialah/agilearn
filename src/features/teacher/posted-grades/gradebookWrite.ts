/**
 * Turns an imported posted-grades sheet into gradebook writes, so the computed
 * gradebook view (grade sheet export, gradebook slides) shows the same Lecture
 * and Laboratory grades as the sheet.
 *
 * A finished grade is stored the only way the gradebook can hold one exactly:
 * a single activity scored out of 100 in its own category, so the period grade
 * equals the score. Lecture goes to the Lecture subject and Laboratory to the
 * Laboratory subject:
 *
 *   period   "Midterm"                    (reused when the subject has one)
 *   category "Term grade (Lecture)"       (shared across periods, so Finals
 *            "Term grade (Laboratory)"     reuses it; the name carries the side
 *                                          because category names are unique per
 *                                          classroom, not per subject)
 *   activity "Midterm grade", max 100
 *
 * Pure: builds a synthetic sheet for the class-record planner, which already
 * matches periods / categories / activities, never erases a score with a blank
 * and only overwrites when asked — so the preview is exactly what is written.
 */

import type { ColumnMapping } from '@/lib/gradeSheetConfig'
import type { Student } from '@/types/domain'
import type { DetectedColumn, DetectedSheet } from '@/features/teacher/io/classRecord'
import {
  planClassRecordImport,
  type ExistingGradebook,
  type ImportPlan,
  type ResolvedSheet,
} from '@/features/teacher/io/classRecordPlan'
import type { ParsedPostedRow } from './parsePostedGrades'

export type GradebookSide = 'lecture' | 'laboratory'

const SIDE_LABEL: Record<GradebookSide, string> = {
  lecture: 'Lecture',
  laboratory: 'Laboratory',
}

export function termCategoryName(side: GradebookSide): string {
  return `Term grade (${SIDE_LABEL[side]})`
}

export function termActivityName(term: string): string {
  return `${term.trim()} grade`
}

function column(
  index: number,
  key: string,
  header: string,
  suggested: ColumnMapping,
): DetectedColumn {
  return {
    index,
    key,
    header,
    letter: String.fromCharCode(65 + index),
    sample: [],
    hpsMax: null,
    categoryWeight: null,
    suggested,
  }
}

/**
 * The matched rows of one side as a class-record sheet. Identity cells come
 * from the roster row the posted import already matched, so the planner lands
 * on the same student and never creates one.
 */
export function postedGradebookSheet(
  rows: readonly ParsedPostedRow[],
  roster: readonly Pick<Student, 'id' | 'student_no' | 'last_name' | 'first_name'>[],
  term: string,
  side: GradebookSide,
): ResolvedSheet {
  const byId = new Map(roster.map((student) => [student.id, student]))
  const columns: DetectedColumn[] = [
    column(0, 'studentNo', 'Student No.', { role: 'studentNo' }),
    column(1, 'lastName', 'Last Name', { role: 'lastName' }),
    column(2, 'firstName', 'First Name', { role: 'firstName' }),
    column(3, 'grade', `${term} grade ${SIDE_LABEL[side]}`, {
      role: 'activity',
      period: term,
      category: termCategoryName(side),
      name: termActivityName(term),
      maxScore: 100,
    }),
  ]
  const sheetRows = rows.flatMap((row) => {
    const student = row.studentId ? byId.get(row.studentId) : undefined
    const value = side === 'lecture' ? row.lecture : row.laboratory
    if (row.status !== 'matched' || !student || value === null) return []
    return [
      {
        rowNumber: row.row,
        cells: [student.student_no, student.last_name, student.first_name, String(value)],
      },
    ]
  })
  const sheet: DetectedSheet = {
    name: `${SIDE_LABEL[side]} grades`,
    key: `posted-${side}`,
    period: term,
    columns,
    rows: sheetRows,
    include: true,
    headerRowNumber: null,
  }
  return {
    sheet,
    mapping: {
      include: true,
      period: term,
      columns: Object.fromEntries(columns.map((col) => [col.key, col.suggested])),
    },
  }
}

/** The planned gradebook writes for one subject, or null when the sheet has no
 *  grades for that side. */
export function planPostedGradebook(
  rows: readonly ParsedPostedRow[],
  existing: ExistingGradebook,
  term: string,
  side: GradebookSide,
  overwriteScores: boolean,
): ImportPlan | null {
  const sheet = postedGradebookSheet(rows, existing.students, term, side)
  if (sheet.sheet.rows.length === 0) return null
  return planClassRecordImport([sheet], existing, { overwriteScores })
}
