import { beforeEach, describe, expect, it } from 'vitest'
import {
  readRecentClassrooms,
  rememberClassroomVisit,
  sortByRecentVisit,
} from './recentClassrooms'

describe('recent classrooms', () => {
  beforeEach(() => localStorage.clear())

  it('puts the newest visit first', () => {
    rememberClassroomVisit('a')
    rememberClassroomVisit('b')
    expect(readRecentClassrooms()).toEqual(['b', 'a'])
  })

  it('moves a revisited classroom back to the front without duplicating it', () => {
    rememberClassroomVisit('a')
    rememberClassroomVisit('b')
    rememberClassroomVisit('a')
    expect(readRecentClassrooms()).toEqual(['a', 'b'])
  })

  it('keeps at most five', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) rememberClassroomVisit(id)
    expect(readRecentClassrooms()).toEqual(['f', 'e', 'd', 'c', 'b'])
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('agilearn-recent-classrooms', 'not json')
    expect(readRecentClassrooms()).toEqual([])
  })

  it('sorts visited classrooms first and leaves the rest in order', () => {
    const rooms = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(sortByRecentVisit(rooms, ['c']).map((r) => r.id)).toEqual(['c', 'a', 'b'])
    expect(sortByRecentVisit(rooms, []).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })
})
