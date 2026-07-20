import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '@/features/teacher/attendance/SessionPage'

export const Route = createFileRoute(
  '/_auth/teacher/classrooms/$classroomId/attendance/$sessionId',
)({
  component: SessionRoute,
})

function SessionRoute() {
  const { classroomId, sessionId } = Route.useParams()
  return <SessionPage classroomId={classroomId} sessionId={sessionId} />
}
