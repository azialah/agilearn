import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { PinInput } from '@/components/ui/PinInput'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { Check } from 'lucide-react'
import {
  useSession,
  useProfile,
  useAllowedDomains,
  useCompleteProfile,
  useSaveProfilingDetails,
} from '@/lib/queries/profiles'
import type { TeachingLevel } from '@/types/domain'
import { cn } from '@/lib/cn'
import { credentialsSchema, nameSchema, schoolSchema, fieldErrors } from './schemas'
import { useOnboardingStore, type OnboardingStep } from './onboardingStore'
import { AuthShell, Field, FormError, Hint, StickyCta, Stepper } from './wizard-ui'

const STEP_INDEX: Record<OnboardingStep, number> = {
  credentials: 0,
  verify: 1,
  name: 2,
  school: 3,
  level: 4,
  welcome: 5,
}

const STEP_COUNT = 6

const CODE_LENGTH = 6

export function SignupWizard() {
  const { step, email, setStep, setEmail } = useOnboardingStore()
  const { data: session } = useSession()
  const { data: profile } = useProfile()
  const navigate = useNavigate()

  // Resume / guard: an authenticated visitor with a completed name is already
  // onboarded; one without has verified but not finished — drop them at the name
  // step. Unauthenticated visitors stay on whatever step the store holds.
  useEffect(() => {
    if (!session) return
    if (profile?.last_name) {
      navigate({ to: '/dashboard' })
    } else if (profile && step !== 'welcome') {
      setStep('name')
    }
  }, [session, profile, step, setStep, navigate])

  return (
    <AuthShell>
      <Stepper current={STEP_INDEX[step]} total={STEP_COUNT} />
      {step === 'credentials' && (
        <CredentialsStep
          onDone={(e) => {
            setEmail(e)
            setStep('verify')
          }}
        />
      )}
      {step === 'verify' && (
        <VerifyStep
          email={email}
          onBack={() => setStep('credentials')}
          onVerified={() => setStep('name')}
        />
      )}
      {step === 'name' && <NameStep onDone={() => setStep('school')} />}
      {step === 'school' && <SchoolStep onDone={() => setStep('level')} />}
      {step === 'level' && <LevelStep onDone={() => setStep('welcome')} />}
      {step === 'welcome' && <WelcomeStep />}
    </AuthShell>
  )
}

// Screen 1 — email / password / confirm password ----------------------------
function CredentialsStep({ onDone }: { onDone: (email: string) => void }) {
  const { data: allowedDomains } = useAllowedDomains()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const parsed = credentialsSchema.safeParse({ email, password, confirmPassword })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    // Friendly pre-check; the DB trigger is the real gate.
    const domain = parsed.data.email.split('@')[1]?.toLowerCase()
    if (allowedDomains && domain && !allowedDomains.includes(domain)) {
      setErrors({ email: "This email domain isn't approved for sign-up." })
      return
    }
    setErrors({})
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    setSubmitting(false)
    if (error) {
      setFormError(
        /domain not allowed/i.test(error.message)
          ? "This email domain isn't approved for sign-up."
          : error.message,
      )
      return
    }
    onDone(parsed.data.email)
  }

  return (
    <>
      <h1 className="text-lg font-semibold">Create your teacher account</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Use your school email to get started.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.edu"
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <div className="pt-1.5">
            <PasswordStrengthMeter password={password} />
          </div>
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirm-password"
          error={errors.confirmPassword}
        >
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
        </Field>
        {formError && <FormError message={formError} />}
        <StickyCta label="Continue" loading={submitting} />
      </form>
    </>
  )
}

// Screen 2 — 6-digit email OTP ----------------------------------------------
function VerifyStep({
  email,
  onBack,
  onVerified,
}: {
  email: string
  onBack: () => void
  onVerified: () => void
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function verify(token: string) {
    setError(null)
    setSubmitting(true)
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    })
    setSubmitting(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    onVerified()
  }

  async function resend() {
    setError(null)
    setNotice(null)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    if (resendError) {
      setError(resendError.message)
      return
    }
    setCode('')
    setNotice(`We sent a new ${CODE_LENGTH}-digit code to ${email}.`)
  }

  return (
    <>
      <h1 className="text-lg font-semibold">Verify your email</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        {notice ?? `Enter the ${CODE_LENGTH}-digit code we sent to ${email}.`}
      </p>
      <div className="mt-5 space-y-4">
        <Field label="Verification code" htmlFor="otp-code" error={error ?? undefined}>
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
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onBack}
            className="text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
          >
            Use a different email
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={submitting}
            className="text-[var(--color-accent-350)] transition-colors hover:text-[var(--color-accent-300)] disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
        <StickyCta
          label="Verify and continue"
          type="button"
          loading={submitting}
          disabled={code.length !== CODE_LENGTH}
          onClick={() => verify(code)}
        />
      </div>
    </>
  )
}

