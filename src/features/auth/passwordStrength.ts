export interface PasswordStrength {
  /** 0 (empty) to 3 (strong) — also the number of meter segments to fill. */
  score: 0 | 1 | 2 | 3
  label: 'Weak' | 'Fair' | 'Strong'
}

/**
 * Cheap heuristic strength score for the signup meter. Not a security control —
 * the real minimum (8 chars) is enforced by the zod schema.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Weak' }

  let points = 0
  if (password.length >= 8) points++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points++
  if (/\d/.test(password)) points++
  if (/[^A-Za-z0-9]/.test(password)) points++
  if (password.length >= 12) points++

  const score = Math.min(3, points) as PasswordStrength['score']
  const label = score >= 3 ? 'Strong' : score === 2 ? 'Fair' : 'Weak'
  return { score, label }
}
