import { afterEach, describe, expect, it, vi } from 'vitest'
import { conflictReason, findSlotConflicts, type SlotLike } from './calendar'

const MON = 1
const TUE = 2

/** Postgres returns 'HH:MM:SS'; the time input gives 'HH:MM'. Both appear here. */
function slot(weekday: number, starts_at: string, ends_at: string, id = '') {
  return { weekday, starts_at, ends_at, id }
}

describe('findSlotConflicts', () => {
  it('flags a proposal that sits inside an existing slot', () => {
    const existing = [slot(MON, '09:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '10:00', '11:00'), existing)).toHaveLength(1)
  })

  it('flags a proposal that swallows an existing slot', () => {
    const existing = [slot(MON, '10:00:00', '11:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '09:00', '12:00'), existing)).toHaveLength(1)
  })

  it('flags a proposal that starts before and ends inside', () => {
    const existing = [slot(MON, '10:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '09:00', '11:00'), existing)).toHaveLength(1)
  })

  it('flags a proposal that starts inside and ends after', () => {
    const existing = [slot(MON, '10:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '11:00', '13:00'), existing)).toHaveLength(1)
  })

  it('flags identical times', () => {
    const existing = [slot(MON, '10:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '10:00', '12:00'), existing)).toHaveLength(1)
  })

  it('allows a slot that ends exactly when another starts', () => {
    const existing = [slot(MON, '11:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '10:00', '11:00'), existing)).toEqual([])
  })

  it('allows a slot that starts exactly when another ends', () => {
    const existing = [slot(MON, '09:00:00', '10:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '10:00', '11:00'), existing)).toEqual([])
  })

  it('ignores the same times on a different weekday', () => {
    const existing = [slot(TUE, '10:00:00', '12:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '10:00', '12:00'), existing)).toEqual([])
  })

  it('catches a clash with a slot from another section', () => {
    // The caller passes the teacher's whole timetable, so a different
    // classroom's subject is just another row here.
    const otherSection = [slot(MON, '10:30:00', '11:30:00', 'other-classroom')]
    expect(findSlotConflicts(slot(MON, '10:00', '12:00'), otherSection)).toEqual([
      otherSection[0],
    ])
  })

  it('returns every conflicting slot, in order', () => {
    const existing = [
      slot(MON, '09:30:00', '10:30:00', 'a'),
      slot(MON, '11:30:00', '12:30:00', 'b'),
      slot(TUE, '10:00:00', '11:00:00', 'c'),
    ]
    expect(
      findSlotConflicts(slot(MON, '10:00', '12:00'), existing).map((s) => s.id),
    ).toEqual(['a', 'b'])
  })

  it('returns nothing when the teacher has no slots', () => {
    expect(findSlotConflicts(slot(MON, '10:00', '11:00'), [])).toEqual([])
  })

  it('does not report the slot being edited when the caller filters it out', () => {
    const editing = slot(MON, '10:00:00', '11:00:00', 'self')
    const rest = [editing].filter((s) => s.id !== 'self')
    expect(findSlotConflicts(slot(MON, '10:00', '11:00'), rest)).toEqual([])
  })

  it('compares HH:MM against HH:MM:SS correctly', () => {
    const existing = [slot(MON, '10:00:00', '11:00:00', 'a')]
    // Lexicographic '10:30' < '10:00:00' would be wrong; normalisation fixes it.
    expect(findSlotConflicts(slot(MON, '10:30', '11:30'), existing)).toHaveLength(1)
    expect(findSlotConflicts(slot(MON, '11:00', '11:30'), existing)).toEqual([])
  })

  it('treats an incomplete or backwards proposal as nothing to check', () => {
    const existing = [slot(MON, '10:00:00', '11:00:00', 'a')]
    expect(findSlotConflicts(slot(MON, '', ''), existing)).toEqual([])
    expect(findSlotConflicts(slot(MON, '12:00', '10:00'), existing)).toEqual([])
  })
})

describe('conflictReason', () => {
  it('names the day, both ranges, and the colliding subject', () => {
    const proposed: SlotLike = { weekday: MON, starts_at: '10:00', ends_at: '12:00' }
    const conflict: SlotLike = {
      weekday: MON,
      starts_at: '11:00:00',
      ends_at: '13:00:00',
    }
    // Postgres seconds are dropped in display.
    expect(conflictReason(proposed, conflict, 'CS Elective 1 Lab')).toBe(
      'Mon 10:00 AM–12:00 PM overlaps CS Elective 1 Lab (Mon 11:00 AM–1:00 PM)',
    )
  })
})

describe('timetable times are wall-clock', () => {
  // subject_meeting_slots.starts_at/ends_at are `time` columns: a 10:00 class is
  // 10:00 at the school no matter where the teacher's laptop is, and it does not
  // shift across a DST boundary. These assert we never start Date-parsing them.
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads the same in Manila and in New York', () => {
    const slot: SlotLike = { weekday: MON, starts_at: '10:00:00', ends_at: '12:00:00' }
    const proposed: SlotLike = { weekday: MON, starts_at: '11:00', ends_at: '13:00' }

    vi.stubEnv('TZ', 'Asia/Manila')
    const manila = conflictReason(proposed, slot, 'Physics')

    vi.stubEnv('TZ', 'America/New_York')
    const newYork = conflictReason(proposed, slot, 'Physics')

    expect(manila).toBe(newYork)
    expect(manila).toContain('10:00 AM–12:00 PM')
  })
})
