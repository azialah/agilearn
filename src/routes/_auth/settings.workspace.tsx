import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceSection } from '@/features/settings/sections/WorkspaceSection'

export const Route = createFileRoute('/_auth/settings/workspace')({
  component: WorkspaceSection,
})
