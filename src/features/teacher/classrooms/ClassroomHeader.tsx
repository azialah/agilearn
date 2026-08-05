import { Suspense, lazy, useEffect } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EditIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassroom } from '@/lib/queries/classrooms'
import { classroomColorClasses } from '@/lib/classroomColor'
import { rememberClassroomVisit } from '@/lib/recentClassrooms'
import { ClassroomFormDialog } from './ClassroomFormDialog'

const ImportButton = lazy(() =>
  import('@/features/teacher/io/ImportButton').then((module) => ({
    default: module.ImportButton,
  })),
)
const ExportMenu = lazy(() =>
  import('@/features/teacher/io/ExportMenu').then((module) => ({
    default: module.ExportMenu,
  })),
)

function ActionFallback({ label }: { label: string }) {
  return (
    <Button variant="outline" size="sm" disabled>
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
        {label}
      </span>
    </Button>
  )
}

/**
 * Classroom identity + the actions that apply to the whole classroom. Shared by
 * the Roster, Grades and Attendance tabs so the chrome above the tab strip does
 * not change as you move between them.
 */
export function ClassroomHeader({ classroomId }: { classroomId: string }) {
  const { data: profile } = useProfile()
  const { data: classroom } = useClassroom(classroomId)

  // This header renders on Roster, Grades and Attendance, so it is the one place
  // that sees every visit to a classroom.
  useEffect(() => {
    rememberClassroomVisit(classroomId)
  }, [classroomId])

  if (!classroom) return null
  return (
    <PageHeader
      // The classroom is the page, so the cohort is the title. course_name now
      // mirrors the primary subject, and using it here repeated a 70-character
      // subject name that the meta card below already lists in full.
      title={
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-3 shrink-0 rounded-full ${classroomColorClasses(classroom).dot}`}
          />
          {classroom.cohort_name || classroom.block || classroom.course_name}
        </span>
      }
      description={[classroom.year, classroom.term_name, classroom.academic_year]
        .filter(Boolean)
        .join(' · ')}
      actions={
        <div className="flex items-center gap-2">
          <Suspense fallback={<ActionFallback label="Import" />}>
            <ImportButton classroomId={classroomId} />
          </Suspense>
          <Suspense fallback={<ActionFallback label="Export" />}>
            <ExportMenu classroomId={classroomId} />
          </Suspense>
          {profile && (
            <ClassroomFormDialog
              ownerId={profile.id}
              classroom={classroom}
              trigger={
                // Same variant/size as Import and Export — the three read as one set.
                <Button variant="outline" size="sm">
                  <EditIcon className="size-4" /> Edit
                </Button>
              }
            />
          )}
        </div>
      }
    />
  )
}
