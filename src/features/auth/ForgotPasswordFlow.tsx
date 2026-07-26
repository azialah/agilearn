import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useToast } from '@/components/ui/toast'
import { useResendCooldown } from '@/lib/useResendCooldown'
import { newPasswordSchema, fieldErrors } from './schemas'
import {
  AuthShell,
  Field,
  StaggerGroup,
  StaggerItem,
  StickyCta,
  type AuthRailContent,
} from './wizard-ui'

type Stage = 'email' | 'sent' | 'password'

const RECOVERY_RAIL: Record<Stage, AuthRailContent> = {
  email: {
    eyebrow: 'Account recovery',
    title: 'Let’s get you back to class.',
    body: 'Enter your school email and we’ll send a secure link to restore access safely.',
  },
  sent: {
    eyebrow: 'Account recovery',
    title: 'Check your inbox.',
    body: 'Click the link we emailed you to pick up right where you left off.',
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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { remaining: cooldownRemaining, markSent } = useResendCooldown('reset', email)

  /** Failures surface as a toast, matching the signup wizard. */
  function notifyProblems(messages: string[]) {
    const real = messages.filter(Boolean)
    if (real.length === 0) return
    toast({
      title: real.length === 1 ? real[0] : 'Check your details',
      description: real.length === 1 ? undefined : real.join(' '),
      tone: 'error',
    })
  }

  // Clicking the emailed reset link opens a fresh tab where Supabase
  // establishes a recovery session directly from the URL, with no email/sent
  // stage in between — jump straight to the password screen when that fires.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('password')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  async function requestLink() {
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/forgot-password`,
    })
    setSubmitting(false)
    if (error) {
      notifyProblems([error.message])
      return false
    }
    markSent()
    return true
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    if (await requestLink()) {
      setStage('sent')
    }
  }

  async function resendLink() {
    if (await requestLink()) {
      toast({ title: 'Link sent again', tone: 'success' })
    }
  }

  async function setNewPassword(event: FormEvent) {
    event.preventDefault()
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      notifyProblems(Object.values(fieldErrors(parsed.error)))
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    setSubmitting(false)
    if (error) {
      notifyProblems([error.message])
      return
    }
    toast({ title: 'Password updated', tone: 'success' })
    navigate({ to: '/teacher/dashboard' })
  }

  return (
    <AuthShell rail={RECOVERY_RAIL[stage]} mobileFormTypography mobileViewportLocked>
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
              <Link
                to="/login"
                aria-label="Back to sign in"
                className="-ml-2 mb-3 inline-flex size-9 items-center justify-center rounded-full text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) lg:hidden"
              >
                <ChevronLeft className="size-5" />
              </Link>
              <StaggerGroup>
                <StaggerItem>
                  <h1 className="text-lg font-semibold">Reset your password</h1>
                </StaggerItem>
                <StaggerItem>
                  <p className="mt-1 text-sm text-(--color-ink-muted)">
                    Enter your email and we'll send you a reset link.
                  </p>
                </StaggerItem>
                <StaggerItem>
                  <form onSubmit={sendLink} className="mt-5 space-y-4">
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
                    <StickyCta
                      label={
                        cooldownRemaining > 0
                          ? `Resend in ${cooldownRemaining}s`
                          : 'Send link'
                      }
                      loading={submitting}
                      disabled={cooldownRemaining > 0}
                    />
                  </form>
                </StaggerItem>
                <StaggerItem>
                  <Link
                    to="/login"
                    className="mt-4 hidden h-11 w-full items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-2) text-sm font-medium text-(--color-ink) transition-colors hover:bg-(--color-surface-3) lg:flex"
                  >
                    Back to sign in
                  </Link>
                </StaggerItem>
              </StaggerGroup>
            </>
          )}

          {stage === 'sent' && (
            <StaggerGroup className="text-center">
              <StaggerItem>
                <h1 className="text-lg font-semibold">Check your email</h1>
              </StaggerItem>
              <StaggerItem>
                <p className="mt-1 text-sm text-(--color-ink-muted)">
                  We sent a reset link to {email.trim()}. Open it on this device to
                  continue.
                </p>
              </StaggerItem>
              <StaggerItem>
                <>
                  <div className="mt-5 flex items-center justify-center gap-6">
                    <button
                      type="button"
                      onClick={() => setStage('email')}
                      className="text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
                    >
                      Use a different email
                    </button>
                    <button
                      type="button"
                      onClick={resendLink}
                      disabled={submitting || cooldownRemaining > 0}
                      className="text-sm text-(--color-accent-350) transition-colors hover:text-(--color-accent-300) disabled:cursor-not-allowed disabled:text-(--color-ink-faint)"
                    >
                      {cooldownRemaining > 0
                        ? `Resend in ${cooldownRemaining}s`
                        : 'Resend link'}
                    </button>
                  </div>
                </>
              </StaggerItem>
            </StaggerGroup>
          )}

          {stage === 'password' && (
            <StaggerGroup>
              <StaggerItem>
                <h1 className="text-lg font-semibold">Choose a new password</h1>
              </StaggerItem>
              <StaggerItem>
                <form onSubmit={setNewPassword} className="mt-5 space-y-4">
                  <Field label="New password" htmlFor="new-password">
                    <PasswordInput
                      id="new-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </Field>
                  <Field label="Confirm password" htmlFor="confirm-new-password">
                    <PasswordInput
                      id="confirm-new-password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                    />
                  </Field>
                  <StickyCta label="Update password" loading={submitting} />
                </form>
              </StaggerItem>
            </StaggerGroup>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}
