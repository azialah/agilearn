import { describe, expect, it } from 'vitest'
import { parsePostedGrades, termFromHeader } from './parsePostedGrades'
import { recordedGradeKey, recordedTermGrades } from './postedGradeSets'
import {
  gradeEmailText,
  normalizeEmailDomain,
  parseAddressList,
  studentAddress,
} from './gradeEmail'

const roster = [
  { id: 's1', student_no: '202110190', last_name: 'Neo', first_name: 'John' },
  { id: 's2', student_no: '202110191', last_name: 'Cruz', first_name: 'Ana' },
  { id: 's3', student_no: '', last_name: 'Reyes', first_name: 'Ben' },
]

const HEADER = [
  'Last Name',
  'First Name',
  'SchoolID',
  'Lecture',
  'Laboratory',
  'Midterm Grade',
]

describe('parsePostedGrades', () => {
  it('reads the standard layout and matches by school id', () => {
    const result = parsePostedGrades(
      [HEADER, ['Neo', 'John', '202110190', '88', '92', '90.4']],
      roster,
    )
    expect(result.errors).toEqual([])
    expect(result.gradeHeader).toBe('Midterm Grade')
    expect(result.rows[0]).toMatchObject({
      row: 2,
      studentId: 's1',
      matchedBy: 'studentNo',
      lecture: 88,
      laboratory: 92,
      termGrade: 90.4,
      termGradeComputed: false,
      mismatch: false,
      status: 'matched',
    })
  })

  it('finds the header below a title block, in any column order', () => {
    const result = parsePostedGrades(
      [
        ['Physics 1 — Midterm'],
        [],
        ['SchoolID', 'Lecture', 'Laboratory', 'Last Name', 'First Name'],
        ['202110191', '80', '90', 'Cruz', 'Ana'],
      ],
      roster,
    )
    expect(result.rows[0]).toMatchObject({ row: 4, studentId: 's2' })
  })

  it('computes a blank term grade as lecture × 40% + laboratory × 60%', () => {
    const result = parsePostedGrades(
      [HEADER, ['Neo', 'John', '202110190', '85.5', '90.25', '']],
      roster,
    )
    expect(result.rows[0]).toMatchObject({ termGrade: 88.35, termGradeComputed: true })
  })

  it('flags a term grade that is not the average', () => {
    const result = parsePostedGrades(
      [HEADER, ['Neo', 'John', '202110190', '88', '92', '85']],
      roster,
    )
    expect(result.rows[0]).toMatchObject({ mismatch: true, status: 'matched' })
  })

  it('falls back to the name, and reports unknown students', () => {
    const result = parsePostedGrades(
      [
        HEADER,
        ['Reyes', 'Ben', '', '70', '80', ''],
        ['Doe', 'Jane', '999', '70', '80', ''],
      ],
      roster,
    )
    expect(result.rows[0]).toMatchObject({ studentId: 's3', matchedBy: 'name' })
    expect(result.rows[1]).toMatchObject({ studentId: null, status: 'unmatched' })
  })

  it('rejects out-of-range values, text and duplicates', () => {
    const result = parsePostedGrades(
      [
        HEADER,
        ['Neo', 'John', '202110190', '101', '92', ''],
        ['Cruz', 'Ana', '202110191', 'abc', '92', ''],
        ['Cruz', 'Ana', '202110191', '80', '92', ''],
      ],
      roster,
    )
    expect(result.rows[0].errors).toEqual(['Lecture must be between 0 and 100'])
    expect(result.rows[1].errors).toEqual(['Lecture is not a number'])
    expect(result.rows[2].errors).toEqual([
      'Duplicate — this student already appears above',
    ])
    expect(result.rows.every((row) => row.status === 'error')).toBe(true)
  })

  it('skips blank rows and reports a missing header', () => {
    expect(parsePostedGrades([HEADER, ['', '', '', '', '', '']], roster).rows).toEqual([])
    expect(parsePostedGrades([['Hello']], roster).errors).toHaveLength(1)
  })
})

describe('termFromHeader', () => {
  it('derives the term from the grade column header', () => {
    expect(termFromHeader('Midterm Grade')).toBe('Midterm')
    expect(termFromHeader('Finals')).toBe('Finals')
    expect(termFromHeader('Grade')).toBe('Midterm')
    expect(termFromHeader(null, 'Prelim')).toBe('Prelim')
  })
})

