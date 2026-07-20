import { z } from 'zod'
import { passwordPolicy } from '@/features/auth/schemas'

/** Screen 1 — account credentials. Domain allowlist is checked separately. */
export const credentialsSchema = z
  .object({
    email: z.email('Enter a valid email address.'),
    password: passwordPolicy,
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
