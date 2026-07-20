import { z } from 'zod'

/**
 * Shared password policy: 8+ chars, upper + lower case, a number, a symbol.
 * Zod reports every failing rule, but fieldErrors() below only surfaces the
 * first — so these read as a progressive checklist as the user fixes each one.
 * Exported so the teacher-onboarding schemas (features/teacher/onboarding/schemas.ts)
 * can reuse the exact same rules instead of redeclaring them.
 */
export const passwordPolicy = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[a-z]/, 'Add a lowercase letter.')
  .regex(/[A-Z]/, 'Add an uppercase letter.')
  .regex(/\d/, 'Add a number.')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol like ! ? @ or #.')

/** Password-reset — the new password. */
export const newPasswordSchema = z
  .object({
    password: passwordPolicy,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

/** Map a ZodError into a flat { field: message } record for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}
