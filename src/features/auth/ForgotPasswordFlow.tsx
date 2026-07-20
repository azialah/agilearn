import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PinInput } from '@/components/ui/PinInput'
import { newPasswordSchema, fieldErrors } from './schemas'
import { AuthShell, Field, FormError, StickyCta } from './wizard-ui'

type Stage = 'email' | 'code' | 'password'

const CODE_LENGTH = 6

export function ForgotPasswordFlow() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return
    }
    setCode('')
    setStage('code')
  }

  async function verify(token: string) {
    setFormError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'recovery',
    })
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return
    }
    setStage('password')
  }

  async function setNewPassword(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return
    }
    navigate({ to: '/dashboard' })
  }

  return (
    <AuthShell>
      {stage === 'email' && (
        <>
          <h1 className="text-lg font-semibold">Reset your password</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Enter your email and we'll send a {CODE_LENGTH}-digit code.
          </p>
          <form onSubmit={sendCode} className="mt-5 space-y-4">
            <Field label="Email" htmlFor="reset-email">
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </Field>
            {formError && <FormError message={formError} />}
            <StickyCta label="Send code" loading={submitting} />
          </form>
          <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
            <Link
              to="/login"
              className="text-[var(--color-accent-350)] hover:text-[var(--color-accent-300)]"
            >
              Back to sign in
            </Link>
          </p>
        </>
      )}

      {stage === 'code' && (
        <>
          <h1 className="text-lg font-semibold">Enter your code</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            We sent a {CODE_LENGTH}-digit code to {email.trim()}.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Verification code" htmlFor="reset-code">
              <PinInput
                label="Verification code"
                value={code}
                onChange={setCode}
                length={CODE_LENGTH}
                autoFocus
                disabled={submitting}
                onComplete={verify}
              />
            </Field>
            {formError && <FormError message={formError} />}
            <button
              type="button"
              onClick={() => setStage('email')}
              className="text-sm text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Use a different email
            </button>
            <StickyCta
              label="Verify"
              type="button"
              loading={submitting}
              disabled={code.length !== CODE_LENGTH}
              onClick={() => verify(code)}
            />
          </div>
        </>
      )}

      {stage === 'password' && (
        <>
          <h1 className="text-lg font-semibold">Choose a new password</h1>
          <form onSubmit={setNewPassword} className="mt-5 space-y-4">
            <Field label="New password" htmlFor="new-password" error={errors.password}>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </Field>
            <Field
              label="Confirm password"
              htmlFor="confirm-new-password"
              error={errors.confirmPassword}
            >
              <PasswordInput
                id="confirm-new-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </Field>
            {formError && <FormError message={formError} />}
            <StickyCta label="Update password" loading={submitting} />
          </form>
        </>
      )}
    </AuthShell>
  )
}
