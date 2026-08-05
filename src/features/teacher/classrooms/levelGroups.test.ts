import { describe, expect, it } from 'vitest'
import { composeCohortName, LEVEL_GROUPS, LEVELS } from './ClassroomFormDialog'

describe('LEVEL_GROUPS.high_school', () => {
  const groups = LEVEL_GROUPS.high_school ?? []

  it('covers every grade in LEVELS.high_school exactly once', () => {
    const grouped = groups.flatMap((group) => group.options)
    expect(grouped).toEqual(LEVELS.high_school)
  })

  it('splits Junior High (7-10) from Senior High (11-12)', () => {
    expect(groups).toEqual([
      {
        label: 'Junior High (Grade 7–10)',
        options: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
      },
      { label: 'Senior High (Grade 11–12)', options: ['Grade 11', 'Grade 12'] },
    ])
  })
})

describe('LEVEL_GROUPS does not affect other levels', () => {
  it('leaves preschool, elementary and college ungrouped', () => {
    expect(LEVEL_GROUPS.preschool).toBeUndefined()
    expect(LEVEL_GROUPS.elementary).toBeUndefined()
    expect(LEVEL_GROUPS.college).toBeUndefined()
  })

  it('does not change what composeCohortName derives for a grouped grade', () => {
    expect(
      composeCohortName({
        schoolLevel: 'high_school',
        course: '',
        year: 'Grade 11',
        block: 'STEM-A',
      }),
    ).toBe('Grade 11 — STEM-A')
  })
})
