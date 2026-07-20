import { createFileRoute } from '@tanstack/react-router'
import { ModulesPage } from '@/features/teacher/modules/ModulesPage'

export const Route = createFileRoute('/_auth/teacher/modules/')({
  component: ModulesPage,
})
