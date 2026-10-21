import { describe, expect, it } from 'vitest'
import type { GradebookStructure } from '@/lib/grading'
import {
  DEFAULT_EXPORT_LAYOUT,
  DETAILED_EXPORT_LAYOUT,
  parseExportLayout,
} from '@/lib/gradeSheetConfig'
import type { Classroom, Student } from '@/types/domain'
import { buildGradeSheetTable, gradeSheetTitleLines } from './exportLayout'
import { detectClassRecord } from './classRecord'
import { periodKey } from './classRecordPlan'

const structure: GradebookStructure = {
  periods: [
    {
      id: 'q1',
      classroom_id: 'r',
      course_subject_id: 's',
      name: 'Quarter 1',
      weight: 1,
      position: 0,
      starts_on: null,
      ends_on: null,
    },
  ],
  components: [
    {
      id: 'c',
      classroom_id: 'r',
      course_subject_id: 's',
      created_at: '',
      name: 'Overall',
      position: 0,
      weight: 1,
    },
  ],
  categories: [
    {
      id: 'ww',
      classroom_id: 'r',
      course_subject_id: 's',
      component: 'lecture',
      grade_component_id: 'c',
      grading_period_id: null,
      name: 'Written work',
      position: 0,
      weight: 1,
    },
  ],
  activities: [
    {
      id: 'a1',
      name: 'Quiz 1',
      grading_period_id: 'q1',
      category_id: 'ww',
      max_score: 20,
      position: 0,
      date: null,
    },
  ],
}

const students: Student[] = [
  {
    id: 's1',
    classroom_id: 'r',
    created_at: '',
    student_no: '2024-001',
    last_name: 'Lopez',
    first_name: 'Ana',
    middle_initial: 'B',
    guardian_email: null,
    student_email: null,
  },
]

const scores = { a1: { s1: 15 } }

describe('buildGradeSheetTable', () => {
  it('keeps the original detailed sheet as a preset', () => {
    const table = buildGradeSheetTable(
      students,
      structure,
      scores,
      {},
      DETAILED_EXPORT_LAYOUT,
    )
    expect(table.sheetName).toBe('Grade Sheet')
    expect(table.header).toEqual([
      'Student No.',
      'Last Name',
      'First Name',
      'MI',
      'Quarter 1 / Written work / Quiz 1 (20)',
      'Quarter 1 / Overall',
      'Overall grade',
      'Final Grade',
      'Remarks',
    ])
    expect(table.rows[0]).toEqual([
      '2024-001',
      'Lopez',
      'Ana',
      'B',
      15,
      75,
      75,
      75,
      'PASSED',
    ])
    expect(table.widths.slice(0, 4)).toEqual([14, 20, 20, 6])
  })

  it('honours order, toggles, header overrides and sheet name', () => {
    const layout = parseExportLayout({
      sheetName: 'Q1: Final/Record',
      columns: [
        { key: 'fullName', enabled: true, label: 'Learner' },
        { key: 'finalGrade', enabled: true, label: 'Grade' },
        { key: 'categoryPercents', enabled: true, label: 'ignored for groups' },
        { key: 'studentNo', enabled: false, label: '' },
      ],
    })
    const table = buildGradeSheetTable(students, structure, scores, {}, layout)
    expect(table.sheetName).toBe('Q1 Final Record')
    expect(table.header).toEqual(['Learner', 'Grade', 'Quarter 1 / Written work %'])
    expect(table.rows[0]).toEqual(['Lopez, Ana B.', 75, 75])
  })

  it('exports a sheet the class-record importer reads back', () => {
    const table = buildGradeSheetTable(
      students,
      structure,
      scores,
      {},
      DETAILED_EXPORT_LAYOUT,
    )
    const [sheet] = detectClassRecord([
      { name: table.sheetName, rows: [table.header, ...table.rows] },
    ])
    const activity = sheet.columns.find((c) => c.suggested.role === 'activity')
    expect(activity?.suggested).toEqual({
      role: 'activity',
      period: 'Quarter 1',
      category: 'Written work',
      name: 'Quiz 1',
      maxScore: 20,
    })
    expect(sheet.columns.filter((c) => c.suggested.role === 'activity')).toHaveLength(1)
  })
})

