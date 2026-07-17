import { createFileRoute } from '@tanstack/react-router'
import { AttendancePage } from '@/features/attendance/AttendancePage'

export const Route = createFileRoute('/_auth/classrooms/$classroomId/attendance/')({
  component: AttendanceRoute,
})

function AttendanceRoute() {
  const { classroomId } = Route.useParams()
  return <AttendancePage classroomId={classroomId} />
}
