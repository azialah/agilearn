import { useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, type AvatarColor } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toast'
import {
  useCompleteProfile,
  useProfile,
  useSaveProfilingDetails,
  useUpdateProfilePreferences,
} from '@/lib/queries/profiles'

const COLORS: AvatarColor[] = ['orange', 'plum', 'teal', 'blue']

export function ProfilePage() {
  const { data: profile } = useProfile()
  const saveName = useCompleteProfile()
  const saveDetails = useSaveProfilingDetails()
  const savePreferences = useUpdateProfilePreferences()
  const { toast } = useToast()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [school, setSchool] = useState('')
  const [location, setLocation] = useState('')
  const [loadedId, setLoadedId] = useState('')
  if (profile && loadedId !== profile.id) {
    setLoadedId(profile.id)
    setFirstName(profile.first_name ?? '')
    setLastName(profile.last_name ?? '')
    setSchool(profile.school ?? '')
    setLocation(profile.location ?? '')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    try {
      await Promise.all([
        saveName.mutateAsync({ firstName, lastName }),
        saveDetails.mutateAsync({
          school,
          location,
          teachingLevels: profile?.teaching_levels ?? [],
        }),
      ])
      toast({ title: 'Profile updated', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not update profile',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="The teaching details you shared during onboarding, kept ready for your workspace."
      />
      <Card className="overflow-hidden rounded-[2rem] p-0">
        <div className="bg-gradient-to-br from-[var(--color-accent-400)]/22 via-[var(--color-surface-1)] to-transparent px-6 py-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-[var(--color-surface-1)]/75 p-2 pr-5 shadow-[var(--shadow-card)] backdrop-blur">
            <Avatar
              name={profile?.full_name || profile?.email}
              color={profile?.avatar_color}
              className="size-12 text-base"
            />
            <div>
              <p className="font-semibold">
                {profile?.full_name || 'Your teaching profile'}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">{profile?.email}</p>
            </div>
          </div>
          <p className="mt-6 font-[var(--font-calligraphy)] text-3xl text-[var(--color-accent-350)]">
            A teacher’s work leaves a kind trace
          </p>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="rounded-[2rem] p-6">
          <h2 className="font-semibold">Teaching details</h2>
          <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                First name
                <Input
                  className="mt-1.5"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Maria"
                />
              </label>
              <label className="text-sm font-medium">
                Last name
                <Input
                  className="mt-1.5"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Santos"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              School
              <Input
                className="mt-1.5"
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                placeholder="Your school or campus"
              />
            </label>
            <label className="block text-sm font-medium">
              Location
              <Input
                className="mt-1.5"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or district"
              />
            </label>
            <div>
              <p className="text-sm font-medium">Teaching levels</p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {profile?.teaching_levels?.length
                  ? profile.teaching_levels.join(', ').replaceAll('_', ' ')
                  : 'Not set during onboarding'}
              </p>
            </div>
            <Button type="submit" loading={saveName.isPending || saveDetails.isPending}>
              Save profile
            </Button>
          </form>
        </Card>
        <Card className="rounded-[2rem] p-6">
          <h2 className="font-semibold">Avatar color</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => void savePreferences.mutateAsync({ avatarColor: color })}
                className={
                  'rounded-xl border p-3 text-left text-sm capitalize ' +
                  (profile?.avatar_color === color
                    ? 'border-[var(--color-accent-400)] bg-[var(--color-accent-400)]/10'
                    : 'border-[var(--color-border)]')
                }
              >
                <Avatar
                  name={profile?.full_name || profile?.email}
                  color={color}
                  className="mb-2"
                />
                {color}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
