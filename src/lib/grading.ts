/**
 * Pure grade-computation engine for Agilearn.
 *
 * This module has NO side effects and imports nothing from Supabase. It is the
 * single source of truth for grade math and is exercised by grading.test.ts.
 *
 * Model
 * -----
 * A classroom is graded across two components — `lecture` and `laboratory`.
 * Each component is weighted (default lecture 0.40 / laboratory 0.60) into a
 * final grade, matching the legacy formula.
 *
 * A component grade is a weight-normalized average of grading-period grades.
 * A period grade is a weight-normalized average of category percentages for
 * that component within that period. A category percentage is the ratio of
 * earned points to possible points across the activities in that category that
 * the student actually has a score for.
 *
 * Renormalization rule: any category or period that has no graded work for the
 * student is dropped, and the remaining weights are renormalized so they always
 * sum to 1. That renormalization also covers a structure whose configured
 * weights miss 100% — such a gradebook still grades, and {@link findWeightIssues}
 * reports the mismatch so the UI can warn rather than silently blanking every
 * column. Full precision is retained internally; rounding to two decimals
 * happens only at the very end (see {@link round2}).
 */

import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradeComponent,
  GradingPeriod,
} from '@/types/domain'

/**
 * Per-subject scoring rules, mirroring course_subjects.grade_floor and
 * .ungraded_as_zero (migration 0036).
 *
 * Optional throughout: an absent policy is exactly today's behaviour, so every
 * existing caller and test keeps working untouched.
 */
export interface ScoringPolicy {
  /**
   * Lowest reportable percentage. A raw category percent `p` becomes
   * `floor + p * (100 - floor) / 100`. 0 disables it; 60 gives the Philippine
   * college convention `tab_score = (raw / max) * 40 + 60`.
   *
   * Applied per category, which is where the paper class record applies it. It
   * would be arithmetically identical to apply it once to the weighted average
   * (the linear map commutes with a weighted mean whose weights sum to 1), but
   * per-category keeps the grid's category column showing the same number the
   * teacher's sheet shows.
   */
  floor?: number
  /**
   * When true, an activity with no score counts as zero rather than dropping
   * out of the ratio — spreadsheet behaviour, where a blank cell is a zero.
   *
   * ponytail: the known consequence is that an exam row created before the exam
   * is given drags everyone toward the floor until scores are entered. The
   * paper record behaves the same way and teachers cope by adding columns as
   * they go; add a per-activity "counts yet" flag only if someone asks.
   */
  ungradedAsZero?: boolean
}

/** The static shape of a classroom's gradebook (no scores). */
export interface GradebookStructure {
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  categories: ActivityCategory[]
  activities: Activity[]
  /** Absent means "no floor, ungraded work excluded" — the historical default. */
  policy?: ScoringPolicy
}

export interface ConfiguredStudentGradebook {
  perPeriod: Record<string, Record<string, number | null>>
  components: Record<string, number | null>
  final: number | null
}

export interface WeightedFinalInput {
  grade: number | null
  weight: number
}

/**
 * Grade structures are expressed as decimal weights: 0.4 means 40%.
 *
 * This is a *reporting* predicate, not a gate. The compute functions below
 * renormalize (`weighted / totalWeight`), so a structure totalling 70% or 200%
 * still produces a grade — it is simply not the split the teacher asked for.
 * Gating on it instead used to blank the whole gradebook silently:
 * `grading_periods.weight` defaults to 1.0 and PeriodDialog sends 1 for a blank
 * share, so two hand-added periods totalled 200% and every component and final
 * read `null` while the dialog reported "resulting share: 50%".
 * {@link findWeightIssues} surfaces the mismatch instead of hiding the grades.
 *
 * It stays a hard gate in exactly one place, {@link computeCombinedFinalGrade}:
 * a missing Lecture subject must never renormalize into 100% Laboratory, and
 * `save_subject_grade_combination` enforces the same rule in SQL.
 */
export function hasExactWeightTotal(weights: readonly number[]): boolean {
  return (
    weights.length > 0 &&
    weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1) &&
    weights.reduce((total, weight) => total + Math.round(weight * 10_000), 0) === 10_000
  )
}

