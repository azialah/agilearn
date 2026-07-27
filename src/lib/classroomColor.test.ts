import { describe, expect, it } from 'vitest'
import { CLASSROOM_COLORS, classroomColor } from './classroomColor'

describe('classroomColor', () => {
  it('uses the stored colour when the teacher picked one', () => {
    expect(classroomColor({ id: 'abc', color: 'teal' })).toBe('teal')
  })

  it('falls back to a palette colour for null or unknown values', () => {
    expect(CLASSROOM_COLORS).toContain(classroomColor({ id: 'abc', color: null }))
    expect(CLASSROOM_COLORS).toContain(classroomColor({ id: 'abc', color: 'chartreuse' }))
  })

  it('is stable for the same id', () => {
    const id = 'cb859c8c-28a3-456b-9e25-2d3dad7b0e0d'
    expect(classroomColor({ id })).toBe(classroomColor({ id }))
  })

  it('spreads ids across the palette', () => {
    const seen = new Set(
      Array.from({ length: 60 }, (_, i) => classroomColor({ id: `classroom-${i}` })),
    )
    expect(seen.size).toBeGreaterThan(3)
  })
})
