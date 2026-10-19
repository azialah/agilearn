/**
 * Turns a detected class record + the teacher's final column mapping into a
 * concrete, previewable list of writes against one subject's gradebook.
 *
 * Pure: no Supabase. The wizard renders the plan as the preview, and
 * src/lib/queries/classRecordImport.ts executes exactly what it lists — so
 * what the teacher confirmed is what gets written.
 *
 * Matching rules
 * --------------
 * - Students: by student number, else by "last|first" name. Rows from several
 *   sheets (one per quarter) that name the same learner resolve to one student.
 * - Periods: by name, tolerant of "Q1" / "Quarter 1" / "1st Quarter".
 * - Categories: by name within the period (shared categories count), tolerant
 *   of case, punctuation and plurals ("Written work" = "WRITTEN WORKS").
 *   New categories are created shared across periods (grading_period_id null):
 *   activity_categories is unique on (classroom, component, name), so one
 *   "Written Works" row has to serve Q1–Q4 — the same shape the DepEd
 *   template seeds.
 * - Activities: by name within period + category.
 *
 * Blank score cells never erase an existing score. Existing scores that differ
 * are only overwritten when the teacher opts in.
 */

import {
  categoriesFor,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from '@/lib/grading'
import type { SheetMapping } from '@/lib/gradeSheetConfig'
import type { Activity, ActivityCategory, GradingPeriod, Student } from '@/types/domain'
import {
  isBlankScore,
  parseNumber,
  splitFullName,
  type DetectedSheet,
} from './classRecord'

export type Ref = { kind: 'existing'; id: string } | { kind: 'new'; key: string }

export interface NewStudent {
  key: string
  studentNo: string
  lastName: string
  firstName: string
  middleInitial: string
  /** True when the file had no student number and one was generated. */
  placeholderNo: boolean
}

export interface NewPeriod {
  key: string
  name: string
  weight: number
  position: number
}

export interface NewCategory {
  key: string
  name: string
  weight: number
  position: number
  componentId: string
}

export interface NewActivity {
  key: string
  name: string
  maxScore: number
  position: number
  period: Ref
  category: Ref
}

export interface ScoreWrite {
  student: Ref
  activity: Ref
  score: number
  /** Replaces a different existing score. */
  overwrite: boolean
}

export interface PlanIssue {
  level: 'error' | 'warning'
  sheet?: string
  rowNumber?: number
  column?: string
  message: string
}

export interface ImportPlan {
  students: { create: NewStudent[]; matched: number }
  periods: NewPeriod[]
  categories: NewCategory[]
  activities: { create: NewActivity[]; matched: number }
  scores: ScoreWrite[]
  counts: {
    newScores: number
    overwrites: number
    unchanged: number
    keptExisting: number
    invalid: number
  }
  issues: PlanIssue[]
  /** True when an error must be fixed first, or there is nothing to write. */
  blocked: boolean
}

export interface ResolvedSheet {
  sheet: DetectedSheet
  mapping: SheetMapping
}

export interface ExistingGradebook {
  students: readonly Student[]
  structure: GradebookStructure
  scores: ScoreMap
}

export interface PlanOptions {
  overwriteScores: boolean
}

/* -------------------------------------------------------------------------- */
/* Normalizers                                                                */
/* -------------------------------------------------------------------------- */

function loose(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word))
    .join('')
}

const ORDINALS: Record<string, string> = {
  first: '1',
  '1st': '1',
  second: '2',
  '2nd': '2',
  third: '3',
  '3rd': '3',
  fourth: '4',
  '4th': '4',
}

/** "Q1" = "Quarter 1" = "1st Quarter" = "First Quarter"; "Final" = "Finals". */
export function periodKey(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => ORDINALS[word] ?? word)
  const text = words.join('')
  const quarter =
    text.match(/^(?:q|qtr|quarter)([1-4])$/) ?? text.match(/^([1-4])(?:q|qtr|quarter)$/)
  if (quarter) return `q${quarter[1]}`
  const sem = text.match(/^([12])(?:sem|semester)$/)
  if (sem) return `sem${sem[1]}`
  return loose(words.join(' '))
}

