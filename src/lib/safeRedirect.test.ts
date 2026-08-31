import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from './safeRedirect'

const ORIGIN = 'https://agilearn.app'

// Built from char codes so no shell, editor, or escaping layer between here and
// the assertion can quietly alter the byte under test.
const BACKSLASH = `/${String.fromCharCode(92)}evil.com`
const TAB = `/${String.fromCharCode(9)}/evil.com`
const NEWLINE = `/${String.fromCharCode(10)}/evil.com`
const CARRIAGE_RETURN = `/${String.fromCharCode(13)}/evil.com`

describe('safeRedirectPath', () => {
  it('keeps an ordinary in-app path', () => {
    expect(safeRedirectPath('/teacher/dashboard', ORIGIN)).toBe('/teacher/dashboard')
  })

  it('preserves the query string', () => {
    expect(safeRedirectPath('/teacher/classrooms?tab=grades', ORIGIN)).toBe(
      '/teacher/classrooms?tab=grades',
    )
  })

  it('drops the fragment, which would otherwise carry an implicit-grant token', () => {
    // The sink is a full document load and the Supabase client is created with
    // detectSessionInUrl, so a same-origin hash of auth params would be parsed
    // on arrival and overwrite the session the victim just signed in with.
    expect(safeRedirectPath('/teacher/classrooms?tab=grades#top', ORIGIN)).toBe(
      '/teacher/classrooms?tab=grades',
    )
    expect(
      safeRedirectPath(
        '/teacher/dashboard#access_token=attacker&refresh_token=attacker&token_type=bearer',
        ORIGIN,
      ),
    ).toBe('/teacher/dashboard')
    expect(safeRedirectPath('/reset#type=recovery', ORIGIN)).toBe('/reset')
  })

  it('strips userinfo from an otherwise same-origin absolute URL', () => {
    expect(safeRedirectPath('https://user:pass@agilearn.app/settings', ORIGIN)).toBe(
      '/settings',
    )
  })

  it('treats a userinfo-looking host as the off-origin target it is', () => {
    expect(safeRedirectPath('https://agilearn.app@evil.com', ORIGIN)).toBeUndefined()
    expect(safeRedirectPath('https://user:pass@evil.com', ORIGIN)).toBeUndefined()
    expect(safeRedirectPath('https://agilearn.app.evil.com', ORIGIN)).toBeUndefined()
  })

  it('keeps a percent-encoded separator as a path, not a host', () => {
    expect(safeRedirectPath('/%2f%2fevil.com', ORIGIN)).toBe('/%2f%2fevil.com')
    expect(safeRedirectPath('/@evil.com', ORIGIN)).toBe('/@evil.com')
  })

  it('honours a port in the origin', () => {
    const dev = 'http://localhost:5173'
    expect(safeRedirectPath('/teacher/dashboard', dev)).toBe('/teacher/dashboard')
    expect(safeRedirectPath('http://localhost:5174/x', dev)).toBeUndefined()
    expect(safeRedirectPath('https://agilearn.app/x', dev)).toBeUndefined()
  })

  it('returns undefined when the origin itself is unparseable', () => {
    expect(safeRedirectPath('/teacher/dashboard', 'null')).toBeUndefined()
    expect(safeRedirectPath('/teacher/dashboard', 'not a url')).toBeUndefined()
  })

  it('accepts an absolute URL on the same origin, returning it as a path', () => {
    expect(safeRedirectPath(`${ORIGIN}/settings`, ORIGIN)).toBe('/settings')
  })

  describe('rejects off-origin targets', () => {
    it.each([
      ['protocol-relative', '//evil.com'],
      ['absolute https', 'https://evil.com/phish'],
      ['absolute http', 'http://evil.com'],
      // The three the old /^\/(?!\/)/ guard let through. Each resolves to
      // https://evil.com/ once the URL parser sees it.
      ['backslash after the slash', BACKSLASH],
      ['tab between the slashes', TAB],
      ['newline between the slashes', NEWLINE],
      ['carriage return between the slashes', CARRIAGE_RETURN],
    ])('%s', (_label, raw) => {
      expect(safeRedirectPath(raw, ORIGIN)).toBeUndefined()
    })
  })

  it('rejects a javascript: URL', () => {
    expect(safeRedirectPath('javascript:alert(1)', ORIGIN)).toBeUndefined()
  })

  it('rejects a data: URL', () => {
    expect(
      safeRedirectPath('data:text/html,<script>alert(1)</script>', ORIGIN),
    ).toBeUndefined()
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an object', { toString: () => '/teacher/dashboard' }],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('rejects %s', (_label, raw) => {
    expect(safeRedirectPath(raw, ORIGIN)).toBeUndefined()
  })

  it('never returns a value that resolves off-origin', () => {
    // The property that actually matters. Includes inputs that are ACCEPTED,
    // so the assertion really runs — an all-rejected list made this vacuous.
    const candidates = [
      // rejected
      '//evil.com',
      BACKSLASH,
      TAB,
      NEWLINE,
      CARRIAGE_RETURN,
      'https://evil.com',
      `/${String.fromCharCode(92)}${String.fromCharCode(92)}evil.com`,
      `${String.fromCharCode(92)}evil.com`,
      `${String.fromCharCode(11)}//evil.com`,
      `${String.fromCharCode(12)}//evil.com`,
      ' //evil.com',
      'https://agilearn.app@evil.com',
      '\uff0f\uff0fevil.com',
      'blob:https://evil.com/x',
      'about:blank',
      'vbscript:msgbox(1)',
      // accepted, and must still resolve on-origin
      '/teacher/dashboard',
      '/@evil.com',
      '/%2f%2fevil.com',
      '%2F%2Fevil.com',
      'https://user:pass@agilearn.app/x',
      `/${String.fromCharCode(0)}evil.com`,
    ]
    let accepted = 0
    for (const raw of candidates) {
      const safe = safeRedirectPath(raw, ORIGIN)
      if (safe === undefined) continue
      accepted += 1
      expect(new URL(safe, ORIGIN).origin).toBe(ORIGIN)
      expect(safe.startsWith('/')).toBe(true)
      expect(safe).not.toContain('#')
    }
    // Guards the guard: if a refactor started rejecting everything, the loop
    // above would pass while testing nothing.
    expect(accepted).toBeGreaterThanOrEqual(5)
  })
})