/**
 * A level whose configured weights do not total 100%.
 *
 * Grades are still produced for such a structure — the engine renormalizes —
 * but the teacher asked for a different split, so the UI must say so. This
 * replaces the old behavior of silently returning `null` for the whole level,
 * which looked identical to "no grades entered yet".
 */
export interface WeightIssue {
  level: 'period' | 'component' | 'category'
  /** Which period/component pair the offending categories sit in. */
  periodId?: string
  componentId?: string
  /** What the weights actually add up to, as a percentage: 70, 200, ... */
  totalPercent: number
}

/** Every level of `structure` whose weights miss 100%, in display order. */
export function findWeightIssues(structure: GradebookStructure): WeightIssue[] {
  const issues: WeightIssue[] = []
  const totalOf = (weights: readonly number[]) =>
    round2(weights.reduce((sum, weight) => sum + weight, 0) * 100)

  const periodWeights = structure.periods.map((period) => period.weight)
  if (periodWeights.length > 0 && !hasExactWeightTotal(periodWeights)) {
    issues.push({ level: 'period', totalPercent: totalOf(periodWeights) })
  }

  const componentWeights = structure.components.map((component) => component.weight)
  if (componentWeights.length > 0 && !hasExactWeightTotal(componentWeights)) {
    issues.push({ level: 'component', totalPercent: totalOf(componentWeights) })
  }

  for (const period of structure.periods) {
    for (const component of structure.components) {
      const weights = categoriesFor(structure, period.id, component.id).map(
        (category) => category.weight,
      )
      // An empty component in a period is not misconfigured, just unused.
      if (weights.length === 0 || hasExactWeightTotal(weights)) continue
      issues.push({
        level: 'category',
        periodId: period.id,
        componentId: component.id,
        totalPercent: totalOf(weights),
      })
    }
  }

  return issues
}

/**
 * Combines final grades from separate subjects, such as Lecture and Laboratory.
 * A combined result is intentionally unavailable until every selected subject
 * has a grade and its configured weights total exactly 100%.
 */
export function computeCombinedFinalGrade(
  inputs: readonly WeightedFinalInput[],
): number | null {
  if (
    inputs.length < 2 ||
    !hasExactWeightTotal(inputs.map((input) => input.weight)) ||
    inputs.some((input) => input.grade === null)
  ) {
    return null
  }

  return round2(
    inputs.reduce((total, input) => total + (input.grade ?? 0) * input.weight, 0),
  )
}

/** Existing classrooms have no persisted component rows. Keep their historical
 * lecture/laboratory categories readable until a teacher explicitly adopts the
 * new component structure. */
function categoryUsesComponent(category: ActivityCategory, componentId: string): boolean {
  if (category.grade_component_id === componentId) return true
  return (
    category.grade_component_id === null &&
    ((componentId === 'legacy-lecture' && category.component === 'lecture') ||
      (componentId === 'legacy-laboratory' && category.component === 'laboratory'))
  )
}

/** The categories that count toward one component in one period. Legacy
 * categories remain visible across periods; new ones are scoped by
 * `grading_period_id`. Exported because the grid, the structure panel and the
 * workbook all need the same selection and had each grown their own copy. */
export function categoriesFor(
  structure: GradebookStructure,
  periodId: string,
  componentId: string,
): ActivityCategory[] {
  return structure.categories.filter(
    (category) =>
      categoryUsesComponent(category, componentId) &&
      (category.grading_period_id === null || category.grading_period_id === periodId),
  )
}

/** Grade one configured component for a period. */
export function computeConfiguredPeriodComponentGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
  componentId: string,
): number | null {
  const categories = categoriesFor(structure, periodId, componentId)
  let weighted = 0
  let totalWeight = 0
  for (const category of categories) {
    const activities = structure.activities.filter(
      (activity) =>
        activity.category_id === category.id && activity.grading_period_id === periodId,
    )
    const percent = computeCategoryPercent(
      activities,
      scores,
      studentId,
      structure.policy,
    )
    if (percent === null) continue
    weighted += percent * category.weight
    totalWeight += category.weight
  }
  return totalWeight > 0 ? weighted / totalWeight : null
}

