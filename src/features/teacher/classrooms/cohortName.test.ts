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
