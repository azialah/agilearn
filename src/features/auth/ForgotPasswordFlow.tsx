import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PinInput } from '@/components/ui/PinInput'
import { useToast } from '@/components/ui/toast'
import { newPasswordSchema, fieldErrors } from './schemas'
import { AuthShell, Field, FormError, StickyCta, type AuthRailContent } from './wizard-ui'

type Stage = 'email' | 'code' | 'password'

const CODE_LENGTH = 6

const RECOVERY_RAIL: Record<Stage, AuthRailContent> = {
  email: {
    eyebrow: 'Account recovery',
    title: 'Let’s get you back to class.',
    body: 'Enter your school email and we’ll send a short verification code to restore access safely.',
  },
  code: {
    eyebrow: 'Account recovery',
    title: 'Check your inbox.',
    body: 'Your code keeps this reset tied to the school account that belongs to you.',
  },
  password: {
    eyebrow: 'Account recovery',
    title: 'Choose a fresh password.',
    body: 'One final step and your grades, attendance, and teaching materials are within reach again.',
  },
}

export function ForgotPasswordFlow() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const reduce = useReducedMotion()
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function requestCode() {
    setFormError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return false
    }
    return true
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault()
    if (await requestCode()) {
      setCode('')
      setStage('code')
    }
  }

  async function resendCode() {
    if (await requestCode()) {
      setCode('')
      toast({ title: 'New code sent', tone: 'success' })
    }
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
    toast({ title: 'Password updated', tone: 'success' })
    navigate({ to: '/teacher/dashboard' })
  }

  return (
    <AuthShell rail={RECOVERY_RAIL[stage]}>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={reduce ? false : { opacity: 0, marginTop: 10 }}
          animate={{ opacity: 1, marginTop: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, marginTop: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {stage === 'email' && (
            <>
              <h1 className="text-lg font-semibold">Reset your password</h1>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
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
              <p className="mt-4 text-center text-sm text-(--color-ink-muted)">
                <Link
                  to="/login"
                  className="text-(--color-accent-350) hover:text-(--color-accent-300)"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}

          {stage === 'code' && (
            <>
              <h1 className="text-lg font-semibold">Enter your code</h1>
              <p className="mt-1 text-sm text-(--color-ink-muted)">
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
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStage('email')}
                    className="text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={submitting}
                    className="text-sm text-(--color-accent-350) transition-colors hover:text-(--color-accent-300) disabled:opacity-50"
                  >
                    Send a new code
                  </button>
                </div>
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
                <Field
                  label="New password"
                  htmlFor="new-password"
                  error={errors.password}
                >
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
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}
