import { createFileRoute } from '@tanstack/react-router'
import { ClassroomDetailPage } from '@/features/classrooms/ClassroomDetailPage'

export const Route = createFileRoute('/_auth/classrooms/$classroomId/')({
  component: ClassroomDetailRoute,
})

function ClassroomDetailRoute() {
  const { classroomId } = Route.useParams()
  return <ClassroomDetailPage classroomId={classroomId} />
}
