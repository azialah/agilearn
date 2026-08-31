import { describe, it, expect } from 'vitest'
import {
  applyFloor,
  computeCategoryPercent,
  computeConfiguredStudentGradebook,
  computeReportedFinalGrade,
  remarkFor,
  summarizeClass,
  type GradebookStructure,
  type Remark,
  type ScoreMap,
  type TransmutationTable,
} from './grading'
import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradingPeriod,
} from '@/types/domain'

const S = 'student-1'

function activity(id: string, maxScore: number): Activity {
  return {
    id,
    grading_period_id: 'p1',
    category_id: 'cat',
    name: id,
    max_score: maxScore,
    date: null,
    position: 0,
  }
}

function scores(map: Record<string, number | null>): ScoreMap {
  const out: ScoreMap = {}
  for (const [activityId, value] of Object.entries(map)) out[activityId] = { [S]: value }
  return out
}

describe('applyFloor', () => {
  it('is the identity when no floor is configured', () => {
    expect(applyFloor(42, undefined)).toBe(42)
    expect(applyFloor(42, 0)).toBe(42)
  })

  it('maps 0..100 onto floor..100', () => {
    expect(applyFloor(0, 60)).toBe(60)
    expect(applyFloor(50, 60)).toBe(80)
    expect(applyFloor(100, 60)).toBe(100)
  })

  it('reproduces the college convention (raw/max)*40 + 60', () => {
    // 134 of 158, the first hands-on column of the real class record.
    expect(applyFloor((134 / 158) * 100, 60)).toBeCloseTo(93.92405063291139, 10)
  })

  it('ignores a nonsensical floor rather than distorting the grade', () => {
    expect(applyFloor(42, 100)).toBe(42)
    expect(applyFloor(42, -10)).toBe(42)
    expect(applyFloor(42, Number.NaN)).toBe(42)
  })
})

describe('computeCategoryPercent with a scoring policy', () => {
  const acts = [activity('a1', 100), activity('a2', 100)]

  it('excludes ungraded work by default', () => {
    // 40 of 100 counted; a2 drops out of both sides.
    expect(computeCategoryPercent(acts, scores({ a1: 40, a2: null }), S)).toBe(40)
  })

  it('counts ungraded work as zero when asked to', () => {
    expect(
      computeCategoryPercent(acts, scores({ a1: 40, a2: null }), S, {
        ungradedAsZero: true,
      }),
    ).toBe(20)
  })

  it('reports the floor for a category with nothing entered, under ungradedAsZero', () => {
    // This is the spreadsheet behaviour the policy exists to reproduce: an exam
    // column that exists but has not been given yet contributes the floor.
    expect(
      computeCategoryPercent(acts, scores({ a1: null, a2: null }), S, {
        ungradedAsZero: true,
        floor: 60,
      }),
    ).toBe(60)
  })

  it('still reports "not started" for an untouched category by default', () => {
    expect(computeCategoryPercent(acts, scores({ a1: null, a2: null }), S)).toBeNull()
  })

  it('applies the floor after the ratio, not before', () => {
    expect(
      computeCategoryPercent(acts, scores({ a1: 50, a2: 50 }), S, { floor: 60 }),
    ).toBe(80)
  })

  it('leaves the existing suite untouched when policy is undefined', () => {
    expect(computeCategoryPercent(acts, scores({ a1: 40, a2: 45 }), S, undefined)).toBe(
      42.5,
    )
  })
})