export function computeConfiguredStudentGradebook(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
): ConfiguredStudentGradebook {
  const perPeriod: ConfiguredStudentGradebook['perPeriod'] = {}
  const components: ConfiguredStudentGradebook['components'] = {}
  for (const period of structure.periods) {
    perPeriod[period.id] = {}
    for (const component of structure.components) {
      perPeriod[period.id][component.id] = computeConfiguredPeriodComponentGrade(
        structure,
        scores,
        studentId,
        period.id,
        component.id,
      )
    }
  }
  for (const component of structure.components) {
    let weighted = 0
    let totalWeight = 0
    for (const period of structure.periods) {
      const grade = perPeriod[period.id][component.id]
      if (grade === null) continue
      weighted += grade * period.weight
      totalWeight += period.weight
    }
    components[component.id] = totalWeight > 0 ? weighted / totalWeight : null
  }
  let total = 0
  let totalWeight = 0
  for (const component of structure.components) {
    const grade = components[component.id]
    if (grade === null) continue
    total += grade * component.weight
    totalWeight += component.weight
  }
  return {
    perPeriod,
    components,
    final: totalWeight > 0 ? round2(total / totalWeight) : null,
  }
}

/** Combine configured components for a single grading period. */
export function computeConfiguredPeriodFinalGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
): number | null {
  let total = 0
  let totalWeight = 0
  for (const component of structure.components) {
    const grade = computeConfiguredPeriodComponentGrade(
      structure,
      scores,
      studentId,
      periodId,
      component.id,
    )
    if (grade === null) continue
    total += grade * component.weight
    totalWeight += component.weight
  }
  return totalWeight > 0 ? round2(total / totalWeight) : null
}

/** Required score coverage for reports. A partially scored category may be
 * useful while entering grades, but it must not be sent as a final report. */
export function isConfiguredGradeComplete(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId?: string,
): boolean {
  const activities = structure.activities.filter(
    (activity) => periodId === undefined || activity.grading_period_id === periodId,
  )
  return (
    activities.length > 0 &&
    activities.every((activity) => scoreFor(scores, activity.id, studentId) !== null)
  )
}

/** activityId -> studentId -> score (null when ungraded). */
export type ScoreMap = Record<string, Record<string, number | null>>

/** Component weights used to combine lecture + laboratory into a final grade. */
export interface ComponentWeights {
  lecture: number
  laboratory: number
}

export const DEFAULT_WEIGHTS: ComponentWeights = {
  lecture: 0.4,
  laboratory: 0.6,
}

/** Round half-up to two decimal places. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function scoreFor(
  scores: ScoreMap,
  activityId: string,
  studentId: string,
): number | null {
  const row = scores[activityId]
  if (!row) return null
  const value = row[studentId]
  return value === undefined ? null : value
}

/**
 * Category percentage (0–100) for a student across the supplied activities.
 *
 * By default only activities the student has a numeric score for count toward
 * the ratio, and the result is null when nothing in the category is graded.
 * A {@link ScoringPolicy} can change both halves: `ungradedAsZero` keeps
 * unscored activities in the denominator, and `floor` compresses the result
 * into [floor, 100].
 */
export function computeCategoryPercent(
  activities: Activity[],
  scores: ScoreMap,
  studentId: string,
  policy?: ScoringPolicy,
): number | null {
  let earned = 0
  let possible = 0
  for (const activity of activities) {
    const value = scoreFor(scores, activity.id, studentId)
    if (value === null) {
      if (!policy?.ungradedAsZero) continue
      // Counts as a zero: contributes to the denominator, not the numerator.
      possible += activity.max_score
      continue
    }
    earned += value
    possible += activity.max_score
  }
  // Default policy: nothing scored means possible is still 0, so an untouched
  // category reads "not started" rather than 0%. Under ungradedAsZero it does
  // report the floor instead, which is the whole point of that mode — a
  // spreadsheet shows the same thing, and a not-yet-given exam column pulls
  // everyone down until it is filled in. isConfiguredGradeComplete is what
  // keeps such a grade out of a report.
  if (possible <= 0) return null
  return applyFloor((earned / possible) * 100, policy?.floor)
}

/**
 * Compress a 0–100 percentage into [floor, 100]:
 * `floor + percent * (100 - floor) / 100`.
 *
 * Exported because the grid shows this per category and the exporters need the
 * identical number — the alternative was three copies drifting apart.
 */
