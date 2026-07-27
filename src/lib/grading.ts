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
 * sum to 1. Full precision is retained internally; rounding to two decimals
 * happens only at the very end (see {@link round2}).
 */

import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradeComponent,
  GradingPeriod,
} from '@/types/domain'

/** The static shape of a classroom's gradebook (no scores). */
export interface GradebookStructure {
  periods: GradingPeriod[]
  components: GradeComponentRecord[]
  categories: ActivityCategory[]
  activities: Activity[]
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

/** Grade structures are expressed as decimal weights: 0.4 means 40%. */
export function hasExactWeightTotal(weights: readonly number[]): boolean {
  return (
    weights.length > 0 &&
    weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1) &&
    weights.reduce((total, weight) => total + Math.round(weight * 10_000), 0) === 10_000
  )
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

/** Grade one configured component for a period. Legacy categories remain visible
 * across periods; new categories are scoped by `grading_period_id`. */
export function computeConfiguredPeriodComponentGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
  componentId: string,
): number | null {
  const categories = structure.categories.filter(
    (category) =>
      categoryUsesComponent(category, componentId) &&
      (category.grading_period_id === null || category.grading_period_id === periodId),
  )
  if (!hasExactWeightTotal(categories.map((category) => category.weight))) return null
  let weighted = 0
  let totalWeight = 0
  for (const category of categories) {
    const activities = structure.activities.filter(
      (activity) =>
        activity.category_id === category.id && activity.grading_period_id === periodId,
    )
    const percent = computeCategoryPercent(activities, scores, studentId)
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
    components[component.id] =
      totalWeight > 0 &&
      hasExactWeightTotal(structure.periods.map((period) => period.weight))
        ? weighted / totalWeight
        : null
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
    final:
      totalWeight > 0 &&
      hasExactWeightTotal(structure.components.map((component) => component.weight))
        ? round2(total / totalWeight)
        : null,
  }
}

/** Combine configured components for a single grading period. */
export function computeConfiguredPeriodFinalGrade(
  structure: GradebookStructure,
  scores: ScoreMap,
  studentId: string,
  periodId: string,
): number | null {
  if (!hasExactWeightTotal(structure.components.map((component) => component.weight))) {
    return null
  }
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
 * Only activities the student has a numeric score for count toward the ratio.
 * Returns null when the student has no graded activity in the category.
 */
export function computeCategoryPercent(
  activities: Activity[],
  scores: ScoreMap,
  studentId: string,
): number | null {
  let earned = 0
  let possible = 0
  for (const activity of activities) {
    const value = scoreFor(scores, activity.id, studentId)
    if (value === null) continue
    earned += value
    possible += activity.max_score
  }
  if (possible <= 0) return null
  return (earned / possible) * 100
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
    const percent = computeCategoryPercent(activities, scores, studentId)
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