describe('grade email helpers', () => {
  it('normalizes the domain the teacher types', () => {
    expect(normalizeEmailDomain(' @GordonCollege.edu.ph ')).toBe('gordoncollege.edu.ph')
    expect(normalizeEmailDomain('not a domain')).toBeNull()
    expect(normalizeEmailDomain('@')).toBeNull()
  })

  it('builds the student address from the school id', () => {
    expect(studentAddress('202110190', 'gordoncollege.edu.ph')).toBe(
      '202110190@gordoncollege.edu.ph',
    )
    expect(studentAddress('', 'gordoncollege.edu.ph')).toBeNull()
    expect(studentAddress('202110190', null)).toBeNull()
    expect(studentAddress('20 21', 'gordoncollege.edu.ph')).toBeNull()
  })

  it('parses CC/BCC lists', () => {
    expect(parseAddressList('Me@School.edu, me@school.edu; x')).toEqual({
      addresses: ['me@school.edu'],
      invalid: ['x'],
      tooMany: false,
    })
    expect(parseAddressList('a@b.co c@d.co e@f.co g@h.co').tooMany).toBe(true)
  })

  it('renders the email body', () => {
    const body = gradeEmailText({
      studentName: 'John Neo',
      subjectName: 'Physics 1',
      subjectCode: 'PHY101',
      term: 'Midterm',
      lecture: 88,
      laboratory: 92,
      termGrade: 90,
      teacherName: 'Maria Santos',
    })
    expect(body).toContain('Hi John Neo,')
    expect(body).toContain('grade breakdown for Physics 1 PHY101:')
    expect(body).toContain('Lecture - 88.00')
    expect(body).toContain('Midterm Grade - 90.00')
    expect(body.endsWith('Maria Santos')).toBe(true)
  })
})

describe('parsePostedGrades with the exported class-record sheet', () => {
  it('reads the title block, band row, Name column and GRADE LEC / LAB headers', () => {
    const result = parsePostedGrades(
      [
        ['45635 CSE317', '', '', '', '', ''],
        ['CS Elective 1', '', '', '', '', ''],
        ['Mon 10AM-12PM · BSCS 3B', '', '', '', '', ''],
        ['', '', '', 'MIDTERM', '', ''],
        [
          '#',
          'Name',
          'Student No.',
          'MIDTERM GRADE LEC (40%)',
          'MIDTERM GRADE LAB (60%)',
          'MIDTERM GRADE',
        ],
        ['1', 'NEO, JOHN P.', '202110190', '92', '94', '94'],
      ],
      roster,
    )
    expect(result.errors).toEqual([])
    expect(termFromHeader(result.gradeHeader)).toBe('Midterm')
    expect(result.rows[0]).toMatchObject({
      row: 6,
      lastName: 'NEO',
      firstName: 'JOHN',
      studentId: 's1',
      matchedBy: 'studentNo',
      lecture: 92,
      laboratory: 94,
      // Kept as the teacher computed it, not recomputed from the rounded halves.
      termGrade: 94,
      mismatch: false,
      status: 'matched',
    })
  })
})

describe('recordedTermGrades', () => {
  const row = (
    subject: string,
    student: string,
    term: string,
    grade: number | null,
    at: string,
  ) => ({
    id: `${subject}-${student}-${term}`,
    classroom_id: 'r',
    course_subject_id: subject,
    student_id: student,
    term,
    lecture: null,
    laboratory: null,
    term_grade: grade,
    created_at: at,
    updated_at: at,
  })

  it('keys recorded grades by student and period, newest first, for the given subjects', () => {
    const map = recordedTermGrades(
      [
        row('lec', 's1', 'Midterm', 93, '2026-10-01'),
        row('lab', 's1', 'MIDTERM', 94, '2026-10-02'),
        row('other', 's2', 'Midterm', 80, '2026-10-03'),
        row('lec', 's3', 'Midterm', null, '2026-10-03'),
      ],
      ['lec', 'lab'],
    )
    expect(map.get(recordedGradeKey('s1', 'Midterm'))).toBe(94)
    expect(map.has(recordedGradeKey('s2', 'Midterm'))).toBe(false)
    expect(map.has(recordedGradeKey('s3', 'Midterm'))).toBe(false)
  })
})
