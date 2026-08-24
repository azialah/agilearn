import { useMemo } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import {
  AnalyticsIcon,
  CalendarIcon,
  ClassroomIcon,
  DashboardIcon,
  HistoryIcon,
  InboxIcon,
  ModuleIcon,
  UsersIcon,
} from '@/components/icons'
import { useLocale } from '@/lib/locale'
import { useProfile } from '@/lib/queries/profiles'
import { useUnreadNotificationCount } from '@/lib/queries/notifications'
import { BottomDock } from './BottomDock'
import type { DockItem } from './dockItems'

/**
 * The thin per-audience adapter.
 *
 * It supplies items and an accessible name; the dock supplies every mechanic.
 * Teachers and admins differ only in where their five tabs point — and an admin
 * browsing their own classrooms gets the teacher set, because that is the job
 * they are doing at that moment.
 */
export function AppDock({ onOverflow }: { onOverflow: () => void }) {
  const { t } = useLocale()
  const { data: profile } = useProfile()
  const { data: unread = 0 } = useUnreadNotificationCount()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const adminSection = pathname.startsWith('/admin')
  // Settings gets its own bottom chrome (an inline search bar), so the dock
  // stands down there — via CSS, not by unmounting; see BottomDock.
  const suppressed = pathname.startsWith('/settings')

  const items = useMemo<DockItem[]>(() => {
    const overflow: DockItem = {
      key: 'more',
      labelKey: 'shellMore',
      icon: MoreHorizontal,
      badge: unread > 0,
      avatar: {
        name: profile?.full_name,
        src: profile?.avatar_url,
        color: profile?.avatar_color,
      },
    }

    if (adminSection) {
      return [
        {
          key: 'overview',
          labelKey: 'schoolOverview',
          icon: AnalyticsIcon,
          to: '/admin/overview',
        },
        {
          key: 'users',
          labelKey: 'users',
          icon: UsersIcon,
          to: '/admin/users',
          accent: true,
        },
        {
          key: 'requests',
          labelKey: 'requests',
          icon: InboxIcon,
          to: '/admin/domain-requests',
        },
        { key: 'audit', labelKey: 'auditLog', icon: HistoryIcon, to: '/admin/audit-log' },
        overflow,
      ]
    }

    return [
      {
        key: 'home',
        labelKey: 'dashboard',
        icon: DashboardIcon,
        to: '/teacher/dashboard',
        exact: true,
      },
      {
        key: 'classes',
        labelKey: 'shellNavClasses',
        icon: ClassroomIcon,
        to: '/teacher/classrooms',
        accent: true,
      },
      {
        key: 'materials',
        labelKey: 'shellNavMaterials',
        icon: ModuleIcon,
        to: '/teacher/modules',
      },
      {
        key: 'calendar',
        labelKey: 'calendar',
        icon: CalendarIcon,
        to: '/teacher/calendar',
      },
      overflow,
    ]
  }, [adminSection, unread, profile])

  return (
    <BottomDock
      items={items}
      // The one label only assistive tech reads, so it goes through i18n like
      // every other string — it is the easiest to ship untranslated by accident.
      ariaLabel={t(adminSection ? 'shellAdminNavigation' : 'shellTeacherNavigation')}
      suppressed={suppressed}
      onOverflow={onOverflow}
    />
  )
}
