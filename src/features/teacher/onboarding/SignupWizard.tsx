import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useResendCooldown } from '@/lib/useResendCooldown'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'
import { Check, ChevronLeft } from 'lucide-react'
import { ClassroomIcon, GradeIcon, ModuleIcon } from '@/components/icons'
import { useToast } from '@/components/ui/toast'
import {
  useSession,
  useProfile,
  useAllowedDomains,
  useCompleteProfile,
  useSaveProfilingDetails,
} from '@/lib/queries/profiles'
import type { TeachingLevel } from '@/types/domain'
import { cn } from '@/lib/cn'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { ConsentSummaryLink } from '@/features/auth/ConsentSummary'
import { credentialsSchema, nameSchema, schoolSchema } from './schemas'
import { fieldErrors } from '@/features/auth/schemas'
import { useOnboardingStore, type OnboardingStep } from './onboardingStore'
import { Stepper } from './wizard-ui'
import {
  AuthShell,
  Field,
  Hint,
  StaggerGroup,
  StaggerItem,
  StickyCta,
  type AuthRailContent,
} from '@/features/auth/wizard-ui'

const STEP_INDEX: Record<OnboardingStep, number> = {
  credentials: 0,
  verify: 1,
  name: 2,
  school: 3,
  level: 4,
  welcome: 5,
}

const STEP_COUNT = 6

/**
 * Where the emailed confirmation link lands. Back on the verify step, where the
 * session established from the URL lets the resume effect move the user forward.
 */
function signupRedirectTo(): string {
  return `${window.location.origin}/teacher/signup/step-2/verify-your-email`
}

type ToastFn = ReturnType<typeof useToast>['toast']

/**
 * Every wizard step reports validation and save failures as a toast rather than
 * inline text, so the CTA never shifts down as messages appear.
 */
function toastProblems(toast: ToastFn, messages: string[]): void {
  const real = messages.filter(Boolean)
  if (real.length === 0) return
  toast({
    title: real.length === 1 ? real[0] : 'Check your details',
    description: real.length === 1 ? undefined : real.join(' '),
    tone: 'error',
  })
}

const NAME_EXAMPLES = {
  lastName: 'Dela Cruz',
  firstName: 'Juan',
  middleName: 'Manuel',
} as const

const SUFFIXES = ['I', 'II', 'III', 'IV', 'Jr.'] as const

const ONBOARDING_RAIL: Record<OnboardingStep, Omit<AuthRailContent, 'milestones'>> = {
  credentials: {
    eyebrow: 'Teacher setup · 01 of 06',
    title: 'Create your account.',
    body: 'Start your teaching workspace with the school email you use every day.',
  },
  verify: {
    eyebrow: 'Teacher setup · 02 of 06',
    title: 'One quick check, then it’s yours.',
    body: 'Verify your school email and we’ll keep your new workspace ready for you.',
  },
  name: {
    eyebrow: 'Teacher setup · 03 of 06',
    title: 'Make Agilearn feel like your workspace.',
    body: 'Add the name your students and colleagues will see across the app.',
  },
  school: {
    eyebrow: 'Teacher setup · 04 of 06',
    title: 'Context for the classes you lead.',
    body: 'Tell us where you teach so Agilearn starts with the right context.',
  },
  level: {
    eyebrow: 'Teacher setup · 05 of 06',
    title: 'Set up for how you teach.',
    body: 'Choose the level you teach to personalize the way your workspace begins.',
  },
  welcome: {
    eyebrow: 'Teacher setup · 06 of 06',
    title: 'Your calm teaching workspace is ready.',
    body: 'Grades, attendance, and materials now have one clear home.',
  },
}

const ONBOARDING_MILESTONES = [
  'Account',
  'Verify email',
  'Your profile',
  'Your school',
  'Teaching level',
  'Ready to teach',
] as const

const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  'credentials',
  'verify',
  'name',
  'school',
  'level',
  'welcome',
]

const STEP_PATHS: Record<OnboardingStep, string> = {
  credentials: '/teacher/signup/step-1/create-your-account',
  verify: '/teacher/signup/step-2/verify-your-email',
  name: '/teacher/signup/step-3/tell-us-about-you',
  school: '/teacher/signup/step-4/your-school',
  level: '/teacher/signup/step-5/teaching-levels',
  welcome: '/teacher/signup/step-6/welcome-to-agilearn',
}

interface SignupWizardProps {
  step: OnboardingStep
}