describe('computeReportedFinalGrade', () => {
  const structure: GradebookStructure = {
    periods: [
      {
        id: 'p1',
        classroom_id: 'c',
        course_subject_id: 's',
        name: 'p1',
        weight: 1,
        position: 0,
        starts_on: null,
        ends_on: null,
      } satisfies GradingPeriod,
    ],
    components: [
      {
        id: 'comp',
        classroom_id: 'c',
        course_subject_id: 's',
        name: 'Overall',
        weight: 1,
        position: 0,
        created_at: '2026-01-01T00:00:00Z',
      } satisfies GradeComponentRecord,
    ],
    categories: [
      {
        id: 'cat',
        classroom_id: 'c',
        course_subject_id: 's',
        component: 'lecture',
        grading_period_id: 'p1',
        grade_component_id: 'comp',
        position: 0,
        name: 'cat',
        weight: 1,
      } satisfies ActivityCategory,
    ],
    activities: [activity('a1', 100)],
  }
  const map = scores({ a1: 88 })
  const table: TransmutationTable = [
    { minPercent: 0, maxPercent: 74.49, transmutedGrade: 5 },
    { minPercent: 74.5, maxPercent: 87.49, transmutedGrade: 2 },
    { minPercent: 87.5, maxPercent: 100, transmutedGrade: 1 },
  ]

  it('returns the raw percentage for a custom subject', () => {
    expect(
      computeReportedFinalGrade(structure, map, S, { gradingTemplate: 'custom' }),
    ).toBe(88)
  })

  it('returns the raw percentage when no config is supplied at all', () => {
    expect(computeReportedFinalGrade(structure, map, S)).toBe(88)
  })

  it('looks the blended final up in the table for higher_education', () => {
    expect(
      computeReportedFinalGrade(structure, map, S, {
        gradingTemplate: 'higher_education',
        table,
      }),
    ).toBe(1)
  })

  it('falls back to the built-in CHED formula when college has no table', () => {
    // Not the table above: the linear 75->3.00 / 100->1.00 rule.
    expect(
      computeReportedFinalGrade(structure, map, S, {
        gradingTemplate: 'higher_education',
      }),
    ).toBe(preciseChed(88))
  })

  it('transmutes per period for DepEd templates', () => {
    expect(
      computeReportedFinalGrade(structure, map, S, {
        gradingTemplate: 'basic_education',
        table,
      }),
    ).toBe(1)
  })

  it('falls back to the percentage when a DepEd subject has no table yet', () => {
    expect(
      computeReportedFinalGrade(structure, map, S, { gradingTemplate: 'senior_high' }),
    ).toBe(88)
  })

  it('honours the scoring policy through the reporting layer', () => {
    const floored: GradebookStructure = { ...structure, policy: { floor: 60 } }
    expect(
      computeReportedFinalGrade(floored, map, S, { gradingTemplate: 'custom' }),
    ).toBeCloseTo(95.2, 10)
    expect(computeConfiguredStudentGradebook(floored, map, S).final).toBeCloseTo(95.2, 10)
  })
})

/** The linear CHED rule, restated here so the test does not just re-run the
 *  implementation it is checking. */
function preciseChed(percent: number): number {
  const raw = 3 - ((percent - 75) / 25) * 2
  const snapped = Math.round(raw / 0.25) * 0.25
  return Math.round(snapped * 100) / 100
}

describe('remarks and class statistics', () => {
  it('judges on the percentage, never on a 1.00-5.00 equivalent', () => {
    // 1.25 would read as a fail if the threshold were applied to the converted
    // grade, since that scale runs the other way.
    expect(remarkFor(75, true)).toBe('PASSED')
    expect(remarkFor(74.99, true)).toBe('FAILED')
  })

  it('reports INCOMPLETE ahead of pass or fail', () => {
    expect(remarkFor(95, false)).toBe('INCOMPLETE')
    expect(remarkFor(10, false)).toBe('INCOMPLETE')
    expect(remarkFor(null, true)).toBe('INCOMPLETE')
  })

  it('accepts a different passing mark', () => {
    expect(remarkFor(60, true, 60)).toBe('PASSED')
    expect(remarkFor(59.9, true, 60)).toBe('FAILED')
  })

  it('tallies a mixed cohort', () => {
    const remarks: Remark[] = [
      'PASSED',
      'FAILED',
      'FAILED',
      'INCOMPLETE',
      'PASSED',
      'PASSED',
    ]
    expect(summarizeClass(remarks)).toEqual({
      count: 6,
      passed: 3,
      failed: 2,
      incomplete: 1,
    })
  })

  it('handles an empty class', () => {
    expect(summarizeClass([])).toEqual({
      count: 0,
      passed: 0,
      failed: 0,
      incomplete: 0,
    })
  })
})
