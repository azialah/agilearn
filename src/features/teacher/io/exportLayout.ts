/**
 * Resolves a configurable {@link ExportLayout} into the grade sheet's header,
 * column widths and rows. Pure — no SheetJS — so the exact layout a teacher
 * configures is unit-testable; workbook.ts only turns the result into a file.
 *
 * Every number comes from src/lib/grading.ts. This module decides which
 * numbers appear and in what order, never how they are computed.
 */

import {
  categoriesFor,
  computeCategoryPercent,
  computeConfiguredPeriodFinalGrade,
  computeCombinedPeriodGrade,
  computeConfiguredStudentGradebook,
  computePeriodSheetRow,
  computeReportedFinalGrade,
  isConfiguredGradeComplete,
  remarkFor,
  round2,
  roundWhole,
  type GradebookStructure,
  type ReportingConfig,
  type ScoreMap,
} from '@/lib/grading'
import {
  DEFAULT_EXPORT_LAYOUT,
  exportColumnMeta,
  sanitizeSheetName,
  type ExportColumnKey,
  type ExportLayout,
} from '@/lib/gradeSheetConfig'
import {
  studentFullName,
  type Activity,
  type Classroom,
  type CourseSubject,
  type GradeComponentRecord,
  type Student,
} from '@/types/domain'
import { periodKey } from './classRecordPlan'

/** Recorded term grades keyed by `${studentId}|${periodKey(period name)}`. */
export type RecordedGrades = ReadonlyMap<string, number>

export function recordedFor(
  recorded: RecordedGrades | undefined,
  studentId: string,
  periodName: string,
): number | undefined {
  return recorded?.get(`${studentId}|${periodKey(periodName)}`)
}

export type SheetCell = string | number

/** One subject's gradebook, as loaded by useSubjectGradebooks. */
export interface SubjectBook {
  structure: GradebookStructure
  scores: ScoreMap
}

/**
 * Lecture and Laboratory kept as separate subjects. When supplied, the
 * class-record columns read each subject's own period grade instead of the
 * active subject's components.
 */
export interface LecLabBooks {
  lecture: SubjectBook
  laboratory: SubjectBook
  weights: { lecture: number; laboratory: number }
}

/** Periods of both subjects matched by name ("Midterm" = "MIDTERM"), Lecture's
 *  order first, then any period only the Laboratory has. */
function pairedPeriods(pair: LecLabBooks) {
  const rows: { name: string; lectureId?: string; laboratoryId?: string }[] = []
  const byKey = new Map<string, (typeof rows)[number]>()
  for (const [side, book] of [
    ['lectureId', pair.lecture],
    ['laboratoryId', pair.laboratory],
  ] as const) {
    for (const period of book.structure.periods) {
      const key = periodKey(period.name)
      let row = byKey.get(key)
      if (!row) {
        row = { name: period.name }
        byKey.set(key, row)
        rows.push(row)
      }
      row[side] = period.id
    }
  }
  return rows
}

function subjectPeriodGrade(
  book: SubjectBook,
  periodId: string | undefined,
  studentId: string,
): number | null {
  if (!periodId) return null
  return computePeriodSheetRow(book.structure, book.scores, studentId, periodId).grade
}

interface RowContext {
  student: Student
  /** 0-based position in the exported list. */
  index: number
  book: ReturnType<typeof computeConfiguredStudentGradebook>
}

interface SheetColumn {
  header: string
  width: number
  /** Band label printed above a run of columns, e.g. "MIDTERM". */
  band?: string
  value: (row: RowContext) => SheetCell
}

/** A label spanning `span` columns from `start`, in the row above the header. */
export interface SheetBand {
  label: string
  start: number
  span: number
}

export interface GradeSheetTable {
  sheetName: string
  header: string[]
  widths: number[]
  /** Period bands over the class-record columns; empty when there are none. */
  bands: SheetBand[]
  rows: SheetCell[][]
}

