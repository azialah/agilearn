import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import {
  Bell,
  HardDrive,
  LogOut,
  Menu,
  Search,
  Settings2,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Avatar } from '@/components/ui/Avatar'
import { signOut, useProfile } from '@/lib/queries/profiles'
import {
  useClearUnreadNotifications,
  useMarkNotificationRead,
  useUnreadNotifications,
  type NotificationPayload,
} from '@/lib/queries/notifications'
import { useLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'
import { useToast } from '@/components/ui/toast'
import type { AppNotification } from '@/types/domain'

/** Middle name = full_name with the first- and last-name parts trimmed off. */
function deriveMiddleName(
  profile:
    { full_name?: string; first_name?: string; last_name?: string } | null | undefined,
): string | undefined {
  const full = profile?.full_name?.trim()
  if (!full) return undefined
  let middle = full
  const first = profile?.first_name?.trim()
  const last = profile?.last_name?.trim()
  if (first && middle.startsWith(first)) middle = middle.slice(first.length).trim()
  if (last && middle.endsWith(last)) middle = middle.slice(0, -last.length).trim()
  return middle || undefined
}

function notificationPayload(notification: AppNotification): NotificationPayload {
  const payload = notification.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const studentName =
      typeof payload.studentName === 'string' ? payload.studentName : 'Student'
    const value = typeof payload.value === 'number' ? payload.value : 0
    const courseSubjectName =
      typeof payload.courseSubjectName === 'string'
        ? payload.courseSubjectName
        : undefined
    return { studentName, value, courseSubjectName }
  }
  return { studentName: 'Student', value: 0 }
}

