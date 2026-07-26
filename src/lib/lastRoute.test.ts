import { beforeEach, describe, expect, it } from 'vitest'
import {
  isRestorablePath,
  readLastRoute,
  saveLastRoute,
  clearLastRoute,
} from './lastRoute'

describe('isRestorablePath', () => {
  it('accepts in-app surfaces', () => {
    expect(isRestorablePath('/teacher/dashboard')).toBe(true)
    expect(isRestorablePath('/teacher/classrooms')).toBe(true)
    expect(isRestorablePath('/settings/profile')).toBe(true)
    expect(isRestorablePath('/admin/overview')).toBe(true)
  })

  it('rejects public and auth routes', () => {
    expect(isRestorablePath('/')).toBe(false)
    expect(isRestorablePath('/login')).toBe(false)
    expect(isRestorablePath('/forgot-password')).toBe(false)
    expect(isRestorablePath('/privacy')).toBe(false)
    expect(isRestorablePath('/features')).toBe(false)
  })

  it('never restores a signup step', () => {
    expect(isRestorablePath('/teacher/signup')).toBe(false)
    expect(isRestorablePath('/teacher/signup/step-2/verify-your-email')).toBe(false)
  })

  it('skips deep session links that can 404', () => {
    expect(isRestorablePath('/teacher/classrooms/abc/attendance/xyz')).toBe(false)
    // The attendance index itself is still fine.
    expect(isRestorablePath('/teacher/classrooms/abc/attendance')).toBe(true)
  })

  it('rejects non-absolute paths', () => {
    expect(isRestorablePath('teacher/dashboard')).toBe(false)
    expect(isRestorablePath('//evil.example')).toBe(false)
  })
})

describe('saveLastRoute / readLastRoute', () => {
  beforeEach(() => clearLastRoute())

  it('round-trips a restorable path', () => {
    saveLastRoute('/teacher/dashboard')
    expect(readLastRoute()).toBe('/teacher/dashboard')
  })

  it('ignores paths that are not restorable', () => {
    saveLastRoute('/login')
    expect(readLastRoute()).toBeNull()
  })

  it('does not overwrite a good value with a public route', () => {
    saveLastRoute('/teacher/classrooms')
    saveLastRoute('/privacy')
    expect(readLastRoute()).toBe('/teacher/classrooms')
  })

  it('returns null when the stored value stops being restorable', () => {
    localStorage.setItem(
      'agilearn-last-route',
      '/teacher/signup/step-1/create-your-account',
    )
    expect(readLastRoute()).toBeNull()
  })
})