export function SignupWizard({ step }: SignupWizardProps) {
  const { email, setStep, setEmail } = useOnboardingStore()
  const { data: session, isPending: sessionPending } = useSession()
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const verifyEmail = email || session?.user.email || profile?.email || ''

  function goToStep(nextStep: OnboardingStep) {
    setStep(nextStep)
    navigate({ to: STEP_PATHS[nextStep] })
  }

  // Resume / guard: an authenticated visitor with a completed name is already
  // onboarded — but only bounce to the dashboard if they're still on an early
  // step (credentials/verify/name); once they're past name (school/level/
  // welcome) the redirect would strand them before those optional steps ever
  // render. Unauthenticated visitors stay on whatever step the store holds.
  useEffect(() => {
    setStep(step)
    if (sessionPending) return
    if (profile?.last_name && STEP_INDEX[step] <= STEP_INDEX.name) {
      navigate({ to: '/teacher/dashboard' })
    } else if (!session && step !== 'credentials' && step !== 'verify') {
      goToStep('credentials')
    } else if (session && profile && STEP_INDEX[step] < STEP_INDEX.name) {
      goToStep('name')
    } else if (step === 'verify' && !verifyEmail && !sessionPending) {
      goToStep('credentials')
    }
  }, [session, sessionPending, profile, step, setStep, navigate, verifyEmail])

  const currentIndex = STEP_INDEX[step]
  const previousStep = currentIndex > 0 ? ONBOARDING_STEPS[currentIndex - 1] : null
  const rail: AuthRailContent = {
    ...ONBOARDING_RAIL[step],
    milestones: ONBOARDING_MILESTONES.map((label, index) => ({
      label,
      state:
        index < currentIndex
          ? 'complete'
          : index === currentIndex
            ? 'current'
            : 'upcoming',
    })),
  }

  return (
    <AuthShell
      rail={rail}
      mobileFormTypography
      mobileFormCentered
      mobileViewportLocked
      mobileHeaderActionPosition="start"
      mobileHeaderSupplement={
        <Stepper current={STEP_INDEX[step]} total={STEP_COUNT} className="mt-3" />
      }
      mobileHeaderAction={
        step === 'credentials' ? (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => previousStep && goToStep(previousStep)}
            className="inline-flex items-center gap-1.5 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back
          </button>
        )
      }
    >
      {/* opacity + margin-top (not x/scale/transform): a transform on this
          wrapper would give the StickyCta's `position: fixed` (used on
          mobile, inside each step) a new containing block, unpinning it
          from the viewport. Margin gives a subtle settle-in without that
          risk. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={reduce ? false : { opacity: 0, marginTop: 10 }}
          animate={{ opacity: 1, marginTop: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, marginTop: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {step === 'credentials' && (
            <CredentialsStep
              onDone={(e) => {
                setEmail(e)
                goToStep('verify')
              }}
            />
          )}
          {step === 'verify' && (
            <VerifyStep email={verifyEmail} onBack={() => goToStep('credentials')} />
          )}
          {step === 'name' && <NameStep onDone={() => goToStep('school')} />}
          {step === 'school' && <SchoolStep onDone={() => goToStep('level')} />}
          {step === 'level' && <LevelStep onDone={() => goToStep('welcome')} />}
          {step === 'welcome' && <WelcomeStep />}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  )
}

// Screen 1 — email / password / confirm password ----------------------------
function CredentialsStep({ onDone }: { onDone: (email: string) => void }) {
  const {
    data: allowedDomains,
    isPending: domainsPending,
    isError: domainsError,
  } = useAllowedDomains()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [consented, setConsented] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const notifyInvalid = (messages: string[]) => toastProblems(toast, messages)
  const normalizedEmail = email.trim().toLowerCase()
  const debouncedEmail = useDebouncedValue(normalizedEmail, 3000)
  const domain = debouncedEmail.split('@')[1] ?? ''
  const hasCompleteEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)
  const isAwaitingDomainCheck = hasCompleteEmail && normalizedEmail !== debouncedEmail
  const domainStatus = !hasCompleteEmail
    ? 'idle'
    : isAwaitingDomainCheck || domainsPending
      ? 'checking'
      : domainsError
        ? 'unavailable'
        : allowedDomains?.includes(domain)
          ? 'approved'
          : 'unapproved'

  const domainHint = {
    idle: 'Use a school email on an approved domain to sign up.',
    checking: 'Checking whether this school domain is approved…',
    approved: `${domain} is approved. You can continue.`,
    unapproved: `${domain} is not approved for sign-up yet. Ask your school administrator to request access.`,
    unavailable:
      'We could not check this domain right now. Your eligibility will still be verified when you continue.',
  }[domainStatus]

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = credentialsSchema.safeParse({ email, password, confirmPassword })
    if (!parsed.success) {
      notifyInvalid(Object.values(fieldErrors(parsed.error)).filter(Boolean))
      return
    }
    // The CTA is disabled without consent, but re-check here: a form can still
    // be submitted by pressing Enter in a field.
    if (!consented) {
      notifyInvalid(['Please accept the Terms of Use and Privacy Notice.'])
      return
    }
    // Friendly pre-check; the DB trigger is the real gate.
    const domain = parsed.data.email.split('@')[1]?.toLowerCase()
    if (allowedDomains && domain && !allowedDomains.includes(domain)) {
      notifyInvalid(["This email domain isn't approved for sign-up."])
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: signupRedirectTo() },
    })
    setSubmitting(false)
    if (error) {
      notifyInvalid([
        /domain not allowed/i.test(error.message)
          ? "This email domain isn't approved for sign-up."
          : error.message,
      ])
      return
    }
    toast({
      title: 'Account created',
      description: `We sent a confirmation link to ${parsed.data.email}.`,
      tone: 'success',
      native: true,
    })
    onDone(parsed.data.email)
  }

  return (
    <>
      <StaggerGroup>
        <StaggerItem>
          <h1 className="text-lg font-semibold">Create your teacher account</h1>
        </StaggerItem>
        <StaggerItem>
          <p className="mt-1 text-sm text-(--color-ink-muted)">
            Use your school email to get started.
          </p>
        </StaggerItem>
        <StaggerItem>
          {/* noValidate: zod owns validation and reports it through a toast.
              Without this the browser's native bubble fires first for
              type="email", so a malformed address would never reach our
              messaging. */}
          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                aria-describedby="email-domain-hint"
              />
              <p
                id="email-domain-hint"
                aria-live="polite"
                className={cn(
                  'mt-1.5 rounded-md px-3 py-2 text-xs',
                  domainStatus === 'approved' &&
                    'bg-(--color-success)/10 text-(--color-success)',
                  domainStatus === 'unapproved' &&
                    'bg-(--color-warning)/10 text-(--color-warning)',
                  domainStatus === 'unavailable' &&
                    'bg-(--color-danger)/10 text-(--color-danger)',
                  (domainStatus === 'idle' || domainStatus === 'checking') &&
                    'bg-(--color-surface-2) text-(--color-ink-muted)',
                )}
              >
                {domainHint}
              </p>
            </Field>
            <Field label="Password" htmlFor="password">
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
            <Field label="Confirm password" htmlFor="confirm-password">
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
              />
            </Field>
            {/* Explicit opt-in rather than a passive notice. The Terms/Privacy
                triggers are <button>s, and per the HTML spec a label does not
                forward activation to interactive descendants — so opening a
                summary can't silently tick the box. */}
            <div className="flex items-start gap-2">
              <input
                id="consent"
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-(--color-border) accent-(--color-accent-400)"
              />
              <label
                htmlFor="consent"
                className="text-xs leading-5 text-(--color-ink-faint)"
              >
                I agree to Agilearn&apos;s{' '}
                <ConsentSummaryLink
                  document="terms"
                  returnTo="/teacher/signup/step-1/create-your-account"
                >
                  Terms of Use
                </ConsentSummaryLink>{' '}
                and{' '}
                <ConsentSummaryLink
                  document="privacy"
                  returnTo="/teacher/signup/step-1/create-your-account"
                >
                  Privacy Notice
                </ConsentSummaryLink>
                .
              </label>
            </div>
            <StickyCta
              label="Continue"
              loading={submitting}
              disabled={
                !consented || domainStatus === 'checking' || domainStatus === 'unapproved'
              }
            />
          </form>
        </StaggerItem>
        <StaggerItem>
          <Link
            to="/login"
            className="mt-4 hidden h-11 w-full items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-2) text-sm font-medium text-(--color-ink) transition-colors hover:bg-(--color-surface-3) md:flex"
          >
            Back to sign in
          </Link>
        </StaggerItem>
      </StaggerGroup>
    </>
  )
}

