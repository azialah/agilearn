import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export interface MeetingSlotDraft {
  weekday: string
  startsAt: string
  endsAt: string
  modality: 'face_to_face' | 'online' | 'hybrid'
  location: string
}

export const EMPTY_MEETING_DRAFT: MeetingSlotDraft = {
  weekday: '1',
  startsAt: '08:00',
  endsAt: '09:00',
  modality: 'face_to_face',
  location: '',
}

export function draftToSlot(draft: MeetingSlotDraft) {
  return {
    weekday: Number(draft.weekday),
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
  }
}

/**
 * The one meeting form. The classroom wizard's last pane and the standalone
 * "Schedule" dialog both render this — they used to carry independent copies
 * that drifted apart.
 */
export function MeetingSlotFields({
  value,
  onChange,
  conflicts,
  idPrefix = 'meeting',
  disabled,
}: {
  value: MeetingSlotDraft
  onChange: (next: MeetingSlotDraft) => void
  /** Ready-made reasons from useSlotConflicts; empty means the slot is clear. */
  conflicts: string[]
  idPrefix?: string
  disabled?: boolean
}) {
  const timesBackwards =
    !!value.startsAt && !!value.endsAt && value.startsAt >= value.endsAt

  return (
    <fieldset disabled={disabled} className="space-y-4 disabled:opacity-50">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-weekday`}>Day</Label>
        <select
          id={`${idPrefix}-weekday`}
          aria-label="Meeting day"
          value={value.weekday}
          onChange={(event) => onChange({ ...value, weekday: event.target.value })}
          className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
        >
          {DAY_NAMES.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-starts`}>Starts</Label>
          <Input
            id={`${idPrefix}-starts`}
            type="time"
            value={value.startsAt}
            onChange={(event) => onChange({ ...value, startsAt: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-ends`}>Ends</Label>
          <Input
            id={`${idPrefix}-ends`}
            type="time"
            value={value.endsAt}
            onChange={(event) => onChange({ ...value, endsAt: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-modality`}>Class mode</Label>
        <select
          id={`${idPrefix}-modality`}
          aria-label="Class mode"
          value={value.modality}
          onChange={(event) =>
            onChange({
              ...value,
              modality: event.target.value as MeetingSlotDraft['modality'],
            })
          }
          className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
        >
          <option value="face_to_face">Face-to-Face</option>
          <option value="online">Online Class</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-location`}>Room or meeting label</Label>
        <Input
          id={`${idPrefix}-location`}
          value={value.location}
          placeholder="Room 505 or Meet link label"
          onChange={(event) => onChange({ ...value, location: event.target.value })}
        />
      </div>

      {timesBackwards && (
        <p role="alert" className="text-sm text-(--color-danger)">
          End time must be after start time.
        </p>
      )}

      {conflicts.length > 0 && (
        <div
          role="alert"
          className="space-y-1 rounded-xl border border-(--color-danger)/40 bg-(--color-danger)/10 p-3"
        >
          <p className="text-sm font-medium text-(--color-ink)">
            This clashes with a class you already teach
          </p>
          {conflicts.map((reason) => (
            <p key={reason} className="text-sm text-(--color-ink-muted)">
              {reason}
            </p>
          ))}
        </div>
      )}
    </fieldset>
  )
}
