import { createFileRoute } from '@tanstack/react-router'
import { SettingsIndex } from '@/features/settings/SettingsIndex'

export const Route = createFileRoute('/_auth/settings/')({
  component: SettingsIndex,
})
