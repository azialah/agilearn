import { describe, expect, it } from 'vitest'
import {
  detectClassRecord,
  maxFromHeader,
  periodFromSheetName,
  splitFullName,
  suggestedMapping,
  tidyLabel,
  weightFromLabel,
  type SheetMatrix,
} from './classRecord'

/** E-Class-Record-shaped sheet: banner rows, merged bands (already filled, as
 *  readWorkbookSheets does), an HPS row, MALE/FEMALE markers and computed
 *  Total / PS / WS / grade columns that must never be imported. */
const DEPED_Q1: SheetMatrix = {
  name: 'Q1',
  rows: [
    ['REGION IV-A', '', '', '', '', '', '', '', '', '', ''],
    ['SCHOOL NAME: Sample National High School', '', '', '', '', '', '', '', '', '', ''],
    [],
    [
      '#',
      "LEARNERS' NAMES",
      'WRITTEN WORKS (30%)',
      'WRITTEN WORKS (30%)',
      'WRITTEN WORKS (30%)',
      'WRITTEN WORKS (30%)',
      'PERFORMANCE TASKS (50%)',
      'PERFORMANCE TASKS (50%)',
      'QUARTERLY ASSESSMENT (20%)',
      'Initial Grade',
      'Quarterly Grade',
    ],
    [
      '#',
      "LEARNERS' NAMES",
      '1',
      '2',
      'Total',
      'PS',
      '1',
      '2',
      '1',
      'Initial Grade',
      'Quarterly Grade',
    ],
    ['', 'HIGHEST POSSIBLE SCORE', '20', '25', '45', '100', '50', '50', '40', '', ''],
    ['', 'MALE', '', '', '', '', '', '', '', '', ''],
    [
      '1',
      'DELA CRUZ, JUAN A.',
      '18',
      '20',
      '38',
      '84.44',
      '45',
      '40',
      '35',
      '86.5',
      '91',
    ],
    ['2', 'REYES, PEDRO', '15', '', '15', '33.3', '40', '42', 'ABS', '70.1', '82'],
    ['', 'FEMALE', '', '', '', '', '', '', '', '', ''],
    [
      '3',
      'SANTOS, MARIA CLARA B.',
      '20',
      '25',
      '45',
      '100',
      '50',
      '48',
      '39',
      '98.2',
      '99',
    ],
    [],
    ['', 'Prepared by:', '', '', '', '', '', '', '', '', ''],
  ],
}

describe('detectClassRecord — DepEd-style class record', () => {
  const [sheet] = detectClassRecord([DEPED_Q1])

  it('finds the learner header, the period and only real learners', () => {
    expect(sheet.include).toBe(true)
    expect(sheet.headerRowNumber).toBe(4)
    expect(sheet.period).toBe('Quarter 1')
    expect(sheet.rows.map((row) => row.rowNumber)).toEqual([8, 9, 11])
  })

  it('suggests activities under their band with the HPS max', () => {
    const activities = sheet.columns.filter((c) => c.suggested.role === 'activity')
    expect(activities.map((c) => c.suggested)).toEqual([
      {
        role: 'activity',
        period: '',
        category: 'Written Works',
        name: 'Written Works 1',
        maxScore: 20,
      },
      {
        role: 'activity',
        period: '',
        category: 'Written Works',
        name: 'Written Works 2',
        maxScore: 25,
      },
      {
        role: 'activity',
        period: '',
        category: 'Performance Tasks',
        name: 'Performance Tasks 1',
        maxScore: 50,
      },
      {
        role: 'activity',
        period: '',
        category: 'Performance Tasks',
        name: 'Performance Tasks 2',
        maxScore: 50,
      },
      {
        role: 'activity',
        period: '',
        category: 'Quarterly Assessment',
        name: 'Quarterly Assessment 1',
        maxScore: 40,
      },
    ])
    expect(activities[0].categoryWeight).toBeCloseTo(0.3)
    expect(activities[2].categoryWeight).toBeCloseTo(0.5)
  })

  it('never suggests importing computed columns', () => {
    const ignored = sheet.columns.filter((c) => c.suggested.role === 'ignore')
    const headers = ignored.map((c) => c.header)
    expect(headers).toEqual(
      expect.arrayContaining([
        'WRITTEN WORKS (30%) › Total',
        'WRITTEN WORKS (30%) › PS',
        'Initial Grade',
        'Quarterly Grade',
      ]),
    )
    expect(sheet.columns.find((c) => c.header === '#')?.suggested.role).toBe('ignore')
  })

  it('maps the learner name column', () => {
    expect(sheet.columns.find((c) => c.index === 1)?.suggested).toEqual({
      role: 'fullName',
    })
  })
})