describe('parseExportLayout', () => {
  it('falls back to defaults and lists every column exactly once', () => {
    expect(parseExportLayout(null)).toEqual(DEFAULT_EXPORT_LAYOUT)
    const parsed = parseExportLayout({
      columns: [{ key: 'remarks' }, { key: 'remarks' }, { key: 'bogus' }],
    })
    expect(parsed.columns[0]).toEqual({ key: 'remarks', enabled: true, label: '' })
    expect(parsed.columns).toHaveLength(DEFAULT_EXPORT_LAYOUT.columns.length)
    expect(parsed.columns.slice(1).every((c) => !c.enabled)).toBe(true)
  })
})

describe('class record format (default layout)', () => {
  const component = (id: string, name: string, weight: number, position: number) => ({
    id,
    classroom_id: 'r',
    course_subject_id: 's',
    created_at: '',
    name,
    position,
    weight,
  })
  const category = (id: string, componentId: string) => ({
    id,
    classroom_id: 'r',
    course_subject_id: 's',
    component: 'lecture' as const,
    grade_component_id: componentId,
    grading_period_id: null,
    name: id,
    position: 0,
    weight: 1,
  })
  const activity = (id: string, categoryId: string) => ({
    id,
    name: id,
    grading_period_id: 'mid',
    category_id: categoryId,
    max_score: 100,
    position: 0,
    date: null,
  })
  const lecLab: GradebookStructure = {
    periods: [{ ...structure.periods[0], id: 'mid', name: 'Midterm' }],
    components: [
      component('lec', 'Lecture', 0.4, 0),
      component('lab', 'Laboratory', 0.6, 1),
    ],
    categories: [category('lec-cat', 'lec'), category('lab-cat', 'lab')],
    activities: [activity('lec-a', 'lec-cat'), activity('lab-a', 'lab-cat')],
  }
  const roster: Student[] = [
    {
      ...students[0],
      id: 's1',
      student_no: '202410130',
      last_name: 'CUBALAN',
      first_name: 'JHON REY',
      middle_initial: 'B',
    },
    {
      ...students[0],
      id: 's2',
      student_no: '202411676',
      last_name: 'CARAAN',
      first_name: 'MARK JOSHUA',
      middle_initial: 'O',
    },
    {
      ...students[0],
      id: 's3',
      student_no: '202411000',
      last_name: 'DOE',
      first_name: 'JANE',
      middle_initial: '',
    },
  ]
  const lecLabScores = {
    'lec-a': { s1: 95, s2: 76, s3: 90 },
    'lab-a': { s1: 85, s2: 97 },
  }

  it('prints # | Name | Student No. | LEC | LAB | MIDTERM GRADE under a MIDTERM band', () => {
    const table = buildGradeSheetTable(roster, lecLab, lecLabScores)
    expect(table.header).toEqual([
      '#',
      'Name',
      'Student No.',
      'MIDTERM GRADE LEC (40%)',
      'MIDTERM GRADE LAB (60%)',
      'MIDTERM GRADE',
    ])
    expect(table.bands).toEqual([{ label: 'MIDTERM', start: 3, span: 3 }])
    // 95 × 40% + 85 × 60% = 89; 76 × 40% + 97 × 60% = 88.6 → 89.
    expect(table.rows[0]).toEqual([1, 'CUBALAN, JHON REY B.', '202410130', 95, 85, 89])
    expect(table.rows[1]).toEqual([2, 'CARAAN, MARK JOSHUA O.', '202411676', 76, 97, 89])
  })

  it('leaves the midterm grade blank until both halves are graded', () => {
    const table = buildGradeSheetTable(roster, lecLab, lecLabScores)
    expect(table.rows[2]).toEqual([3, 'DOE, JANE', '202411000', 90, '', ''])
  })

  it('builds the title block from the subject and classroom', () => {
    const classroom = {
      course_code: 'IT 211',
      course_name: 'Data Structures',
      cohort_name: '',
      year: 'BSIT 2',
      block: 'A',
    } satisfies Pick<
      Classroom,
      'course_code' | 'course_name' | 'cohort_name' | 'year' | 'block'
    >
    expect(
      gradeSheetTitleLines(classroom, {
        name: 'Data Structures and Algorithms',
        subject_code: '1234',
        course_code: 'IT 211',
        schedule: 'MWF 8:00-9:00',
      }),
    ).toEqual([
      '1234 IT 211',
      'Data Structures and Algorithms',
      'MWF 8:00-9:00 · BSIT 2-A',
    ])
  })
})

