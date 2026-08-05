import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { z } from 'zod'
import { BookmarkPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTrigger,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import {
  useClassrooms,
  useCreateClassroom,
  useUpdateClassroom,
} from '@/lib/queries/classrooms'
import {
  useAcademicPeriods,
  useClassroomTemplates,
  useCreateAcademicPeriod,
  useCourseSubjects,
  useCreateCourseSubject,
  useSaveClassroomTemplate,
  useUpdateAcademicPeriod,
  useUpdateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import { useCreateMeetingSlot } from '@/lib/queries/calendar'
import { cn } from '@/lib/cn'
import { useTypewriter } from '@/lib/useTypewriter'
import {
  formatSchedule,
  WEEKDAY_LABELS as SHORT_DAY_NAMES,
} from '@/features/teacher/calendar/calendar'
import {
  draftToSlot,
  EMPTY_MEETING_DRAFT,
  MeetingSlotFields,
  type MeetingSlotDraft,
} from '@/features/teacher/calendar/MeetingSlotFields'
import { useSlotConflicts } from '@/features/teacher/calendar/useSlotConflicts'
import { meetingSlotErrorMessage } from '@/features/teacher/calendar/slotErrors'
import { CLASSROOM_COLORS, CLASSROOM_COLOR_CLASSES } from '@/lib/classroomColor'
import { kindsFor, SubjectFields, type SubjectDraft } from './SubjectFields'
import type {
  Classroom,
  CourseSubjectSession,
  GradingTemplate,
  TeachingLevel,
} from '@/types/domain'

type Step = 1 | 2 | 3

const STEP_COPY: Record<Step, { title: string; description: string; label: string }> = {
  1: {
    title: 'Which term and class is this for?',
    description:
      'Pick the school year and semester, then name the cohort you teach it to.',
    label: 'Term and cohort',
  },
  2: {
    title: 'Add the first course subject',
    description: 'A major with a laboratory becomes two subjects over the same roster.',
    label: 'Course subject',
  },
  3: {
    title: 'Schedule the weekly meeting',
    description:
      'Calendar weeks begin on Sunday. A meeting cannot overlap another class you teach.',
    label: 'Weekly meeting',
  },
}

const SEMESTERS = ['1st Semester', '2nd Semester', '3rd Semester'] as const

/** School years on offer: the last ten, this one, and the next ten. */
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 21 }, (_, index) =>
  String(CURRENT_YEAR - 10 + index),
)

const DEFAULT_SCHOOL_YEAR = `${CURRENT_YEAR}–${CURRENT_YEAR + 1}`

