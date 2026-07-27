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
import { addHours, DEFAULT_DURATION_HOURS } from '@/features/teacher/calendar/calendar'
import { cn } from '@/lib/cn'
import { useTypewriter } from '@/lib/useTypewriter'
import { CLASSROOM_COLORS, CLASSROOM_COLOR_CLASSES } from '@/lib/classroomColor'
import type {
  Classroom,
  CourseSubjectKind,
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
    description: 'Lecture and laboratory are separate subjects, not grade weights.',
    label: 'Course subject',
  },
  3: {
    title: 'Schedule the weekly meeting',
    description:
      'Calendar weeks begin on Sunday. Overlapping meetings are allowed but will be visible together.',
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
    const yearDigit = form.year.match(/\d/)?.[0] ?? ''
    const suffix = `${yearDigit}${block}`
    return [form.course.trim(), suffix].filter(Boolean).join(' ')
  }
  return [form.year, block].filter(Boolean).join(' — ')
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** "13:00" -> "1:00 PM"; anything unparseable is passed through untouched. */
function to12Hour(value: string): string {
  const [rawHour, minute] = value.split(':')
  const hour = Number(rawHour)
  if (!Number.isFinite(hour) || minute === undefined) return value
  const suffix = hour < 12 ? 'AM' : 'PM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${minute} ${suffix}`
}

