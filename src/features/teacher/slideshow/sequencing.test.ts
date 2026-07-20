import { describe, expect, it } from 'vitest'
import { buildSlides, slideAt, slideCounter, wrapIndex, type Slide } from './sequencing'

describe('buildSlides', () => {
  it('produces two slides per student in breakdown-then-average order', () => {
    expect(buildSlides(2)).toEqual<Slide[]>([
      { studentIndex: 0, kind: 'breakdown' },
      { studentIndex: 0, kind: 'average' },
      { studentIndex: 1, kind: 'breakdown' },
      { studentIndex: 1, kind: 'average' },
    ])
  })

  it('returns an empty list for an empty roster', () => {
    expect(buildSlides(0)).toEqual([])
  })

  it('ignores negative or fractional counts', () => {
    expect(buildSlides(-3)).toEqual([])
    expect(buildSlides(1.9)).toHaveLength(2)
  })
})

describe('wrapIndex', () => {
  it('wraps overflow forward', () => {
    expect(wrapIndex(4, 4)).toBe(0)
    expect(wrapIndex(5, 4)).toBe(1)
  })

  it('wraps negatives backward', () => {
    expect(wrapIndex(-1, 4)).toBe(3)
    expect(wrapIndex(-5, 4)).toBe(3)
  })

  it('is safe when there are no slides', () => {
    expect(wrapIndex(2, 0)).toBe(0)
  })
})

describe('slideCounter', () => {
  it('labels breakdown and average slides for the right student', () => {
    // 3 students -> 6 slides.
    expect(slideCounter(0, 6)).toEqual({
      studentNumber: 1,
      totalStudents: 3,
      kindLabel: 'Grade Breakdown',
    })
    expect(slideCounter(1, 6)).toEqual({
      studentNumber: 1,
      totalStudents: 3,
      kindLabel: 'Final Average',
    })
    expect(slideCounter(5, 6)).toEqual({
      studentNumber: 3,
      totalStudents: 3,
      kindLabel: 'Final Average',
    })
  })

  it('wraps out-of-range indices', () => {
    expect(slideCounter(6, 6).studentNumber).toBe(1)
    expect(slideCounter(-1, 6)).toEqual({
      studentNumber: 3,
      totalStudents: 3,
      kindLabel: 'Final Average',
    })
  })

  it('degrades gracefully with no slides', () => {
    expect(slideCounter(0, 0)).toEqual({
      studentNumber: 0,
      totalStudents: 0,
      kindLabel: 'Grade Breakdown',
    })
  })
})

describe('slideAt', () => {
  it('maps indices back to student + kind', () => {
    expect(slideAt(0, 6)).toEqual({ studentIndex: 0, kind: 'breakdown' })
    expect(slideAt(3, 6)).toEqual({ studentIndex: 1, kind: 'average' })
    expect(slideAt(7, 6)).toEqual({ studentIndex: 0, kind: 'average' })
  })
})
