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
import {
  useCourseSubjects,
  useCreateCourseSubject,
  useDeleteCourseSubject,
  useUpdateCourseSubject,
} from '@/lib/queries/academicWorkspace'
import { useClassroom } from '@/lib/queries/classrooms'
import { meetingSlotErrorMessage } from '@/features/teacher/calendar/slotErrors'
import type { CourseSubject } from '@/types/domain'
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
          ? 'Course subject updated'
          : draft.sessionType === 'lecture_lab'
            ? 'Lecture and laboratory added'
            : 'Course subject added',
        tone: 'success',
      })
      setOpen(false)
    } catch (error) {
      toast({
        title: isEditing ? 'Could not update the subject' : 'Could not add the subject',
        description: isNameCollision(error)
          ? `A subject named "${draft.name.trim()}" already exists in this classroom — pick a different name.`
          : meetingSlotErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleDelete() {
    if (!subject) return
    try {
      await deleteSubject.mutateAsync({ id: subject.id, classroomId })
      toast({ title: 'Course subject deleted', tone: 'success' })
      setConfirmDelete(false)
      setOpen(false)
    } catch (error) {
      toast({
        title: 'Could not delete the subject',
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
          title={isEditing ? 'Edit course subject' : 'Add a course subject'}
          description={
            isEditing
              ? 'Renaming this updates it everywhere the subject appears.'
              : 'It shares this classroom’s roster — no need to add the students again.'
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
              This classroom already has a subject with that title.
            </p>
          )}
          {isEditing && (
            <div className="mt-4 border-t border-(--color-border) pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-sm font-medium text-(--color-danger) hover:underline"
              >
                Delete subject
              </button>
            </div>
          )}
        </ResponsiveDrawerBody>
        <ResponsiveDrawerFooter
          primaryLabel={
            isEditing
              ? 'Save subject'
              : draft.sessionType === 'lecture_lab'
                ? 'Add both'
                : 'Add subject'
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
              title="Delete subject"
              description={`This permanently deletes "${subject.name}" — its schedule, grading periods, activities, scores, and attendance sessions all go with it. The shared roster and students stay untouched. This can't be undone.`}
            />
            <ResponsiveDrawerFooter
              primaryLabel="Delete"
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
