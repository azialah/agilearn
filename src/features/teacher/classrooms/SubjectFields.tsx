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
import { useTransmutationTables } from '@/lib/queries/grades'
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
  /** null uses the built-in conversion for the template. */
  transmutationTableId: string | null
  /** 0 = off. 60 gives the Philippine college (raw/max)*40+60 convention. */
  gradeFloor: number
  ungradedAsZero: boolean
  description: string
  room: string
}

export const EMPTY_SUBJECT_DRAFT: SubjectDraft = {
  name: '',
  courseCode: '',
  subjectCode: '',
  sessionType: 'single',
  gradingTemplate: 'custom',
  transmutationTableId: null,
  gradeFloor: 0,
  ungradedAsZero: false,
  description: '',
  room: '',
}

/** The value the picker uses for "no explicit table" — Radix Select cannot
 *  hold an empty-string item value. */
export const NO_TABLE = 'built-in'

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
  showScoringPolicy = true,
}: {
  value: SubjectDraft
  onChange: (next: SubjectDraft) => void
  isCollege: boolean
  idPrefix?: string
  namePlaceholder?: string
  /** Editing one half of an existing pair — the split is already decided. */
  lockSessionType?: boolean
  /**
   * Conversion table, grade floor and blank-as-zero. Off in the new-classroom
   * wizard, which keeps its own flat form shape and is meant to be a fast path
   * to a classroom — these are grading decisions the teacher makes later, in
   * the subject dialog, alongside the rest of the gradebook setup.
   */
  showScoringPolicy?: boolean
}) {
  const { t } = useLocale()
  const conversionTables = useTransmutationTables().data ?? []
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

      {showScoringPolicy && value.gradingTemplate !== 'custom' && (
        <Field
          label={t('subjectConversionTableLabel')}
          htmlFor={`${idPrefix}-conversion-table`}
          hint={t('subjectConversionTableHint')}
        >
          <Select
            value={value.transmutationTableId ?? NO_TABLE}
            onValueChange={(next) =>
              onChange({
                ...value,
                transmutationTableId: next === NO_TABLE ? null : next,
              })
            }
          >
            <SelectTrigger
              id={`${idPrefix}-conversion-table`}
              aria-label={t('subjectConversionTableLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TABLE}>
                {t('subjectConversionTableBuiltIn')}
              </SelectItem>
              {conversionTables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {showScoringPolicy && (
        <Field
          label={t('subjectGradeFloorLabel')}
          htmlFor={`${idPrefix}-grade-floor`}
          hint={t('subjectGradeFloorHint')}
        >
          <Input
            id={`${idPrefix}-grade-floor`}
            type="number"
            min={0}
            max={99}
            step={1}
            value={value.gradeFloor}
            onChange={(event) =>
              onChange({
                ...value,
                // Empty input reads as NaN; treat it as "off" rather than
                // writing NaN into a numeric column.
                gradeFloor: Number.isFinite(event.target.valueAsNumber)
                  ? Math.min(99, Math.max(0, event.target.valueAsNumber))
                  : 0,
              })
            }
          />
        </Field>
      )}

      {showScoringPolicy && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={value.ungradedAsZero}
            onChange={(event) =>
              onChange({ ...value, ungradedAsZero: event.target.checked })
            }
          />
          <span>
            <span className="font-medium">{t('subjectUngradedAsZeroLabel')}</span>
            <span className="block text-(--color-ink-faint)">
              {t('subjectUngradedAsZeroHint')}
            </span>
          </span>
        </label>
      )}

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
