import { createFileRoute } from '@tanstack/react-router'
import { SlideshowPage } from '@/features/slideshow/SlideshowPage'

export const Route = createFileRoute('/_auth/classrooms/$classroomId/slideshow')({
  component: SlideshowRoute,
})

function SlideshowRoute() {
  const { classroomId } = Route.useParams()
  return <SlideshowPage classroomId={classroomId} />
}
