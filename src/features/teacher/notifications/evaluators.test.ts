import { describe, expect, it } from 'vitest'
import { consecutiveUnexcusedAbsences, shouldNotifyLowAverage } from './evaluators'

describe('shouldNotifyLowAverage', () => {
  it('opens only below the 70% threshold', () => {
    expect(shouldNotifyLowAverage(69.99)).toBe(true)
    expect(shouldNotifyLowAverage(70)).toBe(false)
    expect(shouldNotifyLowAverage(null)).toBe(false)
  })
})

describe('consecutiveUnexcusedAbsences', () => {
  const session = (
    status: 'present' | 'absent' | 'late' | 'excused' | null,
    day: string,
  ) => ({
    status,
    sessionDate: day,
    createdAt: `${day}T09:00:00.000Z`,
  })

  it('opens at three consecutive recorded absences', () => {
    expect(
      consecutiveUnexcusedAbsences([
        session('absent', '2026-07-03'),
        session('absent', '2026-07-02'),
        session('absent', '2026-07-01'),
      ]),
    ).toBe(3)
  })

  it('does not extend a streak across a recorded reset', () => {
    expect(
      consecutiveUnexcusedAbsences([
        session('absent', '2026-07-04'),
        session('present', '2026-07-03'),
        session('absent', '2026-07-02'),
        session('absent', '2026-07-01'),
      ]),
    ).toBe(1)
  })

  it('ignores unrecorded sessions', () => {
    expect(
      consecutiveUnexcusedAbsences([
        session(null, '2026-07-04'),
        session('absent', '2026-07-03'),
        session('absent', '2026-07-02'),
        session('absent', '2026-07-01'),
      ]),
    ).toBe(3)
  })
})