describe('detectClassRecord — other layouts', () => {
  it('reads a plain sheet with the max score in the header', () => {
    const [sheet] = detectClassRecord(
      [
        {
          name: 'Sheet1',
          rows: [
            [
              'Student No',
              'Last Name',
              'First Name',
              'Quiz 1 (20)',
              'Exam /50',
              'Average',
            ],
            ['2024-001', 'Lopez', 'Ana', '18', '44', '88.5'],
            ['2024-002', 'Cruz', 'Ben', '12', '', '60'],
          ],
        },
      ],
      { defaultPeriod: 'Midterm' },
    )
    expect(sheet.period).toBe('Midterm')
    expect(sheet.columns.map((c) => c.suggested.role)).toEqual([
      'studentNo',
      'lastName',
      'firstName',
      'activity',
      'activity',
      'ignore',
    ])
    expect(sheet.columns[3].suggested).toMatchObject({
      name: 'Quiz 1',
      category: 'Quizzes',
      maxScore: 20,
    })
    expect(sheet.columns[4].suggested).toMatchObject({
      name: 'Exam',
      category: 'Exams',
      maxScore: 50,
    })
  })

  it('guesses the max from the highest whole-number score and flags it', () => {
    const [sheet] = detectClassRecord([
      {
        name: 'Prelim',
        rows: [
          ['Name', 'Seatwork 1'],
          ['Lopez, Ana', '8'],
          ['Cruz, Ben', '10'],
        ],
      },
    ])
    const column = sheet.columns[1]
    expect(column.suggested).toMatchObject({ role: 'activity', maxScore: 10 })
    expect(column.maxInferred).toBe(true)
    expect(sheet.period).toBe('Prelim')
  })

  it('round-trips Agilearn’s own export headers', () => {
    const [sheet] = detectClassRecord([
      {
        name: 'Grade Sheet',
        rows: [
          [
            'Student No',
            'Last Name',
            'First Name',
            'MI',
            'Quarter 1 / Written work / Quiz 1 (20)',
            'Quarter 1 / Overall',
            'Overall grade',
            'Transmuted Grade',
            'Remarks',
          ],
          ['2024-001', 'Lopez', 'Ana', 'B', '18', '90', '90', '94', 'PASSED'],
        ],
      },
    ])
    const roles = sheet.columns.map((c) => c.suggested.role)
    expect(roles).toEqual([
      'studentNo',
      'lastName',
      'firstName',
      'middleName',
      'activity',
      'ignore',
      'ignore',
      'ignore',
      'ignore',
    ])
    expect(sheet.columns[4].suggested).toEqual({
      role: 'activity',
      period: 'Quarter 1',
      category: 'Written work',
      name: 'Quiz 1',
      maxScore: 20,
    })
  })

  it('excludes sheets with no learner header or only computed columns', () => {
    const sheets = detectClassRecord([
      { name: 'Instructions', rows: [['How to use this file'], ['Fill in scores']] },
      {
        name: 'Summary',
        rows: [
          ['Learner Names', 'Q1 Grade', 'Final Grade'],
          ['Lopez, Ana', '90', '91'],
        ],
      },
    ])
    expect(sheets.map((s) => s.include)).toEqual([false, false])
    expect(sheets[0].reason).toMatch(/learner name/i)
  })

  it('reads a college record: nested bands, unlabelled max row, tab scores', () => {
    const [sheet] = detectClassRecord([
      {
        name: 'MIDTERM',
        rows: [
          [
            'NO.',
            'NAME',
            'CLASS STANDING (70%)',
            'CLASS STANDING (70%)',
            'CLASS STANDING (70%)',
            'CLASS STANDING (70%)',
            'MIDTERM EXAM (30%)',
            'MIDTERM EXAM (30%)',
            'MIDTERM GRADE',
          ],
          [
            'NO.',
            'NAME',
            'QUIZZES/PROJECTS (30%)',
            'QUIZZES/PROJECTS (30%)',
            'QUIZZES/PROJECTS (30%)',
            'RECITATION (20%)',
            'MIDTERM EXAM (30%)',
            'MIDTERM EXAM (30%)',
            'MIDTERM GRADE',
          ],
          [
            'NO.',
            'NAME',
            'Q1',
            'Q2',
            'Tab. Score',
            'R1',
            'Exam',
            'Tab. Score',
            'MIDTERM GRADE',
          ],
          ['', '', '20', '30', '', '10', '60', '', ''],
          ['1', 'SANTOS, MAX', '18', '25', '88.0', '9', '50', '93.3', '90.1'],
        ],
      },
    ])
    expect(sheet.rows.map((r) => r.rowNumber)).toEqual([5])
    const activities = sheet.columns.filter((c) => c.suggested.role === 'activity')
    expect(activities.map((c) => c.suggested)).toEqual([
      {
        role: 'activity',
        period: '',
        category: 'Quizzes/Projects',
        name: 'Q1',
        maxScore: 20,
      },
      {
        role: 'activity',
        period: '',
        category: 'Quizzes/Projects',
        name: 'Q2',
        maxScore: 30,
      },
      { role: 'activity', period: '', category: 'Recitation', name: 'R1', maxScore: 10 },
      {
        role: 'activity',
        period: '',
        category: 'Midterm Exam',
        name: 'Exam',
        maxScore: 60,
      },
    ])
    expect(activities[0].categoryWeight).toBeCloseTo(0.3)
    expect(activities[2].categoryWeight).toBeCloseTo(0.2)
    expect(sheet.period).toBe('Midterm')
  })

  it('keeps suggestions as the initial mapping', () => {
    const [sheet] = detectClassRecord([DEPED_Q1])
    const mapping = suggestedMapping(sheet)
    expect(mapping.include).toBe(true)
    expect(mapping.period).toBe('Quarter 1')
    expect(Object.keys(mapping.columns)).toHaveLength(sheet.columns.length)
  })

  it('gives repeated headers distinct keys', () => {
    const [sheet] = detectClassRecord([
      {
        name: 'Q2',
        rows: [
          ['Name', 'Quiz (10)', 'Quiz (10)'],
          ['Lopez, Ana', '8', '9'],
        ],
      },
    ])
    const keys = sheet.columns.map((c) => c.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('helpers', () => {
  it('splits last-name-first and given-name-first full names', () => {
    expect(splitFullName('DELA CRUZ, JUAN A.')).toEqual({
      lastName: 'DELA CRUZ',
      firstName: 'JUAN',
      middleInitial: 'A',
    })
    expect(splitFullName('Santos, Maria Clara')).toEqual({
      lastName: 'Santos',
      firstName: 'Maria Clara',
      middleInitial: '',
    })
    expect(splitFullName('Ana B. Lopez')).toEqual({
      lastName: 'Lopez',
      firstName: 'Ana',
      middleInitial: 'B',
    })
  })

  it('reads periods from sheet names', () => {
    expect(periodFromSheetName('1st Quarter')).toBe('Quarter 1')
    expect(periodFromSheetName('Q3')).toBe('Quarter 3')
    expect(periodFromSheetName('SECOND QUARTER')).toBe('Quarter 2')
    expect(periodFromSheetName('MIDTERM')).toBe('Midterm')
    expect(periodFromSheetName('Finals')).toBe('Finals')
    expect(periodFromSheetName('Final Grades')).toBeNull()
    expect(periodFromSheetName('Sheet1')).toBeNull()
  })

  it('reads max scores and weights from labels', () => {
    expect(maxFromHeader('Quiz 1 (20)')).toEqual({ name: 'Quiz 1', max: 20 })
    expect(maxFromHeader('Lab 2 [15 pts]')).toEqual({ name: 'Lab 2', max: 15 })
    expect(maxFromHeader('Project - 50 points')).toEqual({ name: 'Project', max: 50 })
    expect(maxFromHeader('Quiz 1')).toBeNull()
    expect(weightFromLabel('PERFORMANCE TASKS (50%)')).toBeCloseTo(0.5)
    expect(weightFromLabel('Quizzes')).toBeNull()
    expect(tidyLabel('WRITTEN WORKS')).toBe('Written Works')
    expect(tidyLabel('Written work')).toBe('Written work')
  })
})
