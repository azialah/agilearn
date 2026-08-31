import { useState, type FormEvent } from 'react'
import { KeyRound, Palette } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
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
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/lib/locale'
import { supabase } from '@/lib/supabase'
import {
  useProfile,
  useSignOut,
  useUpdateProfilePreferences,
} from '@/lib/queries/profiles'
import { newPasswordSchema, fieldErrors } from '@/features/auth/schemas'
import type { AvatarColor } from '@/components/ui/Avatar'
import { SettingsScreenHeader } from '../SettingsScreenHeader'
import { avatarColors, getErrorMessage } from '../shared'

export function ProfileSection() {
  const { data: profile } = useProfile()
  const preferences = useUpdateProfilePreferences()
  const { toast } = useToast()
  const { t } = useLocale()
  const signOutAndRedirect = useSignOut()
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

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
      await signOutAndRedirect()
    } catch (error) {
      toast({ title: 'Could not sign out', description: getErrorMessage(error) })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsScreenHeader
        title={t('profile')}
        description="Your account, avatar, and sign-in security."
      />

      <Card className="rounded-4xl">
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
            Upload a photo on your profile page, or pick an accent color for the generated
            initials avatar.
          </p>
        </CardHeader>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-(--color-border) bg-(--color-surface-2) py-2 pl-2 pr-5">
            <Avatar
              name={profile?.full_name || profile?.email}
              color={profile?.avatar_color}
              src={profile?.avatar_url}
              className="size-14 text-base"
            />
            <div>
              <p className="font-medium">{profile?.full_name || 'Your profile'}</p>
              <p className="text-sm text-(--color-ink-muted)">{profile?.email}</p>
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
            <KeyRound className="size-4 text-(--color-accent-350)" /> Change password
          </CardTitle>
          <p className="text-sm text-(--color-ink-muted)">
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
              <p className="text-sm text-(--color-danger)">{passwordError}</p>
            )}
            <Button type="submit" loading={savingPassword}>
              Update password
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))]">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Sign out of this device</p>
            <p className="text-sm text-(--color-ink-muted)">
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
                className="flex flex-col items-center gap-2 rounded-md border border-(--color-border) p-3 text-sm transition-colors hover:border-(--color-accent-400) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) disabled:cursor-not-allowed disabled:opacity-50"
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
