import { describe, it, expect } from 'vitest'
import {
  computeCategoryPercent,
  computeComponentGrade,
  computeFinalGrade,
  computePeriodComponentGrade,
  computeStudentGradebook,
  round2,
  type GradebookStructure,
  type ScoreMap,
} from './grading'
import type { Activity, ActivityCategory, GradingPeriod } from '@/types/domain'

const S = 'student-1'

function period(id: string, weight = 1, position = 0): GradingPeriod {
  return { id, classroom_id: 'c', name: id, weight, position }
}

function category(
  id: string,
  component: 'lecture' | 'laboratory',
  weight: number,
): ActivityCategory {
  return { id, classroom_id: 'c', component, name: id, weight }
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

describe('round2', () => {
  it('rounds half-up at two decimals', () => {
    expect(round2(86.125)).toBe(86.13)
    expect(round2(86.124)).toBe(86.12)
    expect(round2(86.126)).toBe(86.13)
    expect(round2(86)).toBe(86)
  })
})

describe('computeFinalGrade', () => {
  it('matches legacy parity: lecture 80, lab 90 at 40/60 -> 86', () => {
    expect(computeFinalGrade(80, 90, 0.4, 0.6)).toBe(86)
  })

  it('defaults to 40/60 weights', () => {
    expect(computeFinalGrade(80, 90)).toBe(86)
  })

  it('returns null when either component is missing', () => {
    expect(computeFinalGrade(null, 90)).toBeNull()
    expect(computeFinalGrade(80, null)).toBeNull()
    expect(computeFinalGrade(null, null)).toBeNull()
  })

  it('supports non 40/60 weights', () => {
    expect(computeFinalGrade(80, 90, 0.5, 0.5)).toBe(85)
    expect(computeFinalGrade(70, 100, 0.7, 0.3)).toBe(79)
  })
})

describe('computeCategoryPercent', () => {
  it('sums earned / possible only over graded activities', () => {
    const acts = [activity('a1', 'p', 'cat', 50), activity('a2', 'p', 'cat', 50)]
    const pct = computeCategoryPercent(acts, scores({ a1: 40, a2: 45 }), S)
    expect(pct).toBe(85)
  })

  it('excludes ungraded activities from the denominator', () => {
    const acts = [activity('a1', 'p', 'cat', 50), activity('a2', 'p', 'cat', 50)]
    // only a1 graded: 40/50 = 80%
    const pct = computeCategoryPercent(acts, scores({ a1: 40, a2: null }), S)
    expect(pct).toBe(80)
  })

  it('returns null when nothing is graded', () => {
    const acts = [activity('a1', 'p', 'cat', 50)]
    expect(computeCategoryPercent(acts, scores({ a1: null }), S)).toBeNull()
    expect(computeCategoryPercent(acts, {}, S)).toBeNull()
  })
})

describe('computePeriodComponentGrade renormalization', () => {
  const structure: GradebookStructure = {
    periods: [period('p1')],
    categories: [category('quiz', 'lecture', 0.4), category('exam', 'lecture', 0.6)],
    activities: [activity('q1', 'p1', 'quiz', 100), activity('e1', 'p1', 'exam', 100)],
  }

  it('weights categories when both are graded', () => {
    const grade = computePeriodComponentGrade(
      structure,
      scores({ q1: 90, e1: 80 }),
      S,
      'p1',
      'lecture',
    )
    // 90*0.4 + 80*0.6 = 84
    expect(grade).toBe(84)
  })

  it('renormalizes when a category has no graded work', () => {
    const grade = computePeriodComponentGrade(
      structure,
      scores({ q1: 90, e1: null }),
      S,
      'p1',
      'lecture',
    )
    // only quiz graded -> 90 regardless of its 0.4 weight
    expect(grade).toBe(90)
  })

  it('returns null with no graded categories', () => {
    const grade = computePeriodComponentGrade(
      structure,
      scores({ q1: null, e1: null }),
      S,
      'p1',
      'lecture',
    )
    expect(grade).toBeNull()
  })
})

describe('computeComponentGrade renormalization across periods', () => {
  const structure: GradebookStructure = {
    periods: [period('p1', 0.5), period('p2', 0.5)],
    categories: [category('quiz', 'lecture', 1)],
    activities: [activity('q1', 'p1', 'quiz', 100), activity('q2', 'p2', 'quiz', 100)],
  }

  it('weights periods when both graded', () => {
    const grade = computeComponentGrade(
      structure,
      scores({ q1: 80, q2: 100 }),
      S,
      'lecture',
    )
    expect(grade).toBe(90)
  })

  it('renormalizes when a period has no graded work', () => {
    const grade = computeComponentGrade(
      structure,
      scores({ q1: 80, q2: null }),
      S,
      'lecture',
    )
    expect(grade).toBe(80)
  })
})

describe('empty structures', () => {
  const empty: GradebookStructure = { periods: [], categories: [], activities: [] }

  it('returns null component grades', () => {
    expect(computeComponentGrade(empty, {}, S, 'lecture')).toBeNull()
    expect(computeComponentGrade(empty, {}, S, 'laboratory')).toBeNull()
  })

  it('produces a null final in the full gradebook', () => {
    const book = computeStudentGradebook(empty, {}, S)
    expect(book.lecture).toBeNull()
    expect(book.laboratory).toBeNull()
    expect(book.final).toBeNull()
    expect(book.perPeriod).toEqual({})
  })
})

describe('computeStudentGradebook end to end', () => {
  const structure: GradebookStructure = {
    periods: [period('p1', 1)],
    categories: [
      category('lec-quiz', 'lecture', 1),
      category('lab-quiz', 'laboratory', 1),
    ],
    activities: [
      activity('lq', 'p1', 'lec-quiz', 100),
      activity('bq', 'p1', 'lab-quiz', 100),
    ],
  }

  it('produces legacy-parity final grade (lecture 80, lab 90 -> 86)', () => {
    const book = computeStudentGradebook(structure, scores({ lq: 80, bq: 90 }), S)
    expect(book.lecture).toBe(80)
    expect(book.laboratory).toBe(90)
    expect(book.final).toBe(86)
    expect(book.perPeriod['p1']).toEqual({ lecture: 80, laboratory: 90 })
  })

  it('honors custom component weights', () => {
    const book = computeStudentGradebook(structure, scores({ lq: 80, bq: 90 }), S, {
      lecture: 0.5,
      laboratory: 0.5,
    })
    expect(book.final).toBe(85)
  })

  it('null final when a whole component is ungraded', () => {
    const book = computeStudentGradebook(structure, scores({ lq: 80, bq: null }), S)
    expect(book.lecture).toBe(80)
    expect(book.laboratory).toBeNull()
    expect(book.final).toBeNull()
  })
})
