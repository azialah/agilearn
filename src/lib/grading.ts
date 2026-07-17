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
  GradeComponent,
  GradingPeriod,
} from '@/types/domain'

/** The static shape of a classroom's gradebook (no scores). */
export interface GradebookStructure {
  periods: GradingPeriod[]
  categories: ActivityCategory[]
  activities: Activity[]
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
  const final = computeFinalGrade(
    lecture,
    laboratory,
    weights.lecture,
    weights.laboratory,
  )

  return { perPeriod, lecture, laboratory, final }
}
