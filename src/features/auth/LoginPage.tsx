import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { supabase, REMEMBER_KEY } from '@/lib/supabase'
import { Route } from '@/routes/login'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/Label'
import { AuthShell } from './wizard-ui'
import { useLocale } from '@/lib/locale'

export function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()
  const { t } = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
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
      setError(signInError.message)
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
      rail={{ eyebrow: t('authEyebrow'), title: t('authTitle'), body: t('authBody') }}
    >
      <h1 className="text-lg font-semibold">{t('signIn')}</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        {t('signInDescription')}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <Link
              to="/forgot-password"
              className="text-sm text-[var(--color-accent-350)] transition-colors hover:text-[var(--color-accent-300)]"
            >
              {t('forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 rounded border-[var(--color-border)] accent-[var(--color-accent-400)]"
          />
          {t('rememberMe')}
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          loading={submitting}
        >
          {t('signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
        {t('newTeacher')}{' '}
        <Link
          to="/teacher/signup"
          className="font-medium text-[var(--color-accent-350)] transition-colors hover:text-[var(--color-accent-300)]"
        >
          {t('createAccount')}
        </Link>
      </p>
    </AuthShell>
  )
}
