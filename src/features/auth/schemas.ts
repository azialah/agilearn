import { z } from 'zod'

/** Screen 1 — account credentials. Domain allowlist is checked separately. */
export const credentialsSchema = z
  .object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })

export type CredentialsForm = z.infer<typeof credentialsSchema>

/** Screen 3 — the teacher's name. Middle name and suffix are optional. */
export const nameSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required.'),
  firstName: z.string().trim().min(1, 'First name is required.'),
  middleName: z.string().trim().optional(),
  suffix: z.string().trim().optional(),
})

export type NameForm = z.infer<typeof nameSchema>

/** Onboarding profiling — school + optional location (skippable step). */
export const schoolSchema = z.object({
  school: z.string().trim().min(1, 'Tell us your school to continue, or skip.'),
  location: z.string().trim().optional(),
})

export type SchoolForm = z.infer<typeof schoolSchema>

/** Password-reset — the new password. */
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
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
