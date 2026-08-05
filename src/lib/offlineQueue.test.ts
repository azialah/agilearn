import { describe, expect, it } from 'vitest'
import { resolveWrite } from './offlineQueue'

describe('resolveWrite', () => {
  it('applies when the server row has not moved since the edit was queued', () => {
    expect(
      resolveWrite({ baseUpdatedAt: '2026-08-05T10:00:00Z' }, '2026-08-05T10:00:00Z'),
    ).toBe('apply')
  })

  it('parks a conflict when someone else edited the row after we went offline', () => {
    expect(
      resolveWrite({ baseUpdatedAt: '2026-08-05T10:00:00Z' }, '2026-08-05T11:00:00Z'),
    ).toBe('conflict')
  })

  it('applies when the server row is older than our base (clock skew, replays)', () => {
    expect(
      resolveWrite({ baseUpdatedAt: '2026-08-05T12:00:00Z' }, '2026-08-05T10:00:00Z'),
    ).toBe('apply')
  })

  it('applies a brand new row that still does not exist on the server', () => {
    expect(resolveWrite({ baseUpdatedAt: null }, null)).toBe('apply')
  })

  it('parks a new row that someone else created first', () => {
    expect(resolveWrite({ baseUpdatedAt: null }, '2026-08-05T11:00:00Z')).toBe('conflict')
  })

  it('applies when the row vanished server-side', () => {
    expect(resolveWrite({ baseUpdatedAt: '2026-08-05T10:00:00Z' }, null)).toBe('apply')
  })
})
