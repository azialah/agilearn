import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { Bell, TriangleAlert } from 'lucide-react'
import {
  ProfileIcon,
  SearchIcon,
  SettingsIcon,
  SignOutIcon,
  UsageIcon,
} from '@/components/icons'
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
import {
  ResponsiveDrawer,
  ResponsiveDrawerBody,
  ResponsiveDrawerContent,
  ResponsiveDrawerFooter,
  ResponsiveDrawerHeader,
} from '@/components/ui/ResponsiveDrawer'
import { cn } from '@/lib/cn'
import { signOut, useProfile } from '@/lib/queries/profiles'
import {
  useClearUnreadNotifications,
  useMarkNotificationRead,
  useUnreadNotificationCount,
  useUnreadNotifications,
  type NotificationPayload,
} from '@/lib/queries/notifications'
import { useLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'
import { useToast } from '@/components/ui/toast'
import type { AppNotification } from '@/types/domain'

/**
 * The three header triggers (notifications, search, account) must read as one
 * set of controls at phone widths — same 36px circle, same border and surface.
 * Per-button `md:`/`lg:` classes layer the intentional differences on top.
 */
const TRIGGER_CLASS =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface-1) text-(--color-ink-muted) shadow-sm transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)'

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

function notificationPayload(
  notification: AppNotification,
  fallbackName: string,
): NotificationPayload {
  const payload = notification.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const studentName =
      typeof payload.studentName === 'string' ? payload.studentName : fallbackName
    const value = typeof payload.value === 'number' ? payload.value : 0
    const courseSubjectName =
      typeof payload.courseSubjectName === 'string'
        ? payload.courseSubjectName
        : undefined
    return { studentName, value, courseSubjectName }
  }
  return { studentName: fallbackName, value: 0 }
}