// Screen 3 — name -----------------------------------------------------------
function NameStep({ onDone }: { onDone: () => void }) {
  const completeProfile = useCompleteProfile()
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [suffix, setSuffix] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const parsed = nameSchema.safeParse({ lastName, firstName, middleName, suffix })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    try {
      await completeProfile.mutateAsync(parsed.data)
      onDone()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save your name.')
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold">What's your name?</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        This is how you'll appear across Agilearn.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Last name" htmlFor="last-name" error={errors.lastName}>
          <Input
            id="last-name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
        <Field label="First name" htmlFor="first-name" error={errors.firstName}>
          <Input
            id="first-name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Middle name" htmlFor="middle-name" optional>
          <Input
            id="middle-name"
            autoComplete="additional-name"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
        </Field>
        <Field label="Suffix" htmlFor="suffix" optional>
          <Input
            id="suffix"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="Jr., III, ..."
          />
        </Field>
        {formError && <FormError message={formError} />}
        <StickyCta label="Continue" loading={completeProfile.isPending} />
      </form>
    </>
  )
}

// Screen 4 — school + location (optional) -----------------------------------
function SchoolStep({ onDone }: { onDone: () => void }) {
  const saveDetails = useSaveProfilingDetails()
  const [school, setSchool] = useState('')
  const [location, setLocation] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const parsed = schoolSchema.safeParse({ school, location })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    try {
      await saveDetails.mutateAsync({
        school: parsed.data.school,
        location: parsed.data.location ?? '',
      })
      onDone()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save your school.')
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold">What school are you in?</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Tell us where you teach.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="School" htmlFor="school" error={errors.school}>
          <Input
            id="school"
            autoComplete="organization"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Gordon College"
          />
        </Field>
        <Field label="Location" htmlFor="location" optional>
          <Input
            id="location"
            autoComplete="address-level2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Province"
          />
        </Field>
        <Hint>This helps Agilearn learn more about its users and improve the app.</Hint>
        {formError && <FormError message={formError} />}
        <StickyCta label="Continue" loading={saveDetails.isPending} />
      </form>
      <SkipButton onClick={onDone} />
    </>
  )
}

// Screen 5 — teaching level (optional, multi-select) ------------------------
const LEVELS: { value: TeachingLevel; label: string }[] = [
  { value: 'preschool', label: 'Preschool' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'high_school', label: 'High school' },
  { value: 'college', label: 'College' },
]

function LevelStep({ onDone }: { onDone: () => void }) {
  const saveDetails = useSaveProfilingDetails()
  const [selected, setSelected] = useState<TeachingLevel[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  function toggle(value: TeachingLevel) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await saveDetails.mutateAsync({ teachingLevels: selected })
      onDone()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save your levels.')
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold">What level are you teaching?</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Choose all that apply.</p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Teaching level">
          {LEVELS.map((level) => {
            const active = selected.includes(level.value)
            return (
              <button
                key={level.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(level.value)}
                className={cn(
                  'flex items-center justify-between rounded-[var(--radius-md)] border px-3 py-3 text-sm transition-colors',
                  active
                    ? 'border-[var(--color-accent-400)] bg-[var(--color-accent-50)] text-[var(--color-ink)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-strong)]',
                )}
              >
                {level.label}
                {active && <Check className="size-4 text-[var(--color-accent-400)]" />}
              </button>
            )
          })}
        </div>
        <Hint>This helps Agilearn learn more about its users and improve the app.</Hint>
        {formError && <FormError message={formError} />}
        <StickyCta
          label="Continue"
          loading={saveDetails.isPending}
          disabled={selected.length === 0}
        />
      </form>
      <SkipButton onClick={onDone} />
    </>
  )
}

/** Ghost skip control shared by the optional profiling steps. */
function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-2 text-center">
      <Button variant="ghost" size="sm" onClick={onClick}>
        Skip for now
      </Button>
    </div>
  )
}

// Screen 6 — welcome tour (3 sub-steps) -------------------------------------
const FEATURES = [
  {
    emoji: '📚',
    title: 'Classrooms & rosters',
    body: 'Organize every class, section, and student roster in one calm workspace.',
  },
  {
    emoji: '🎯',
    title: 'Weighted gradebooks',
    body: 'Set component weights once and let Agilearn compute grades consistently.',
  },
  {
    emoji: '🗂️',
    title: 'Shared modules library',
    body: 'Store and reuse lesson plans, activities, and resources across your classes.',
  },
]

function WelcomeStep() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const reset = useOnboardingStore((s) => s.reset)
  const [index, setIndex] = useState(0)
  const feature = FEATURES[index]
  const isLast = index === FEATURES.length - 1

  function finish() {
    reset()
    navigate({ to: '/dashboard' })
  }

  return (
    <>
      <div className="mt-1 min-h-[200px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-3xl">
              {feature.emoji}
            </div>
            <h1 className="text-lg font-semibold">{feature.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-[var(--color-ink-muted)]">
              {feature.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {FEATURES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to highlight ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={
              i === index
                ? 'h-2 w-6 rounded-full bg-[var(--color-accent-400)] transition-all'
                : 'h-2 w-2 rounded-full bg-[var(--color-surface-3)] transition-all'
            }
          />
        ))}
      </div>

      <StickyCta
        label={isLast ? 'Go to dashboard' : 'Next'}
        type="button"
        onClick={() => (isLast ? finish() : setIndex(index + 1))}
      />
      {!isLast && (
        <div className="mt-2 text-center">
          <Button variant="ghost" size="sm" onClick={finish}>
            Skip
          </Button>
        </div>
      )}
    </>
  )
}
