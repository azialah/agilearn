import { createFileRoute } from '@tanstack/react-router'
import { SchoolOverviewPage } from '@/features/admin/SchoolOverviewPage'

export const Route = createFileRoute('/_auth/admin/overview')({
  component: SchoolOverviewPage,
})
