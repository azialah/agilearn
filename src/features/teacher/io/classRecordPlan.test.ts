import { describe, expect, it } from 'vitest'
import type { GradebookStructure } from '@/lib/grading'
import type {
  Activity,
  ActivityCategory,
  GradeComponentRecord,
  GradingPeriod,
  Student,
} from '@/types/domain'
import { detectClassRecord, suggestedMapping, type SheetMatrix } from './classRecord'
import { periodKey, planClassRecordImport, type ResolvedSheet } from './classRecordPlan'
import { applyPreset, bestPreset, presetFromMappings } from './importPresets'

const COMPONENT: GradeComponentRecord = {
  id: 'comp',
  classroom_id: 'room',
  course_subject_id: 'subj',
  created_at: '',
  name: 'Overall',
  position: 0,
  weight: 1,
}

function student(id: string, no: string, last: string, first: string): Student {
  return {
    id,
    classroom_id: 'room',
    created_at: '',
    first_name: first,
    last_name: last,
    middle_initial: '',
    student_no: no,
    guardian_email: null,
    student_email: null,
  }
}

function period(id: string, name: string, position = 0): GradingPeriod {
  return {
    id,
    classroom_id: 'room',
    course_subject_id: 'subj',
    name,
    weight: 0.25,
    position,
    starts_on: null,
    ends_on: null,
  }
}

function category(id: string, name: string, periodId: string | null): ActivityCategory {
  return {
    id,
    classroom_id: 'room',
    course_subject_id: 'subj',
    component: 'lecture',
    grade_component_id: 'comp',
    grading_period_id: periodId,
    name,
    position: 0,
    weight: 0.3,
  }
}

function activity(
  id: string,
  name: string,
  periodId: string,
  categoryId: string,
  max: number,
): Activity {
  return {
    id,
    name,
    grading_period_id: periodId,
    category_id: categoryId,
    max_score: max,
    position: 0,
    date: null,
  }
}

const EMPTY: GradebookStructure = {
  periods: [],
  components: [COMPONENT],
  categories: [],
  activities: [],
}

function resolve(sheets: SheetMatrix[], defaultPeriod?: string): ResolvedSheet[] {
  return detectClassRecord(sheets, { defaultPeriod }).map((sheet) => ({
    sheet,
    mapping: suggestedMapping(sheet),
  }))
}

const QUARTER = (name: string, scores: [string, string][]): SheetMatrix => ({
  name,
  rows: [
    ["LEARNERS' NAMES", 'WRITTEN WORKS (40%)', 'PERFORMANCE TASKS (60%)'],
    ["LEARNERS' NAMES", '1', '1'],
    ['HIGHEST POSSIBLE SCORE', '20', '50'],
    ['DELA CRUZ, JUAN A.', ...scores[0]],
    ['SANTOS, MARIA', ...scores[1]],
  ],
})

describe('planClassRecordImport — fresh subject', () => {
  const plan = planClassRecordImport(
    resolve([
      QUARTER('Q1', [
        ['18', '45'],
        ['20', '50'],
      ]),
      QUARTER('Q2', [
        ['15', ''],
        ['19', '48'],
      ]),
    ]),
    { students: [], structure: EMPTY, scores: {} },
    { overwriteScores: false },
  )

  it('creates each learner once across quarter sheets, with placeholder numbers', () => {
    expect(
      plan.students.create.map((s) => [s.lastName, s.firstName, s.studentNo]),
    ).toEqual([
      ['DELA CRUZ', 'JUAN', 'IMPORT-001'],
      ['SANTOS', 'MARIA', 'IMPORT-002'],
    ])
    expect(plan.students.create.every((s) => s.placeholderNo)).toBe(true)
    expect(plan.issues.some((i) => /placeholder/.test(i.message))).toBe(true)
  })

  it('creates periods with an even split and shared, weighted categories', () => {
    expect(plan.periods).toEqual([
      { key: 'p:q1', name: 'Quarter 1', weight: 0.5, position: 0 },
      { key: 'p:q2', name: 'Quarter 2', weight: 0.5, position: 1 },
    ])
    expect(plan.categories.map((c) => [c.name, c.weight, c.componentId])).toEqual([
      ['Written Works', 0.4, 'comp'],
      ['Performance Tasks', 0.6, 'comp'],
    ])
  })

  it('creates one activity per period and skips blank cells', () => {
    expect(plan.activities.create).toHaveLength(4)
    expect(plan.scores).toHaveLength(7)
    expect(plan.counts).toMatchObject({ newScores: 7, overwrites: 0, invalid: 0 })
    expect(plan.blocked).toBe(false)
  })
})