export function applyFloor(percent: number, floor?: number): number {
  if (!floor || floor <= 0 || floor >= 100 || !Number.isFinite(floor)) return percent
  return floor + (percent * (100 - floor)) / 100
}

/**
 * Grade (0–100) for one component within one grading period. Categories with no
 * graded work drop out and remaining category weights renormalize.
 */
export function computePeriodComponentGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
  component: GradeComponent,
): number | null {
  const categories = structure.categories.filter((c) => c.component === component)

  let weighted = 0
  let totalWeight = 0
  for (const category of categories) {
    const activities = structure.activities.filter(
      (a) => a.category_id === category.id && a.grading_period_id === periodId,
    )
    const percent = computeCategoryPercent(
      activities,
      scores,
      studentId,
      structure.policy,
    )
    if (percent === null) continue
    weighted += percent * category.weight
    totalWeight += category.weight
  }

  if (totalWeight <= 0) return null
  return weighted / totalWeight
}

/**
 * Grade (0–100) for one component across all periods. Periods with no graded
 * work drop out and remaining period weights renormalize.
 */
export function computeComponentGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  component: GradeComponent,
): number | null {
  let weighted = 0
  let totalWeight = 0
  for (const period of structure.periods) {
    const grade = computePeriodComponentGrade(
      structure,
      scores,
      studentId,
      period.id,
      component,
    )
    if (grade === null) continue
    weighted += grade * period.weight
    totalWeight += period.weight
  }

  if (totalWeight <= 0) return null
  return weighted / totalWeight
}

/**
 * Combine a lecture and laboratory grade into a final grade, rounded to two
 * decimals. Returns null when either component is missing (legacy parity).
 */
export function computeFinalGrade(
  lectureGrade: number | null,
  laboratoryGrade: number | null,
  lectureWeight: number = DEFAULT_WEIGHTS.lecture,
  laboratoryWeight: number = DEFAULT_WEIGHTS.laboratory,
): number | null {
  if (lectureGrade === null || laboratoryGrade === null) return null
  return round2(lectureGrade * lectureWeight + laboratoryGrade * laboratoryWeight)
}

/** Combine the two component grades for one named grading period. */
export function computePeriodFinalGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
  weights: ComponentWeights = DEFAULT_WEIGHTS,
): number | null {
  return computeFinalGrade(
    computePeriodComponentGrade(structure, scores, studentId, periodId, 'lecture'),
    computePeriodComponentGrade(structure, scores, studentId, periodId, 'laboratory'),
    weights.lecture,
    weights.laboratory,
  )
}

export interface StudentGradebook {
  perPeriod: Record<string, { lecture: number | null; laboratory: number | null }>
  lecture: number | null
  laboratory: number | null
  final: number | null
}

/**
 * Full per-student breakdown: each period's lecture/laboratory grade, the two
 * component grades, and the final grade.
 */
export function computeStudentGradebook(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  weights: ComponentWeights = DEFAULT_WEIGHTS,
): StudentGradebook {
  const perPeriod: StudentGradebook['perPeriod'] = {}
  for (const period of structure.periods) {
    perPeriod[period.id] = {
      lecture: computePeriodComponentGrade(
        structure,
        scores,
        studentId,
        period.id,
        'lecture',
      ),
      laboratory: computePeriodComponentGrade(
        structure,
        scores,
        studentId,
        period.id,
        'laboratory',
      ),
    }
  }

  const lecture = computeComponentGrade(structure, scores, studentId, 'lecture')
  const laboratory = computeComponentGrade(structure, scores, studentId, 'laboratory')
  // A new classroom starts with one Overall component. The legacy display shape
  // represents that component in the lecture slot until all consumers migrate
  // to `computeConfiguredStudentGradebook`.
  if (structure.components.length === 1 && structure.components[0]?.name === 'Overall') {
    return {
      perPeriod,
      lecture,
      laboratory: null,
      final: lecture === null ? null : round2(lecture),
    }
  }
  const final = computeFinalGrade(
    lecture,
    laboratory,
    weights.lecture,
    weights.laboratory,
  )

  return { perPeriod, lecture, laboratory, final }
}

