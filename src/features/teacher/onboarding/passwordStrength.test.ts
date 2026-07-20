import { describe, expect, it } from 'vitest'
import { passwordStrength } from './passwordStrength'

describe('passwordStrength', () => {
  it('scores an empty password as 0/Weak', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: 'Weak' })
  })

  it('scores a short simple password as Weak', () => {
    expect(passwordStrength('abc').label).toBe('Weak')
  })

  it('scores a decent mixed password as Fair', () => {
    // length>=8 + digit = 2 points → Fair
    expect(passwordStrength('abcdef12').label).toBe('Fair')
  })

  it('scores a long mixed-case password with digits and symbols as Strong', () => {
    const s = passwordStrength('Str0ng!Passw0rd')
    expect(s.score).toBe(3)
    expect(s.label).toBe('Strong')
  })

  it('never exceeds a score of 3', () => {
    expect(passwordStrength('A'.repeat(40) + 'a1!').score).toBe(3)
  })
})
