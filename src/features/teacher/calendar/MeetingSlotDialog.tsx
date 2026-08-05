import { useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTrigger,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import { useCreateMeetingSlot, useUpdateMeetingSlot } from '@/lib/queries/calendar'
import type { CourseSubject, SubjectMeetingSlot } from '@/types/domain'
import {
  draftToSlot,
  EMPTY_MEETING_DRAFT,
  MeetingSlotFields,
  type MeetingSlotDraft,
} from './MeetingSlotFields'
import { useSlotConflicts } from './useSlotConflicts'
import { meetingSlotErrorMessage } from './slotErrors'

function draftFromSlot(slot: SubjectMeetingSlot): MeetingSlotDraft {
  return {
    weekday: String(slot.weekday),
    startsAt: slot.starts_at.slice(0, 5),
    endsAt: slot.ends_at.slice(0, 5),
    modality: slot.modality,
    location: slot.location_label,
  }
}

export function MeetingSlotDialog({
  subject,
  slot,
  trigger,
}: {
  subject: CourseSubject
  /** Omit to add a new meeting; pass a slot to edit it. */
  slot?: SubjectMeetingSlot
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<MeetingSlotDraft>(
    slot ? draftFromSlot(slot) : EMPTY_MEETING_DRAFT,
  )
  const create = useCreateMeetingSlot()
  const update = useUpdateMeetingSlot()
  const { toast } = useToast()
  const isEditing = !!slot

  useEffect(() => {
    if (open) setDraft(slot ? draftFromSlot(slot) : EMPTY_MEETING_DRAFT)
  }, [open, slot])

  const conflicts = useSlotConflicts(draftToSlot(draft), slot?.id)
  const valid = draft.startsAt < draft.endsAt && conflicts.length === 0

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!valid) return
    const fields = {
      weekday: Number(draft.weekday),
      starts_at: draft.startsAt,
      ends_at: draft.endsAt,
      modality: draft.modality,
      location_label: draft.location.trim(),
    }
    try {
      if (slot) await update.mutateAsync({ id: slot.id, patch: fields })
      else await create.mutateAsync({ course_subject_id: subject.id, ...fields })
      setOpen(false)
      toast({
        title: isEditing ? 'Meeting updated' : 'Meeting added to Calendar',
        tone: 'success',
      })
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update meeting' : 'Could not add meeting',
        description: meetingSlotErrorMessage(error),
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
      <ResponsiveDrawerContent className="md:w-[min(32rem,calc(100%-3rem))] lg:w-[min(34rem,calc(100%-4rem))] xl:w-[min(34rem,calc(100%-8rem))]">
        <ResponsiveDrawerHeader
          title={isEditing ? `Edit ${subject.name} meeting` : `Schedule ${subject.name}`}
          description="Calendar weeks begin on Sunday. A meeting cannot overlap another class you teach."
        />
        <ResponsiveDrawerBody>
          <form onSubmit={(event) => void submit(event)}>
            <MeetingSlotFields value={draft} onChange={setDraft} conflicts={conflicts} />
          </form>
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={isEditing ? 'Save meeting' : 'Add meeting'}
          primaryDisabled={!valid}
          primaryLoading={create.isPending || update.isPending}
          onPrimary={() => void submit()}
          onSecondary={() => setOpen(false)}
        />
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}