describe('class record format across Lecture and Laboratory subjects', () => {
  const overall = (subjectId: string) => ({
    id: `${subjectId}-overall`,
    classroom_id: 'r',
    course_subject_id: subjectId,
    created_at: '',
    name: 'Overall',
    position: 0,
    weight: 1,
  })
  const book = (subjectId: string, periodName: string | null) => ({
    periods: periodName
      ? [
          {
            ...structure.periods[0],
            id: `${subjectId}-p`,
            name: periodName,
            course_subject_id: subjectId,
          },
        ]
      : [],
    components: [overall(subjectId)],
    categories: [
      {
        id: `${subjectId}-cat`,
        classroom_id: 'r',
        course_subject_id: subjectId,
        component: 'lecture' as const,
        grade_component_id: `${subjectId}-overall`,
        grading_period_id: null,
        name: 'Work',
        position: 0,
        weight: 1,
      },
    ],
    activities: periodName
      ? [
          {
            id: `${subjectId}-a`,
            name: 'Exam',
            grading_period_id: `${subjectId}-p`,
            category_id: `${subjectId}-cat`,
            max_score: 100,
            position: 0,
            date: null,
          },
        ]
      : [],
  })

  it("reads each subject's own period grade and weights them 40/60", () => {
    const lecture = { structure: book('lec', 'Midterm'), scores: { 'lec-a': { s1: 95 } } }
    const laboratory = {
      structure: book('lab', 'MIDTERM'),
      scores: { 'lab-a': { s1: 85 } },
    }
    const table = buildGradeSheetTable(
      students,
      lecture.structure,
      lecture.scores,
      {},
      DEFAULT_EXPORT_LAYOUT,
      { lecture, laboratory, weights: { lecture: 0.4, laboratory: 0.6 } },
    )
    expect(table.header.slice(3)).toEqual([
      'MIDTERM GRADE LEC (40%)',
      'MIDTERM GRADE LAB (60%)',
      'MIDTERM GRADE',
    ])
    expect(table.rows[0].slice(3)).toEqual([95, 85, 89])
  })

  it("prints a MIDTERM GRADE recorded on the teacher's sheet instead of recomputing", () => {
    // 92 × 40% + 94 × 60% = 93.2 → 93, but the sheet recorded 94.
    const lecture = { structure: book('lec', 'Midterm'), scores: { 'lec-a': { s1: 92 } } }
    const laboratory = {
      structure: book('lab', 'Midterm'),
      scores: { 'lab-a': { s1: 94 } },
    }
    const pair = { lecture, laboratory, weights: { lecture: 0.4, laboratory: 0.6 } }
    const computed = buildGradeSheetTable(
      students,
      lecture.structure,
      lecture.scores,
      {},
      DEFAULT_EXPORT_LAYOUT,
      pair,
    )
    expect(computed.rows[0].slice(3)).toEqual([92, 94, 93])
    const recorded = buildGradeSheetTable(
      students,
      lecture.structure,
      lecture.scores,
      {},
      DEFAULT_EXPORT_LAYOUT,
      pair,
      new Map([[`s1|${periodKey('MIDTERM')}`, 94]]),
    )
    expect(recorded.rows[0].slice(3)).toEqual([92, 94, 94])
  })

  it('leaves Laboratory and the midterm grade blank until the lab has the period', () => {
    const lecture = { structure: book('lec', 'Midterm'), scores: { 'lec-a': { s1: 95 } } }
    const laboratory = { structure: book('lab', null), scores: {} }
    const table = buildGradeSheetTable(
      students,
      lecture.structure,
      lecture.scores,
      {},
      DEFAULT_EXPORT_LAYOUT,
      { lecture, laboratory, weights: { lecture: 0.4, laboratory: 0.6 } },
    )
    expect(table.rows[0].slice(3)).toEqual([95, '', ''])
  })
})