/**
 * DepEd-style report-card conversion (Order 8, s. 2015), layered on top of
 * the existing 0-100% engine above rather than inside it —
 * `computeConfiguredPeriodFinalGrade`/`computeConfiguredStudentGradebook`
 * stay untouched; these functions only ever consume their `number | null`
 * output.
 */

/** One inclusive percentage band. A table may leave gaps (e.g. nothing below
 * its lowest band) — that is a valid shape, not a data error; see
 * {@link transmuteGrade}. */
export interface TransmutationBand {
  minPercent: number
  maxPercent: number
  transmutedGrade: number
}

export type TransmutationTable = readonly TransmutationBand[]

/** Every band internally consistent (0 <= min <= max <= 100) and no two
 * bands overlap. Does NOT require full 0-100 coverage. */
export function hasValidTransmutationTable(table: TransmutationTable): boolean {
  if (table.length === 0) return false
  const sorted = [...table].sort((a, b) => a.minPercent - b.minPercent)
  return sorted.every((band, index) => {
    if (
      !Number.isFinite(band.minPercent) ||
      !Number.isFinite(band.maxPercent) ||
      band.minPercent < 0 ||
      band.maxPercent > 100 ||
      band.minPercent > band.maxPercent
    ) {
      return false
    }
    const previous = sorted[index - 1]
    return !previous || previous.maxPercent < band.minPercent
  })
}

/**
 * A 0-100 percentage (a period's "Initial Grade") transmuted through the
 * given table. Null when `percent` is null, the table is malformed, or no
 * band covers the percentage (e.g. below the lowest band) — every case
 * propagates as "no grade yet," matching the rest of this module's null rules.
 */
export function transmuteGrade(
  percent: number | null,
  table: TransmutationTable,
): number | null {
  if (percent === null || !hasValidTransmutationTable(table)) return null
  const band = table.find((b) => percent >= b.minPercent && percent <= b.maxPercent)
  return band ? band.transmutedGrade : null
}

/** One grading period's transmuted Quarterly Grade. */
export function computeTransmutedPeriodGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
  table: TransmutationTable,
): number | null {
  return transmuteGrade(
    computeConfiguredPeriodFinalGrade(structure, scores, studentId, periodId),
    table,
  )
}

export interface TransmutedStudentGradebook {
  perPeriod: Record<string, number | null>
  final: number | null
}

/**
 * DepEd's General Average: each period is transmuted FIRST into its own
 * Quarterly Grade, and periods are then weight-combined — the combination is
 * NOT re-transmuted. This is the only mapping that matches how DepEd actually
 * reports: a 74%/76% split and a flat 75%/75% split must not transmute
 * identically just because they average to the same blended percentage.
 */
export function computeTransmutedStudentGradebook(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  table: TransmutationTable,
): TransmutedStudentGradebook {
  const perPeriod: TransmutedStudentGradebook['perPeriod'] = {}
  for (const period of structure.periods) {
    perPeriod[period.id] = computeTransmutedPeriodGrade(
      structure,
      scores,
      studentId,
      period.id,
      table,
    )
  }
  let weighted = 0
  let totalWeight = 0
  for (const period of structure.periods) {
    const grade = perPeriod[period.id]
    if (grade === null) continue
    weighted += grade * period.weight
    totalWeight += period.weight
  }
  const final = totalWeight > 0 ? round2(weighted / totalWeight) : null
  return { perPeriod, final }
}

/**
 * CHED-style numeric equivalent. Linear from 100% (best) to the passing mark
 * (worst passing grade); anything below the passing mark floors to the
 * failing grade. Snaps to the nearest `increment` without float drift.
 */
export const CHED_HIGHEST_GRADE = 1.0
export const CHED_PASSING_GRADE = 3.0
export const CHED_FAILING_GRADE = 5.0
export const CHED_PASSING_PERCENT = 75
export const CHED_DEFAULT_INCREMENT = 0.25

export function bandChedGrade(
  percent: number | null,
  increment: number = CHED_DEFAULT_INCREMENT,
): number | null {
  if (percent === null || !Number.isFinite(percent) || increment <= 0) return null
  if (percent < CHED_PASSING_PERCENT) return CHED_FAILING_GRADE
  // Linear: 100% -> CHED_HIGHEST_GRADE, CHED_PASSING_PERCENT -> CHED_PASSING_GRADE.
  const span = 100 - CHED_PASSING_PERCENT
  const raw =
    CHED_PASSING_GRADE -
    ((percent - CHED_PASSING_PERCENT) / span) * (CHED_PASSING_GRADE - CHED_HIGHEST_GRADE)
  const snapped = Math.round(raw / increment) * increment
  const clamped = Math.min(CHED_FAILING_GRADE, Math.max(CHED_HIGHEST_GRADE, snapped))
  return round2(clamped)
}

