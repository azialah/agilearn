import { ChoiceButton } from '@/components/ui/ChoiceButton'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import type {
  CourseSubjectKind,
  CourseSubjectSession,
  GradingTemplate,
} from '@/types/domain'

/** How a subject's type reads on screen. The title never repeats it. */
export const KIND_LABEL: Record<CourseSubjectKind, string> = {
  lecture: 'Lecture',
  laboratory: 'Laboratory',
  other: 'Single session',
}

/** How a grading template reads on screen — order matters: shown non-college
 *  first for non-college subjects, college first for college subjects. */
export const GRADING_TEMPLATE_LABEL: Record<GradingTemplate, string> = {
  custom: 'Percentage only (no conversion)',
  basic_education: 'DepEd — Elementary / Junior High',
  senior_high: 'DepEd — Senior High',
  higher_education: 'CHED — College (1.00–5.00)',
}

export interface SubjectDraft {
  name: string
  courseCode: string
  subjectCode: string
  sessionType: CourseSubjectSession
  gradingTemplate: GradingTemplate
  description: string
  room: string
}

export const EMPTY_SUBJECT_DRAFT: SubjectDraft = {
  name: '',
  courseCode: '',
  subjectCode: '',
  sessionType: 'single',
  gradingTemplate: 'custom',
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
 * only produce a rejected save. It also gates "Course code" — a college-only
 * concept — and demotes "Subject code" to a single de-emphasized optional
 * field for every other level, rather than the two-column grid college gets.
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
      <Field
        label="Subject title"
        htmlFor={`${idPrefix}-name`}
        hint="Just the title — leave “(Lecture)” and “(Laboratory)” out, the app labels those for you."
      >
        <Input
          id={`${idPrefix}-name`}
          value={value.name}
          placeholder={namePlaceholder}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>

      {isCollege && !lockSessionType && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-(--color-ink-muted)">
            How is it taught?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceButton
              selected={value.sessionType === 'single'}
              onSelect={() => onChange({ ...value, sessionType: 'single' })}
              title="One session"
              detail="A minor, or any subject without a separate lab."
            />
            <ChoiceButton
              selected={value.sessionType === 'lecture_lab'}
              onSelect={() => onChange({ ...value, sessionType: 'lecture_lab' })}
              title="Lecture + laboratory"
              detail="A major. Creates both, each with its own grades and schedule."
            />
          </div>
        </fieldset>
      )}

      {isCollege ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Course code" htmlFor={`${idPrefix}-course-code`}>
            <Input
              id={`${idPrefix}-course-code`}
              value={value.courseCode}
              placeholder="CSP313"
              onChange={(event) => onChange({ ...value, courseCode: event.target.value })}
            />
          </Field>
          <Field label="Subject code" htmlFor={`${idPrefix}-subject-code`}>
            <Input
              id={`${idPrefix}-subject-code`}
              value={value.subjectCode}
              placeholder="CS-ELEC2"
              onChange={(event) =>
                onChange({ ...value, subjectCode: event.target.value })
              }
            />
          </Field>
        </div>
      ) : (
        <Field
          label="Subject code (optional)"
          htmlFor={`${idPrefix}-subject-code`}
          hint="If your school uses short subject codes, add one here."
        >
          <Input
            id={`${idPrefix}-subject-code`}
            value={value.subjectCode}
            placeholder="MATH7"
            onChange={(event) => onChange({ ...value, subjectCode: event.target.value })}
          />
        </Field>
      )}

      <Field
        label="Report-card grade"
        htmlFor={`${idPrefix}-grading-template`}
        hint="Converts the computed percentage into what the report card shows. Leave as percentage only for a raw number."
      >
        <Select
          value={value.gradingTemplate}
          onValueChange={(next) =>
            onChange({ ...value, gradingTemplate: next as GradingTemplate })
          }
        >
          <SelectTrigger id={`${idPrefix}-grading-template`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(isCollege
              ? ([
                  'higher_education',
                  'basic_education',
                  'senior_high',
                  'custom',
                ] as const)
              : ([
                  'basic_education',
                  'senior_high',
                  'higher_education',
                  'custom',
                ] as const)
            ).map((template) => (
              <SelectItem key={template} value={template}>
                {GRADING_TEMPLATE_LABEL[template]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Description" htmlFor={`${idPrefix}-description`}>
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={value.description}
          placeholder="A short practical overview for this subject."
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm"
        />
      </Field>

      <Field
        label="Room"
        htmlFor={`${idPrefix}-room`}
        hint="Day and time live on the meeting schedule, so the Calendar and this page always agree."
      >
        <Input
          id={`${idPrefix}-room`}
          value={value.room}
          placeholder="Room 505"
          onChange={(event) => onChange({ ...value, room: event.target.value })}
        />
      </Field>
    </div>
  )
}
