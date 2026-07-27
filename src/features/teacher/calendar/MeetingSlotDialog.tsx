import { useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTrigger,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import { useCreateMeetingSlot } from '@/lib/queries/calendar'
import type { CourseSubject } from '@/types/domain'

export function MeetingSlotDialog({
  subject,
  trigger,
}: {
  subject: CourseSubject
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [weekday, setWeekday] = useState('1')
  const [startsAt, setStartsAt] = useState('08:00')
  const [endsAt, setEndsAt] = useState('09:00')
  const [modality, setModality] = useState<'face_to_face' | 'online' | 'hybrid'>(
    'face_to_face',
  )
  const [location, setLocation] = useState('')
  const create = useCreateMeetingSlot()
  const { toast } = useToast()
  const valid = startsAt < endsAt
  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!valid) return
    try {
      await create.mutateAsync({
        course_subject_id: subject.id,
        weekday: Number(weekday),
        starts_at: startsAt,
        ends_at: endsAt,
        modality,
        location_label: location.trim(),
      })
      setOpen(false)
      toast({ title: 'Meeting added to Calendar', tone: 'success' })
    } catch (error) {
      toast({
        title: 'Could not add meeting',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }
  return (
    <ResponsiveDrawer open={open} onOpenChange={setOpen}>
      <ResponsiveDrawerTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="size-4" /> Schedule
          </Button>
        )}
      </ResponsiveDrawerTrigger>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={`Schedule ${subject.name}`}
          description="Calendar weeks begin on Sunday. Overlapping meetings are allowed but will be visible together."
        />
        <ResponsiveDrawerBody>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <label className="block text-sm font-medium">
              Day
              <select
                aria-label="Meeting day"
                className="mt-1.5 h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3"
                value={weekday}
                onChange={(event) => setWeekday(event.target.value)}
              >
                {[
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                ].map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Starts
                <Input
                  className="mt-1.5"
                  type="time"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                Ends
                <Input
                  className="mt-1.5"
                  type="time"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Class mode
              <select
                aria-label="Class mode"
                className="mt-1.5 h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3"
                value={modality}
                onChange={(event) => setModality(event.target.value as typeof modality)}
              >
                <option value="face_to_face">Face-to-Face</option>
                <option value="online">Online Class</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Room or meeting label
              <Input
                className="mt-1.5"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Room 505 or Meet link label"
              />
            </label>
            {!valid && (
              <p className="text-sm text-red-500">End time must be after start time.</p>
            )}
          </form>
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel="Add meeting"
          primaryDisabled={!valid}
          primaryLoading={create.isPending}
          onPrimary={() => void submit()}
          onSecondary={() => setOpen(false)}
        />
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