// Screen 2 — confirm by emailed link ----------------------------------------
// Supabase's stock "Confirm signup" template sends a link, not a 6-digit token,
// so there is nothing for the user to type. Opening the link establishes the
// session via detectSessionInUrl and lands back here; the wizard's resume effect
// then carries them on to the name step.
function VerifyStep({ email, onBack }: { email: string; onBack: () => void }) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const { remaining, markSent } = useResendCooldown('signup', email)

  async function resend() {
    setSubmitting(true)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: signupRedirectTo() },
    })
    setSubmitting(false)
    if (resendError) {
      toastProblems(toast, [resendError.message])
      return
    }
    markSent()
    toast({ title: 'Link sent again', tone: 'success' })
  }

  return (
    <StaggerGroup className="text-center">
      <StaggerItem>
        <h1 className="text-lg font-semibold">Check your email</h1>
      </StaggerItem>
      <StaggerItem>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          We sent a confirmation link to {email}. Open it on this device to continue
          setting up your account.
        </p>
      </StaggerItem>
      <StaggerItem>
        <>
          <div className="mt-5 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink)"
            >
              Use a different email
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={submitting || remaining > 0}
              className="text-sm text-(--color-accent-350) transition-colors hover:text-(--color-accent-300) disabled:cursor-not-allowed disabled:text-(--color-ink-faint)"
            >
              {remaining > 0 ? `Resend in ${remaining}s` : 'Resend link'}
            </button>
          </div>
        </>
      </StaggerItem>
    </StaggerGroup>
  )
}

