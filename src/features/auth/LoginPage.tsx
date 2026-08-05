import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { supabase, REMEMBER_KEY } from '@/lib/supabase'
import { Route } from '@/routes/login'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/Label'
import { SquigglyText } from '@/components/ui/squiggly-text'
import { AuthShell, StaggerGroup, StaggerItem, StickyCta } from './wizard-ui'
import { ConsentSummaryLink } from './ConsentSummary'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/lib/locale'

export function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const { t } = useLocale()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSignIn, setShowSignIn] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.matchMedia('(max-width: 767px)').matches
  })

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    // Persist the session to localStorage only when "remember me" is checked;
    // the storage adapter in supabase.ts reads this flag.
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signInError) {
      toast({ title: signInError.message, tone: 'error' })
      return
    }
    if (redirect) {
      window.location.assign(redirect)
      return
    }
    navigate({ to: '/teacher/dashboard' })
  }

  return (
    <AuthShell
      rail={{
        eyebrow: t('authEyebrow'),
        title: t('authTitle'),
        body: t('authBody'),
        // Below lg the rail is hidden and MobileWelcome carries this link, so
        // desktop was the one width with no route to sign-up at all.
        cta: {
          label: t('newTeacher'),
          action: t('createAccount'),
          to: '/teacher/signup',
        },
      }}
      mobileBrandCentered
      mobileViewportLocked
      mobileFormTypography={showSignIn}
      mobileFormCentered={showSignIn}
      mobileHeaderActionPosition="start"
      mobileHeaderAction={
        showSignIn ? (
          <button
            type="button"
            onClick={() => setShowSignIn(false)}
            className="inline-flex items-center gap-1.5 text-sm text-(--color-ink-muted) transition-colors hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t('backToWelcome')}
          </button>
        ) : undefined
      }
    >
      {showSignIn ? (
        <StaggerGroup>
          <StaggerItem>
            <h1 className="text-lg font-semibold">{t('signIn')}</h1>
          </StaggerItem>
          <StaggerItem>
            <p className="mt-1 text-sm text-(--color-ink-muted)">
              {t('signInDescription')}
            </p>
          </StaggerItem>

          <StaggerItem>
            <form
              id="login-form"
              onSubmit={handleSubmit}
              className="mt-5 space-y-4 text-left"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t('password')}</Label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex select-none items-center gap-2 text-sm text-(--color-ink-muted)">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="size-4 rounded border-(--color-border) accent-(--color-accent-400)"
                  />
                  {t('rememberMe')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-(--color-accent-350) transition-colors hover:text-(--color-accent-300)"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </form>
          </StaggerItem>

          <StaggerItem>
            <StickyCta
              label={t('signIn')}
              type="submit"
              form="login-form"
              loading={submitting}
            />
          </StaggerItem>
        </StaggerGroup>
      ) : (
        <MobileWelcome
          title={t('authWelcomeTitle')}
          signIn={t('signIn')}
          createAccount={t('createAccount')}
          consentPrefix={t('authConsentPrefix')}
          termsConditions={t('termsConditions')}
          consentConjunction={t('authConsentConjunction')}
          privacyPolicy={t('privacyPolicy')}
          onSignIn={() => setShowSignIn(true)}
        />
      )}
    </AuthShell>
  )
}

function MobileWelcome({
  title,
  signIn,
  createAccount,
  consentPrefix,
  termsConditions,
  consentConjunction,
  privacyPolicy,
  onSignIn,
}: {
  title: string
  signIn: string
  createAccount: string
  consentPrefix: string
  termsConditions: string
  consentConjunction: string
  privacyPolicy: string
  onSignIn: () => void
}) {
  return (
    <div className="flex h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] min-h-0 flex-col overflow-hidden overscroll-none text-center">
      <div className="pt-[clamp(5rem,18dvh,10rem)]">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-accent-350)">
          Agilearn for educators
        </p>
        <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-(--color-ink)">
          <WelcomeTitle title={title} />
        </h1>
      </div>

      <div className="fixed inset-x-6 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 space-y-3">
        <Link
          to="/teacher/signup"
          className="flex h-12 w-full items-center justify-center rounded-full bg-(--color-accent-400) px-6 text-base font-semibold text-(--color-accent-fg) shadow-(--shadow-card) transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) focus-visible:ring-offset-2"
        >
          {createAccount}
        </Link>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onSignIn}
          className="w-full !font-semibold"
        >
          {signIn}
        </Button>
        <p className="px-3 pt-2 text-xs leading-relaxed text-(--color-ink-faint)">
          {consentPrefix}
          <ConsentSummaryLink document="terms">{termsConditions}</ConsentSummaryLink>
          {consentConjunction}
          <ConsentSummaryLink document="privacy">{privacyPolicy}</ConsentSummaryLink>.
        </p>
      </div>
    </div>
  )
}

function WelcomeTitle({ title }: { title: string }) {
  const phrase = 'teaching workspace'
  const [before, after] = title.split(phrase)

  if (after === undefined) return title

  return (
    <>
      {before}
      <SquigglyText
        stepDuration={150}
        scale={[1.5, 2.5]}
        baseFrequency={0.012}
        numOctaves={1}
        className="font-calligraphy text-[1.12em] font-semibold leading-[0.8] tracking-normal text-(--color-accent-350)"
      >
        {phrase}
      </SquigglyText>
      {after}
    </>
  )
}
