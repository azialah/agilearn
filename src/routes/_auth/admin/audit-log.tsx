import { createFileRoute } from '@tanstack/react-router'
import { AuditLogPage } from '@/features/admin/AuditLogPage'

export const Route = createFileRoute('/_auth/admin/audit-log')({
  component: AuditLogPage,
})
