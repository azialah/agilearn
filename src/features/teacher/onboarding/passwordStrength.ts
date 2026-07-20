export interface PasswordStrength {
  /** 0 (empty) to 3 (strong) — also the number of meter segments to fill. */
  score: 0 | 1 | 2 | 3
  label: 'Weak' | 'Fair' | 'Strong'
}

/**
 * Strength score for the signup meter, kept in lockstep with the zod
 * password policy (schemas.ts) so "Strong" never shows before a password
 * would actually pass validation.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Weak' }

  const metCount = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  const score = (
    metCount >= 5 ? 3 : metCount >= 3 ? 2 : metCount >= 1 ? 1 : 0
  ) as PasswordStrength['score']
  const label = score >= 3 ? 'Strong' : score === 2 ? 'Fair' : 'Weak'
  return { score, label }
}
