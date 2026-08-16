import { describe, it, expect } from 'vitest'
import { parseAttendanceImport, type RosterStudent } from './participantsImport'

function student(
  id: string,
  last_name: string,
  first_name: string,
  middle_initial = '',
): RosterStudent {
  return { id, last_name, first_name, middle_initial }
}

const roster: RosterStudent[] = [
  student('1', 'Abello', 'June Vic', 'M'),
  student('2', 'Azucenas', 'Lorraine'),
  student('3', 'Ilagan', 'Calvin Jason'),
  student('4', 'Monton', 'Erica'),
  student('5', 'Ecalnir', 'Alan', 'P'),
  student('6', 'Sabenio', 'Renz Mark'),
  student('7', 'Mañez', 'Diana'),
  student('8', 'Garcia', 'Juan', 'A'),
  student('9', 'Garcia', 'Juan', 'B'),
]

function rowFor(text: string, r = roster) {
  return parseAttendanceImport(text, r).rows[0]
}

describe('parseAttendanceImport', () => {
  it('matches a clean "Last, First MI." line', () => {
    const row = rowFor(
      'Abello, June Vic M. | Entry: 14:01:08, Total time: 32 min 14 secs',
    )
    expect(row.outcome).toBe('matched')
    expect(row.matchedStudentId).toBe('1')
    expect(row.remarks).toContain('Entry: 14:01:08')
  })

  it('matches an ALL CAPS line with no middle initial', () => {
    const row = rowFor('AZUCENAS, LORRAINE | Entry: 14:01:08, Total time: 32 min 14 secs')
    expect(row.outcome).toBe('matched')
    expect(row.matchedStudentId).toBe('2')
  })

  it('matches regardless of name order when there is no comma', () => {
    const forward = rowFor(
      'Calvin Jason Ilagan | Entry: 14:06:28, Total time: 26 min 54 secs',
    )
    expect(forward.matchedStudentId).toBe('3')

    const reversed = rowFor(
      'Ilagan Calvin Jason | Entry: 14:06:28, Total time: 26 min 54 secs',
    )
    expect(reversed.matchedStudentId).toBe('3')
  })

  it('matches a two-word name with no comma', () => {
    const row = rowFor('ERICA MONTON | Entry: 14:00:40, Total time: 32 min 42 secs')
    expect(row.matchedStudentId).toBe('4')
  })

  it('matches through an embedded suffix without corrupting tokens', () => {
    const row = rowFor(
      'ECALNIR, ALAN JR., P. | Entry: 14:01:16, Total time: 32 min 6 secs',
    )
    expect(row.outcome).toBe('matched')
    expect(row.matchedStudentId).toBe('5')
  })

  it('leaves a non-roster line (e.g. the meeting host) unmatched without throwing', () => {
    const row = rowFor('John Neo Lopez | Entry: 14:00:40, Total time: 32 min 42 secs')
    expect(row.outcome).toBe('unmatched')
    expect(row.matchedStudentId).toBeNull()
  })

  it('matches a line with no timing segment at all', () => {
    const result = parseAttendanceImport('SABENIO, RENZ MARK', roster)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].matchedStudentId).toBe('6')
    expect(result.rows[0].remarks).toBe('')
  })

  it('matches a diacritic roster name against both accented and ASCII-folded lines', () => {
    const accented = rowFor('MAÑEZ, DIANA | Entry: 14:03:12, Total time: 30 min 10 secs')
    expect(accented.matchedStudentId).toBe('7')

    const folded = rowFor('MANEZ, DIANA | Entry: 14:03:12, Total time: 30 min 10 secs')
    expect(folded.matchedStudentId).toBe('7')
  })

  it('merges rejoin lines for the same participant into one row', () => {
    const text = [
      'Abello, June Vic M. | Entry: 14:01:08, Total time: 10 min 0 secs',
      'Abello, June Vic M. | Entry: 14:20:00, Total time: 22 min 14 secs',
    ].join('\n')
    const result = parseAttendanceImport(text, roster)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].matchedStudentId).toBe('1')
    expect(result.rows[0].occurrences).toBe(2)
    expect(result.rows[0].remarks).toContain('10 min 0 secs')
    expect(result.rows[0].remarks).toContain('22 min 14 secs')
  })

  it('flags an ambiguous collision when two students share a name and no initial disambiguates', () => {
    const row = rowFor('Garcia, Juan | Entry: 14:00:00, Total time: 5 min 0 secs')
    expect(row.outcome).toBe('ambiguous')
    expect(row.matchedStudentId).toBeNull()
    expect(row.candidateIds.sort()).toEqual(['8', '9'])
  })

  it('breaks the tie when the file includes a disambiguating middle initial', () => {
    const row = rowFor('Garcia, Juan A. | Entry: 14:00:00, Total time: 5 min 0 secs')
    expect(row.outcome).toBe('matched')
    expect(row.matchedStudentId).toBe('8')
  })

  it('silently skips blank and whitespace-only lines', () => {
    const text = [
      'Abello, June Vic M. | Entry: 14:01:08, Total time: 32 min 14 secs',
      '',
      '   ',
      'AZUCENAS, LORRAINE | Entry: 14:01:08, Total time: 32 min 14 secs',
    ].join('\n')
    const result = parseAttendanceImport(text, roster)
    expect(result.rows).toHaveLength(2)
  })

  it('handles the full real export end to end', () => {
    const fullFile = [
      'Abello, June Vic M. | Entry: 14:01:08, Total time: 32 min 14 secs',
      'AZUCENAS, LORRAINE | Entry: 14:01:08, Total time: 32 min 14 secs',
      'Calvin Jason Ilagan | Entry: 14:06:28, Total time: 26 min 54 secs',
      'ERICA MONTON | Entry: 14:00:40, Total time: 32 min 42 secs',
      'ECALNIR, ALAN JR., P. | Entry: 14:01:16, Total time: 32 min 6 secs',
      'John Neo Lopez | Entry: 14:00:40, Total time: 32 min 42 secs',
      'MAÑEZ, MAEGAN ELAINE | Entry: 14:03:12, Total time: 30 min 10 secs',
      'SUÑGA, SAMANTHA | Entry: 14:03:08, Total time: 30 min 14 secs',
      'SABENIO, RENZ MARK',
    ].join('\n')

    const fileRoster: RosterStudent[] = [
      ...roster,
      student('10', 'Mañez', 'Maegan Elaine'),
      student('11', 'Suñga', 'Samantha'),
    ]

    const result = parseAttendanceImport(fullFile, fileRoster)
    expect(result.counts.unmatched).toBeGreaterThanOrEqual(1) // the host, John Neo Lopez
    const matchedIds = result.rows.map((r) => r.matchedStudentId).filter(Boolean)
    expect(new Set(matchedIds).size).toBe(matchedIds.length) // every id appears once
    expect(matchedIds.sort()).toEqual(['1', '10', '11', '2', '3', '4', '5', '6'].sort())
  })
})
