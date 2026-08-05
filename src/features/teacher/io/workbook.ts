/**
 * Workbook builders for the two spreadsheet exports (roster template + grade
 * sheet) and the shared browser download trigger.
 *
 * SheetJS community edition writes structure, column widths and freeze panes but
 * not cell fills/fonts (those are Pro-only), so the "styling" here matches the
 * legacy template's layout — header row, italic-hint notes row, sensible column
 * widths and a frozen header — rather than its colors.
 */

import * as XLSX from 'xlsx'
import {
  computeConfiguredStudentGradebook,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import type { Activity, Classroom, Student } from '@/types/domain'

const TEMPLATE_HEADERS = ['Student No', 'Last Name', 'First Name', 'Middle Name'] as const
// The middle name may be written in full — the importer keeps only the initial.
const TEMPLATE_NOTES = [
  'e.g. 2021-00123',
  'e.g. Dela Cruz',
  'e.g. Juan',
  'e.g. Reyes',
] as const

function belongsToComponent(
  category: GradebookStructure['categories'][number],
  componentId: string,
) {
  return (
    category.grade_component_id === componentId ||
    (category.grade_component_id === null &&
      ((componentId === 'legacy-lecture' && category.component === 'lecture') ||
        (componentId === 'legacy-laboratory' && category.component === 'laboratory')))
  )
}

/** Roster import template: header + hint row, ready to fill in. */
export function buildRosterTemplateWorkbook(): XLSX.WorkBook {
  const aoa: (string | number)[][] = [[...TEMPLATE_HEADERS], [...TEMPLATE_NOTES]]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  return wb
}

/** Order activities by grading period, then component, then category. */
function orderedActivityColumns(structure: GradebookStructure): Activity[] {
  const columns: Activity[] = []
  for (const period of structure.periods) {
    for (const component of structure.components) {
      const categories = structure.categories.filter(
        (category) =>
          belongsToComponent(category, component.id) &&
          (category.grading_period_id === period.id ||
            category.grading_period_id === null),
      )
      for (const category of categories) {
        const activities = structure.activities.filter(
          (a) => a.category_id === category.id && a.grading_period_id === period.id,
        )
        columns.push(...activities)
      }
    }
  }
  return columns
}

function labelFor(activity: Activity, structure: GradebookStructure): string {
  const category = structure.categories.find((c) => c.id === activity.category_id)
  const period = structure.periods.find((p) => p.id === activity.grading_period_id)
  const parts = [period?.name, category?.name, activity.name].filter(Boolean)
  return `${parts.join(' / ')} (${activity.max_score})`
}

function cell(value: number | null): number | string {
  return value === null ? '' : round2(value)
}

/**
 * Grade sheet: roster + every activity score + the computed period, component
 * and final grades (from the shared grading engine, using the classroom's
 * component weights).
 */
export function buildGradeSheetWorkbook(
  _classroom: Classroom,
  students: Student[],
  structure: GradebookStructure,
  scores: ScoreMap,
): XLSX.WorkBook {
  const activityColumns = orderedActivityColumns(structure)

  const header: string[] = ['Student No', 'Last Name', 'First Name', 'MI']
  for (const activity of activityColumns) header.push(labelFor(activity, structure))
  for (const period of structure.periods) {
    for (const component of structure.components) {
      header.push(`${period.name} / ${component.name}`)
    }
  }
  for (const component of structure.components) header.push(`${component.name} grade`)
  header.push('Final Grade')

  const aoa: (string | number)[][] = [header]

  for (const student of students) {
    const book = computeConfiguredStudentGradebook(structure, scores, student.id)
    const row: (string | number)[] = [
      student.student_no,
      student.last_name,
      student.first_name,
      student.middle_initial ?? '',
    ]
    for (const activity of activityColumns) {
      const score = scores[activity.id]?.[student.id]
      row.push(score === null || score === undefined ? '' : score)
    }
    for (const period of structure.periods) {
      for (const component of structure.components) {
        row.push(cell(book.perPeriod[period.id]?.[component.id] ?? null))
      }
    }
    for (const component of structure.components)
      row.push(cell(book.components[component.id]))
    row.push(cell(book.final))
    aoa.push(row)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = header.map((label, index) => {
    if (index < 4) return { wch: [14, 20, 20, 6][index] }
    return { wch: Math.min(28, Math.max(12, label.length + 2)) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Grade Sheet')
  return wb
}

/** Trigger a browser download for a built workbook. */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename)
}
