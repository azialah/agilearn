/**
 * Pure parser for a posted-grades sheet:
 *
 *   Last Name | First Name | SchoolID | Lecture | Laboratory | Midterm Grade
 *
 * Columns may come in any order, and the header row may sit below a title
 * block. Students are matched to the roster by student number first, then by
 * "last|first" name. Unknown students are reported and skipped — this import
 * never creates students.
 */

import { midtermFromComponents, postedGradeMismatch } from '@/lib/grading'
import { splitFullName } from '@/features/teacher/io/classRecord'
import type { Student } from '@/types/domain'

type Column =
  'lastName' | 'firstName' | 'fullName' | 'studentNo' | 'lecture' | 'laboratory' | 'grade'

const HEADER_TOKENS: Record<Column, readonly string[]> = {
  lastName: ['lastname', 'surname', 'familyname'],
  // "ALFONSO, MARK JOSHUA P." in one column, as Agilearn's grade sheet exports it.
  fullName: ['name', 'fullname', 'studentname', 'studentsname', 'nameofstudent'],
  firstName: ['firstname', 'givenname'],
  studentNo: [
    'schoolid',
    'schoolidno',
    'schoolidnumber',
    'studentno',
    'studentnumber',
    'studentid',
    'studentidno',
    'idno',
    'idnumber',
    'id',
  ],
  lecture: ['lecture', 'lec', 'lecturegrade', 'actuallecture'],
  laboratory: ['laboratory', 'lab', 'laboratorygrade', 'labgrade', 'actuallaboratory'],
  grade: [
    'midtermgrade',
    'midterm',
    'prelimgrade',
    'prelim',
    'semifinalgrade',
    'semifinal',
    'finalgrade',
    'finals',
    'final',
    'termgrade',
    'grade',
  ],
}

/**
 * Headers from Agilearn's class-record export and similar sheets:
 * "MIDTERM GRADE LEC (40%)" → midtermgradelec40, "Finals Grade Lab" →
 * finalsgradelab. The grade column is any "<term> grade" without lec/lab.
 */
const PATTERNS: Partial<Record<Column, RegExp>> = {
  lecture: /^[a-z]*grade(lec|lecture)\d*$/,
  laboratory: /^[a-z]*grade(lab|laboratory)\d*$/,
  grade: /^(midterm|prelim|prelims|semifinal|semifinals|final|finals|term)grade\d*$/,
}

const HEADER_SEARCH_ROWS = 20

