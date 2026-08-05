import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { cn } from '@/lib/cn'
import type { CourseSubjectKind, CourseSubjectSession } from '@/types/domain'

/** How a subject's type reads on screen. The title never repeats it. */
export const KIND_LABEL: Record<CourseSubjectKind, string> = {
  lecture: 'Lecture',
  laboratory: 'Laboratory',
  other: 'Single session',
}

export interface SubjectDraft {
  name: string
  courseCode: string
  subjectCode: string
  sessionType: CourseSubjectSession
  description: string
  room: string
}

export const EMPTY_SUBJECT_DRAFT: SubjectDraft = {
  name: '',
  courseCode: '',
  subjectCode: '',
  sessionType: 'single',
  description: '',
  room: '',
}

/** A major is stored as two rows; a minor as one. */
export function kindsFor(sessionType: CourseSubjectSession): CourseSubjectKind[] {
  return sessionType === 'lecture_lab' ? ['lecture', 'laboratory'] : ['other']
}

/**
 * The one course-subject form, shared by the classroom wizard and the add/edit
 * subject dialog.
 *
 * `isCollege` gates the lecture/laboratory split: only college subjects have
 * one, and the database enforces the same rule, so offering it elsewhere would
 * only produce a rejected save.
 */
export function SubjectFields({
  value,
  onChange,
  isCollege,
  idPrefix = 'subject',
  namePlaceholder,
  lockSessionType = false,
}: {
  value: SubjectDraft
  onChange: (next: SubjectDraft) => void
  isCollege: boolean
  idPrefix?: string
  namePlaceholder?: string
  /** Editing one half of an existing pair — the split is already decided. */
  lockSessionType?: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Subject title</Label>
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          placeholder={namePlaceholder}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
        <p className="text-xs text-(--color-ink-faint)">
          Just the title — leave “(Lecture)” and “(Laboratory)” out, the app labels those
          for you.
        </p>
      </div>

      {isCollege && !lockSessionType && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-(--color-ink-muted)">
            How is it taught?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <SessionChoice
              selected={value.sessionType === 'single'}
              onSelect={() => onChange({ ...value, sessionType: 'single' })}
              title="One session"
              detail="A minor, or any subject without a separate lab."
            />
            <SessionChoice
              selected={value.sessionType === 'lecture_lab'}
              onSelect={() => onChange({ ...value, sessionType: 'lecture_lab' })}
              title="Lecture + laboratory"
              detail="A major. Creates both, each with its own grades and schedule."
            />
          </div>
        </fieldset>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-course-code`}>Course code</Label>
          <Input
            id={`${idPrefix}-course-code`}
            value={value.courseCode}
            placeholder="CSP313"
            onChange={(event) => onChange({ ...value, courseCode: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-subject-code`}>Subject code</Label>
          <Input
            id={`${idPrefix}-subject-code`}
            value={value.subjectCode}
            placeholder="CS-ELEC2"
            onChange={(event) => onChange({ ...value, subjectCode: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={value.description}
          placeholder="A short practical overview for this subject."
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-room`}>Room</Label>
        <Input
          id={`${idPrefix}-room`}
          value={value.room}
          placeholder="Room 505"
          onChange={(event) => onChange({ ...value, room: event.target.value })}
        />
        <p className="text-xs text-(--color-ink-faint)">
          Day and time live on the meeting schedule, so the Calendar and this page always
          agree.
        </p>
      </div>
    </div>
  )
}

function SessionChoice({
  selected,
  onSelect,
  title,
  detail,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  detail: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)',
        selected
          ? 'border-(--color-accent-400) bg-(--color-accent-400)/10'
          : 'border-(--color-border) hover:border-(--color-border-strong)',
      )}
    >
      <span className="block text-sm font-medium text-(--color-ink)">{title}</span>
      <span className="mt-0.5 block text-xs text-(--color-ink-muted)">{detail}</span>
    </button>
  )
}