// Navigation below `lg` lives entirely in the bottom navbar (its "More" button
// opens the drawer), so the top bar carries no hamburger — just search + account.
export function TopBar({
  onOpenSearch,
  onOpenNavigation,
}: {
  onOpenSearch: () => void
  onOpenNavigation?: () => void
}) {
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const { t } = useLocale()
  const { toast } = useToast()
  const [isPhone, setIsPhone] = useState(false)
  const unreadNotifications = useUnreadNotifications()
  const markNotificationRead = useMarkNotificationRead()
  const clearUnreadNotifications = useClearUnreadNotifications()
  const unread = unreadNotifications.data ?? []
  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || ''
  // Prefer the middle_name column; fall back to the slice of full_name between
  // first and last name (older profiles never split their middle name out).
  const middleName = profile?.middle_name?.trim() || deriveMiddleName(profile) || ''
  const middleInitial = middleName.charAt(0)
  const displayName = firstName
    ? `${firstName}${middleInitial ? ` ${middleInitial}.` : ''}`
    : profile?.email

  // Auto-hide on scroll-down, reveal on scroll-up (or hovering the top edge),
  // matching the landing header. Disabled under reduced-motion.
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsPhone(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useMotionValueEvent(scrollY, 'change', (y) => {
    if (reduce) return
    const previous = scrollY.getPrevious() ?? 0
    setHidden(y > previous && y > 80)
  })

  function handleNotificationSelect(notification: AppNotification) {
    void markNotificationRead.mutateAsync(notification.id).catch((error: unknown) => {
      toast({
        title: 'Could not mark notification as read',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    })
    if (notification.type === 'low_average') {
      navigate({
        to: '/teacher/classrooms/$classroomId/grades',
        params: { classroomId: notification.classroom_id },
        search: {
          studentId: notification.student_id,
          subjectId: notification.course_subject_id ?? undefined,
        },
      })
      return
    }
    navigate({
      to: '/teacher/classrooms/$classroomId/attendance',
      params: { classroomId: notification.classroom_id },
      search: { studentId: notification.student_id },
    })
  }

  function handleClearNotifications() {
    void clearUnreadNotifications.mutateAsync().catch((error: unknown) => {
      toast({
        title: 'Could not clear notifications',
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    })
  }

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-20 h-2.5"
        onMouseEnter={() => setHidden(false)}
      />
      <motion.header
        animate={{ y: reduce || isPhone ? 0 : hidden ? '-100%' : '0%' }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="static z-30 flex h-14 items-center gap-3 bg-(--color-surface-0)/85 px-4 backdrop-blur md:sticky md:top-3 md:mx-3 md:rounded-3xl md:shadow-(--shadow-card) lg:top-0 lg:mx-0 lg:rounded-none lg:border-b lg:border-(--color-border) lg:shadow-none"
      >
        {onOpenNavigation && (
          <IconButton
            label="Open navigation"
            className="!hidden md:!inline-flex lg:!hidden"
            onClick={onOpenNavigation}
          >
            <Menu className="size-4" />
          </IconButton>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search (Ctrl+K)"
          className="order-2 hidden h-9 w-64 items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-1) pl-3 pr-2 text-sm text-(--color-ink-faint) transition-colors hover:border-(--color-border-strong) hover:text-(--color-ink-muted) lg:flex"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-(--color-border) bg-(--color-surface-2) px-1.5 py-0.5 text-[10px] font-medium">
            {isMac ? 'Cmd K' : 'Ctrl K'}
          </kbd>
        </button>
        <IconButton
          label="Search (Ctrl+K)"
          className="order-2 rounded-full border border-(--color-border) bg-(--color-surface-1) shadow-sm lg:hidden"
          onClick={onOpenSearch}
        >
          <Search className="size-4" />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={
                unread.length === 0
                  ? 'Notifications'
                  : `Notifications, ${unread.length} unread`
              }
              className="order-1 relative inline-flex size-9 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface-1) text-(--color-ink-muted) shadow-sm transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) lg:rounded-md lg:border-0 lg:bg-transparent lg:shadow-none"
            >
              <Bell className="size-4" aria-hidden />
              {unread.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-(--color-accent-400) px-1 text-[10px] font-bold leading-4 text-(--color-accent-fg)">
                  {unread.length > 9 ? '9+' : unread.length}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[min(24rem,calc(100vw-2rem))] rounded-3xl p-2"
          >
            <DropdownMenuLabel className="flex items-center justify-between rounded-xl bg-(--color-surface-2) p-3 normal-case tracking-normal">
              <span className="text-sm font-semibold text-(--color-ink)">
                Notifications
              </span>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  disabled={clearUnreadNotifications.isPending}
                  className="rounded-md px-2 py-1 text-xs font-medium text-(--color-accent-350) hover:bg-(--color-surface-3) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear all
                </button>
              )}
            </DropdownMenuLabel>
            {unreadNotifications.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-(--color-ink-faint)">
                Loading notifications…
              </p>
            ) : unread.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-(--color-ink-faint)">
                You&apos;re all caught up.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {unread.map((notification) => {
                  const payload = notificationPayload(notification)
                  const lowAverage = notification.type === 'low_average'
                  const description = lowAverage
                    ? `${payload.studentName} has a ${payload.value.toFixed(2)}% average${payload.courseSubjectName ? ` in ${payload.courseSubjectName}` : ''}.`
                    : `${payload.studentName} has ${payload.value} consecutive unexcused absences.`
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      onSelect={() => handleNotificationSelect(notification)}
                      className="items-start gap-3 rounded-xl px-3 py-3"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-(--color-warning)" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-(--color-ink)">
                          {lowAverage ? 'Low average' : 'Attendance alert'}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-(--color-ink-muted)">
                          {description}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account menu for ${profile?.full_name || profile?.email || 'your account'}`}
              className="order-3 inline-flex size-9 items-center justify-center rounded-md text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) md:flex md:w-auto md:justify-start md:gap-2 md:rounded-full md:border md:border-(--color-border) md:bg-(--color-surface-1) md:pl-1 md:pr-3 md:shadow-sm"
            >
              <Avatar
                name={profile?.full_name || profile?.email}
                color={profile?.avatar_color}
                className="!size-7 !text-[10px]"
              />
              <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-medium text-(--color-ink) md:block">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-3xl p-2">
            <DropdownMenuLabel className="rounded-xl bg-(--color-surface-2) p-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={profile?.full_name || profile?.email}
                  color={profile?.avatar_color}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--color-ink)">
                    {profile?.full_name || 'Teacher account'}
                  </p>
                  <p className="truncate text-xs font-normal text-(--color-ink-muted)">
                    {profile?.email}
                  </p>
                </div>
              </div>
              {profile?.role === 'admin' && (
                <Badge tone="accent" className="mt-2">
                  admin
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: '/teacher/profile' })}>
              <UserRound className="size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
              <Settings2 className="size-4" /> {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: '/teacher/usage' })}>
              <HardDrive className="size-4" /> Usage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut className="size-4" /> {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.header>
    </>
  )
}
