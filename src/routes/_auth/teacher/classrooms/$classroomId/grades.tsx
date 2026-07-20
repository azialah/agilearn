import { createFileRoute } from '@tanstack/react-router'
import { GradesPage } from '@/features/teacher/grades/GradesPage'

export const Route = createFileRoute('/_auth/teacher/classrooms/$classroomId/grades')({
  component: GradesRoute,
})

function GradesRoute() {
  const { classroomId } = Route.useParams()
  return <GradesPage classroomId={classroomId} />
}