/** Convenience wrapper composing with `computeConfiguredStudentGradebook`'s
 * existing `final`, not replacing it. */
export function computeChedFinalGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  increment: number = CHED_DEFAULT_INCREMENT,
): number | null {
  return bandChedGrade(
    computeConfiguredStudentGradebook(structure, scores, studentId).final,
    increment,
  )
}

/**
 * The reporting layer: which number a teacher is actually shown.
 *
 * Everything above produces a 0-100 percentage. Which conversion sits on top
 * depends on the subject's grading template, and the branch used to live
 * duplicated in SummaryTable and GradeGrid — so the .xlsx and .pdf exporters,
 * which never had a copy, printed the raw percentage while the screen showed
 * the converted grade. Same student, two different numbers. One function now,
 * called by all four.
 */

export type GradingTemplateName =
  'basic_education' | 'senior_high' | 'higher_education' | 'custom'

export interface ReportingConfig {
  gradingTemplate?: GradingTemplateName | string
  /** Resolved conversion table, when the subject uses one. */
  table?: TransmutationTable
  /** Only consulted on the CHED formula fallback. */
  chedIncrement?: number
}

export function computeReportedFinalGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  config: ReportingConfig = {},
): number | null {
  const { gradingTemplate, table, chedIncrement } = config

  // DepEd: transmute EACH period into its own Quarterly Grade, then combine.
  // The combination is deliberately NOT re-transmuted - see the comment on
  // computeTransmutedStudentGradebook.
  if (gradingTemplate === 'basic_education' || gradingTemplate === 'senior_high') {
    if (!table)
      return computeConfiguredStudentGradebook(structure, scores, studentId).final
    return computeTransmutedStudentGradebook(structure, scores, studentId, table).final
  }

  if (gradingTemplate === 'higher_education') {
    const final = computeConfiguredStudentGradebook(structure, scores, studentId).final
    // Combine first, THEN look up - the opposite order to DepEd above, and the
    // order the college class record uses: ROUND(AVERAGE(midterm, finals)) is
    // computed first and the numeric equivalent read off that single number.
    if (table) return transmuteGrade(final, table)
    return bandChedGrade(final, chedIncrement)
  }

  return computeConfiguredStudentGradebook(structure, scores, studentId).final
}

/**
 * Pass/fail/incomplete for one student.
 *
 * Judged on the PERCENTAGE, never on a converted grade: a CHED numeric
 * equivalent runs 1.00 (best) to 5.00 (worst), so a >= comparison against it
 * would invert the test.
 *
 * INCOMPLETE needs no stored column - "has a score for every activity" is
 * already answered by isConfiguredGradeComplete, and that is what an INC means
 * in practice.
 *
 * ponytail: derived, not stored. A teacher who wants to mark a fully-scored
 * student INC anyway needs a real override column - add it when someone asks.
 */
export type Remark = 'PASSED' | 'FAILED' | 'INCOMPLETE'

export function remarkFor(
  finalPercent: number | null,
  complete: boolean,
  passingPercent: number = CHED_PASSING_PERCENT,
): Remark {
  if (finalPercent === null || !complete) return 'INCOMPLETE'
  return finalPercent >= passingPercent ? 'PASSED' : 'FAILED'
}

export interface ClassStatistics {
  count: number
  passed: number
  failed: number
  incomplete: number
}

/** Tally remarks the caller has already computed - SummaryTable maps over its
 * students once, so this is a reduce over an array it is holding anyway. */
export function summarizeClass(remarks: readonly Remark[]): ClassStatistics {
  return {
    count: remarks.length,
    passed: remarks.filter((remark) => remark === 'PASSED').length,
    failed: remarks.filter((remark) => remark === 'FAILED').length,
    incomplete: remarks.filter((remark) => remark === 'INCOMPLETE').length,
  }
}