/** Day + start + end as one display string: "Mon 10:00 AM–12:00 PM". */
export function formatSchedule(day: string, start: string, end: string): string {
  if (!day || !start || !end) return ''
  return `${day} ${to12Hour(start)}–${to12Hour(end)}`
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
const SUBJECT_HINTS = ['CS Elective 2 Lecture', 'Physical Education 1'] as const

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

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
  kind: CourseSubjectKind
  description: string
  schedule: string
  scheduleDay: string
  scheduleStart: string
  scheduleEnd: string
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
  kind: z.enum(['lecture', 'laboratory', 'other']).optional(),
  description: z.string().optional(),
  schedule: z.string().optional(),
  scheduleDay: z.string().optional(),
  scheduleStart: z.string().optional(),
  scheduleEnd: z.string().optional(),
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
    subjectName: classroom?.course_name ?? '',
    courseCode: classroom?.course_code ?? '',
    subjectCode: classroom?.subject_code ?? '',
    // The near-universal first subject for a new COLLEGE classroom is a
    // lecture; elementary/high-school subjects aren't lecture/lab pairs.
    kind: classroom?.school_level === 'college' ? 'lecture' : 'other',
    description: classroom?.description ?? '',
    schedule: classroom?.schedule ?? '',
    scheduleDay: '',
    scheduleStart: '',
    scheduleEnd: '',
    room: classroom?.room ?? '',
    gradingTemplate:
      (classroom?.grading_template as GradingTemplate | undefined) ?? 'custom',
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
  const [weekday, setWeekday] = useState('1')
  const [startsAt, setStartsAt] = useState('08:00')
  // '' = not yet touched by hand — effectiveEndsAt below fills it from the
  // subject's kind until the teacher overrides it.
  const [endsAt, setEndsAt] = useState('')
  const [modality, setModality] = useState<'face_to_face' | 'online' | 'hybrid'>(
    'face_to_face',
  )
  const [meetingLocation, setMeetingLocation] = useState('')
  // Renames for the classroom's existing subjects, applied on save.
  const [subjectNames, setSubjectNames] = useState<Record<string, string>>({})
  // Defaults from the subject's kind (2h lecture, 3h lab) until endsAt is set
  // by hand — same pattern as SubjectFormDialog's own schedule fields.
  const effectiveEndsAt = endsAt || addHours(startsAt, DEFAULT_DURATION_HOURS[form.kind])
  const meetingValid = !addMeeting || startsAt < effectiveEndsAt
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
  // Field of study/Course/Block have nowhere to be restored from on an
  // existing classroom (they aren't stored columns — only the composed name
  // is), so composeCohortName always falls back to just the year digit here.
  // Recomputing it on every edit-save silently overwrote the real cohort
  // name (e.g. "BSCS 3B" -> "3") the moment ANY field changed, even the
  // semester dates. Editing keeps the stored name; only creation composes one.
  const cohortName = classroom
    ? form.cohortName
    : composeCohortName(form) || form.cohortName
  // Falls back to whatever text the classroom already had until a day and both
  // times are picked.
  const schedule = formatSchedule(form.scheduleDay, form.scheduleStart, form.scheduleEnd)
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
      setWeekday('1')
      setStartsAt('08:00')
      setEndsAt('')
      setModality('face_to_face')
      setMeetingLocation('')
      setSubjectNames({})
    }
  }, [open, classroom])

  // The dropdown above already shows the classroom's existing period selected
  // (initialState sets periodId straight from the classroom), but the date
  // fields still need their own values pulled in — those only otherwise get
  // set by hand-picking a period from that dropdown.
  useEffect(() => {
    if (!open || !classroom?.academic_period_id) return
    const period = periods?.find((item) => item.id === classroom.academic_period_id)
    if (!period) return
    setForm((current) => ({
      ...current,
      startsOn: period.starts_on ?? '',
      endsOn: period.ends_on ?? '',
    }))
  }, [open, classroom, periods])

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
        course_name: form.subjectName.trim(),
        course_code: form.courseCode.trim(),
        subject_code: form.subjectCode.trim(),
        description: form.description.trim(),
        schedule: schedule || form.schedule.trim(),
        room: form.room.trim(),
        grading_template: form.gradingTemplate,
      }
      const savedClassroom = isEditing
        ? await updateClassroom.mutateAsync({ id: classroom.id, patch: classroomPayload })
        : await createClassroom.mutateAsync(classroomPayload)

      if (!isEditing) {
        const subject = await createSubject.mutateAsync({
          classroom_id: savedClassroom.id,
          name: form.subjectName.trim(),
          course_code: form.courseCode.trim(),
          subject_code: form.subjectCode.trim(),
          description: form.description.trim(),
          kind: form.kind,
          schedule: schedule || form.schedule.trim(),
          room: form.room.trim(),
          grading_template: form.gradingTemplate,
        })
        if (addMeeting) {
          await createMeetingSlot.mutateAsync({
            course_subject_id: subject.id,
            weekday: Number(weekday),
            starts_at: startsAt,
            ends_at: effectiveEndsAt,
            modality,
            location_label: meetingLocation.trim(),
          })
        }
      }
      if (isEditing) {
        await Promise.all(
          existingSubjects
            .filter((subject) => {
              const name = subjectNames[subject.id]?.trim()
              return name && name !== subject.name
            })
            .map((subject) =>
              updateSubject.mutateAsync({
                id: subject.id,
                patch: { name: subjectNames[subject.id].trim() },
              }),
            ),
        )
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
        description: error instanceof Error ? error.message : undefined,
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
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
                  {isEditing && (
                    <Field label="Class name" htmlFor="class-name">
                      <Input
                        id="class-name"
                        value={form.cohortName}
                        placeholder="e.g. BSCS 3B"
                        onChange={(event) =>
                          setForm({ ...form, cohortName: event.target.value })
                        }
                      />
                    </Field>
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
                      onChange={(event) => {
                        const schoolLevel = event.target.value as TeachingLevel | ''
                        // The class details below depend on the level, so switching
                        // it clears the answers that no longer apply. Subject type
                        // only auto-follows the level while it's still sitting at
                        // one of the two defaults — an explicit "Laboratory" pick
                        // is never overwritten by a level change.
                        const kind =
                          schoolLevel === 'college' && form.kind === 'other'
                            ? 'lecture'
                            : schoolLevel !== 'college' && form.kind === 'lecture'
                              ? 'other'
                              : form.kind
                        setForm({
                          ...form,
                          schoolLevel,
                          kind,
                          fieldOfStudy: '',
                          course: '',
                          year: '',
                          block: '',
                        })
                      }}
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
                    ) : cohortName ? (
                      <motion.div
                        key="cohort-preview"
                        {...expand(reducedMotion)}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-(--color-ink-muted)">
                          This classroom will be listed as{' '}
                          <span className="font-medium text-(--color-ink)">
                            {cohortName}
                          </span>
                          .
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <Field
                    label={isEditing ? 'Course name' : 'Course subject'}
                    htmlFor="subject-name"
                  >
                    <Input
                      id="subject-name"
                      value={form.subjectName}
                      placeholder={`e.g. ${subjectHint}`}
                      onChange={(event) =>
                        setForm({ ...form, subjectName: event.target.value })
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Course code" htmlFor="course-code">
                      <Input
                        id="course-code"
                        value={form.courseCode}
                        placeholder="CSP313"
                        onChange={(event) =>
                          setForm({ ...form, courseCode: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Subject code" htmlFor="subject-code">
                      <Input
                        id="subject-code"
                        value={form.subjectCode}
                        placeholder="CS-ELEC2"
                        onChange={(event) =>
                          setForm({ ...form, subjectCode: event.target.value })
                        }
                      />
                    </Field>
                  </div>
                  {/* Lecture/Laboratory is a college concept — an elementary
                      or high-school subject is never split that way, so the
                      choice doesn't exist for them at all (kind just stays
                      'other', set by initialState/the school-level handler). */}
                  {isCollege && (
                    <Field label="Subject type" htmlFor="subject-kind">
                      <select
                        id="subject-kind"
                        aria-label="Subject type"
                        value={form.kind}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            kind: event.target.value as CourseSubjectKind,
                          })
                        }
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        <option value="other">Other</option>
                        <option value="lecture">Lecture</option>
                        <option value="laboratory">Laboratory</option>
                      </select>
                    </Field>
                  )}
                  {/* Only for a brand-new classroom, where it seeds the first
                      subject's own meeting slot on save (see `save()` below).
                      An existing classroom's subjects each carry their own
                      day/start/end/room now — edit those from the subject's
                      own badge instead, since lecture and laboratory usually
                      run on different days at different times. */}
                  {!isEditing && (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <Field label="Day" htmlFor="schedule-day">
                          <select
                            id="schedule-day"
                            aria-label="Day"
                            value={form.scheduleDay}
                            onChange={(event) =>
                              setForm({ ...form, scheduleDay: event.target.value })
                            }
                            className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                          >
                            <option value="">Choose a day</option>
                            {SHORT_DAYS.map((day) => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Starts" htmlFor="schedule-start">
                          <Input
                            id="schedule-start"
                            type="time"
                            value={form.scheduleStart}
                            onChange={(event) =>
                              setForm({ ...form, scheduleStart: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Ends" htmlFor="schedule-end">
                          <Input
                            id="schedule-end"
                            type="time"
                            value={form.scheduleEnd}
                            onChange={(event) =>
                              setForm({ ...form, scheduleEnd: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Room" htmlFor="subject-room">
                          <Input
                            id="subject-room"
                            value={form.room}
                            placeholder="Room 505"
                            onChange={(event) =>
                              setForm({ ...form, room: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      {(schedule || form.schedule) && (
                        <p className="text-sm text-(--color-ink-muted)">
                          Schedule:{' '}
                          <span className="font-medium text-(--color-ink)">
                            {schedule || form.schedule}
                          </span>
                        </p>
                      )}
                    </>
                  )}
                  <Field label="Description" htmlFor="subject-description">
                    <textarea
                      id="subject-description"
                      rows={3}
                      value={form.description}
                      placeholder="A short practical overview for this subject."
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                      className="w-full resize-none rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm"
                    />
                  </Field>
                  {isEditing && existingSubjects.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-(--color-border) p-3">
                      <p className="text-xs font-medium text-(--color-ink-faint)">
                        Course subjects — these share the classroom’s roster
                      </p>
                      <p className="text-xs text-(--color-ink-faint)">
                        Rename here. Each subject’s own day, time, and room are set from
                        its badge on the classroom page.
                      </p>
                      {existingSubjects.map((subject) => (
                        <Field
                          key={subject.id}
                          label={subject.kind.replace('_', ' ')}
                          htmlFor={`subject-name-${subject.id}`}
                        >
                          <Input
                            id={`subject-name-${subject.id}`}
                            value={subjectNames[subject.id] ?? subject.name}
                            onChange={(event) =>
                              setSubjectNames({
                                ...subjectNames,
                                [subject.id]: event.target.value,
                              })
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  )}
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
                  <fieldset
                    disabled={!addMeeting}
                    className="space-y-4 disabled:opacity-50"
                  >
                    <Field label="Day" htmlFor="meeting-weekday">
                      <select
                        id="meeting-weekday"
                        aria-label="Meeting day"
                        value={weekday}
                        onChange={(event) => setWeekday(event.target.value)}
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        {WEEKDAYS.map((day, index) => (
                          <option key={day} value={index}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Starts" htmlFor="meeting-starts">
                        <Input
                          id="meeting-starts"
                          type="time"
                          value={startsAt}
                          onChange={(event) => setStartsAt(event.target.value)}
                        />
                      </Field>
                      <Field label="Ends" htmlFor="meeting-ends">
                        <Input
                          id="meeting-ends"
                          type="time"
                          value={effectiveEndsAt}
                          onChange={(event) => setEndsAt(event.target.value)}
                        />
                      </Field>
                    </div>
                    <Field label="Class mode" htmlFor="meeting-modality">
                      <select
                        id="meeting-modality"
                        aria-label="Class mode"
                        value={modality}
                        onChange={(event) =>
                          setModality(event.target.value as typeof modality)
                        }
                        className="h-9 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                      >
                        <option value="face_to_face">Face-to-Face</option>
                        <option value="online">Online Class</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    </Field>
                    <Field label="Room or meeting label" htmlFor="meeting-location">
                      <Input
                        id="meeting-location"
                        value={meetingLocation}
                        placeholder="Room 505 or Meet link label"
                        onChange={(event) => setMeetingLocation(event.target.value)}
                      />
                    </Field>
                  </fieldset>
                  {!meetingValid && (
                    <p className="text-sm text-(--color-danger)">
                      End time must be after start time.
                    </p>
                  )}
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
