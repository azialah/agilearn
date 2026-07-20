import { createFileRoute } from '@tanstack/react-router'
import { DomainRequestsPage } from '@/features/admin/DomainRequestsPage'

export const Route = createFileRoute('/_auth/admin/domain-requests')({
  component: DomainRequestsPage,
})
