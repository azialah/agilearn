import { createFileRoute } from '@tanstack/react-router'
import { ClassroomDetailPage } from '@/features/teacher/classrooms/ClassroomDetailPage'

export const Route = createFileRoute('/_auth/teacher/classrooms/$classroomId/')({
  component: ClassroomDetailRoute,
})

function ClassroomDetailRoute() {
  const { classroomId } = Route.useParams()
  return <ClassroomDetailPage classroomId={classroomId} />
}
