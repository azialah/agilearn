/**
 * Workbook builders for the two spreadsheet exports (roster template + grade
 * sheet) and the shared browser download trigger. The grade sheet's columns
 * are resolved by exportLayout.ts.
 *
 * SheetJS community edition writes structure, column widths and freeze panes but
 * not cell fills/fonts (those are Pro-only), so the "styling" here matches the
 * legacy template's layout — header row, italic-hint notes row, sensible column
 * widths and a frozen header — rather than its colors.
 */

import * as XLSX from 'xlsx'
import type { GradebookStructure, ReportingConfig, ScoreMap } from '@/lib/grading'
import { DEFAULT_EXPORT_LAYOUT, type ExportLayout } from '@/lib/gradeSheetConfig'
import type { Classroom, CourseSubject, Student } from '@/types/domain'
import {
  buildGradeSheetTable,
  gradeSheetTitleLines,
  type LecLabBooks,
  type RecordedGrades,
  type SheetCell,
} from './exportLayout'

const TEMPLATE_HEADERS = ['Student No', 'Last Name', 'First Name', 'Middle Name'] as const
// The middle name may be written in full — the importer keeps only the initial.
const TEMPLATE_NOTES = [
  'e.g. 2021-00123',
  'e.g. Dela Cruz',
  'e.g. Juan',
  'e.g. Reyes',
] as const

/** Roster import template: header + hint row, ready to fill in. */
export function buildRosterTemplateWorkbook(): XLSX.WorkBook {
  const aoa: (string | number)[][] = [[...TEMPLATE_HEADERS], [...TEMPLATE_NOTES]]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  return wb
}

/**
 * Grade sheet: roster + computed grades (from the shared grading engine), laid
 * out by the subject's configured export layout. The default is the class
 * record format:
 *
 *   ClassCode CourseCode            (title block, one merged row per line)
 *   Course Title
 *   Schedule · Course/Year/Block
 *                         |        MIDTERM          |   (period band row)
 *   # | Name | Student No. | GRADE LEC | GRADE LAB | GRADE
 */
export function buildGradeSheetWorkbook(
  classroom: Classroom,
  students: Student[],
  structure: GradebookStructure,
  scores: ScoreMap,
  /** Which number the Final column holds. Omitted means the raw percentage,
   *  which is what this exporter used to emit unconditionally — including for
   *  DepEd and college subjects whose screen showed a converted grade. */
  reporting: ReportingConfig = {},
  layout: ExportLayout = DEFAULT_EXPORT_LAYOUT,
  subject?: CourseSubject | null,
  /** Lecture + Laboratory as separate subjects: the class-record columns read both. */
  pair?: LecLabBooks,
  /** Term grades recorded on the teacher's own sheet; printed instead of recomputing. */
  recorded?: RecordedGrades,
): XLSX.WorkBook {
  const table = buildGradeSheetTable(
    students,
    structure,
    scores,
    reporting,
    layout,
    pair,
    recorded,
  )
  const width = Math.max(1, table.header.length)
  const lastCol = width - 1
  const aoa: SheetCell[][] = []
  const merges: XLSX.Range[] = []

  for (const line of gradeSheetTitleLines(classroom, subject)) {
    merges.push({ s: { r: aoa.length, c: 0 }, e: { r: aoa.length, c: lastCol } })
    aoa.push([line])
  }
  if (table.bands.length) {
    const bandRow: SheetCell[] = Array.from({ length: width }, () => '')
    for (const band of table.bands) {
      bandRow[band.start] = band.label
      if (band.span > 1)
        merges.push({
          s: { r: aoa.length, c: band.start },
          e: { r: aoa.length, c: band.start + band.span - 1 },
        })
    }
    aoa.push(bandRow)
  }
  aoa.push(table.header, ...table.rows)

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = table.widths.map((wch) => ({ wch }))
  if (merges.length) ws['!merges'] = merges

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, table.sheetName)
  return wb
}

/** Trigger a browser download for a built workbook. */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename)
}
