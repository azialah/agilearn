import type { ReactNode } from 'react'
import { BarChart3, CalendarDays, HardDrive, Inbox, UserRound } from 'lucide-react'
import {
  ClassroomIcon,
  DashboardIcon,
  HistoryIcon,
  ModuleIcon,
  UsersIcon,
} from '@/components/icons'
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
  { to: '/teacher/calendar', labelKey: 'calendar', icon: CalendarDays },
  { to: '/teacher/analytics', labelKey: 'analytics', icon: BarChart3 },
  { to: '/teacher/usage', labelKey: 'usage', icon: HardDrive },
  { to: '/teacher/profile', labelKey: 'profile', icon: UserRound },
  {
    to: '/admin/overview',
    labelKey: 'schoolOverview',
    icon: BarChart3,
    adminOnly: true,
  },
  { to: '/admin/users', labelKey: 'users', icon: UsersIcon, adminOnly: true },
  {
    to: '/admin/domain-requests',
    labelKey: 'requests',
    icon: Inbox,
    adminOnly: true,
  },
  {
    to: '/admin/audit-log',
    labelKey: 'auditLog',
    icon: HistoryIcon,
    adminOnly: true,
  },
]
