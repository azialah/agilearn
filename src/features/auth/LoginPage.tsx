import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { supabase, REMEMBER_KEY } from '@/lib/supabase'
import { Route } from '@/routes/login'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Label } from '@/components/ui/Label'
import { Card } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function LoginPage() {
  const navigate = useNavigate()
  const { redirect } = Route.useSearch()

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
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[var(--color-surface-0)] px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(50%_100%_at_50%_0%,var(--color-accent-500),transparent)] opacity-[0.14]" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="relative w-full max-w-sm">
        <div className="p-6">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
              A
            </span>
            <span className="text-lg font-semibold tracking-tight">Agilearn</span>
          </div>

          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Welcome back. Sign in to your Agilearn account.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-[var(--color-accent-350)] transition-colors hover:text-[var(--color-accent-300)]"
                >
                  Forgot password?
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
              Remember me
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
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
            New teacher?{' '}
            <Link
              to="/signup"
              className="font-medium text-[var(--color-accent-350)] transition-colors hover:text-[var(--color-accent-300)]"
            >
              Create an account
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
