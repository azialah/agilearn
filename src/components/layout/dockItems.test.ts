import { describe, it, expect } from 'vitest'
import { DashboardIcon } from '@/components/icons'
import { activeDockIndex, isItemActive, type DockItem } from './dockItems'

function item(key: string, to?: string, exact = false): DockItem {
  return { key, labelKey: 'dashboard', icon: DashboardIcon, to, exact }
}

const teacher: DockItem[] = [
  item('home', '/teacher/dashboard', true),
  item('classes', '/teacher/classrooms'),
  item('materials', '/teacher/modules'),
  item('calendar', '/teacher/calendar'),
  item('more'),
]

const admin: DockItem[] = [
  item('overview', '/admin/overview'),
  item('users', '/admin/users'),
  item('requests', '/admin/domain-requests'),
  item('audit', '/admin/audit-log'),
  item('more'),
]

describe('isItemActive', () => {
  it('matches a child route', () => {
    expect(
      isItemActive(item('c', '/teacher/classrooms'), '/teacher/classrooms/abc'),
    ).toBe(true)
  })

  it('honours exact for an index route', () => {
    // Without this the dashboard tab lights up for every /teacher/dashboard/* child.
    expect(
      isItemActive(item('h', '/teacher/dashboard', true), '/teacher/dashboard'),
    ).toBe(true)
    expect(
      isItemActive(item('h', '/teacher/dashboard', true), '/teacher/dashboard/x'),
    ).toBe(false)
  })

  it('does not match on a shared prefix that is not a path boundary', () => {
    expect(isItemActive(item('c', '/teacher/class'), '/teacher/classrooms')).toBe(false)
  })

  it('is never active for a route-less item', () => {
    expect(isItemActive(item('more'), '/teacher/dashboard')).toBe(false)
  })
})

describe('activeDockIndex', () => {
  it('selects the tab owning the route', () => {
    expect(activeDockIndex(teacher, '/teacher/dashboard')).toBe(0)
    expect(activeDockIndex(teacher, '/teacher/classrooms')).toBe(1)
    expect(activeDockIndex(teacher, '/teacher/classrooms/abc/grades')).toBe(1)
    expect(activeDockIndex(teacher, '/teacher/calendar')).toBe(3)
  })

  it('selects the right admin tab', () => {
    expect(activeDockIndex(admin, '/admin/overview')).toBe(0)
    expect(activeDockIndex(admin, '/admin/users')).toBe(1)
    expect(activeDockIndex(admin, '/admin/domain-requests')).toBe(2)
    expect(activeDockIndex(admin, '/admin/audit-log')).toBe(3)
  })

  it('prefers the longest match when one route nests inside another', () => {
    const nested = [item('a', '/admin'), item('b', '/admin/users')]
    expect(activeDockIndex(nested, '/admin/users/42')).toBe(1)
  })

  it('returns -1 for a route no tab owns, so no tab is falsely marked current', () => {
    expect(activeDockIndex(teacher, '/teacher/profile')).toBe(-1)
    expect(activeDockIndex(teacher, '/settings')).toBe(-1)
    expect(activeDockIndex(admin, '/teacher/dashboard')).toBe(-1)
  })
})