/** Order activities by grading period, then component, then category. */
export function orderedActivityColumns(structure: GradebookStructure): Activity[] {
  const columns: Activity[] = []
  for (const period of structure.periods) {
    for (const component of structure.components) {
      const categories = categoriesFor(structure, period.id, component.id)
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

/** "Quarter 1 / Written work / Quiz 1 (20)" — the class-record importer reads
 *  this exact shape back, so an exported sheet can be re-imported. */
export function activityLabel(activity: Activity, structure: GradebookStructure): string {
  const category = structure.categories.find((c) => c.id === activity.category_id)
  const period = structure.periods.find((p) => p.id === activity.grading_period_id)
  const parts = [period?.name, category?.name, activity.name].filter(Boolean)
  return `${parts.join(' / ')} (${activity.max_score})`
}

function grade(value: number | null | undefined): SheetCell {
  return value === null || value === undefined ? '' : round2(value)
}

/** Name the Final column for what it actually holds, matching the on-screen
 *  label — "Final Grade" reads as a percentage, which it is not for a DepEd or
 *  college subject. */
export function finalHeaderFor(gradingTemplate?: string): string {
  if (gradingTemplate === 'basic_education' || gradingTemplate === 'senior_high') {
    return 'Transmuted Grade'
  }
  if (gradingTemplate === 'higher_education') return 'Grade Equivalent'
  return 'Final Grade'
}

function whole(value: number | null | undefined): SheetCell {
  return value === null || value === undefined ? '' : roundWhole(value)
}

/** "Lecture" → "LEC", "Laboratory" → "LAB", anything else in capitals. */
export function componentAbbreviation(component: Pick<GradeComponentRecord, 'name'>) {
  const name = component.name.trim()
  if (/^lec/i.test(name)) return 'LEC'
  if (/^lab/i.test(name)) return 'LAB'
  return name.toUpperCase()
}

/** 0.4 → "40%", 0.333… → "33.3%". */
export function weightLabel(weight: number): string {
  return `${Math.round(weight * 1000) / 10}%`
}

/** Columns that sit under a band, e.g. "MIDTERM", get the band recorded. */
function bandsFor(columns: readonly SheetColumn[]): SheetBand[] {
  const bands: SheetBand[] = []
  columns.forEach((column, index) => {
    if (!column.band) return
    const last = bands[bands.length - 1]
    if (last && last.label === column.band && last.start + last.span === index) {
      last.span += 1
    } else {
      bands.push({ label: column.band, start: index, span: 1 })
    }
  })
  return bands
}

function fitWidth(label: string): number {
  return Math.min(28, Math.max(12, label.length + 2))
}

function columnsFor(
  key: ExportColumnKey,
  label: string,
  structure: GradebookStructure,
  scores: ScoreMap,
  reporting: ReportingConfig,
  pair?: LecLabBooks,
  recorded?: RecordedGrades,
): SheetColumn[] {
  const single = (
    fallback: string,
    width: number | null,
    value: SheetColumn['value'],
  ) => {
    const header = label || fallback
    return [{ header, width: width ?? fitWidth(header), value }]
  }
  const meta = exportColumnMeta(key)
  const builtIn = meta.defaultLabel ?? ''

  switch (key) {
    case 'rowNumber':
      return single(builtIn, 5, ({ index }) => index + 1)
    case 'studentNo':
      return single(builtIn, 14, ({ student }) => student.student_no)
    case 'lastName':
      return single(builtIn, 20, ({ student }) => student.last_name)
    case 'firstName':
      return single(builtIn, 20, ({ student }) => student.first_name)
    case 'middleInitial':
      return single(builtIn, 6, ({ student }) => student.middle_initial ?? '')
    case 'fullName':
      return single(builtIn, 28, ({ student }) => studentFullName(student))
    case 'activities':
      return orderedActivityColumns(structure).map((activity) => {
        const header = activityLabel(activity, structure)
        return {
          header,
          width: fitWidth(header),
          value: ({ student }) => {
            const score = scores[activity.id]?.[student.id]
            return score === null || score === undefined ? '' : score
          },
        }
      })
    case 'categoryPercents':
      return structure.periods.flatMap((period) =>
        structure.components.flatMap((component) =>
          categoriesFor(structure, period.id, component.id).map((category) => {
            const header = `${period.name} / ${category.name} %`
            const activities = structure.activities.filter(
              (a) => a.category_id === category.id && a.grading_period_id === period.id,
            )
            return {
              header,
              width: fitWidth(header),
              value: ({ student }: RowContext) =>
                grade(
                  computeCategoryPercent(
                    activities,
                    scores,
                    student.id,
                    structure.policy,
                  ),
                ),
            }
          }),
        ),
      )
    case 'periodGrades':
      return structure.periods.flatMap((period) =>
        structure.components.map((component) => {
          const header = `${period.name} / ${component.name}`
          return {
            header,
            width: fitWidth(header),
            value: ({ book }: RowContext) =>
              grade(book.perPeriod[period.id]?.[component.id]),
          }
        }),
      )
    case 'periodFinals':
      return structure.periods.map((period) => {
        const header = `${period.name} final`
        return {
          header,
          width: fitWidth(header),
          value: ({ student }: RowContext) =>
            grade(
              computeConfiguredPeriodFinalGrade(structure, scores, student.id, period.id),
            ),
        }
      })
    case 'periodSheet':
      if (pair) {
        return pairedPeriods(pair).flatMap((period) => {
          const band = period.name.trim().toUpperCase()
          const lecture = ({ student }: RowContext) =>
            subjectPeriodGrade(pair.lecture, period.lectureId, student.id)
          const laboratory = ({ student }: RowContext) =>
            subjectPeriodGrade(pair.laboratory, period.laboratoryId, student.id)
          return [
            {
              header: `${band} GRADE LEC (${weightLabel(pair.weights.lecture)})`,
              band,
              width: 16,
              value: (row: RowContext) => whole(lecture(row)),
            },
            {
              header: `${band} GRADE LAB (${weightLabel(pair.weights.laboratory)})`,
              band,
              width: 16,
              value: (row: RowContext) => whole(laboratory(row)),
            },
            {
              header: `${band} GRADE`,
              band,
              width: 16,
              value: (row: RowContext) =>
                whole(
                  recordedFor(recorded, row.student.id, period.name) ??
                    computeCombinedPeriodGrade([
                      { grade: lecture(row), weight: pair.weights.lecture },
                      { grade: laboratory(row), weight: pair.weights.laboratory },
                    ]),
                ),
            },
          ]
        })
      }
      return structure.periods.flatMap((period) => {
        const band = period.name.trim().toUpperCase()
        const componentColumns = structure.components.map((component) => {
          const header = `${band} GRADE ${componentAbbreviation(component)} (${weightLabel(component.weight)})`
          return {
            header,
            band,
            width: 16,
            value: ({ student }: RowContext) =>
              whole(
                computePeriodSheetRow(structure, scores, student.id, period.id)
                  .components[component.id],
              ),
          }
        })
        const header = `${band} GRADE`
        return [
          ...componentColumns,
          {
            header,
            band,
            width: 16,
            value: ({ student }: RowContext) =>
              whole(
                recordedFor(recorded, student.id, period.name) ??
                  computePeriodSheetRow(structure, scores, student.id, period.id).grade,
              ),
          },
        ]
      })
    case 'componentGrades':
      return structure.components.map((component) => {
        const header = `${component.name} grade`
        return {
          header,
          width: fitWidth(header),
          value: ({ book }: RowContext) => grade(book.components[component.id]),
        }
      })
    case 'finalGrade':
      return single(finalHeaderFor(reporting.gradingTemplate), null, ({ student }) =>
        grade(computeReportedFinalGrade(structure, scores, student.id, reporting)),
      )
    case 'remarks':
      return single(builtIn, null, ({ student, book }) =>
        remarkFor(book.final, isConfiguredGradeComplete(structure, scores, student.id)),
      )
  }
}

/**
 * Header + rows for the grade sheet. With the default layout this is exactly
 * the sheet the exporter produced before layouts were configurable.
 */
export function buildGradeSheetTable(
  students: readonly Student[],
  structure: GradebookStructure,
  scores: ScoreMap,
  reporting: ReportingConfig = {},
  layout: ExportLayout = DEFAULT_EXPORT_LAYOUT,
  pair?: LecLabBooks,
  /** Term grades recorded on the teacher's sheet; shown instead of recomputing. */
  recorded?: RecordedGrades,
): GradeSheetTable {
  const columns = layout.columns
    .filter((column) => column.enabled)
    .flatMap((column) =>
      columnsFor(
        column.key,
        exportColumnMeta(column.key).group ? '' : column.label.trim(),
        structure,
        scores,
        reporting,
        pair,
        recorded,
      ),
    )

  const rows = students.map((student, index) => {
    const context: RowContext = {
      student,
      index,
      book: computeConfiguredStudentGradebook(structure, scores, student.id),
    }
    return columns.map((column) => column.value(context))
  })

  return {
    sheetName: sanitizeSheetName(layout.sheetName),
    header: columns.map((column) => column.header),
    widths: columns.map((column) => column.width),
    bands: bandsFor(columns),
    rows,
  }
}

/**
 * The title block above a class-record sheet:
 *
 *   ClassCode CourseCode
 *   Course Title
 *   Schedule · Course/Year/Block
 */
export function gradeSheetTitleLines(
  classroom: Pick<
    Classroom,
    'course_code' | 'course_name' | 'cohort_name' | 'year' | 'block'
  >,
  subject?: Pick<
    CourseSubject,
    'name' | 'subject_code' | 'course_code' | 'schedule'
  > | null,
): string[] {
  const codes = [subject?.subject_code, subject?.course_code || classroom.course_code]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  const title = (subject?.name || classroom.course_name).trim()
  const cohort =
    classroom.cohort_name.trim() ||
    [classroom.year, classroom.block]
      .map((part) => part.trim())
      .filter(Boolean)
      .join('-')
  const schedule = [subject?.schedule?.trim(), cohort].filter(Boolean).join(' · ')
  return [codes, title, schedule].filter(Boolean)
}

/** Header labels only, for the layout editor's live preview. */
export function previewHeaders(
  structure: GradebookStructure,
  reporting: ReportingConfig,
  layout: ExportLayout,
  pair?: LecLabBooks,
): string[] {
  return buildGradeSheetTable([], structure, {}, reporting, layout, pair).header
}
