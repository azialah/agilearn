import { useEffect, useState, type ReactNode } from 'react'
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
  ResponsiveDrawerTrigger,
} from '@/components/ui/ResponsiveDrawer'
import { useToast } from '@/components/ui/toast'
import { useLocale } from '@/lib/locale'
import {
  useCourseSubjects,
  useCreateCourseSubject,
  useDeleteCourseSubject,
  useUpdateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import { useClassroom } from '@/lib/queries/classrooms'
import { meetingSlotErrorMessage } from '@/features/teacher/calendar/slotErrors'
import type { CourseSubject, GradingTemplate } from '@/types/domain'
import {
  EMPTY_SUBJECT_DRAFT,
  kindsFor,
  SubjectFields,
  type SubjectDraft,
} from './SubjectFields'

function draftFromSubject(subject?: CourseSubject): SubjectDraft {
  if (!subject) return EMPTY_SUBJECT_DRAFT
  return {
    name: subject.name,
    courseCode: subject.course_code ?? '',
    subjectCode: subject.subject_code ?? '',
    sessionType: subject.session_type,
    gradingTemplate: subject.grading_template as GradingTemplate,
    transmutationTableId: subject.transmutation_table_id,
    gradeFloor: subject.grade_floor,
    ungradedAsZero: subject.ungraded_as_zero,
    description: subject.description ?? '',
    room: subject.room ?? '',
  }
}

/** A Postgres unique-violation on the course_subjects name, distinguished
 * from the constraint violations meetingSlotErrorMessage already covers —
 * this one is about the subject's title, not its schedule. */
function isNameCollision(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.includes(
      'course_subjects_classroom_name_kind_key',
    )
  )
}

/**
 * Add or edit a course subject. Adding one reuses the classroom's existing
 * roster — a lecture and its laboratory are two subjects over the same students.
 */
export function SubjectFormDialog({
  classroomId,
  subject,
  trigger,
}: {
  classroomId: string
  subject?: CourseSubject
  trigger: ReactNode
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState<SubjectDraft>(draftFromSubject(subject))
  const { data: classroom } = useClassroom(classroomId)
  const { data: siblings = [] } = useCourseSubjects(classroomId)
  const update = useUpdateCourseSubject()
  const create = useCreateCourseSubject()
  const deleteSubject = useDeleteCourseSubject()
  const { toast } = useToast()
  const isEditing = !!subject

  useEffect(() => {
    if (open) setDraft(draftFromSubject(subject))
  }, [open, subject])

  async function save() {
    if (!draft.name.trim()) return
    const fields = {
      name: draft.name.trim(),
      course_code: draft.courseCode.trim(),
      subject_code: draft.subjectCode.trim(),
      session_type: draft.sessionType,
      grading_template: draft.gradingTemplate,
      transmutation_table_id: draft.transmutationTableId,
      grade_floor: draft.gradeFloor,
      ungraded_as_zero: draft.ungradedAsZero,
      description: draft.description.trim(),
      room: draft.room.trim(),
    }
    try {
      if (subject) {
        await update.mutateAsync({
          id: subject.id,
          patch: { ...fields, kind: subject.kind },
        })
      } else {
        // "Lecture + laboratory" means both halves exist from the start; the
        // teacher named the subject once and expects to see two.
        for (const kind of kindsFor(draft.sessionType)) {
          await create.mutateAsync({ classroom_id: classroomId, kind, ...fields })
        }
      }
      toast({
        title: isEditing
          ? t('subjectDialogUpdateSuccess')
          : draft.sessionType === 'lecture_lab'
            ? t('subjectDialogLectureLabAddedSuccess')
            : t('subjectDialogAddSuccess'),
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? t('subjectDialogUpdateError') : t('subjectDialogAddError'),
        description: isNameCollision(error)
          ? t('subjectDialogNameCollision', { name: draft.name.trim() })
          : meetingSlotErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDelete() {
    if (!subject) return
    try {
      await deleteSubject.mutateAsync({ id: subject.id, classroomId })
      toast({ title: t('subjectDialogDeleteSuccess'), tone: 'success' })
      setConfirmDelete(false)
      setOpen(false)
    } catch (error) {
      toast({
        title: t('subjectDialogDeleteError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    }
  }

  // A title already used by this classroom for the same kind would hit the
  // unique key, so say so here rather than after a failed save.
  const duplicate =
    !isEditing &&
    kindsFor(draft.sessionType).some((kind) =>
      siblings.some(
        (item) =>
          item.kind === kind &&
          item.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
      ),
    )

  return (
    <ResponsiveDrawer open={open} onOpenChange={setOpen}>
      <ResponsiveDrawerTrigger asChild>{trigger}</ResponsiveDrawerTrigger>
      <ResponsiveDrawerContent>
        <ResponsiveDrawerHeader
          title={isEditing ? t('subjectDialogEditTitle') : t('subjectDialogAddTitle')}
          description={
            isEditing
              ? t('subjectDialogEditDescription')
              : t('subjectDialogAddDescription')
          }
        />
        <ResponsiveDrawerBody>
          <SubjectFields
            value={draft}
            onChange={setDraft}
            isCollege={classroom?.school_level === 'college'}
            idPrefix="subject-edit"
            lockSessionType={isEditing}
          />
          {duplicate && (
            <p role="alert" className="mt-3 text-sm text-(--color-danger)">
              {t('subjectDialogDuplicateWarning')}
            </p>
          )}
          {isEditing && (
            <div className="mt-4 border-t border-(--color-border) pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-(--color-danger) hover:underline"
              >
                {t('subjectDialogDeleteButton')}
              </button>
            </div>
          )}
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={
            isEditing
              ? t('subjectDialogSaveButton')
              : draft.sessionType === 'lecture_lab'
                ? t('subjectDialogAddBothButton')
                : t('subjectDialogAddButton')
          }
          primaryDisabled={!draft.name.trim() || duplicate}
          primaryLoading={update.isPending || create.isPending}
          onPrimary={() => void save()}
          onSecondary={() => setOpen(false)}
        />
      </ResponsiveDrawerContent>

      {/* Bottom sheet on phones, centred modal at md+ — same pattern as the
          sign-out confirmation in TopBar. */}
      {subject && (
        <ResponsiveDrawer
          open={confirmDelete}
          onOpenChange={(next) => !deleteSubject.isPending && setConfirmDelete(next)}
        >
          <ResponsiveDrawerContent className="!min-h-0 md:max-w-md">
            <ResponsiveDrawerHeader
              title={t('subjectDialogDeleteButton')}
              description={t('subjectDialogDeleteConfirmDescription', {
                name: subject.name,
              })}
            />
            <ResponsiveDrawerFooter
              primaryLabel={t('commonDelete')}
              primaryVariant="danger"
              primaryLoading={deleteSubject.isPending}
              onPrimary={() => void handleDelete()}
              onSecondary={() => setConfirmDelete(false)}
            />
          </ResponsiveDrawerContent>
        </ResponsiveDrawer>
      )}
    </ResponsiveDrawer>
  )
}
