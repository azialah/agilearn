import { describe, expect, it } from 'vitest'
import type { GradebookStructure } from '@/lib/grading'
import type { Student } from '@/types/domain'
import { parsePostedGrades } from './parsePostedGrades'
import { planPostedGradebook, termCategoryName } from './gradebookWrite'

const roster: Student[] = [
  {
    id: 's1',
    classroom_id: 'r',
    created_at: '',
    student_no: '202411829',
    last_name: 'ALFONSO',
    first_name: 'MARK JOSHUA',
    middle_initial: 'P',
    guardian_email: null,
    student_email: null,
  },
  {
    id: 's2',
    classroom_id: 'r',
    created_at: '',
    student_no: '202410472',
    last_name: 'ALVAREZ',
    first_name: 'MONICA XENNA',
    middle_initial: 'M',
    guardian_email: null,
    student_email: null,
  },
]

const sheet = parsePostedGrades(
  [
    ['45635 CSE317'],
    ['', '', '', 'MIDTERM', '', ''],
    [
      '#',
      'Name',
      'Student No.',
      'MIDTERM GRADE LEC (40%)',
      'MIDTERM GRADE LAB (60%)',
      'MIDTERM GRADE',
    ],
    ['1', 'ALFONSO, MARK JOSHUA P.', '202411829', '92', '94', '94'],
    ['2', 'ALVAREZ, MONICA XENNA M.', '202410472', '92', '', ''],
    ['3', 'NOBODY, NOT ON ROSTER', '999', '80', '80', '80'],
  ],
  roster,
)

const overall = (subjectId: string) => ({
  id: `${subjectId}-overall`,
  classroom_id: 'r',
  course_subject_id: subjectId,
  created_at: '',
  name: 'Overall',
  position: 0,
  weight: 1,
})

/** A Laboratory subject nobody has set up: one component, nothing else. */
const emptyLab: GradebookStructure = {
  periods: [],
  components: [overall('lab')],
  categories: [],
  activities: [],
}

describe('planPostedGradebook', () => {
  it('sets up an empty Laboratory subject: Midterm, one category, one activity out of 100', () => {
    const plan = planPostedGradebook(
      sheet.rows,
      { students: roster, structure: emptyLab, scores: {} },
      'Midterm',
      'laboratory',
      false,
    )
    expect(plan).not.toBeNull()
    expect(plan?.students.create).toEqual([])
    expect(plan?.periods).toEqual([
      expect.objectContaining({ name: 'Midterm', weight: 1 }),
    ])
    expect(plan?.categories).toEqual([
      expect.objectContaining({
        name: termCategoryName('laboratory'),
        weight: 1,
        componentId: 'lab-overall',
      }),
    ])
    expect(plan?.activities.create).toEqual([
      expect.objectContaining({ name: 'Midterm grade', maxScore: 100 }),
    ])
    // ALVAREZ has no lab grade and the unknown student is skipped.
    expect(plan?.scores).toEqual([
      expect.objectContaining({
        student: { kind: 'existing', id: 's1' },
        score: 94,
        overwrite: false,
      }),
    ])
    expect(plan?.blocked).toBe(false)
  })

  it('reuses the structure on a re-import and only overwrites when asked', () => {
    const setUp: GradebookStructure = {
      periods: [
        {
          id: 'lab-mid',
          classroom_id: 'r',
          course_subject_id: 'lab',
          name: 'Midterm',
          weight: 1,
          position: 0,
          starts_on: null,
          ends_on: null,
        },
      ],
      components: [overall('lab')],
      categories: [
        {
          id: 'lab-cat',
          classroom_id: 'r',
          course_subject_id: 'lab',
          component: 'lecture',
          grade_component_id: 'lab-overall',
          grading_period_id: null,
          name: termCategoryName('laboratory'),
          position: 0,
          weight: 1,
        },
      ],
      activities: [
        {
          id: 'lab-act',
          name: 'Midterm grade',
          grading_period_id: 'lab-mid',
          category_id: 'lab-cat',
          max_score: 100,
          position: 0,
          date: null,
        },
      ],
    }
    const existing = {
      students: roster,
      structure: setUp,
      scores: { 'lab-act': { s1: 90 } },
    }

    const keep = planPostedGradebook(sheet.rows, existing, 'Midterm', 'laboratory', false)
    expect(keep?.periods).toEqual([])
    expect(keep?.categories).toEqual([])
    expect(keep?.activities.create).toEqual([])
    expect(keep?.counts.keptExisting).toBe(1)
    expect(keep?.scores).toEqual([])

    const replace = planPostedGradebook(
      sheet.rows,
      existing,
      'Midterm',
      'laboratory',
      true,
    )
    expect(replace?.scores).toEqual([
      expect.objectContaining({
        activity: { kind: 'existing', id: 'lab-act' },
        score: 94,
        overwrite: true,
      }),
    ])
  })

  it('writes the Lecture column to the Lecture subject', () => {
    const plan = planPostedGradebook(
      sheet.rows,
      {
        students: roster,
        structure: { ...emptyLab, components: [overall('lec')] },
        scores: {},
      },
      'Midterm',
      'lecture',
      false,
    )
    expect(plan?.categories[0]?.name).toBe('Term grade (Lecture)')
    expect(plan?.scores.map((write) => write.score)).toEqual([92, 92])
  })

  it('plans nothing for a side the sheet has no grades for', () => {
    const lecOnly = parsePostedGrades(
      [
        ['Name', 'Student No.', 'Lecture'],
        ['ALFONSO, MARK JOSHUA P.', '202411829', '92'],
      ],
      roster,
    )
    expect(
      planPostedGradebook(
        lecOnly.rows,
        { students: roster, structure: emptyLab, scores: {} },
        'Midterm',
        'laboratory',
        false,
      ),
    ).toBeNull()
  })
})
