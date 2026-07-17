import { Link } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SlideshowIcon } from '@/components/icons'
import { useSlideshowData } from './useSlideshowData'
import { SlidePlayer } from './SlidePlayer'

export function SlideshowPage({ classroomId }: { classroomId: string }) {
  const { classroom, students, periods, weights, isLoading, isError } =
    useSlideshowData(classroomId)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--color-ink-muted)]">
        <Spinner className="size-6" />
        <p className="text-sm">Preparing the presentation…</p>
      </div>
    )
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
            <Link to="/classrooms">
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
            <Link to="/classrooms/$classroomId" params={{ classroomId }}>
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
      weights={weights}
    />
  )
}