function nameKey(last: string, first: string): string {
  const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${norm(last)}|${norm(first)}`
}

function refKey(ref: Ref): string {
  return ref.kind === 'existing' ? `e:${ref.id}` : `n:${ref.key}`
}

/** Spread `total` evenly over `count` items, absorbing rounding in the last. */
function evenWeights(count: number, total = 1): number[] {
  if (count <= 0) return []
  const share = Math.floor((total / count) * 10_000) / 10_000
  const weights = Array.from({ length: count }, () => share)
  weights[count - 1] = Math.round((total - share * (count - 1)) * 10_000) / 10_000
  return weights
}

/* -------------------------------------------------------------------------- */
/* Plan                                                                       */
/* -------------------------------------------------------------------------- */

interface RowIdentity {
  studentNo: string
  lastName: string
  firstName: string
  middleInitial: string
}

function identityOf(sheet: ResolvedSheet, cells: string[]): RowIdentity {
  const identity: RowIdentity = {
    studentNo: '',
    lastName: '',
    firstName: '',
    middleInitial: '',
  }
  let fullName = ''
  for (const column of sheet.sheet.columns) {
    const mapping = sheet.mapping.columns[column.key]
    const value = (cells[column.index] ?? '').trim()
    if (!mapping || !value) continue
    if (mapping.role === 'studentNo') identity.studentNo ||= value
    if (mapping.role === 'lastName') identity.lastName ||= value
    if (mapping.role === 'firstName') identity.firstName ||= value
    if (mapping.role === 'middleName')
      identity.middleInitial ||= value.charAt(0).toUpperCase()
    if (mapping.role === 'fullName') fullName ||= value
  }
  if (fullName && (!identity.lastName || !identity.firstName)) {
    const parts = splitFullName(fullName)
    identity.lastName ||= parts.lastName
    identity.firstName ||= parts.firstName
    identity.middleInitial ||= parts.middleInitial
  }
  return identity
}

export function planClassRecordImport(
  sheets: readonly ResolvedSheet[],
  existing: ExistingGradebook,
  options: PlanOptions,
): ImportPlan {
  const issues: PlanIssue[] = []
  const included = sheets.filter((sheet) => sheet.mapping.include)
  const { structure } = existing

  /* ---------------------------- Students ---------------------------------- */

  const byNo = new Map<string, Ref>()
  const byName = new Map<string, Ref>()
  for (const student of existing.students) {
    const ref: Ref = { kind: 'existing', id: student.id }
    if (student.student_no) byNo.set(student.student_no.toLowerCase(), ref)
    byName.set(nameKey(student.last_name, student.first_name), ref)
  }

  const newStudents: NewStudent[] = []
  const usedNos = new Set(existing.students.map((s) => s.student_no.toLowerCase()))
  const matchedExisting = new Set<string>()

  // Rows that carry a student number go first, so a name-only quarter sheet
  // can attach to the student its roster sheet just created.
  const allRows = included.flatMap((sheet) =>
    sheet.sheet.rows.map((row) => ({
      sheet,
      row,
      identity: identityOf(sheet, row.cells),
    })),
  )
  const ordered = [
    ...allRows.filter((entry) => entry.identity.studentNo),
    ...allRows.filter((entry) => !entry.identity.studentNo),
  ]
  const rowRefs = new Map<string, Ref>()
  const rowId = (sheet: ResolvedSheet, rowNumber: number) =>
    `${sheet.sheet.key}:${rowNumber}`

  const pendingPlaceholders: NewStudent[] = []
  for (const { sheet, row, identity } of ordered) {
    const noKey = identity.studentNo.toLowerCase()
    const nk = nameKey(identity.lastName, identity.firstName)
    const hasName = !!identity.lastName && !!identity.firstName

    let ref: Ref | undefined = noKey ? byNo.get(noKey) : undefined
    if (!ref && hasName) ref = byName.get(nk)

    if (!ref) {
      if (!hasName) {
        issues.push({
          level: 'warning',
          sheet: sheet.sheet.name,
          rowNumber: row.rowNumber,
          message: 'Skipped: needs both a last and a first name to add a student',
        })
        continue
      }
      const student: NewStudent = {
        key: `s${newStudents.length + pendingPlaceholders.length}`,
        studentNo: identity.studentNo,
        lastName: identity.lastName,
        firstName: identity.firstName,
        middleInitial: identity.middleInitial,
        placeholderNo: !identity.studentNo,
      }
      if (student.placeholderNo) pendingPlaceholders.push(student)
      else {
        usedNos.add(noKey)
        newStudents.push(student)
      }
      ref = { kind: 'new', key: student.key }
    } else if (ref.kind === 'existing') {
      matchedExisting.add(ref.id)
    }

    if (noKey && !byNo.has(noKey)) byNo.set(noKey, ref)
    if (hasName && !byName.has(nk)) byName.set(nk, ref)
    rowRefs.set(rowId(sheet, row.rowNumber), ref)
  }

  // students.student_no is NOT NULL and unique per classroom, so a learner the
  // file names without a number still needs one. Generated numbers are flagged
  // in the preview so the teacher knows to replace them.
  let seq = 1
  for (const student of pendingPlaceholders) {
    let candidate = ''
    do {
      candidate = `IMPORT-${String(seq).padStart(3, '0')}`
      seq += 1
    } while (usedNos.has(candidate.toLowerCase()))
    usedNos.add(candidate.toLowerCase())
    student.studentNo = candidate
    newStudents.push(student)
  }
  if (pendingPlaceholders.length > 0) {
    issues.push({
      level: 'warning',
      message: `${pendingPlaceholders.length} new student${
        pendingPlaceholders.length === 1 ? ' has' : 's have'
      } no student number in the file and will get a placeholder (IMPORT-001, …). Edit them on the roster afterwards.`,
    })
  }

  /* ------------------------ Structure targets ------------------------------ */

  const component = [...structure.components].sort((a, b) => a.position - b.position)[0]

  interface Target {
    period: string
    category: string
    name: string
    maxScore: number
    categoryWeight: number | null
  }
  interface ActivityColumn {
    sheet: ResolvedSheet
    index: number
    label: string
    target: Target
  }
  const activityColumns: ActivityColumn[] = []
  for (const sheet of included) {
    for (const column of sheet.sheet.columns) {
      const mapping = sheet.mapping.columns[column.key]
      if (mapping?.role !== 'activity') continue
      const target: Target = {
        period: (mapping.period || sheet.mapping.period).trim(),
        category: mapping.category.trim(),
        name: mapping.name.trim(),
        maxScore: mapping.maxScore,
        categoryWeight: column.categoryWeight,
      }
      const label = `${column.letter} · ${column.header}`
      if (!target.period || !target.category || !target.name) {
        issues.push({
          level: 'error',
          sheet: sheet.sheet.name,
          column: label,
          message: 'Activity column needs a period, category and name',
        })
        continue
      }
      if (!(target.maxScore > 0)) {
        issues.push({
          level: 'error',
          sheet: sheet.sheet.name,
          column: label,
          message: 'Max score must be greater than zero',
        })
        continue
      }
      activityColumns.push({ sheet, index: column.index, label, target })
    }
  }

  if (activityColumns.length > 0 && !component) {
    issues.push({
      level: 'error',
      message: 'This subject has no grade component yet. Add one under Structure first.',
    })
  }

  /* ------------------------------ Periods ---------------------------------- */

  const periodRefs = new Map<string, Ref>()
  const periodByKey = new Map<string, GradingPeriod>()
  for (const period of structure.periods) periodByKey.set(periodKey(period.name), period)

  const newPeriodNames: string[] = []
  for (const { target } of activityColumns) {
    const key = periodKey(target.period)
    if (periodRefs.has(key)) continue
    const found = periodByKey.get(key)
    if (found) periodRefs.set(key, { kind: 'existing', id: found.id })
    else {
      periodRefs.set(key, { kind: 'new', key: `p:${key}` })
      newPeriodNames.push(target.period)
    }
  }

  const periodWeights =
    structure.periods.length === 0
      ? evenWeights(newPeriodNames.length)
      : newPeriodNames.map(() => round4(1 / (structure.periods.length + 1)))
  const firstPeriodPosition =
    structure.periods.reduce((max, period) => Math.max(max, period.position), -1) + 1
  const newPeriods: NewPeriod[] = newPeriodNames.map((name, index) => ({
    key: `p:${periodKey(name)}`,
    name,
    weight: periodWeights[index],
    position: firstPeriodPosition + index,
  }))
  if (newPeriods.length > 0 && structure.periods.length > 0) {
    issues.push({
      level: 'warning',
      message: `New grading period${newPeriods.length === 1 ? '' : 's'} ${newPeriods
        .map((p) => `"${p.name}"`)
        .join(
          ', ',
        )} will be added next to existing ones — review period weights under Structure.`,
    })
  }

  /* ----------------------------- Categories -------------------------------- */

  const categoryRefs = new Map<string, Ref>()
  const newCategoryByName = new Map<string, NewCategory>()
  const newCategoryHints = new Map<string, number | null>()

  const visibleCategories = (periodRef: Ref): ActivityCategory[] => {
    if (periodRef.kind === 'existing')
      return structure.components.flatMap((comp) =>
        categoriesFor(structure, periodRef.id, comp.id),
      )
    // A brand-new period only sees shared (period-less) categories.
    return structure.categories.filter((category) => category.grading_period_id === null)
  }

  const blockedColumns = new Set<ActivityColumn>()
  for (const column of activityColumns) {
    const periodRef = periodRefs.get(periodKey(column.target.period))
    if (!periodRef) continue
    const categoryName = loose(column.target.category)
    const mapKey = `${refKey(periodRef)}|${categoryName}`
    if (categoryRefs.has(mapKey)) continue

    const visible = visibleCategories(periodRef).find(
      (category) => loose(category.name) === categoryName,
    )
    if (visible) {
      categoryRefs.set(mapKey, { kind: 'existing', id: visible.id })
      continue
    }
    const elsewhere = structure.categories.find(
      (category) => loose(category.name) === categoryName,
    )
    if (elsewhere) {
      // The unique key forbids a second "Quizzes", and reusing one scoped to
      // another period would put these scores where that period cannot see them.
      blockedColumns.add(column)
      issues.push({
        level: 'error',
        sheet: column.sheet.sheet.name,
        column: column.label,
        message: `Category "${elsewhere.name}" already exists for a different period. Map this column to another category name.`,
      })
      continue
    }
    let created = newCategoryByName.get(categoryName)
    if (!created && component) {
      created = {
        key: `c:${categoryName}`,
        name: column.target.category,
        weight: 0,
        position: 0,
        componentId: component.id,
      }
      newCategoryByName.set(categoryName, created)
      newCategoryHints.set(categoryName, column.target.categoryWeight)
    }
    if (created) categoryRefs.set(mapKey, { kind: 'new', key: created.key })
  }

  const newCategories = [...newCategoryByName.values()]
  if (newCategories.length > 0 && component) {
    const existingInComponent = structure.categories.filter(
      (category) => category.grade_component_id === component.id,
    )
    const firstPosition =
      existingInComponent.reduce(
        (max, category) => Math.max(max, category.position),
        -1,
      ) + 1
    const hinted = newCategories.map(
      (category) => newCategoryHints.get(loose(category.name)) ?? null,
    )
    const hintedTotal = hinted.reduce<number>((sum, weight) => sum + (weight ?? 0), 0)
    const unhinted = hinted.filter((weight) => weight === null).length
    const remaining = existingInComponent.length === 0 ? Math.max(0, 1 - hintedTotal) : 0
    const spread =
      remaining > 0 ? evenWeights(unhinted, remaining) : new Array(unhinted).fill(0)
    let spreadIndex = 0
    newCategories.forEach((category, index) => {
      category.position = firstPosition + index
      const hint = hinted[index]
      let weight = hint ?? spread[spreadIndex++] ?? 0
      // numeric(5,4) > 0 is required; fall back to an equal share and warn.
      if (!(weight > 0))
        weight = round4(1 / (newCategories.length + existingInComponent.length))
      category.weight = round4(Math.min(1, weight))
    })
    const total = round2(
      [...existingInComponent, ...newCategories].reduce(
        (sum, category) => sum + category.weight,
        0,
      ) * 100,
    )
    if (existingInComponent.length > 0 || Math.abs(total - 100) > 0.01) {
      issues.push({
        level: 'warning',
        message: `New categories were given starting weights (the component now totals ${total}%). Review them under Structure after importing.`,
      })
    }
  }

  /* ----------------------------- Activities -------------------------------- */

  const activityRefs = new Map<ActivityColumn, { ref: Ref; maxScore: number }>()
  const targetRefs = new Map<string, { ref: Ref; maxScore: number }>()
  const newActivities: NewActivity[] = []
  const matchedActivities = new Set<string>()
  const nextPosition = new Map<string, number>()

  for (const column of activityColumns) {
    if (blockedColumns.has(column)) continue
    const periodRef = periodRefs.get(periodKey(column.target.period))
    if (!periodRef) continue
    const categoryRef = categoryRefs.get(
      `${refKey(periodRef)}|${loose(column.target.category)}`,
    )
    if (!categoryRef) continue
    const targetKey = `${refKey(periodRef)}|${refKey(categoryRef)}|${column.target.name.toLowerCase()}`

    const already = targetRefs.get(targetKey)
    if (already) {
      issues.push({
        level: 'warning',
        sheet: column.sheet.sheet.name,
        column: column.label,
        message: `Maps to the same activity as another column ("${column.target.name}"); later values win.`,
      })
      activityRefs.set(column, already)
      continue
    }

    let found: Activity | undefined
    if (periodRef.kind === 'existing' && categoryRef.kind === 'existing') {
      found = structure.activities.find(
        (activity) =>
          activity.grading_period_id === periodRef.id &&
          activity.category_id === categoryRef.id &&
          activity.name.trim().toLowerCase() === column.target.name.toLowerCase(),
      )
    }
    if (found) {
      matchedActivities.add(found.id)
      if (found.max_score !== column.target.maxScore) {
        issues.push({
          level: 'warning',
          sheet: column.sheet.sheet.name,
          column: column.label,
          message: `"${found.name}" already exists with max ${found.max_score}; the file says ${column.target.maxScore}. Keeping ${found.max_score}.`,
        })
      }
      const entry: { ref: Ref; maxScore: number } = {
        ref: { kind: 'existing', id: found.id },
        maxScore: found.max_score,
      }
      targetRefs.set(targetKey, entry)
      activityRefs.set(column, entry)
      continue
    }

    const slot = `${refKey(periodRef)}|${refKey(categoryRef)}`
    let position = nextPosition.get(slot)
    if (position === undefined) {
      position =
        structure.activities
          .filter(
            (activity) =>
              periodRef.kind === 'existing' &&
              categoryRef.kind === 'existing' &&
              activity.grading_period_id === periodRef.id &&
              activity.category_id === categoryRef.id,
          )
          .reduce((max, activity) => Math.max(max, activity.position), -1) + 1
    }
    nextPosition.set(slot, position + 1)
    const created: NewActivity = {
      key: `a${newActivities.length}`,
      name: column.target.name,
      maxScore: column.target.maxScore,
      position,
      period: periodRef,
      category: categoryRef,
    }
    newActivities.push(created)
    const entry: { ref: Ref; maxScore: number } = {
      ref: { kind: 'new', key: created.key },
      maxScore: created.maxScore,
    }
    targetRefs.set(targetKey, entry)
    activityRefs.set(column, entry)
  }

  /* ------------------------------- Scores ---------------------------------- */

  const writes = new Map<string, ScoreWrite>()
  const counts = {
    newScores: 0,
    overwrites: 0,
    unchanged: 0,
    keptExisting: 0,
    invalid: 0,
  }
  const seenCells = new Set<string>()

  for (const column of activityColumns) {
    const activity = activityRefs.get(column)
    if (!activity) continue
    for (const row of column.sheet.sheet.rows) {
      const student = rowRefs.get(rowId(column.sheet, row.rowNumber))
      if (!student) continue
      const raw = (row.cells[column.index] ?? '').trim()
      if (isBlankScore(raw)) continue
      const value = parseNumber(raw)
      if (value === null || value < 0 || value > activity.maxScore) {
        counts.invalid += 1
        issues.push({
          level: 'warning',
          sheet: column.sheet.sheet.name,
          rowNumber: row.rowNumber,
          column: column.label,
          message:
            value === null
              ? `"${raw}" is not a score — skipped`
              : `${value} is outside 0–${activity.maxScore} — skipped`,
        })
        continue
      }

      const cellKey = `${refKey(student)}|${refKey(activity.ref)}`
      if (seenCells.has(cellKey)) {
        issues.push({
          level: 'warning',
          sheet: column.sheet.sheet.name,
          rowNumber: row.rowNumber,
          column: column.label,
          message:
            'Same student and activity appear twice in the file; the later value wins.',
        })
      }
      seenCells.add(cellKey)

      const current =
        student.kind === 'existing' && activity.ref.kind === 'existing'
          ? (existing.scores[activity.ref.id]?.[student.id] ?? null)
          : null
      if (current !== null && current === value) {
        writes.delete(cellKey)
        counts.unchanged += 1
        continue
      }
      if (current !== null && !options.overwriteScores) {
        writes.delete(cellKey)
        counts.keptExisting += 1
        continue
      }
      writes.set(cellKey, {
        student,
        activity: activity.ref,
        score: value,
        overwrite: current !== null,
      })
    }
  }
  for (const write of writes.values()) {
    if (write.overwrite) counts.overwrites += 1
    else counts.newScores += 1
  }

  const blocked =
    issues.some((issue) => issue.level === 'error') ||
    (newStudents.length === 0 &&
      newPeriods.length === 0 &&
      newCategories.length === 0 &&
      newActivities.length === 0 &&
      writes.size === 0)

  return {
    students: { create: newStudents, matched: matchedExisting.size },
    periods: newPeriods,
    categories: newCategories,
    activities: { create: newActivities, matched: matchedActivities.size },
    scores: [...writes.values()],
    counts,
    issues,
    blocked,
  }
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
