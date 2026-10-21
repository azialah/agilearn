import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import type { GradebookStructure } from '@/lib/grading'
import type { Classroom, CourseSubject, Student } from '@/types/domain'
import { buildGradeSheetWorkbook } from './workbook'

const structure: GradebookStructure = {
  periods: [
    {
      id: 'mid',
      classroom_id: 'r',
      course_subject_id: 's',
      name: 'Midterm',
      weight: 1,
      position: 0,
      starts_on: null,
      ends_on: null,
    },
  ],
  components: [
    {
      id: 'lec',
      classroom_id: 'r',
      course_subject_id: 's',
      created_at: '',
      name: 'Lecture',
      position: 0,
      weight: 0.4,
    },
    {
      id: 'lab',
      classroom_id: 'r',
      course_subject_id: 's',
      created_at: '',
      name: 'Laboratory',
      position: 1,
      weight: 0.6,
    },
  ],
  categories: [],
  activities: [],
}

const student: Student = {
  id: 's1',
  classroom_id: 'r',
  created_at: '',
  student_no: '202411829',
  last_name: 'ALFONSO',
  first_name: 'MARK JOSHUA',
  middle_initial: 'P',
  guardian_email: null,
  student_email: null,
}

describe('buildGradeSheetWorkbook', () => {
  it('writes the title block, the period band and the header above the class list', () => {
    const classroom = {
      course_code: 'IT 211',
      course_name: 'Data Structures',
      cohort_name: 'BSIT 2-A',
      year: '',
      block: '',
    } as Classroom
    const subject = {
      name: 'Data Structures',
      subject_code: '1234',
      course_code: 'IT 211',
      schedule: 'MWF 8:00',
    } as CourseSubject
    const wb = buildGradeSheetWorkbook(
      classroom,
      [student],
      structure,
      {},
      {},
      undefined,
      subject,
    )
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
    expect(rows[0][0]).toBe('1234 IT 211')
    expect(rows[1][0]).toBe('Data Structures')
    expect(rows[2][0]).toBe('MWF 8:00 · BSIT 2-A')
    expect(rows[3]).toEqual(['', '', '', 'MIDTERM', '', ''])
    expect(rows[4]).toEqual([
      '#',
      'Name',
      'Student No.',
      'MIDTERM GRADE LEC (40%)',
      'MIDTERM GRADE LAB (60%)',
      'MIDTERM GRADE',
    ])
    expect(rows[5]).toEqual([1, 'ALFONSO, MARK JOSHUA P.', '202411829', '', '', ''])
    expect(ws['!merges']).toContainEqual({ s: { r: 3, c: 3 }, e: { r: 3, c: 5 } })
    expect(ws['!merges']).toContainEqual({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } })
  })
})
