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
import { useLocale } from '@/lib/locale'
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
  const { t } = useLocale()
  return (
    <div className="space-y-4">
      <Field
        label={t('subjectDialogTitleLabel')}
        htmlFor={`${idPrefix}-name`}
        hint={t('subjectDialogTitleHint')}
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
            {t('subjectDialogHowTaughtLegend')}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceButton
              selected={value.sessionType === 'single'}
              onSelect={() => onChange({ ...value, sessionType: 'single' })}
              title={t('subjectDialogSingleSessionTitle')}
              detail={t('subjectDialogSingleSessionDetail')}
            />
            <ChoiceButton
              selected={value.sessionType === 'lecture_lab'}
              onSelect={() => onChange({ ...value, sessionType: 'lecture_lab' })}
              title={t('subjectDialogLectureLabTitle')}
              detail={t('subjectDialogLectureLabDetail')}
            />
          </div>
        </fieldset>
      )}

      {isCollege ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t('subjectDialogCourseCodeLabel')}
            htmlFor={`${idPrefix}-course-code`}
          >
            <Input
              id={`${idPrefix}-course-code`}
              value={value.courseCode}
              placeholder={t('subjectDialogCourseCodePlaceholder')}
              onChange={(event) => onChange({ ...value, courseCode: event.target.value })}
            />
          </Field>
          <Field
            label={t('subjectDialogSubjectCodeLabel')}
            htmlFor={`${idPrefix}-subject-code`}
          >
            <Input
              id={`${idPrefix}-subject-code`}
              value={value.subjectCode}
              placeholder={t('subjectDialogSubjectCodePlaceholderCollege')}
              onChange={(event) =>
                onChange({ ...value, subjectCode: event.target.value })
              }
            />
          </Field>
        </div>
      ) : (
        <Field
          label={t('subjectDialogSubjectCodeOptionalLabel')}
          htmlFor={`${idPrefix}-subject-code`}
          hint={t('subjectDialogSubjectCodeHint')}
        >
          <Input
            id={`${idPrefix}-subject-code`}
            value={value.subjectCode}
            placeholder={t('subjectDialogSubjectCodePlaceholder')}
            onChange={(event) => onChange({ ...value, subjectCode: event.target.value })}
          />
        </Field>
      )}

      <Field
        label={t('subjectDialogGradingLabel')}
        htmlFor={`${idPrefix}-grading-template`}
        hint={t('subjectDialogGradingHint')}
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

      <Field
        label={t('subjectDialogDescriptionLabel')}
        htmlFor={`${idPrefix}-description`}
      >
        <textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={value.description}
          placeholder={t('subjectDialogDescriptionPlaceholder')}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm"
        />
      </Field>

      <Field
        label={t('subjectDialogRoomLabel')}
        htmlFor={`${idPrefix}-room`}
        hint={t('subjectDialogRoomHint')}
      >
        <Input
          id={`${idPrefix}-room`}
          value={value.room}
          placeholder={t('subjectDialogRoomPlaceholder')}
          onChange={(event) => onChange({ ...value, room: event.target.value })}
        />
      </Field>
    </div>
  )
}
