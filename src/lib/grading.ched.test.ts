import { describe, it, expect } from 'vitest'
import {
  bandChedGrade,
  computeChedFinalGrade,
  CHED_DEFAULT_INCREMENT,
  type GradebookStructure,
  type ScoreMap,
} from './grading'
import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradingPeriod,
} from '@/types/domain'

const S = 'student-1'

describe('bandChedGrade', () => {
  it('maps 100% to the highest grade, 1.00', () => {
    expect(bandChedGrade(100)).toBe(1.0)
  })

  it('maps exactly the passing percent (75) to exactly 3.00', () => {
    expect(bandChedGrade(75)).toBe(3.0)
  })

  it('floors anything just under the passing mark to 5.00', () => {
    expect(bandChedGrade(74.99)).toBe(5.0)
    expect(bandChedGrade(0)).toBe(5.0)
  })

  it('propagates a null percent as null', () => {
    expect(bandChedGrade(null)).toBeNull()
  })

  it('defaults to a 0.25 increment', () => {
    expect(CHED_DEFAULT_INCREMENT).toBe(0.25)
    // 87.5% is exactly halfway between 75 (3.00) and 100 (1.00) -> raw 2.00,
    // already on a 0.25 boundary.
    expect(bandChedGrade(87.5)).toBe(2.0)
  })

  it('snaps to a custom increment without float drift', () => {
    expect(bandChedGrade(87.5, 0.1)).toBeCloseTo(2.0, 10)
    // raw at 90% is 1.8 -> nearest 0.5 multiple is 2.0.
    expect(bandChedGrade(90, 0.5)).toBeCloseTo(2.0, 10)
    // Every result must land on a clean multiple of the increment.
    const result = bandChedGrade(83, 0.1)
    expect(result).not.toBeNull()
    expect(Math.round((result as number) / 0.1)).toBeCloseTo((result as number) / 0.1, 6)
  })
})

function period(id: string, weight = 1): GradingPeriod {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject-1',
    name: id,
    weight,
    position: 0,
    starts_on: null,
    ends_on: null,
  }
}

function category(
  id: string,
  componentId: string,
  periodId: string,
  weight: number,
): ActivityCategory {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject-1',
    component: 'lecture',
    grading_period_id: periodId,
    grade_component_id: componentId,
    position: 0,
    name: id,
    weight,
  }
}

function component(id: string, name: string, weight: number): GradeComponentRecord {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject-1',
    name,
    weight,
    position: 0,
    created_at: '2026-01-01T00:00:00Z',
  }
}

function activity(
  id: string,
  periodId: string,
  categoryId: string,
  maxScore: number,
): Activity {
  return {
    id,
    grading_period_id: periodId,
    category_id: categoryId,
    name: id,
    max_score: maxScore,
    date: null,
    position: 0,
  }
}

function scores(map: Record<string, number | null>): ScoreMap {
  const out: ScoreMap = {}
  for (const [activityId, value] of Object.entries(map)) {
    out[activityId] = { [S]: value }
  }
  return out
}

describe('computeChedFinalGrade', () => {
  const structure: GradebookStructure = {
    periods: [period('p1')],
    components: [component('comp', 'Overall', 1)],
    categories: [category('cat', 'comp', 'p1', 1)],
    activities: [activity('a1', 'p1', 'cat', 100)],
  }

  it('bands the existing engine final percentage into a CHED grade', () => {
    expect(computeChedFinalGrade(structure, scores({ a1: 100 }), S)).toBe(1.0)
    expect(computeChedFinalGrade(structure, scores({ a1: 60 }), S)).toBe(5.0)
  })

  it('propagates an incomplete gradebook (null final) as null', () => {
    expect(computeChedFinalGrade(structure, scores({ a1: null }), S)).toBeNull()
  })
})
