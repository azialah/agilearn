import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell, Command, KeyRound, Languages, Palette, SunMoon } from 'lucide-react'
import { Avatar, type AvatarColor } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { PageHeader } from '@/components/layout/PageHeader'
import { useToast } from '@/components/ui/toast'
import { useLocale, type AppLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'
import { supabase } from '@/lib/supabase'
import { signOut, useProfile, useUpdateProfilePreferences } from '@/lib/queries/profiles'
import { newPasswordSchema, fieldErrors } from '@/features/auth/schemas'

const avatarColors: { value: AvatarColor; label: string }[] = [
  { value: 'orange', label: 'Amber' },
  { value: 'plum', label: 'Plum' },
  { value: 'teal', label: 'Teal' },
  { value: 'blue', label: 'Blue' },
]

/** Reads/requests the browser's Notification permission (used for native OS toasts). */
function useNotificationPermission() {
  const supported = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  )

  useEffect(() => {
    if (supported) setPermission(Notification.permission)
  }, [supported])

  async function request() {
    if (!supported) return
    setPermission(await Notification.requestPermission())
  }

  return { supported, permission, request }
}

export function SettingsPage() {
  const { data: profile } = useProfile()
  const { locale, setLocale, t } = useLocale()
  const preferences = useUpdateProfilePreferences()
  const { toast } = useToast()
  const navigate = useNavigate()
  const notifications = useNotificationPermission()
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  async function handleLocaleChange(nextLocale: AppLocale) {
    setLocale(nextLocale)
    try {
      await preferences.mutateAsync({ preferredLocale: nextLocale })
      toast({ title: t('saved') })
    } catch (error) {
      setLocale(locale)
      toast({ title: 'Could not save language', description: getErrorMessage(error) })
    }
  }

  async function handleAvatarColor(avatarColor: AvatarColor) {
    try {
      await preferences.mutateAsync({ avatarColor })
      setAvatarDialogOpen(false)
      toast({ title: 'Avatar updated' })
    } catch (error) {
      toast({ title: 'Could not update avatar', description: getErrorMessage(error) })
    }
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setPasswordError(
        fieldErrors(parsed.error).password || fieldErrors(parsed.error).confirmPassword,
      )
      return
    }

    setSavingPassword(true)
    setPasswordError(null)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setPasswordError(error.message)
        return
      }
      setPassword('')
      setConfirmPassword('')
      toast({ title: 'Password updated' })
    } catch (error) {
      setPasswordError(getErrorMessage(error))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate({ to: '/login' })
    } catch (error) {
      toast({ title: 'Could not sign out', description: getErrorMessage(error) })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t('settings')}
        description="Personalize and secure your teaching workspace."
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Your generated avatar keeps your workspace personal without needing an image
            upload.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              name={profile?.full_name || profile?.email}
              color={profile?.avatar_color}
              className="size-14 text-base"
            />
            <div>
              <p className="font-medium">{profile?.full_name || 'Your profile'}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">{profile?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setAvatarDialogOpen(true)}>
            <Palette className="size-4" /> Customize avatar
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SunMoon className="size-4 text-[var(--color-accent-350)]" /> Appearance
          </CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Choose how Agilearn looks on this device.
          </p>
        </CardHeader>
        <CardBody>
          <p className="text-sm font-medium">Theme</p>
          <div className="mt-2">
            <ThemeToggle />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-[var(--color-accent-350)]" /> Notifications
          </CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Get a system notification for account milestones, like finishing onboarding,
            even when Agilearn isn&apos;t the active tab.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {!notifications.supported
                ? 'Not supported on this browser'
                : notifications.permission === 'granted'
                  ? 'Notifications are on'
                  : notifications.permission === 'denied'
                    ? 'Notifications are blocked'
                    : 'Notifications are off'}
            </p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {notifications.permission === 'denied'
                ? 'Blocked in your browser settings — allow them for this site to turn back on.'
                : "We'll ask your browser for permission first."}
            </p>
          </div>
          {notifications.supported && notifications.permission === 'default' && (
            <Button variant="outline" onClick={() => void notifications.request()}>
              <Bell className="size-4" /> Enable notifications
            </Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
          <Command
            className="size-4 shrink-0 text-[var(--color-accent-350)]"
            aria-hidden
          />
          Press{' '}
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs text-[var(--color-ink)]">
            {isMac ? '⌘' : 'Ctrl'}
          </kbd>{' '}
          +{' '}
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs text-[var(--color-ink)]">
            K
          </kbd>{' '}
          anywhere in the app to jump to a page.
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4 text-[var(--color-accent-350)]" />{' '}
            {t('displayLanguage')}
          </CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {t('languageDescription')}
          </p>
        </CardHeader>
        <CardBody>
          <label
            className="block max-w-sm text-sm font-medium"
            htmlFor="preferred-locale"
          >
            {t('displayLanguage')}
          </label>
          <select
            id="preferred-locale"
            value={locale}
            onChange={(event) => void handleLocaleChange(event.target.value as AppLocale)}
            disabled={preferences.isPending}
            className="mt-2 h-9 w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-sm text-[var(--color-ink)] focus-visible:border-[var(--color-accent-400)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="en">{t('english')}</option>
            <option value="tl">{t('tagalog')}</option>
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-[var(--color-accent-350)]" /> Change password
          </CardTitle>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Already signed in? Set a new password here. Use the recovery flow only when
            you cannot sign in.
          </p>
        </CardHeader>
        <CardBody>
          <form className="max-w-sm space-y-4" onSubmit={handlePasswordChange}>
            <div>
              <label className="text-sm font-medium" htmlFor="new-password">
                New password
              </label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <PasswordInput
                id="confirm-new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-[var(--color-danger)]">{passwordError}</p>
            )}
            <Button type="submit" loading={savingPassword}>
              Update password
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border-[color:color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))]">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sign out of this device</p>
            <p className="text-sm text-[var(--color-ink-muted)]">
              You can sign back in whenever you need.
            </p>
          </div>
          <Button variant="outline" onClick={() => void handleSignOut()}>
            {t('signOut')}
          </Button>
        </CardBody>
      </Card>

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose an avatar color</DialogTitle>
            <DialogDescription>
              Your initials stay readable while the accent color gives your profile a
              distinct presence.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {avatarColors.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => void handleAvatarColor(option.value)}
                disabled={preferences.isPending}
                className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm transition-colors hover:border-[var(--color-accent-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Avatar
                  name={profile?.full_name || profile?.email}
                  color={option.value}
                  className="size-11"
                />
                {option.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAvatarDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.'
}
