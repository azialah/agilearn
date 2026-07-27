import type { ReactNode } from 'react'
import {
  AnalyticsIcon,
  CalendarIcon,
  ClassroomIcon,
  DashboardIcon,
  HistoryIcon,
  InboxIcon,
  ModuleIcon,
  ProfileIcon,
  UsageIcon,
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
  { to: '/teacher/calendar', labelKey: 'calendar', icon: CalendarIcon },
  { to: '/teacher/analytics', labelKey: 'analytics', icon: AnalyticsIcon },
  { to: '/teacher/usage', labelKey: 'usage', icon: UsageIcon },
  { to: '/teacher/profile', labelKey: 'profile', icon: ProfileIcon },
  {
    to: '/admin/overview',
    labelKey: 'schoolOverview',
    icon: AnalyticsIcon,
    adminOnly: true,
  },
  { to: '/admin/users', labelKey: 'users', icon: UsersIcon, adminOnly: true },
  {
    to: '/admin/domain-requests',
    labelKey: 'requests',
    icon: InboxIcon,
    adminOnly: true,
  },
  {
    to: '/admin/audit-log',
    labelKey: 'auditLog',
    icon: HistoryIcon,
    adminOnly: true,
  },
]
