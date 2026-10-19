import { describe, expect, it } from 'vitest'
import { findLecLabPair } from './lecLabPair'

const subject = (
  id: string,
  kind: 'lecture' | 'laboratory' | 'other',
  name: string,
  course_code = '',
) => ({ id, kind, name, course_code })

describe('findLecLabPair', () => {
  it('pairs Lecture and Laboratory subjects that share a name, at 40/60', () => {
    const subjects = [
      subject('lec', 'lecture', 'CS Elective 1 - Web App Development'),
      subject('lab', 'laboratory', 'CS Elective 1 - Web App Development'),
      subject('lec2', 'lecture', 'IT Elective 2 (LEC) - Frontend'),
      subject('lab2', 'laboratory', 'IT Elective 2 (LAB) - Frontend'),
    ]
    expect(findLecLabPair(subjects, 'lab')).toMatchObject({
      lecture: { id: 'lec' },
      laboratory: { id: 'lab' },
      weights: { lecture: 0.4, laboratory: 0.6 },
      source: 'default',
    })
    // "(LEC)" / "(LAB)" tags are ignored when matching names.
    expect(findLecLabPair(subjects, 'lec2')).toMatchObject({
      lecture: { id: 'lec2' },
      laboratory: { id: 'lab2' },
    })
  })

  it('prefers the course code, and falls back to the only other-kind subject', () => {
    expect(
      findLecLabPair(
        [
          subject('lec', 'lecture', 'A', 'IT 211'),
          subject('lab', 'laboratory', 'B', 'IT 211'),
          subject('lab-x', 'laboratory', 'A', 'IT 999'),
        ],
        'lec',
      ),
    ).toMatchObject({ laboratory: { id: 'lab' } })
    expect(
      findLecLabPair(
        [subject('lec', 'lecture', 'Lecture'), subject('lab', 'laboratory', 'Lab')],
        'lec',
      ),
    ).toMatchObject({ laboratory: { id: 'lab' } })
  })

  it('uses a saved combination and its weights first', () => {
    const subjects = [
      subject('lec', 'lecture', 'A'),
      subject('lab', 'laboratory', 'B'),
      subject('lab2', 'laboratory', 'C'),
    ]
    expect(
      findLecLabPair(subjects, 'lec', [
        {
          items: [
            { course_subject_id: 'lec', weight: 0.5 },
            { course_subject_id: 'lab2', weight: 0.5 },
          ],
        },
      ]),
    ).toMatchObject({
      laboratory: { id: 'lab2' },
      weights: { lecture: 0.5, laboratory: 0.5 },
      source: 'combination',
    })
  })

  it('returns null without a clear partner', () => {
    expect(findLecLabPair([subject('o', 'other', 'Homeroom')], 'o')).toBeNull()
    expect(
      findLecLabPair(
        [
          subject('lec', 'lecture', 'A'),
          subject('lab1', 'laboratory', 'B'),
          subject('lab2', 'laboratory', 'C'),
        ],
        'lec',
      ),
    ).toBeNull()
  })
})