// Screen 3 — name -----------------------------------------------------------
function NameStep({ onDone }: { onDone: () => void }) {
  const completeProfile = useCompleteProfile()
  const { toast } = useToast()
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [suffix, setSuffix] = useState('')
  const lastNamePlaceholder = useTypingPlaceholder(NAME_EXAMPLES.lastName, 120)
  const firstNamePlaceholder = useTypingPlaceholder(NAME_EXAMPLES.firstName, 650)
  const middleNamePlaceholder = useTypingPlaceholder(NAME_EXAMPLES.middleName, 1180)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = nameSchema.safeParse({ lastName, firstName, middleName, suffix })
    if (!parsed.success) {
      toastProblems(toast, Object.values(fieldErrors(parsed.error)))
      return
    }
    try {
      await completeProfile.mutateAsync(parsed.data)
      toast({ title: 'Name saved', tone: 'success', native: true })
      onDone()
    } catch (err) {
      toastProblems(toast, [
        err instanceof Error ? err.message : 'Could not save your name.',
      ])
    }
  }

  return (
    <StaggerGroup>
      <StaggerItem>
        <h1 className="text-lg font-semibold">What's your name?</h1>
      </StaggerItem>
      <StaggerItem>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          This is how you'll appear across Agilearn.
        </p>
      </StaggerItem>
      <StaggerItem>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="Last name" htmlFor="last-name">
            <Input
              id="last-name"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={lastNamePlaceholder}
            />
          </Field>
          <Field label="First name" htmlFor="first-name">
            <Input
              id="first-name"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={firstNamePlaceholder}
            />
          </Field>
          <Field label="Middle name" htmlFor="middle-name" optional>
            <Input
              id="middle-name"
              autoComplete="additional-name"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder={middleNamePlaceholder}
            />
          </Field>
          <Field label="Suffix" htmlFor="suffix" optional>
            <select
              id="suffix"
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-base text-(--color-ink) transition-colors focus-visible:border-(--color-accent-400) focus-visible:outline-none"
            >
              <option value="">Select a suffix</option>
              {SUFFIXES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <StickyCta label="Continue" loading={completeProfile.isPending} />
        </form>
      </StaggerItem>
    </StaggerGroup>
  )
}

/** Types an example into an empty placeholder once, then leaves it as a hint. */
function useTypingPlaceholder(text: string, startDelay: number) {
  const reduce = useReducedMotion()
  const [placeholder, setPlaceholder] = useState(reduce ? text : '')

  useEffect(() => {
    if (reduce) {
      setPlaceholder(text)
      return
    }

    setPlaceholder('')
    let position = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const start = window.setTimeout(() => {
      interval = setInterval(() => {
        position += 1
        setPlaceholder(text.slice(0, position))
        if (position === text.length && interval) window.clearInterval(interval)
      }, 55)
    }, startDelay)

    return () => {
      window.clearTimeout(start)
      if (interval) window.clearInterval(interval)
    }
  }, [reduce, startDelay, text])

  return placeholder
}