describe('planClassRecordImport — existing gradebook', () => {
  const structure: GradebookStructure = {
    periods: [period('q1', 'Quarter 1')],
    components: [COMPONENT],
    categories: [
      category('ww', 'Written work', null),
      category('pt', 'Performance tasks', null),
    ],
    activities: [activity('ww1', 'Written Works 1', 'q1', 'ww', 20)],
  }
  const students = [
    student('s1', '2024-001', 'Dela Cruz', 'Juan'),
    student('s2', '2024-002', 'Santos', 'Maria'),
  ]
  const sheets = resolve([
    QUARTER('1st Quarter', [
      ['18', '45'],
      ['20', '50'],
    ]),
  ])

  it('matches students by name, periods by alias and categories loosely', () => {
    const plan = planClassRecordImport(
      sheets,
      { students, structure, scores: {} },
      { overwriteScores: false },
    )
    expect(plan.students).toEqual({ create: [], matched: 2 })
    expect(plan.periods).toEqual([])
    expect(plan.categories).toEqual([])
    expect(plan.activities.matched).toBe(1)
    expect(plan.activities.create.map((a) => [a.name, a.category])).toEqual([
      ['Performance Tasks 1', { kind: 'existing', id: 'pt' }],
    ])
  })

  it('keeps differing existing scores unless overwrite is on', () => {
    const scores = { ww1: { s1: 10, s2: 20 } }
    const keep = planClassRecordImport(
      sheets,
      { students, structure, scores },
      { overwriteScores: false },
    )
    expect(keep.counts).toMatchObject({ keptExisting: 1, unchanged: 1, overwrites: 0 })

    const replace = planClassRecordImport(
      sheets,
      { students, structure, scores },
      { overwriteScores: true },
    )
    expect(replace.counts).toMatchObject({ overwrites: 1, unchanged: 1 })
    expect(replace.scores.find((w) => w.overwrite)).toMatchObject({
      student: { kind: 'existing', id: 's1' },
      activity: { kind: 'existing', id: 'ww1' },
      score: 18,
    })
  })

  it('rejects scores above the existing max', () => {
    const tight: GradebookStructure = {
      ...structure,
      activities: [activity('ww1', 'Written Works 1', 'q1', 'ww', 15)],
    }
    const plan = planClassRecordImport(
      sheets,
      { students, structure: tight, scores: {} },
      { overwriteScores: false },
    )
    expect(plan.counts.invalid).toBe(2)
    expect(plan.issues.some((i) => /outside 0–15/.test(i.message))).toBe(true)
  })

  it('blocks a category that exists only in another period', () => {
    const scoped: GradebookStructure = {
      periods: [period('q1', 'Quarter 1'), period('q2', 'Quarter 2', 1)],
      components: [COMPONENT],
      categories: [category('ww', 'Written Works', 'q2')],
      activities: [],
    }
    const plan = planClassRecordImport(
      resolve([
        QUARTER('Q1', [
          ['1', '1'],
          ['1', '1'],
        ]),
      ]),
      { students, structure: scoped, scores: {} },
      { overwriteScores: false },
    )
    expect(
      plan.issues.some((i) => i.level === 'error' && /different period/.test(i.message)),
    ).toBe(true)
    // Performance Tasks is still importable.
    expect(plan.activities.create.map((a) => a.name)).toEqual(['Performance Tasks 1'])
  })
})

describe('planClassRecordImport — roster sheet + name-only quarter sheet', () => {
  it('attaches name-only rows to the students the roster sheet creates', () => {
    const plan = planClassRecordImport(
      resolve([
        QUARTER('Q1', [
          ['18', '45'],
          ['20', '50'],
        ]),
        {
          name: 'Input Data',
          rows: [
            ['LRN', "Learner's Name"],
            ['1000001', 'Dela Cruz, Juan A.'],
            ['1000002', 'Santos, Maria'],
          ],
        },
      ]),
      { students: [], structure: EMPTY, scores: {} },
      { overwriteScores: false },
    )
    expect(plan.students.create.map((s) => s.studentNo)).toEqual(['1000001', '1000002'])
    expect(plan.counts.newScores).toBe(4)
  })
})

describe('periodKey', () => {
  it('treats quarter spellings as one period', () => {
    const keys = ['Q1', 'Quarter 1', '1st Quarter', 'First Quarter', 'quarter-1'].map(
      periodKey,
    )
    expect(new Set(keys).size).toBe(1)
    expect(periodKey('Finals')).toBe(periodKey('Final'))
    expect(periodKey('Midterm')).not.toBe(periodKey('Finals'))
  })
})

describe('import presets', () => {
  const q1 = QUARTER('Q1', [
    ['18', '45'],
    ['20', '50'],
  ])
  const detected = detectClassRecord([q1])
  const mappings = { q1: suggestedMapping(detected[0]) }
  // The teacher renames an activity before saving the preset.
  const wwKey = detected[0].columns[1].key
  const original = mappings.q1.columns[wwKey]
  if (original.role === 'activity') {
    mappings.q1.columns[wwKey] = { ...original, name: 'Quiz 1' }
  }
  const preset = { id: 'p', mapping: presetFromMappings(detected, mappings) }

  it('auto-selects a preset that fits and reapplies the saved mapping', () => {
    const next = detectClassRecord([q1])
    expect(bestPreset(next, [preset])).toBe(preset)
    const applied = applyPreset(next, preset.mapping)
    expect(applied.q1.columns[wwKey]).toMatchObject({ role: 'activity', name: 'Quiz 1' })
  })

  it('reuses a sheet mapping for a new, same-shaped quarter sheet', () => {
    const q2 = detectClassRecord([{ ...q1, name: 'Q2' }])
    const applied = applyPreset(q2, preset.mapping)
    expect(applied.q2.period).toBe('Quarter 2')
    expect(applied.q2.columns[wwKey]).toMatchObject({ name: 'Quiz 1', period: '' })
  })

  it('does not apply a preset to an unrelated file', () => {
    const other = detectClassRecord([
      {
        name: 'Sheet1',
        rows: [
          [
            'Student No',
            'Last Name',
            'First Name',
            'Lab 1 (10)',
            'Lab 2 (10)',
            'Lab 3 (10)',
          ],
          ['1', 'A', 'B', '1', '2', '3'],
        ],
      },
    ])
    expect(bestPreset(other, [preset])).toBeNull()
  })
})
