import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { RouteSkeleton } from '@/components/ui/RouteSkeleton'
import { SlideshowIcon } from '@/components/icons'
import { useSlideshowData } from './useSlideshowData'
import { SlidePlayer } from './SlidePlayer'

export function SlideshowPage({ classroomId }: { classroomId: string }) {
  const { classroom, students, periods, components, isLoading, isError } =
    useSlideshowData(classroomId)

  if (isLoading) {
    return <RouteSkeleton />
  }

  if (isError || !classroom) {
    return (
      <div className="space-y-6">
        <PageHeader title="Slideshow" />
        <EmptyState
          icon={<SlideshowIcon />}
          title="Could not load the slideshow"
          description="The classroom may have been removed or its grades failed to load."
          action={
            <Link to="/teacher/classrooms">
              <Button variant="secondary">Back to classrooms</Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Slideshow"
          description={`${classroom.course_name} · ${classroom.course_code}`}
        />
        <EmptyState
          icon={<SlideshowIcon />}
          title="No students to present"
          description="Add students to this classroom to run the grade presentation."
          action={
            <Link to="/teacher/classrooms/$classroomId" params={{ classroomId }}>
              <Button variant="secondary">Back to classroom</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <SlidePlayer
      classroom={classroom}
      students={students}
      periods={periods}
      components={components}
    />
  )
}
