import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { ClassroomIcon, DashboardIcon, ModuleIcon, UsersIcon } from '@/components/icons'
import type { MessageKey } from '@/lib/locale'

export interface NavItem {
  to: string
  labelKey: MessageKey
  icon: (props: { className?: string }) => ReactNode
  adminOnly?: boolean
}

/** Shared between the sidebar (AppShell) and the Ctrl+K command palette. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/teacher/dashboard', labelKey: 'dashboard', icon: DashboardIcon },
  { to: '/teacher/classrooms', labelKey: 'classrooms', icon: ClassroomIcon },
  { to: '/teacher/modules', labelKey: 'modules', icon: ModuleIcon },
  { to: '/admin/users', labelKey: 'users', icon: UsersIcon, adminOnly: true },
  {
    to: '/admin/domain-requests',
    labelKey: 'requests',
    icon: Inbox,
    adminOnly: true,
  },
]
