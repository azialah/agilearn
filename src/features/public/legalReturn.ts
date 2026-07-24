export const signupReturnPaths = [
  '/teacher/signup/step-1/create-your-account',
  '/teacher/signup/step-2/verify-your-email',
  '/teacher/signup/step-3/tell-us-about-you',
  '/teacher/signup/step-4/your-school',
  '/teacher/signup/step-5/teaching-levels',
  '/teacher/signup/step-6/welcome-to-agilearn',
] as const

const allowedSignupReturnPaths = new Set<string>(signupReturnPaths)

/**
 * Legal pages may return a teacher to a paused signup step. Restrict this to
 * known in-app onboarding paths so a public `returnTo` query can never become
 * an open redirect.
 */
export function getSafeSignupReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return allowedSignupReturnPaths.has(value) ? value : undefined
}

export function legalPageHref(page: 'privacy' | 'terms', returnTo?: string) {
  if (!returnTo) return `/${page}`
  return `/${page}?returnTo=${encodeURIComponent(returnTo)}`
}