/** Common Philippine undergraduate programmes, grouped by field of study. */
const FIELDS_OF_STUDY = [
  {
    name: 'Computing and IT',
    courses: [
      { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
      { code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
      { code: 'BSIS', name: 'Bachelor of Science in Information Systems' },
      {
        code: 'BSEMC',
        name: 'Bachelor of Science in Entertainment and Multimedia Computing',
      },
    ],
  },
  {
    name: 'Education',
    courses: [
      { code: 'BEEd', name: 'Bachelor of Elementary Education' },
      { code: 'BSEd', name: 'Bachelor of Secondary Education' },
      { code: 'BPEd', name: 'Bachelor of Physical Education' },
    ],
  },
  {
    name: 'Business and Accountancy',
    courses: [
      { code: 'BSA', name: 'Bachelor of Science in Accountancy' },
      { code: 'BSBA', name: 'Bachelor of Science in Business Administration' },
      { code: 'BSCA', name: 'Bachelor of Science in Customs Administration' },
    ],
  },
  {
    name: 'Engineering and Architecture',
    courses: [
      { code: 'BSCE', name: 'Bachelor of Science in Civil Engineering' },
      { code: 'BSEE', name: 'Bachelor of Science in Electrical Engineering' },
      { code: 'BSME', name: 'Bachelor of Science in Mechanical Engineering' },
      { code: 'BSArch', name: 'Bachelor of Science in Architecture' },
    ],
  },
  {
    name: 'Health Sciences',
    courses: [
      { code: 'BSN', name: 'Bachelor of Science in Nursing' },
      { code: 'BSPharm', name: 'Bachelor of Science in Pharmacy' },
      { code: 'BSMT', name: 'Bachelor of Science in Medical Technology' },
    ],
  },
  {
    name: 'Arts and Sciences',
    courses: [
      { code: 'ABComm', name: 'Bachelor of Arts in Communication' },
      { code: 'BSPsych', name: 'Bachelor of Science in Psychology' },
      { code: 'ABPolSci', name: 'Bachelor of Arts in Political Science' },
    ],
  },
  {
    name: 'Hospitality and Tourism',
    courses: [
      { code: 'BSHM', name: 'Bachelor of Science in Hospitality Management' },
      { code: 'BSTM', name: 'Bachelor of Science in Tourism Management' },
    ],
  },
  // Empty list = free-text course, for anything the list above misses.
  { name: 'Other', courses: [] },
] as const

const LEVELS: Record<TeachingLevel | '', readonly string[]> = {
  '': [],
  preschool: ['Nursery', 'Kinder 1', 'Kinder 2'],
  elementary: Array.from({ length: 6 }, (_, i) => `Grade ${i + 1}`),
  high_school: Array.from({ length: 6 }, (_, i) => `Grade ${i + 7}`),
  college: ['1st year', '2nd year', '3rd year', '4th year', '5th year'],
}

/** "BSCS" + "3rd year" + "B" reads as "BSCS 3B"; basic ed keeps its wording. */
export function composeCohortName(form: {
  schoolLevel: TeachingLevel | ''
  course: string
  year: string
  block: string
}): string {
  const block = form.block.trim()
  if (form.schoolLevel === 'college') {
    // Without a course there is no name to build. Returning the bare year digit
    // produced classrooms called "3" — the course is not stored on the
    // classroom, so editing an existing one starts with this empty.
    if (!form.course.trim()) return ''
    const yearDigit = form.year.match(/\d/)?.[0] ?? ''
    return [form.course.trim(), `${yearDigit}${block}`].filter(Boolean).join(' ')
  }
  return [form.year, block].filter(Boolean).join(' — ')
}

/** Height/opacity reveal for the fields that depend on the school level. */
function expand(reducedMotion: boolean | null) {
  return {
    initial: reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 },
    animate: reducedMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' as const },
    exit: reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 },
    transition: { duration: reducedMotion ? 0.01 : 0.22, ease: 'easeOut' as const },
  }
}

/** Animated placeholder samples — module-level so the cycle never restarts. */
const SUBJECT_HINTS = ['CS Elective 2', 'Physical Education 1'] as const

interface FormState {
  schoolYear: string
  semesterName: string
  startsOn: string
  endsOn: string
  periodId: string
  cohortName: string
  year: string
  block: string
  fieldOfStudy: string
  course: string
  schoolLevel: TeachingLevel | ''
  color: string
  subjectName: string
  courseCode: string
  subjectCode: string
  sessionType: CourseSubjectSession
  description: string
  room: string
  gradingTemplate: GradingTemplate
}

/**
 * Templates are stored as an opaque jsonb blob, so everything is optional here:
 * a template saved before a field existed still applies cleanly, and unknown
 * keys from a newer client are stripped rather than trusted.
 * `periodId` is deliberately absent — an academic period is point-in-time, so a
 * template carries the School Year / Semester text and lets the wizard create a
 * fresh period from it.
 */
const templatePayloadSchema = z.object({
  schoolYear: z.string().optional(),
  semesterName: z.string().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  cohortName: z.string().optional(),
  year: z.string().optional(),
  block: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  course: z.string().optional(),
  schoolLevel: z
    .enum(['preschool', 'elementary', 'high_school', 'college', ''])
    .optional(),
  color: z.string().optional(),
  subjectName: z.string().optional(),
  courseCode: z.string().optional(),
  subjectCode: z.string().optional(),
  sessionType: z.enum(['single', 'lecture_lab']).optional(),
  description: z.string().optional(),
  room: z.string().optional(),
  gradingTemplate: z
    .enum(['basic_education', 'senior_high', 'higher_education', 'custom'])
    .optional(),
})

function templatePayload(form: FormState) {
  const { periodId: _periodId, ...rest } = form
  return rest
}