// Navigation below `lg` lives entirely in the bottom navbar (its "More" button
// opens the drawer), so the top bar carries no hamburger — just search + account.
export function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const { t } = useLocale()
  const { toast } = useToast()
  const [isPhone, setIsPhone] = useState(false)
  const unreadNotifications = useUnreadNotifications()
  const unreadCountQuery = useUnreadNotificationCount()
  const markNotificationRead = useMarkNotificationRead()
  const clearUnreadNotifications = useClearUnreadNotifications()
  const unread = unreadNotifications.data ?? []
  const unreadCount = unreadCountQuery.data ?? unread.length
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
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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
        title: t('shellToastMarkReadError'),
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

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      setConfirmSignOut(false)
      navigate({ to: '/login' })
    } catch (error) {
      toast({
        title: t('shellToastSignOutError'),
        description: error instanceof Error ? error.message : undefined,
        tone: 'error',
      })
    } finally {
      setSigningOut(false)
    }
  }

  function handleClearNotifications() {
    void clearUnreadNotifications.mutateAsync().catch((error: unknown) => {
      toast({
        title: t('shellToastClearNotificationsError'),
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
        {/* Only reserves space at lg+, where the search pill goes back to a
            fixed width and needs something to push it (and account) right.
            Below lg the search button's own flex-1 fills all remaining
            width — this spacer would just steal half of it. */}
        <div className="hidden lg:block lg:flex-1" />
        {/* Same pill design at every width — xs/sm/md just get a full-width,
            flexible version instead of an icon-only trigger. */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t('shellSearchAriaLabel')}
          className="order-2 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-1) pl-3 pr-2 text-sm text-(--color-ink-faint) transition-colors hover:border-(--color-border-strong) hover:text-(--color-ink-muted) lg:max-w-none lg:flex-none lg:basis-64"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-left">
            {t('shellSearchPlaceholder')}
          </span>
          <kbd className="hidden shrink-0 rounded border border-(--color-border) bg-(--color-surface-2) px-1.5 py-0.5 text-[10px] font-medium sm:inline">
            {isMac ? 'Cmd K' : 'Ctrl K'}
          </kbd>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('shellAccountMenu', {
                name: profile?.full_name || profile?.email || t('shellYourAccount'),
              })}
              className={cn(
                TRIGGER_CLASS,
                'order-3 relative md:w-auto md:justify-start md:gap-2 md:pl-1 md:pr-3',
              )}
            >
              <Avatar
                name={profile?.full_name || profile?.email}
                color={profile?.avatar_color}
                src={profile?.avatar_url}
                className="size-6! text-[10px]!"
              />
              <span className="hidden min-w-0 flex-1 truncate text-left text-sm font-medium text-(--color-ink) md:block">
                {displayName}
              </span>
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-(--color-accent-400) px-1 text-[10px] font-bold leading-4 text-(--color-accent-fg) md:right-1 md:top-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-3xl p-2">
            <DropdownMenuLabel className="rounded-xl bg-(--color-surface-2) p-3">
              <div className="flex items-center gap-3">
                <Avatar
                  name={profile?.full_name || profile?.email}
                  color={profile?.avatar_color}
                  src={profile?.avatar_url}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-(--color-ink)">
                    {profile?.full_name || t('shellTeacherAccountFallback')}
                  </p>
                  <p className="truncate text-xs font-normal text-(--color-ink-muted)">
                    {profile?.email}
                  </p>
                </div>
              </div>
              {profile?.role === 'admin' && (
                <Badge tone="accent" className="mt-2">
                  {t('shellAdminBadge')}
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-(--color-ink-faint)">
                <Bell className="size-3.5" aria-hidden />
                {t('shellNotifications')}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearNotifications}
                  disabled={clearUnreadNotifications.isPending}
                  className="rounded-md px-2 py-1 text-xs font-medium text-(--color-accent-350) hover:bg-(--color-surface-3) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('shellClearAll')}
                </button>
              )}
            </div>
            {unreadNotifications.isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-(--color-ink-faint)">
                {t('shellLoadingNotifications')}
              </p>
            ) : unread.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-(--color-ink-faint)">
                {t('shellAllCaughtUp')}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto py-1">
                {unread.map((notification) => {
                  const payload = notificationPayload(
                    notification,
                    t('shellStudentFallback'),
                  )
                  const lowAverage = notification.type === 'low_average'
                  const description = lowAverage
                    ? payload.courseSubjectName
                      ? t('shellLowAverageWithSubject', {
                          name: payload.studentName,
                          value: payload.value.toFixed(2),
                          subject: payload.courseSubjectName,
                        })
                      : t('shellLowAverageNoSubject', {
                          name: payload.studentName,
                          value: payload.value.toFixed(2),
                        })
                    : t('shellAbsenceAlert', {
                        name: payload.studentName,
                        count: payload.value,
                      })
                  return (
                    <DropdownMenuItem
                      key={notification.id}
                      onSelect={() => handleNotificationSelect(notification)}
                      className="items-start gap-3 rounded-xl px-3 py-3"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-(--color-warning)" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-(--color-ink)">
                          {lowAverage
                            ? t('shellLowAverageTitle')
                            : t('shellAttendanceAlertTitle')}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: '/teacher/profile' })}>
              <ProfileIcon className="size-4" /> {t('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
              <SettingsIcon className="size-4" /> {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: '/teacher/usage' })}>
              <UsageIcon className="size-4" /> {t('usage')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirmSignOut(true)}>
              <SignOutIcon className="size-4" /> {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.header>

      {/* Bottom sheet on phones, centred modal at md+ — one component covers
          both, so there is no separate mobile confirmation to keep in sync. */}
      <ResponsiveDrawer
        open={confirmSignOut}
        onOpenChange={(next) => !signingOut && setConfirmSignOut(next)}
      >
        {/* A two-line confirmation doesn't need the sheet's `max-md:min-h-[60dvh]`.
            `!` because cn() is clsx without tailwind-merge, so a plain `min-h-0`
            would be decided by CSS source order rather than by intent. */}
        <ResponsiveDrawerContent className="!min-h-0 md:max-w-md">
          <ResponsiveDrawerHeader
            title={t('signOut')}
            description={t('shellSignOutConfirmDescription')}
          />
          <ResponsiveDrawerBody>
            <p className="text-sm text-(--color-ink-muted)">
              {t('shellSignOutConfirmBody')}
            </p>
          </ResponsiveDrawerBody>
          <ResponsiveDrawerFooter
            primaryLabel={t('signOut')}
            primaryVariant="danger"
            primaryLoading={signingOut}
            onPrimary={() => void handleSignOut()}
            secondaryLabel={t('shellStaySignedIn')}
            onSecondary={() => setConfirmSignOut(false)}
          />
        </ResponsiveDrawerContent>
      </ResponsiveDrawer>
    </>
  )
}
