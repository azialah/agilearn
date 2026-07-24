import { describe, expect, it } from 'vitest'
import { getSafeSignupReturnTo, legalPageHref } from './legalReturn'

describe('getSafeSignupReturnTo', () => {
  it('accepts a known teacher onboarding step', () => {
    expect(getSafeSignupReturnTo('/teacher/signup/step-3/tell-us-about-you')).toBe(
      '/teacher/signup/step-3/tell-us-about-you',
    )
  })

  it('rejects external, protocol-relative, and unknown paths', () => {
    expect(getSafeSignupReturnTo('https://example.com')).toBeUndefined()
    expect(getSafeSignupReturnTo('//example.com')).toBeUndefined()
    expect(getSafeSignupReturnTo('/teacher/dashboard')).toBeUndefined()
  })
})

describe('legalPageHref', () => {
  it('preserves only a supplied validated return path in the legal page link', () => {
    expect(legalPageHref('privacy', '/teacher/signup/step-1/create-your-account')).toBe(
      '/privacy?returnTo=%2Fteacher%2Fsignup%2Fstep-1%2Fcreate-your-account',
    )
  })
})
