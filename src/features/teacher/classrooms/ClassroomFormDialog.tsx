import { useEffect, useState, type ReactNode } from 'react'
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
import { useCreateClassroom, useUpdateClassroom } from '@/lib/queries/classrooms'
import {
  useAcademicPeriods,
  useCreateAcademicPeriod,
  useCreateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import type {
  Classroom,
  CourseSubjectKind,
  GradingTemplate,
  TeachingLevel,
} from '@/types/domain'

type Step = 1 | 2

interface FormState {
  schoolYear: string
  semesterName: string
  startsOn: string
  endsOn: string
  periodId: string
  cohortName: string
  year: string
  schoolLevel: TeachingLevel | ''
  subjectName: string
  courseCode: string
  subjectCode: string
  kind: CourseSubjectKind
  description: string
  schedule: string
  room: string
  gradingTemplate: GradingTemplate
}

function initialState(classroom?: Classroom): FormState {
  return {
    schoolYear: classroom?.academic_year || '2026–2027',
    semesterName: classroom?.term_name || '1st Semester',
    startsOn: '',
    endsOn: '',
    periodId: classroom?.academic_period_id ?? '',
    cohortName: classroom?.cohort_name || classroom?.block || '',
    year: classroom?.year ?? '',
    schoolLevel: classroom?.school_level ?? '',
    subjectName: classroom?.course_name ?? '',
    courseCode: classroom?.course_code ?? '',
    subjectCode: classroom?.subject_code ?? '',
    kind: 'other',
    description: classroom?.description ?? '',
    schedule: classroom?.schedule ?? '',
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
  const [form, setForm] = useState<FormState>(initialState(classroom))
  const { data: periods } = useAcademicPeriods()
  const createPeriod = useCreateAcademicPeriod()
  const createClassroom = useCreateClassroom()
  const updateClassroom = useUpdateClassroom()
  const createSubject = useCreateCourseSubject()
  const { toast } = useToast()
  const isEditing = !!classroom

  useEffect(() => {
    if (open) {
      setStep(1)
      setForm(initialState(classroom))
    }
  }, [open, classroom])

  const contextValid =
    form.cohortName.trim().length > 0 &&
    form.schoolYear.trim().length > 0 &&
    form.semesterName.trim().length > 0
  const subjectValid = form.subjectName.trim().length > 0
  const pending =
    createPeriod.isPending ||
    createClassroom.isPending ||
    updateClassroom.isPending ||
    createSubject.isPending

  async function save() {
    if (!subjectValid) return
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
      }
      const classroomPayload = {
        owner_id: ownerId,
        academic_period_id: periodId,
        cohort_name: form.cohortName.trim(),
        block: form.cohortName.trim(),
        year: form.year.trim(),
        school_level: form.schoolLevel || null,
        academic_year: form.schoolYear.trim(),
        term_name: form.semesterName.trim(),
        course_name: form.subjectName.trim(),
        course_code: form.courseCode.trim(),
        subject_code: form.subjectCode.trim(),
        description: form.description.trim(),
        schedule: form.schedule.trim(),
        room: form.room.trim(),
        grading_template: form.gradingTemplate,
      }
      const savedClassroom = isEditing
        ? await updateClassroom.mutateAsync({ id: classroom.id, patch: classroomPayload })
        : await createClassroom.mutateAsync(classroomPayload)

      if (!isEditing) {
        await createSubject.mutateAsync({
          classroom_id: savedClassroom.id,
          name: form.subjectName.trim(),
          course_code: form.courseCode.trim(),
          subject_code: form.subjectCode.trim(),
          description: form.description.trim(),
          kind: form.kind,
          schedule: form.schedule.trim(),
          room: form.room.trim(),
          grading_template: form.gradingTemplate,
        })
      }
      toast({
        title: isEditing ? 'Classroom updated' : 'Classroom and subject created',
        tone: 'success',
      })
      setOpen(false)
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
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={
            isEditing
              ? 'Edit classroom'
              : step === 1
                ? 'Set the teaching context'
                : 'Add the first course subject'
          }
          description={
            isEditing
              ? 'Keep the cohort details current for your teaching workspace.'
              : step === 1
                ? 'Start with the School Year, Semester, and cohort.'
                : 'Lecture and laboratory are separate subjects, not grade weights.'
          }
          step={
            isEditing
              ? undefined
              : {
                  current: step,
                  total: 2,
                  label: step === 1 ? 'Teaching context' : 'Course subject',
                }
          }
        />
        <ResponsiveDrawerBody>
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="School Year" htmlFor="school-year">
                  <Input
                    id="school-year"
                    value={form.schoolYear}
                    placeholder="2026–2027"
                    onChange={(event) =>
                      setForm({ ...form, schoolYear: event.target.value, periodId: '' })
                    }
                  />
                </Field>
                <Field label="Semester" htmlFor="semester">
                  <Input
                    id="semester"
                    value={form.semesterName}
                    placeholder="1st Semester"
                    onChange={(event) =>
                      setForm({ ...form, semesterName: event.target.value, periodId: '' })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Semester starts (optional)" htmlFor="semester-start">
                  <Input
                    id="semester-start"
                    type="date"
                    value={form.startsOn}
                    onChange={(event) =>
                      setForm({ ...form, startsOn: event.target.value })
                    }
                  />
                </Field>
                <Field label="Semester ends (optional)" htmlFor="semester-end">
                  <Input
                    id="semester-end"
                    type="date"
                    min={form.startsOn || undefined}
                    value={form.endsOn}
                    onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
                  />
                </Field>
              </div>
              {(periods?.length ?? 0) > 0 && (
                <Field label="Use an existing semester" htmlFor="academic-period">
                  <select
                    id="academic-period"
                    aria-label="Use an existing semester"
                    value={form.periodId}
                    onChange={(event) =>
                      setForm({ ...form, periodId: event.target.value })
                    }
                    className="h-10 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                  >
                    <option value="">
                      Create from the School Year and Semester above
                    </option>
                    {periods?.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.semester_name} — SY {period.school_year}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Classroom / cohort" htmlFor="cohort-name">
                  <Input
                    id="cohort-name"
                    value={form.cohortName}
                    placeholder="BSCS 3B"
                    onChange={(event) =>
                      setForm({ ...form, cohortName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Year level" htmlFor="year-level">
                  <Input
                    id="year-level"
                    value={form.year}
                    placeholder="3rd year"
                    onChange={(event) => setForm({ ...form, year: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="School level" htmlFor="school-level">
                <select
                  id="school-level"
                  aria-label="School level"
                  value={form.schoolLevel}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      schoolLevel: event.target.value as TeachingLevel | '',
                    })
                  }
                  className="h-10 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                >
                  <option value="">Choose level</option>
                  <option value="preschool">Preschool</option>
                  <option value="elementary">Elementary</option>
                  <option value="high_school">High school</option>
                  <option value="college">College</option>
                </select>
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Course subject" htmlFor="subject-name">
                <Input
                  id="subject-name"
                  value={form.subjectName}
                  placeholder="CS Elective 2 Lecture"
                  onChange={(event) =>
                    setForm({ ...form, subjectName: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
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
              <Field label="Subject type" htmlFor="subject-kind">
                <select
                  id="subject-kind"
                  aria-label="Subject type"
                  value={form.kind}
                  onChange={(event) =>
                    setForm({ ...form, kind: event.target.value as CourseSubjectKind })
                  }
                  className="h-10 w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 text-sm"
                >
                  <option value="other">Other</option>
                  <option value="lecture">Lecture</option>
                  <option value="laboratory">Laboratory</option>
                </select>
              </Field>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Schedule" htmlFor="subject-schedule">
                  <Input
                    id="subject-schedule"
                    value={form.schedule}
                    placeholder="Mon 3–5 PM"
                    onChange={(event) =>
                      setForm({ ...form, schedule: event.target.value })
                    }
                  />
                </Field>
                <Field label="Room" htmlFor="subject-room">
                  <Input
                    id="subject-room"
                    value={form.room}
                    placeholder="Room 505"
                    onChange={(event) => setForm({ ...form, room: event.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={
            isEditing || step === 2
              ? isEditing
                ? 'Save classroom'
                : 'Create classroom'
              : 'Continue'
          }
          primaryDisabled={step === 1 ? !contextValid : !subjectValid}
          primaryLoading={pending}
          onPrimary={() => {
            if (step === 1 && !isEditing) setStep(2)
            else void save()
          }}
          secondaryLabel={step === 2 && !isEditing ? 'Back' : 'Cancel'}
          onSecondary={() => (step === 2 && !isEditing ? setStep(1) : setOpen(false))}
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
