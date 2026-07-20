import { createFileRoute } from '@tanstack/react-router'
import { ClassroomsPage } from '@/features/teacher/classrooms/ClassroomsPage'

export const Route = createFileRoute('/_auth/teacher/classrooms/')({
  component: ClassroomsPage,
})
