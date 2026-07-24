import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useToast } from '@/components/ui/toast'
import { newPasswordSchema, fieldErrors } from './schemas'
import {
  AuthShell,
  Field,
  FormError,
  StaggerGroup,
  StaggerItem,
  StickyCta,
  type AuthRailContent,
} from './wizard-ui'

type Stage = 'email' | 'sent' | 'password'

// Supabase's free-tier default email template can't be customized (no OTP
// token, just a reset link) unless a custom SMTP provider is configured, so
// the link is the only recovery path for now. Its cooldown must survive a
// refresh or a closed PWA tab, so it's timestamped in localStorage rather
// than component state.
const RESEND_COOLDOWN_MS = 180_000
const resendKey = (email: string) => `agilearn:reset-resend-at:${email.toLowerCase()}`

function readResendAvailableAt(email: string): number {
  const raw = email && localStorage.getItem(resendKey(email))
  return raw ? Number(raw) : 0
}

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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resendAvailableAt, setResendAvailableAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const cooldownRemaining = Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))

  // Clicking the emailed reset link opens a fresh tab where Supabase
  // establishes a recovery session directly from the URL, with no email/sent
  // stage in between — jump straight to the password screen when that fires.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStage('password')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining])

  async function requestLink() {
    setFormError(null)
    setSubmitting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/forgot-password`,
    })
    setSubmitting(false)
    if (error) {
      setFormError(error.message)
      return false
    }
    const availableAt = Date.now() + RESEND_COOLDOWN_MS
    localStorage.setItem(resendKey(email.trim()), String(availableAt))
    setResendAvailableAt(availableAt)
    setNow(Date.now())
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
                        onChange={(e) => {
                          const next = e.target.value
                          setEmail(next)
                          setResendAvailableAt(readResendAvailableAt(next.trim()))
                        }}
                        placeholder="you@school.edu"
                      />
                    </Field>
                    {formError && <FormError message={formError} />}
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
                  {formError && <FormError message={formError} />}
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
              </StaggerItem>
            </StaggerGroup>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}
