import { describe, expect, it } from 'vitest'
import { composeCohortName } from './ClassroomFormDialog'

describe('composeCohortName', () => {
  it('folds a college course, year and block into "BSCS 3B"', () => {
    expect(
      composeCohortName({
        schoolLevel: 'college',
        course: 'BSCS',
        year: '3rd year',
        block: 'B',
      }),
    ).toBe('BSCS 3B')
  })

  it('drops the block when there is none', () => {
    expect(
      composeCohortName({
        schoolLevel: 'college',
        course: 'BSIT',
        year: '1st year',
        block: '',
      }),
    ).toBe('BSIT 1')
  })

  it('keeps basic-education wording', () => {
    expect(
      composeCohortName({
        schoolLevel: 'elementary',
        course: '',
        year: 'Grade 5',
        block: 'Rizal',
      }),
    ).toBe('Grade 5 — Rizal')
  })
})

describe('composeCohortName without a course', () => {
  // Editing an existing college classroom starts with `course` empty, because
  // the course is not stored on the classroom row. Deriving from year alone
  // renamed a real classroom to "3".
  it('derives nothing for college until a course is chosen', () => {
    expect(
      composeCohortName({
        schoolLevel: 'college',
        course: '',
        year: '3rd year',
        block: 'B',
      }),
    ).toBe('')
  })

  it('still derives basic-education names from the grade alone', () => {
    expect(
      composeCohortName({
        schoolLevel: 'elementary',
        course: '',
        year: 'Grade 5',
        block: '',
      }),
    ).toBe('Grade 5')
  })
})
