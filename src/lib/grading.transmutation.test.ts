import { describe, it, expect } from 'vitest'
import {
  computeConfiguredPeriodFinalGrade,
  computeTransmutedPeriodGrade,
  computeTransmutedStudentGradebook,
  hasValidTransmutationTable,
  transmuteGrade,
  type GradebookStructure,
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

function period(id: string, weight = 1, position = 0): GradingPeriod {
  return {
    id,
    classroom_id: 'c',
    course_subject_id: 'subject-1',
    name: id,
    weight,
    position,
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

/** Small 3-band table for the pure conversion tests. */
const SIMPLE_TABLE: TransmutationTable = [
  { minPercent: 0, maxPercent: 59.99, transmutedGrade: 60 },
  { minPercent: 60, maxPercent: 74.99, transmutedGrade: 74 },
  { minPercent: 75, maxPercent: 100, transmutedGrade: 90 },
]

describe('hasValidTransmutationTable', () => {
  it('accepts a non-overlapping table with gaps allowed', () => {
    expect(hasValidTransmutationTable(SIMPLE_TABLE)).toBe(true)
  })

  it('rejects an empty table', () => {
    expect(hasValidTransmutationTable([])).toBe(false)
  })

  it('rejects overlapping bands', () => {
    expect(
      hasValidTransmutationTable([
        { minPercent: 0, maxPercent: 60, transmutedGrade: 60 },
        { minPercent: 50, maxPercent: 100, transmutedGrade: 90 },
      ]),
    ).toBe(false)
  })

  it('rejects a band with min > max or out-of-range bounds', () => {
    expect(
      hasValidTransmutationTable([
        { minPercent: 60, maxPercent: 50, transmutedGrade: 70 },
      ]),
    ).toBe(false)
    expect(
      hasValidTransmutationTable([
        { minPercent: -1, maxPercent: 50, transmutedGrade: 70 },
      ]),
    ).toBe(false)
    expect(
      hasValidTransmutationTable([
        { minPercent: 0, maxPercent: 101, transmutedGrade: 70 },
      ]),
    ).toBe(false)
  })
})

describe('transmuteGrade', () => {
  it('resolves a percentage sitting exactly on a shared band boundary to exactly one band', () => {
    // 60 is SIMPLE_TABLE's boundary between the first and second band.
    expect(transmuteGrade(59.99, SIMPLE_TABLE)).toBe(60)
    expect(transmuteGrade(60, SIMPLE_TABLE)).toBe(74)
    expect(transmuteGrade(74.99, SIMPLE_TABLE)).toBe(74)
    expect(transmuteGrade(75, SIMPLE_TABLE)).toBe(90)
  })

  it('returns null for a percentage below the lowest band', () => {
    const gapped: TransmutationTable = [
      { minPercent: 50, maxPercent: 100, transmutedGrade: 90 },
    ]
    expect(transmuteGrade(10, gapped)).toBeNull()
  })

  it('propagates a null percent as null', () => {
    expect(transmuteGrade(null, SIMPLE_TABLE)).toBeNull()
  })

  it('returns null for a malformed (overlapping) table regardless of percent', () => {
    const malformed: TransmutationTable = [
      { minPercent: 0, maxPercent: 60, transmutedGrade: 60 },
      { minPercent: 50, maxPercent: 100, transmutedGrade: 90 },
    ]
    expect(transmuteGrade(80, malformed)).toBeNull()
  })
})

describe('computeTransmutedPeriodGrade', () => {
  const structure: GradebookStructure = {
    periods: [period('p1')],
    components: [component('comp', 'Overall', 1)],
    categories: [category('cat', 'comp', 'p1', 1)],
    activities: [activity('a1', 'p1', 'cat', 100)],
  }

  it('transmutes a period whose weight sum is not exactly 1 as null (upstream null propagates)', () => {
    const brokenStructure: GradebookStructure = {
      ...structure,
      categories: [category('cat', 'comp', 'p1', 0.5)], // does not sum to 1
    }
    expect(
      computeConfiguredPeriodFinalGrade(brokenStructure, scores({ a1: 80 }), S, 'p1'),
    ).toBeNull()
    expect(
      computeTransmutedPeriodGrade(
        brokenStructure,
        scores({ a1: 80 }),
        S,
        'p1',
        SIMPLE_TABLE,
      ),
    ).toBeNull()
  })

  it('transmutes a complete period through the table', () => {
    expect(
      computeTransmutedPeriodGrade(structure, scores({ a1: 80 }), S, 'p1', SIMPLE_TABLE),
    ).toBe(90)
  })
})

describe('computeTransmutedStudentGradebook', () => {
  it('transmutes each period independently before averaging (not the blended percentage)', () => {
    // Two periods: 74% and 76% (straddling SIMPLE_TABLE's 75 boundary) average to 75%
    // raw, but must transmute per-period (74 -> 74, 76 -> 90), not as one blended 75 -> 90.
    const structure: GradebookStructure = {
      periods: [period('p1', 0.5), period('p2', 0.5)],
      components: [component('comp', 'Overall', 1)],
      categories: [category('cat1', 'comp', 'p1', 1), category('cat2', 'comp', 'p2', 1)],
      activities: [activity('a1', 'p1', 'cat1', 100), activity('a2', 'p2', 'cat2', 100)],
    }
    const result = computeTransmutedStudentGradebook(
      structure,
      scores({ a1: 74, a2: 76 }),
      S,
      SIMPLE_TABLE,
    )
    expect(result.perPeriod.p1).toBe(74)
    expect(result.perPeriod.p2).toBe(90)
    // General Average of already-transmuted quarters: (74*0.5 + 90*0.5) = 82.
    expect(result.final).toBe(82)
  })
})
