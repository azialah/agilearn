import { Suspense, lazy } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { EditIcon } from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'
import { useClassroom } from '@/lib/queries/classrooms'
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
  if (!classroom) return null
  return (
    <PageHeader
      title={classroom.course_name}
      description={`${classroom.course_code} · ${classroom.year} · ${classroom.block}`}
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
