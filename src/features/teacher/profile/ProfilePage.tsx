import { useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { AvatarUploadDrawer } from './AvatarUploadDrawer'
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
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [suffix, setSuffix] = useState('')
  const [school, setSchool] = useState('')
  const [location, setLocation] = useState('')
  const [loadedId, setLoadedId] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)
  if (profile && loadedId !== profile.id) {
    setLoadedId(profile.id)
    setFirstName(profile.first_name ?? '')
    setMiddleName(profile.middle_name ?? '')
    setLastName(profile.last_name ?? '')
    setSuffix(profile.suffix ?? '')
    setSchool(profile.school ?? '')
    setLocation(profile.location ?? '')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    try {
      await Promise.all([
        // Always send middle_name/suffix so saving never wipes them.
        saveName.mutateAsync({ firstName, middleName, lastName, suffix }),
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
      <AvatarUploadDrawer
        open={avatarOpen}
        onOpenChange={setAvatarOpen}
        hasPhoto={!!profile?.avatar_url}
      />
      <PageHeader
        title="Profile"
        description="The teaching details you shared during onboarding, kept ready for your workspace."
      />
      <Card className="overflow-hidden rounded-4xl p-0">
        <div className="relative bg-linear-to-br from-(--color-accent-400)/25 via-(--color-surface-1) to-(--color-surface-1) px-6 py-8">
          {/* Layered warmth + a lit top edge, matching the landing CTA. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,var(--color-accent-500),transparent_55%)] opacity-[0.1]" />
          <div className="pointer-events-none absolute inset-0 rounded-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" />
          <div className="relative flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-(--color-surface-1)/75 p-2 pr-5 shadow-(--shadow-card) backdrop-blur">
              <button
                type="button"
                onClick={() => setAvatarOpen(true)}
                aria-label={
                  profile?.avatar_url
                    ? 'Change your profile photo'
                    : 'Add a profile photo'
                }
                className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
              >
                <Avatar
                  name={profile?.full_name || profile?.email}
                  color={profile?.avatar_color}
                  src={profile?.avatar_url}
                  className="size-12 text-base"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Camera className="size-4" />
                </span>
              </button>
              <div>
                <p className="font-semibold">
                  {profile?.full_name || 'Your teaching profile'}
                </p>
                <p className="text-xs text-(--color-ink-muted)">{profile?.email}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAvatarOpen(true)}
              >
                {profile?.avatar_url ? 'Edit photo' : 'Add photo'}
              </Button>
            </div>
            {(profile?.school || profile?.location) && (
              <div className="flex flex-wrap gap-2">
                {profile?.school && (
                  <span className="rounded-full border border-(--color-border) bg-(--color-surface-1)/70 px-3 py-1 text-xs text-(--color-ink-muted)">
                    {profile.school}
                  </span>
                )}
                {profile?.location && (
                  <span className="rounded-full border border-(--color-border) bg-(--color-surface-1)/70 px-3 py-1 text-xs text-(--color-ink-muted)">
                    {profile.location}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="relative mt-6 pb-1 font-(family-name:--font-calligraphy) text-3xl leading-[1.15] text-(--color-accent-350)">
            A teacher’s work leaves a kind trace
          </p>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="rounded-4xl p-6">
          <h2 className="font-semibold">Teaching details</h2>
          <form className="mt-5 space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Middle name{' '}
                <span className="font-normal text-(--color-ink-faint)">(optional)</span>
                <Input
                  className="mt-1.5"
                  value={middleName}
                  onChange={(event) => setMiddleName(event.target.value)}
                  placeholder="Manuel"
                />
              </label>
              <label className="text-sm font-medium">
                Suffix{' '}
                <span className="font-normal text-(--color-ink-faint)">(optional)</span>
                <Input
                  className="mt-1.5"
                  value={suffix}
                  onChange={(event) => setSuffix(event.target.value)}
                  placeholder="Jr."
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
              <p className="mt-1 text-sm text-(--color-ink-muted)">
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
        <Card className="rounded-4xl p-6">
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
                    ? 'border-(--color-accent-400) bg-(--color-accent-400)/10'
                    : 'border-(--color-border)')
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