function initialState(classroom?: Classroom): FormState {
  return {
    schoolYear: classroom?.academic_year || DEFAULT_SCHOOL_YEAR,
    semesterName: classroom?.term_name || '1st Semester',
    startsOn: '',
    endsOn: '',
    periodId: classroom?.academic_period_id ?? '',
    cohortName: classroom?.cohort_name || classroom?.block || '',
    year: classroom?.year ?? '',
    block: '',
    fieldOfStudy: '',
    course: '',
    schoolLevel: classroom?.school_level ?? '',
    color: classroom?.color ?? '',
    // Subject fields come from course_subjects, not from the classroom's old
    // duplicate columns. When editing, the effect below fills them in from the
    // primary subject once it has loaded.
    subjectName: classroom?.course_name ?? '',
    courseCode: classroom?.course_code ?? '',
    subjectCode: '',
    sessionType: 'single',
    description: '',
    room: '',
    gradingTemplate: 'custom',
  }
}

export function ClassroomFormDialog({
  ownerId,
  classroom,
  trigger,
}: {
  ownerId: string
  classroom?: Classroom
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  // +1 forward, -1 back — the pane slides in from the side you came from.
  const [direction, setDirection] = useState(1)
  const reducedMotion = useReducedMotion()
  const [form, setForm] = useState<FormState>(initialState(classroom))
  const [nudge, setNudge] = useState(0)
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false)
  const [templateId, setTemplateId] = useState('')
  const [namingTemplate, setNamingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  // Meeting fields sit outside FormState: a saved template describes the
  // subject, not a point-in-time timetable slot.
  const [addMeeting, setAddMeeting] = useState(true)
  const [meetingDraft, setMeetingDraft] = useState<MeetingSlotDraft>(EMPTY_MEETING_DRAFT)
  const [renaming, setRenaming] = useState(false)
  const meetingConflicts = useSlotConflicts(draftToSlot(meetingDraft))
  const meetingValid =
    !addMeeting ||
    (meetingDraft.startsAt < meetingDraft.endsAt && meetingConflicts.length === 0)
  // The row stores the school year as one text field ("2026–2027"); the two
  // selects are just a friendlier way to type it.
  const [startYear = String(CURRENT_YEAR), endYear = String(CURRENT_YEAR + 1)] =
    form.schoolYear.match(/\d{4}/g) ?? []
  function setSchoolYear(start: string, end: string) {
    // Moving the start year drags the end along unless it is already later.
    const nextEnd = Number(end) > Number(start) ? end : String(Number(start) + 1)
    setForm({ ...form, schoolYear: `${start}–${nextEnd}`, periodId: '' })
  }
  const isCollege = form.schoolLevel === 'college'
  const courses =
    FIELDS_OF_STUDY.find((field) => field.name === form.fieldOfStudy)?.courses ?? []
  // Editing an older classroom keeps its stored name until the pickers are used.
  // Derived by default; an explicit rename wins so a school with its own
  // naming ("Section Mabini", "BSCS 3-B AY26") is not forced into the pattern.
  const derivedName = composeCohortName(form)
  const cohortName = renaming ? form.cohortName : derivedName || form.cohortName
  // Falls back to whatever text the classroom already had until a day and both
  // times are picked.
  const subjectHint = useTypewriter(SUBJECT_HINTS, open && step === 2)
  const { data: periods } = useAcademicPeriods()
  const { data: templates } = useClassroomTemplates()
  const createPeriod = useCreateAcademicPeriod()
  const updatePeriod = useUpdateAcademicPeriod()
  const createClassroom = useCreateClassroom()
  const updateClassroom = useUpdateClassroom()
  const createSubject = useCreateCourseSubject()
  const updateSubject = useUpdateCourseSubject()
  const createMeetingSlot = useCreateMeetingSlot()
  const saveTemplate = useSaveClassroomTemplate()
  const { toast } = useToast()
  const navigate = useNavigate()
  const isEditing = !!classroom
  const { data: existingSubjects = [] } = useCourseSubjects(isEditing ? classroom.id : '')
  const { data: classrooms = [] } = useClassrooms()
  // Same cohort in the same term is almost always a second subject for a class
  // that already exists — adding another classroom would split the roster.
  const duplicate = isEditing
    ? undefined
    : classrooms.find(
        (item) =>
          (item.cohort_name || item.block || '').trim().toLowerCase() ===
            cohortName.trim().toLowerCase() &&
          item.academic_year === form.schoolYear &&
          item.term_name === form.semesterName,
      )
  // Editing walks the same panes minus the meeting step, so the course name and
  // codes are reachable from the Edit button rather than a second edit affordance.
  const lastStep: Step = isEditing ? 2 : 3

  // Re-editing the cohort/term fields to point at a *different* existing
  // classroom re-blocks Continue until acknowledged again.
  useEffect(() => {
    setDuplicateAcknowledged(false)
  }, [duplicate?.id])

  useEffect(() => {
    if (open) {
      setStep(1)
      setDirection(1)
      setForm(initialState(classroom))
      setTemplateId('')
      setNudge(0)
      setDuplicateAcknowledged(false)
      setNamingTemplate(false)
      setTemplateName('')
      setAddMeeting(true)
      setMeetingDraft(EMPTY_MEETING_DRAFT)
      // An existing classroom whose name does not match the pattern was renamed
      // at some point, so open in rename mode rather than silently rewriting it.
      setRenaming(
        !!classroom &&
          (classroom.cohort_name || classroom.block || '') !==
            composeCohortName(initialState(classroom)),
      )
    }
  }, [open, classroom])

  // Editing: fill the subject pane from the classroom's primary subject.
  const primarySubject = existingSubjects[0]
  useEffect(() => {
    if (!open || !isEditing || !primarySubject) return
    setForm((current) => ({
      ...current,
      subjectName: primarySubject.name,
      courseCode: primarySubject.course_code,
      subjectCode: primarySubject.subject_code,
      sessionType: primarySubject.session_type,
      description: primarySubject.description,
      room: primarySubject.room,
      gradingTemplate: primarySubject.grading_template as GradingTemplate,
    }))
  }, [open, isEditing, primarySubject])

  const pending =
    createPeriod.isPending ||
    updatePeriod.isPending ||
    createClassroom.isPending ||
    updateClassroom.isPending ||
    createSubject.isPending ||
    updateSubject.isPending ||
    createMeetingSlot.isPending

  /** Escape and backdrop clicks would silently discard the whole wizard, so
   *  they are suppressed and the Cancel button is shaken instead. */
  function goToStep(next: Step) {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  function refuseDismiss(event: Event) {
    event.preventDefault()
    setNudge((n) => n + 1)
  }

  function applyPeriod(id: string) {
    const period = periods?.find((p) => p.id === id)
    if (!period) {
      setForm({ ...form, periodId: '' })
      return
    }
    // Also copy the period's own values across: the classroom row denormalizes
    // academic_year/term_name, and writing them from stale text boxes is what
    // let a classroom disagree with its own academic_period_id.
    setForm({
      ...form,
      periodId: id,
      schoolYear: period.school_year,
      semesterName: period.semester_name,
      startsOn: period.starts_on ?? '',
      endsOn: period.ends_on ?? '',
    })
  }

  function applyTemplate(id: string) {
    setTemplateId(id)
    if (!id) return
    const template = templates?.find((t) => t.id === id)
    if (!template) return
    const parsed = templatePayloadSchema.safeParse(template.payload)
    if (!parsed.success) {
      toast({ title: 'That template could not be read', tone: 'error' })
      return
    }
    setForm({ ...initialState(), ...parsed.data, periodId: '' })
  }

  async function handleSaveTemplate() {
    const name = templateName.trim()
    if (!name) {
      toast({ title: 'Give the template a name first', tone: 'error' })
      return
    }
    const overwriting = templates?.some(
      (t) => t.name.toLowerCase() === name.toLowerCase(),
    )
    try {
      await saveTemplate.mutateAsync({
        owner_id: ownerId,
        name,
        payload: templatePayload(form),
      })
      setNamingTemplate(false)
      setTemplateName('')
      toast({
        title: overwriting ? `Updated “${name}”` : `Saved “${name}” as a template`,
        tone: 'success',
      })
    } catch (error) {
      toast({
        title: 'Could not save the template',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  async function save() {
    try {
      let periodId = form.periodId
      if (!periodId) {
        const period = await createPeriod.mutateAsync({
          owner_id: ownerId,
          school_year: form.schoolYear.trim(),
          semester_name: form.semesterName.trim(),
          starts_on: form.startsOn || null,
          ends_on: form.endsOn || null,
        })
        periodId = period.id
      } else {
        // Editing the date range of an already-selected period — school year
        // and semester are re-picked as a new period instead (see
        // setSchoolYear/the Semester select, which both clear periodId).
        await updatePeriod.mutateAsync({
          id: periodId,
          patch: { starts_on: form.startsOn || null, ends_on: form.endsOn || null },
        })
      }
      // Subject fields are deliberately absent: course_name/course_code are
      // maintained by the 0027 mirror trigger, and the rest live on
      // course_subjects, which is the only source of truth for them.
      const classroomPayload = {
        owner_id: ownerId,
        academic_period_id: periodId,
        cohort_name: cohortName.trim(),
        block: form.block.trim() || cohortName.trim(),
        year: form.year.trim(),
        school_level: form.schoolLevel || null,
        color: form.color || null,
        academic_year: form.schoolYear.trim(),
        term_name: form.semesterName.trim(),
      }
      const savedClassroom = isEditing
        ? await updateClassroom.mutateAsync({ id: classroom.id, patch: classroomPayload })
        : await createClassroom.mutateAsync(classroomPayload)

      if (!isEditing) {
        // A major is two rows sharing a title; a minor is one. The meeting the
        // teacher just described belongs to the lecture — a laboratory keeps its
        // own schedule, added from the classroom page.
        const kinds = kindsFor(form.sessionType)
        for (const kind of kinds) {
          const subject = await createSubject.mutateAsync({
            classroom_id: savedClassroom.id,
            name: form.subjectName.trim(),
            course_code: form.courseCode.trim(),
            subject_code: form.subjectCode.trim(),
            description: form.description.trim(),
            kind,
            session_type: form.sessionType,
            schedule:
              addMeeting && kind !== 'laboratory'
                ? formatSchedule(
                    SHORT_DAY_NAMES[Number(meetingDraft.weekday)],
                    meetingDraft.startsAt,
                    meetingDraft.endsAt,
                  )
                : '',
            room: form.room.trim(),
            grading_template: form.gradingTemplate,
          })
          if (addMeeting && kind !== 'laboratory') {
            await createMeetingSlot.mutateAsync({
              course_subject_id: subject.id,
              weekday: Number(meetingDraft.weekday),
              starts_at: meetingDraft.startsAt,
              ends_at: meetingDraft.endsAt,
              modality: meetingDraft.modality,
              location_label: meetingDraft.location.trim(),
            })
          }
        }
      }
      // The subject pane edits the primary subject; other subjects are edited
      // from their own dialog in ClassroomMeta.
      if (isEditing && primarySubject) {
        await updateSubject.mutateAsync({
          id: primarySubject.id,
          patch: {
            name: form.subjectName.trim(),
            course_code: form.courseCode.trim(),
            subject_code: form.subjectCode.trim(),
            session_type: form.sessionType,
            description: form.description.trim(),
            room: form.room.trim(),
            grading_template: form.gradingTemplate,
          },
        })
      }
      toast({
        title: isEditing ? 'Classroom updated' : 'Classroom and subject created',
        tone: 'success',
      })
      setOpen(false)
      // Lands the teacher where the "Add laboratory" quick-add lives, instead
      // of leaving them on the list where it's easy to forget the classroom
      // needs a second subject.
      if (!isEditing) {
        navigate({
          to: '/teacher/classrooms/$classroomId',
          params: { classroomId: savedClassroom.id },
        })
      }
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update classroom' : 'Could not create classroom',
        description: meetingSlotErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <ResponsiveDrawer open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <ResponsiveDrawerTrigger asChild>{trigger}</ResponsiveDrawerTrigger>
      <ResponsiveDrawerContent
        className="md:w-[min(48rem,calc(100%-3rem))] md:max-h-[90dvh] lg:w-[min(64rem,calc(100%-4rem))] lg:max-h-[92dvh] xl:w-[min(72rem,calc(100%-6rem))]"
        onInteractOutside={refuseDismiss}
        onEscapeKeyDown={refuseDismiss}
      >
        <ResponsiveDrawerHeader
          title={
            isEditing && step === 2 ? 'Course name and codes' : STEP_COPY[step].title
          }
          description={
            isEditing && step === 2
              ? 'This is the name shown across the classroom, grades and attendance.'
              : STEP_COPY[step].description
          }
          step={{ current: step, total: lastStep, label: STEP_COPY[step].label }}
        />
        <ResponsiveDrawerBody>
          {/* No mode="wait": pane 1 contains its own height-animating groups,
              and waiting for those to finish exiting left the next pane
              unmounted — the header advanced while the body stayed behind. */}
          <AnimatePresence initial={false}>
            <motion.div
              key={step}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
              transition={{ duration: reducedMotion ? 0.01 : 0.18, ease: 'easeOut' }}
            >
              {step === 1 && (
                <div className="space-y-4">
                  {!isEditing && (templates?.length ?? 0) > 0 && (
                    <Field label="Start from a template" htmlFor="classroom-template">
                      <select
                        id="classroom-template"
                        aria-label="Start from a template"
                        value={templateId}
                        onChange={(event) => applyTemplate(event.target.value)}
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        <option value="">Start from a blank classroom</option>
                        {templates?.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  {(periods?.length ?? 0) > 0 && (
                    <Field label="Use an existing semester" htmlFor="academic-period">
                      <select
                        id="academic-period"
                        aria-label="Use an existing semester"
                        value={form.periodId}
                        onChange={(event) => applyPeriod(event.target.value)}
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        <option value="">Set up a new semester below</option>
                        {periods?.map((period) => (
                          <option key={period.id} value={period.id}>
                            {period.semester_name} — SY {period.school_year}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="School year starts" htmlFor="school-year-start">
                      <select
                        id="school-year-start"
                        aria-label="School year starts"
                        value={startYear}
                        onChange={(event) => setSchoolYear(event.target.value, endYear)}
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="School year ends" htmlFor="school-year-end">
                      <select
                        id="school-year-end"
                        aria-label="School year ends"
                        value={endYear}
                        onChange={(event) => setSchoolYear(startYear, event.target.value)}
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Semester" htmlFor="semester">
                      <select
                        id="semester"
                        aria-label="Semester"
                        value={form.semesterName}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            semesterName: event.target.value,
                            periodId: '',
                          })
                        }
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        {SEMESTERS.map((semester) => (
                          <option key={semester} value={semester}>
                            {semester}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Semester starts (optional)" htmlFor="semester-start">
                      <DateInput
                        id="semester-start"
                        value={form.startsOn}
                        onChange={(event) =>
                          setForm({ ...form, startsOn: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Semester ends (optional)" htmlFor="semester-end">
                      <DateInput
                        id="semester-end"
                        min={form.startsOn || undefined}
                        value={form.endsOn}
                        onChange={(event) =>
                          setForm({ ...form, endsOn: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                  {renaming ? (
                    <Field label="Class name" htmlFor="class-name">
                      <Input
                        id="class-name"
                        value={form.cohortName}
                        placeholder={derivedName || 'e.g. BSCS 3B'}
                        onChange={(event) =>
                          setForm({ ...form, cohortName: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setRenaming(false)
                          setForm({ ...form, cohortName: '' })
                        }}
                        className="mt-1 text-xs text-(--color-accent-350) underline-offset-2 hover:underline"
                      >
                        Use the name built from the pickers instead
                      </button>
                    </Field>
                  ) : (
                    cohortName && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-(--color-surface-2) px-3 py-2">
                        <p className="text-sm text-(--color-ink)">
                          Listed as <span className="font-medium">{cohortName}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, cohortName })
                            setRenaming(true)
                          }}
                          className="text-xs text-(--color-accent-350) underline-offset-2 hover:underline"
                        >
                          Rename
                        </button>
                      </div>
                    )
                  )}

                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-(--color-ink-muted)">Colour</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-pressed={form.color === ''}
                        onClick={() => setForm({ ...form, color: '' })}
                        className={cn(
                          'h-9 rounded-full border px-3 text-xs font-medium',
                          form.color === ''
                            ? 'border-(--color-accent-400) text-(--color-ink)'
                            : 'border-(--color-border) text-(--color-ink-muted)',
                        )}
                      >
                        Auto
                      </button>
                      {CLASSROOM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={color}
                          aria-pressed={form.color === color}
                          onClick={() => setForm({ ...form, color })}
                          className={cn(
                            'size-9 rounded-full border-2 transition-transform',
                            CLASSROOM_COLOR_CLASSES[color].dot,
                            form.color === color
                              ? 'scale-110 border-(--color-ink)'
                              : 'border-transparent',
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-(--color-ink-faint)">
                      Auto picks a colour from the classroom itself, so every class still
                      looks different.
                    </p>
                  </div>

                  <Field label="School level" htmlFor="school-level">
                    <select
                      id="school-level"
                      aria-label="School level"
                      value={form.schoolLevel}
                      onChange={(event) =>
                        // The class details below depend on the level, so switching
                        // it clears the answers that no longer apply.
                        setForm({
                          ...form,
                          schoolLevel: event.target.value as TeachingLevel | '',
                          fieldOfStudy: '',
                          course: '',
                          year: '',
                          block: '',
                        })
                      }
                      className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                    >
                      <option value="">Choose level</option>
                      <option value="preschool">Preschool</option>
                      <option value="elementary">Elementary</option>
                      <option value="high_school">High school</option>
                      <option value="college">College</option>
                    </select>
                  </Field>

                  <AnimatePresence initial={false}>
                    {isCollege && (
                      <motion.div
                        key="college-fields"
                        {...expand(reducedMotion)}
                        className="grid grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2"
                      >
                        <Field label="Field of study" htmlFor="field-of-study">
                          <select
                            id="field-of-study"
                            aria-label="Field of study"
                            value={form.fieldOfStudy}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                fieldOfStudy: event.target.value,
                                course: '',
                              })
                            }
                            className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                          >
                            <option value="">Choose a field</option>
                            {FIELDS_OF_STUDY.map((field) => (
                              <option key={field.name} value={field.name}>
                                {field.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Course" htmlFor="course">
                          {courses.length > 0 ? (
                            <select
                              id="course"
                              aria-label="Course"
                              value={form.course}
                              onChange={(event) =>
                                setForm({ ...form, course: event.target.value })
                              }
                              className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                            >
                              <option value="">Choose a course</option>
                              {courses.map((course) => (
                                <option key={course.code} value={course.code}>
                                  {course.code} ({course.name})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id="course"
                              value={form.course}
                              placeholder="e.g. BSCS"
                              onChange={(event) =>
                                setForm({ ...form, course: event.target.value })
                              }
                            />
                          )}
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {form.schoolLevel && (
                      <motion.div
                        key="level-fields"
                        {...expand(reducedMotion)}
                        className="grid grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2"
                      >
                        <Field
                          label={isCollege ? 'Year level' : 'Grade level'}
                          htmlFor="year-level"
                        >
                          <select
                            id="year-level"
                            aria-label={isCollege ? 'Year level' : 'Grade level'}
                            value={form.year}
                            onChange={(event) =>
                              setForm({ ...form, year: event.target.value })
                            }
                            className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                          >
                            <option value="">Choose level</option>
                            {LEVELS[form.schoolLevel].map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          label={isCollege ? 'Block (optional)' : 'Section (optional)'}
                          htmlFor="block"
                        >
                          <Input
                            id="block"
                            value={form.block}
                            placeholder={isCollege ? 'e.g. B' : 'e.g. Rizal'}
                            onChange={(event) =>
                              setForm({ ...form, block: event.target.value })
                            }
                          />
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence initial={false} mode="wait">
                    {duplicate ? (
                      <motion.div
                        key="duplicate-warning"
                        {...expand(reducedMotion)}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2 rounded-xl border border-(--color-warning)/40 bg-(--color-warning)/10 p-3">
                          <p className="text-sm text-(--color-ink)">
                            <span className="font-medium">{cohortName}</span> already
                            exists for {form.semesterName} — SY {form.schoolYear}.
                          </p>
                          <p className="text-sm text-(--color-ink-muted)">
                            Creating it again starts an empty roster. Add the new subject
                            to the existing classroom instead and it keeps the same
                            students.
                          </p>
                          <Link
                            to="/teacher/classrooms/$classroomId"
                            params={{ classroomId: duplicate.id }}
                            onClick={() => setOpen(false)}
                            className="block w-full sm:w-auto"
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                            >
                              Open {cohortName} to add a subject
                            </Button>
                          </Link>
                          <label className="-mx-1 flex cursor-pointer items-start gap-2 rounded-lg border-t border-(--color-warning)/30 px-1 pt-3 text-sm text-(--color-ink) transition-colors hover:bg-(--color-warning)/10">
                            <input
                              type="checkbox"
                              checked={duplicateAcknowledged}
                              onChange={(event) =>
                                setDuplicateAcknowledged(event.target.checked)
                              }
                              className="mt-0.5 size-4 shrink-0 rounded border-(--color-border) accent-(--color-accent-400)"
                            />
                            Yes, create a separate classroom for the same course/term
                            anyway.
                          </label>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <SubjectFields
                    value={{
                      name: form.subjectName,
                      courseCode: form.courseCode,
                      subjectCode: form.subjectCode,
                      sessionType: form.sessionType,
                      description: form.description,
                      room: form.room,
                    }}
                    onChange={(next: SubjectDraft) =>
                      setForm({
                        ...form,
                        subjectName: next.name,
                        courseCode: next.courseCode,
                        subjectCode: next.subjectCode,
                        sessionType: next.sessionType,
                        description: next.description,
                        room: next.room,
                      })
                    }
                    isCollege={isCollege}
                    namePlaceholder={`e.g. ${subjectHint}`}
                  />
                  {!isEditing && (
                    <div className="border-t border-(--color-border) pt-4">
                      {namingTemplate ? (
                        <Field label="Template name" htmlFor="template-name">
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              id="template-name"
                              autoFocus
                              value={templateName}
                              placeholder="BSCS 3B — lecture"
                              className="min-w-0 flex-1"
                              onChange={(event) => setTemplateName(event.target.value)}
                              onKeyDown={(event) => {
                                // The wizard has no <form>, so Enter would otherwise
                                // do nothing here and Escape is suppressed at the
                                // drawer level — both are wired up by hand.
                                if (event.key === 'Enter') {
                                  event.preventDefault()
                                  void handleSaveTemplate()
                                }
                                if (event.key === 'Escape') {
                                  event.stopPropagation()
                                  setNamingTemplate(false)
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              loading={saveTemplate.isPending}
                              onClick={() => void handleSaveTemplate()}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNamingTemplate(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </Field>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTemplateName(form.cohortName.trim())
                            setNamingTemplate(true)
                          }}
                        >
                          <BookmarkPlus className="size-4" aria-hidden />
                          Save as template
                        </Button>
                      )}
                      <p className="mt-2 text-xs text-(--color-ink-faint)">
                        Reuse these settings next term. The semester itself is not saved —
                        only the values you typed.
                        {namingTemplate && ' Reusing a name overwrites that template.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {step === 3 && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={addMeeting}
                      onChange={(event) => setAddMeeting(event.target.checked)}
                      className="size-4 accent-(--color-accent-400)"
                    />
                    Add a weekly meeting to the Calendar
                  </label>
                  <MeetingSlotFields
                    value={meetingDraft}
                    onChange={setMeetingDraft}
                    conflicts={addMeeting ? meetingConflicts : []}
                    disabled={!addMeeting}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={
            step < lastStep
              ? 'Continue'
              : isEditing
                ? 'Save classroom'
                : 'Create classroom'
          }
          primaryDisabled={
            (step === 3 && !meetingValid) ||
            (step === 1 && !!duplicate && !duplicateAcknowledged)
          }
          // ponytail: validation intentionally ungated for now — restore the
          // contextValid/subjectValid gate before shipping. A rejected insert
          // surfaces through the catch/toast in save() rather than silently
          // doing nothing, which is what the old early-return did on edit.
          primaryLoading={pending}
          onPrimary={() => {
            if (step >= lastStep) void save()
            else goToStep(step === 1 ? 2 : 3)
          }}
          secondaryLabel={step > 1 ? 'Back' : 'Cancel'}
          onSecondary={() => (step > 1 ? goToStep(step === 3 ? 2 : 1) : setOpen(false))}
          nudgeSecondary={nudge}
        />
      </ResponsiveDrawerContent>
    </ResponsiveDrawer>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}
