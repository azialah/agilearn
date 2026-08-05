import { describe, expect, it } from 'vitest'
import { buildFilename, parseRosterRows, slugifyCode } from './parsing'

describe('parseRosterRows', () => {
  it('maps an Excel class record with Student ID and last-name-first learner names', () => {
    const result = parseRosterRows([
      ['Class record', '', ''],
      ['Student Name', 'Quiz 1', 'Student ID'],
      ['Santos, Maria', 18, '2024-0001'],
    ])

    expect(result.counts.new).toBe(1)
    expect(result.rows[0]).toMatchObject({
      studentNo: '2024-0001',
      lastName: 'Santos',
      firstName: 'Maria',
    })
  })

  it('skips the header and notes rows of the legacy template', () => {
    const matrix = [
      ['Student No', 'Last Name', 'First Name', 'MI'],
      ['e.g. 2021-00123', 'e.g. Dela Cruz', 'e.g. Juan', 'e.g. R'],
      ['2021-0001', 'Reyes', 'Ana', 'B'],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      studentNo: '2021-0001',
      lastName: 'Reyes',
      firstName: 'Ana',
      middleInitial: 'B',
      status: 'new',
      rowNumber: 3,
    })
    expect(result.counts).toEqual({ new: 1, duplicate: 0, invalid: 0, skipped: 0 })
  })

  it('drops legacy example rows (dela cruz / e.g.) as skipped', () => {
    const matrix = [
      ['student_id', 'last_name', 'first_name', 'middle_initial'],
      ['e.g. 2021-00123', 'e.g. Dela Cruz', 'e.g. Juan', 'e.g. R'],
      ['2020-9', 'Dela Cruz', 'Pedro', ''],
      ['e.g. x', 'Santos', 'Mika', ''],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.counts.skipped).toBe(2)
    expect(result.rows).toHaveLength(0)
  })

  it('parses a bare data-only sheet with no header', () => {
    const matrix = [['2021-0002', 'Cruz', 'Ben', '']]
    const result = parseRosterRows(matrix, [])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].status).toBe('new')
    expect(result.rows[0].rowNumber).toBe(1)
  })

  it('marks rows missing a name as invalid with a reason', () => {
    const matrix = [
      ['2021-1', '', 'OnlyFirst', ''],
      ['2021-2', 'OnlyLast', '', ''],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.counts.invalid).toBe(2)
    expect(result.rows[0].reason).toMatch(/last name/i)
    expect(result.rows[1].reason).toMatch(/first name/i)
  })

  it('flags student numbers already in the classroom as duplicates', () => {
    const matrix = [['2021-0001', 'Reyes', 'Ana', 'B']]
    const result = parseRosterRows(matrix, ['2021-0001'])
    expect(result.rows[0].status).toBe('duplicate')
    expect(result.rows[0].reason).toMatch(/already/i)
    expect(result.counts.duplicate).toBe(1)
  })

  it('is case-insensitive when matching existing student numbers', () => {
    const matrix = [['abc-1', 'Reyes', 'Ana', '']]
    const result = parseRosterRows(matrix, ['ABC-1'])
    expect(result.rows[0].status).toBe('duplicate')
  })

  it('flags repeated student numbers within the same file', () => {
    const matrix = [
      ['2021-5', 'Lim', 'Joy', ''],
      ['2021-5', 'Lim', 'Joy', ''],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.rows[0].status).toBe('new')
    expect(result.rows[1].status).toBe('duplicate')
    expect(result.rows[1].reason).toMatch(/file/i)
  })

  it('ignores fully blank rows without counting them', () => {
    const matrix = [
      ['2021-1', 'Reyes', 'Ana', ''],
      ['', '', '', ''],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.rows).toHaveLength(1)
    expect(result.counts).toEqual({ new: 1, duplicate: 0, invalid: 0, skipped: 0 })
  })

  it('reads only the first four columns of a wide legacy file', () => {
    const matrix = [
      ['student_id', 'last_name', 'first_name', 'mi', 'course', 'year'],
      ['2021-7', 'Tan', 'Ivy', 'C', 'BSIT', '3rd'],
    ]
    const result = parseRosterRows(matrix, [])
    expect(result.rows[0]).toMatchObject({
      studentNo: '2021-7',
      lastName: 'Tan',
      firstName: 'Ivy',
      middleInitial: 'C',
      status: 'new',
    })
  })

  it('coerces non-string cell values to trimmed text', () => {
    const matrix = [[2021, '  Reyes ', 'Ana', null]]
    const result = parseRosterRows(matrix, [])
    expect(result.rows[0]).toMatchObject({
      studentNo: '2021',
      lastName: 'Reyes',
      firstName: 'Ana',
      middleInitial: '',
    })
  })
})

describe('slugifyCode', () => {
  it('normalizes a course code into a filename-safe slug', () => {
    expect(slugifyCode('IT 101')).toBe('it-101')
    expect(slugifyCode('CS/202-A')).toBe('cs-202-a')
  })

  it('falls back to "classroom" for empty or symbol-only input', () => {
    expect(slugifyCode('')).toBe('classroom')
    expect(slugifyCode('   ')).toBe('classroom')
    expect(slugifyCode('***')).toBe('classroom')
    expect(slugifyCode(null)).toBe('classroom')
  })
})

describe('buildFilename', () => {
  it('builds names per export kind', () => {
    expect(buildFilename('IT 101', 'roster-template')).toBe('it-101-roster-template.xlsx')
    expect(buildFilename('IT 101', 'grade-sheet')).toBe('it-101-grade-sheet.xlsx')
    expect(buildFilename('IT 101', 'grade-report')).toBe('it-101-grade-report.pdf')
  })

  it('uses the fallback slug when no code is present', () => {
    expect(buildFilename(undefined, 'grade-sheet')).toBe('classroom-grade-sheet.xlsx')
  })
})

describe('middle name normalisation', () => {
  it('stores a full middle name as its initial', () => {
    const result = parseRosterRows([['202110190', 'Lopez', 'John Neo', 'Manuel']])
    expect(result.rows[0].middleInitial).toBe('M')
  })
})
