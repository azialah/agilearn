import { createFileRoute } from '@tanstack/react-router'
import { SessionPage } from '@/features/attendance/SessionPage'

export const Route = createFileRoute(
  '/_auth/classrooms/$classroomId/attendance/$sessionId',
)({
  component: SessionRoute,
})

function SessionRoute() {
  const { classroomId, sessionId } = Route.useParams()
  return <SessionPage classroomId={classroomId} sessionId={sessionId} />
}