function normalize(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function nameKey(last: string, first: string): string {
  return `${normalize(last)}|${normalize(first)}`
}

export type ParsedRowStatus = 'matched' | 'unmatched' | 'error'

export interface ParsedPostedRow {
  /** 1-based row number in the file, as Excel shows it. */
  row: number
  lastName: string
  firstName: string
  studentNo: string
  lecture: number | null
  laboratory: number | null
  /** As written in the sheet, or lecture × 40% + laboratory × 60% when blank. */
  termGrade: number | null
  /** True when termGrade was filled in from lecture and laboratory. */
  termGradeComputed: boolean
  /** The sheet's term grade disagrees with lecture × 40% + laboratory × 60%. */
  mismatch: boolean
  status: ParsedRowStatus
  studentId: string | null
  /** How the student was matched, for the preview. */
  matchedBy: 'studentNo' | 'name' | null
  errors: string[]
}

export interface ParsedPostedSheet {
  /** Header text of the grade column, e.g. "Midterm Grade" — hints the term. */
  gradeHeader: string | null
  rows: ParsedPostedRow[]
  /** Problems with the sheet as a whole (no header row, missing columns). */
  errors: string[]
}

type ColumnIndex = Partial<Record<Column, number>>

function detectColumns(cells: unknown[]): ColumnIndex {
  const index: ColumnIndex = {}
  cells.forEach((cell, col) => {
    const token = normalize(cell)
    if (!token) return
    for (const column of Object.keys(HEADER_TOKENS) as Column[]) {
      const matches =
        HEADER_TOKENS[column].includes(token) || !!PATTERNS[column]?.test(token)
      if (index[column] === undefined && matches) {
        index[column] = col
        return
      }
    }
  })
  return index
}

function findHeader(matrix: unknown[][]): { row: number; columns: ColumnIndex } | null {
  const limit = Math.min(matrix.length, HEADER_SEARCH_ROWS)
  for (let row = 0; row < limit; row += 1) {
    const columns = detectColumns(matrix[row] ?? [])
    const hasName =
      (columns.lastName !== undefined && columns.firstName !== undefined) ||
      columns.fullName !== undefined
    const hasGrade = columns.lecture !== undefined || columns.laboratory !== undefined
    if ((hasName || columns.studentNo !== undefined) && hasGrade) return { row, columns }
  }
  return null
}

/** "88", "88.5", "88,50" → number; "" → null; anything else → NaN. */
function parseGrade(value: unknown): number | null {
  const raw = text(value).replace(',', '.')
  if (raw === '') return null
  const number = Number(raw)
  return Number.isFinite(number) ? number : Number.NaN
}

function checkGrade(
  label: string,
  value: number | null,
  errors: string[],
): number | null {
  if (value === null) return null
  if (Number.isNaN(value)) {
    errors.push(`${label} is not a number`)
    return null
  }
  if (value < 0 || value > 100) {
    errors.push(`${label} must be between 0 and 100`)
    return null
  }
  return value
}

export function parsePostedGrades(
  matrix: unknown[][],
  roster: readonly Pick<Student, 'id' | 'student_no' | 'last_name' | 'first_name'>[],
): ParsedPostedSheet {
  const header = findHeader(matrix)
  if (!header) {
    return {
      gradeHeader: null,
      rows: [],
      errors: [
        'No header row found. Expected columns like Last Name, First Name, SchoolID, Lecture, Laboratory, Midterm Grade.',
      ],
    }
  }
  const { columns } = header
  const sheetErrors: string[] = []
  if (columns.studentNo === undefined)
    sheetErrors.push('No SchoolID column — students will be matched by name only.')
  if (columns.lecture === undefined) sheetErrors.push('No Lecture column found.')
  if (columns.laboratory === undefined) sheetErrors.push('No Laboratory column found.')

  const byNo = new Map<string, string>()
  const byName = new Map<string, string>()
  for (const student of roster) {
    if (student.student_no) byNo.set(student.student_no.trim().toLowerCase(), student.id)
    byName.set(nameKey(student.last_name, student.first_name), student.id)
  }

  const cell = (cells: unknown[], column: Column) => {
    const col = columns[column]
    return col === undefined ? '' : cells[col]
  }

  const rows: ParsedPostedRow[] = []
  const seenStudents = new Set<string>()
  for (let r = header.row + 1; r < matrix.length; r += 1) {
    const cells = matrix[r] ?? []
    const split = splitFullName(text(cell(cells, 'fullName')))
    const lastName = text(cell(cells, 'lastName')) || split.lastName
    const firstName = text(cell(cells, 'firstName')) || split.firstName
    const studentNo = text(cell(cells, 'studentNo'))
    const lectureRaw = parseGrade(cell(cells, 'lecture'))
    const laboratoryRaw = parseGrade(cell(cells, 'laboratory'))
    const gradeRaw = parseGrade(cell(cells, 'grade'))
    // Fully blank rows (spacers, trailing rows) are not data.
    if (
      !lastName &&
      !firstName &&
      !studentNo &&
      lectureRaw === null &&
      laboratoryRaw === null &&
      gradeRaw === null
    )
      continue

    const errors: string[] = []
    const lecture = checkGrade('Lecture', lectureRaw, errors)
    const laboratory = checkGrade('Laboratory', laboratoryRaw, errors)
    const sheetGrade = checkGrade('Term grade', gradeRaw, errors)
    const computed = midtermFromComponents(lecture, laboratory)
    const termGrade = sheetGrade ?? computed
    if (lecture === null && laboratory === null && termGrade === null && !errors.length)
      errors.push('No grades on this row')

    let studentId: string | null = null
    let matchedBy: ParsedPostedRow['matchedBy'] = null
    if (studentNo) {
      studentId = byNo.get(studentNo.toLowerCase()) ?? null
      if (studentId) matchedBy = 'studentNo'
    }
    if (!studentId && lastName && firstName) {
      studentId = byName.get(nameKey(lastName, firstName)) ?? null
      if (studentId) matchedBy = 'name'
    }
    if (studentId) {
      if (seenStudents.has(studentId)) {
        errors.push('Duplicate — this student already appears above')
        studentId = null
        matchedBy = null
      } else {
        seenStudents.add(studentId)
      }
    }

    rows.push({
      row: r + 1,
      lastName,
      firstName,
      studentNo,
      lecture,
      laboratory,
      termGrade,
      termGradeComputed: sheetGrade === null && computed !== null,
      mismatch: postedGradeMismatch(lecture, laboratory, sheetGrade),
      status: errors.length ? 'error' : studentId ? 'matched' : 'unmatched',
      studentId,
      matchedBy,
      errors,
    })
  }

  const gradeCol = columns.grade
  const gradeHeader =
    gradeCol === undefined ? null : text((matrix[header.row] ?? [])[gradeCol]) || null
  return { gradeHeader, rows, errors: sheetErrors }
}

/** "Midterm Grade" / "MIDTERM GRADE" → "Midterm"; "Finals" → "Finals"; else
 *  the fallback. */
export function termFromHeader(header: string | null, fallback = 'Midterm'): string {
  if (!header) return fallback
  const term = header.replace(/\s*grade\s*$/i, '').trim()
  if (!term || normalize(term) === 'term') return fallback
  // An all-caps sheet header reads as a shout in the slideshow and email.
  return term === term.toUpperCase() ? term.charAt(0) + term.slice(1).toLowerCase() : term
}
