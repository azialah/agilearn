import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '@/features/admin/UsersPage'

export const Route = createFileRoute('/_auth/admin/users')({
  component: UsersPage,
})
