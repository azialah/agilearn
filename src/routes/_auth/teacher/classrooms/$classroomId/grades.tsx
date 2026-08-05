import { createFileRoute } from '@tanstack/react-router'
import { GradesPage } from '@/features/teacher/grades/GradesPage'

interface GradesSearch {
  studentId?: string
  subjectId?: string
}

export const Route = createFileRoute('/_auth/teacher/classrooms/$classroomId/grades')({
  validateSearch: (search: Record<string, unknown>): GradesSearch => {
    const studentId = typeof search.studentId === 'string' ? search.studentId : undefined
    const subjectId = typeof search.subjectId === 'string' ? search.subjectId : undefined
    return { ...(studentId ? { studentId } : {}), ...(subjectId ? { subjectId } : {}) }
  },
  component: GradesRoute,
})

function GradesRoute() {
  const { classroomId } = Route.useParams()
  const { studentId, subjectId } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <GradesPage
      classroomId={classroomId}
      focusStudentId={studentId}
      initialSubjectId={subjectId}
      onSubjectChange={(id) =>
        navigate({ search: (prev) => ({ ...prev, subjectId: id }) })
      }
    />
  )
}