// Screen 4 — school + location (optional) -----------------------------------
function SchoolStep({ onDone }: { onDone: () => void }) {
  const saveDetails = useSaveProfilingDetails()
  const { toast } = useToast()
  const [school, setSchool] = useState('')
  const [location, setLocation] = useState('')
  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = schoolSchema.safeParse({ school, location })
    if (!parsed.success) {
      toastProblems(toast, Object.values(fieldErrors(parsed.error)))
      return
    }
    try {
      await saveDetails.mutateAsync({
        school: parsed.data.school,
        location: parsed.data.location ?? '',
      })
      toast({ title: 'School saved', tone: 'success', native: true })
      onDone()
    } catch (err) {
      toastProblems(toast, [
        err instanceof Error ? err.message : 'Could not save your school.',
      ])
    }
  }

  return (
    <StaggerGroup>
      <StaggerItem>
        <h1 className="text-lg font-semibold">What school are you in?</h1>
      </StaggerItem>
      <StaggerItem>
        <p className="mt-1 text-sm text-(--color-ink-muted)">Tell us where you teach.</p>
      </StaggerItem>
      <StaggerItem>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Field label="School" htmlFor="school">
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
          <Hint>Helps us tailor Agilearn to your school.</Hint>
          <StickyCta label="Continue" loading={saveDetails.isPending} />
        </form>
      </StaggerItem>
      <StaggerItem>
        <SkipButton onClick={onDone} />
      </StaggerItem>
    </StaggerGroup>
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
  const { toast } = useToast()
  const [selected, setSelected] = useState<TeachingLevel[]>([])

  function toggle(value: TeachingLevel) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await saveDetails.mutateAsync({ teachingLevels: selected })
      toast({ title: 'Preferences saved', tone: 'success', native: true })
      onDone()
    } catch (err) {
      toastProblems(toast, [
        err instanceof Error ? err.message : 'Could not save your levels.',
      ])
    }
  }

  return (
    <StaggerGroup>
      <StaggerItem>
        <h1 className="text-lg font-semibold">What level are you teaching?</h1>
      </StaggerItem>
      <StaggerItem>
        <p className="mt-1 text-sm text-(--color-ink-muted)">Choose all that apply.</p>
      </StaggerItem>
      <StaggerItem>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label="Teaching level"
          >
            {LEVELS.map((level) => {
              const active = selected.includes(level.value)
              return (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(level.value)}
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3 py-3 text-sm transition-colors',
                    active
                      ? 'border-(--color-accent-400) bg-(--color-accent-50) text-(--color-ink)'
                      : 'border-(--color-border) bg-(--color-surface-1) text-(--color-ink-muted) hover:border-(--color-border-strong)',
                  )}
                >
                  {level.label}
                  {active && <Check className="size-4 text-(--color-accent-400)" />}
                </button>
              )
            })}
          </div>
          <Hint>Helps us build the right tools for your grade levels.</Hint>
          <StickyCta
            label="Continue"
            loading={saveDetails.isPending}
            disabled={selected.length === 0}
          />
        </form>
      </StaggerItem>
      <StaggerItem>
        <SkipButton onClick={onDone} />
      </StaggerItem>
    </StaggerGroup>
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
    icon: ClassroomIcon,
    title: 'Classrooms & rosters',
    body: 'Organize every class, section, and student roster in one calm workspace.',
  },
  {
    icon: GradeIcon,
    title: 'Weighted gradebooks',
    body: 'Set component weights once and let Agilearn compute grades consistently.',
  },
  {
    icon: ModuleIcon,
    title: 'Shared modules library',
    body: 'Store and reuse lesson plans, activities, and resources across your classes.',
  },
]

function WelcomeStep() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const reset = useOnboardingStore((s) => s.reset)
  const { toast } = useToast()
  const [index, setIndex] = useState(0)
  const feature = FEATURES[index]
  const isLast = index === FEATURES.length - 1

  function finish() {
    toast({
      title: 'Welcome to Agilearn!',
      description: "You're all set. Let's get your first classroom going.",
      tone: 'success',
      native: true,
    })
    reset()
    navigate({ to: '/teacher/dashboard' })
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
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-(--color-surface-2) text-2xl text-(--color-accent-400)">
              <feature.icon />
            </div>
            <h1 className="text-lg font-semibold">{feature.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-(--color-ink-muted)">
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
                ? 'h-2 w-6 rounded-full bg-(--color-accent-400) transition-all'
                : 'h-2 w-2 rounded-full bg-(--color-surface-3) transition-all'
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
