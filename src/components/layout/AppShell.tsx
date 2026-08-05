import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { IconButton } from '@/components/ui/IconButton'
import { Logo } from '@/components/ui/Logo'
import { CloseIcon } from '@/components/icons'
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Home,
  Layers3,
  MoreHorizontal,
} from 'lucide-react'
import { useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { NAV_ITEMS } from './navItems'
import { SETTINGS_SECTIONS } from './settingsSections'
import { TeacherBreadcrumbs } from './TeacherBreadcrumbs'
import { useClassrooms } from '@/lib/queries/classrooms'
import { readRecentClassrooms, sortByRecentVisit } from '@/lib/recentClassrooms'
import { classroomColorClasses } from '@/lib/classroomColor'
import { SettingsSearchBar } from '@/features/settings/SettingsSearchBar'

function NavLinks({
  isAdmin,
  onNavigate,
  compact = false,
}: {
  isAdmin: boolean
  onNavigate?: () => void
  compact?: boolean
}) {
  const { t } = useLocale()
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const IconComp = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-label={compact ? t(item.labelKey) : undefined}
            title={compact ? t(item.labelKey) : undefined}
            className={cn(
              'group flex items-center rounded-md py-2 text-sm transition-colors hover:bg-(--color-accent-500)/10 hover:text-(--color-ink)',
              compact ? 'justify-center px-0' : 'gap-3 px-3',
            )}
            activeProps={{
              className: 'bg-(--color-accent-500)/12 text-(--color-ink) font-medium',
            }}
            inactiveProps={{ className: 'text-(--color-ink-muted)' }}
            activeOptions={{ exact: false }}
          >
            <IconComp className="size-5 shrink-0 text-(--color-ink-faint) group-hover:text-(--color-accent-350)" />
            {!compact && <span className="truncate">{t(item.labelKey)}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

// On the settings route the desktop sidebar swaps the app nav for the
// settings sections, with a link back to the workspace.
function SettingsSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      <Link
        to="/teacher/dashboard"
        onClick={onNavigate}
        className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
      >
        <ChevronLeft className="size-4" /> Back to workspace
      </Link>
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-ink-faint)">
        Settings
      </p>
      {SETTINGS_SECTIONS.map((section) => (
        <Link
          key={section.to}
          to={section.to}
          onClick={onNavigate}
          className="rounded-md px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
          activeProps={{
            className: 'bg-(--color-surface-2) text-(--color-ink) font-medium',
          }}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/teacher/dashboard" className="flex items-center gap-2 px-2">
      <Logo />
      {!compact && (
        <span className="text-base font-semibold tracking-tight text-(--color-ink)">
          Agilearn
        </span>
      )}
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('agilearn-sidebar-compact')
    return saved === null ? null : saved === 'true'
  })
  const [autoCompact, setAutoCompact] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [mobileNavPreview, setMobileNavPreview] = useState<MobileNavTarget | null>(null)
  const mobileNavDrag = useRef<{
    pointerId: number
    startX: number
    startY: number
    isSwipe: boolean
  } | null>(null)
  const suppressMobileNavClick = useRef(false)
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const { data: classrooms } = useClassrooms()
  const isAdmin = profile?.role === 'admin'
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // pathname is a dependency on purpose: opening a classroom should reorder this
  // list by the time the teacher looks back at the sidebar.
  const recentClassrooms = useMemo(
    () => sortByRecentVisit(classrooms ?? [], readRecentClassrooms()).slice(0, 3),
    [classrooms, pathname],
  )
  const settingsMode = pathname.startsWith('/settings')
  // Collapse to the rail when the user pins it OR when the window is narrow
  // (roughly a shrunk desktop window); hovering the rail expands it back.
  // Settings mode always shows the expanded sidebar (it hosts section links).
  const railCollapsed = sidebarCompact ?? autoCompact
  const effectiveCompact = !settingsMode && railCollapsed && !sidebarHovered

  // Auto-collapse on narrower desktop widths (below xl, still a grid layout).
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')
    const sync = () => setAutoCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // Phones use a dedicated settings chrome with a bottom search bar. Tablets
  // keep the top bar and open their navigation in a drawer.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const settingsOnMobile = settingsMode && isMobile

  function toggleSidebar() {
    setSidebarCompact(() => {
      const next = !railCollapsed
      localStorage.setItem('agilearn-sidebar-compact', String(next))
      return next
    })
  }

  function mobileNavTargetAt(x: number, y: number): MobileNavTarget | null {
    const element = document.elementFromPoint(x, y)
    const target = element?.closest<HTMLElement>('[data-mobile-nav-target]')?.dataset
      .mobileNavTarget
    return isMobileNavTarget(target) ? target : null
  }

  function handleMobileNavPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'touch') return
    event.currentTarget.setPointerCapture(event.pointerId)
    mobileNavDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      isSwipe: false,
    }
  }

  function handleMobileNavPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = mobileNavDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const horizontalDistance = Math.abs(event.clientX - drag.startX)
    const verticalDistance = Math.abs(event.clientY - drag.startY)
    if (
      !drag.isSwipe &&
      (horizontalDistance < 12 || horizontalDistance < verticalDistance)
    )
      return

    drag.isSwipe = true
    setMobileNavPreview(mobileNavTargetAt(event.clientX, event.clientY))
  }

  function handleMobileNavPointerEnd(event: PointerEvent<HTMLElement>) {
    const drag = mobileNavDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const target = drag.isSwipe ? mobileNavTargetAt(event.clientX, event.clientY) : null
    mobileNavDrag.current = null
    setMobileNavPreview(null)
    if (!target) return

    suppressMobileNavClick.current = true
    window.setTimeout(() => {
      suppressMobileNavClick.current = false
    }, 0)
    if (target === 'more') {
      setDrawerOpen(true)
      return
    }
    navigate({ to: target })
  }

  function handleMobileNavPointerCancel() {
    mobileNavDrag.current = null
    setMobileNavPreview(null)
  }

  function handleMobileNavClickCapture(event: MouseEvent<HTMLElement>) {
    if (!suppressMobileNavClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressMobileNavClick.current = false
  }

  // Hover-intent: wait a beat before expanding the rail so a quick graze past
  // the sidebar doesn't pop it open. Collapsing on leave stays immediate.
  const hoverTimer = useRef<number | null>(null)
  function handleRailEnter() {
    if (!railCollapsed || sidebarCompact !== null) return
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setSidebarHovered(true), 180)
  }
  function handleRailLeave() {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = null
    setSidebarHovered(false)
  }
  useEffect(
    () => () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    },
    [],
  )

  return (
    <div
      className={cn(
        'min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-420 lg:ease-[cubic-bezier(0.32,0.72,0,1)]',
        effectiveCompact ? 'lg:grid-cols-[5.75rem_1fr]' : 'lg:grid-cols-[17rem_1fr]',
      )}
    >
      {/* Desktop sidebar */}
      <aside
        onPointerEnter={handleRailEnter}
        onPointerLeave={handleRailLeave}
        className="sticky top-0 m-3 hidden h-[calc(100dvh-1.5rem)] flex-col gap-6 overflow-hidden rounded-4xl border border-(--color-border) bg-(--color-surface-1) p-3 shadow-(--shadow-card) lg:flex"
      >
        <div
          className={cn(
            'flex items-center pt-1',
            effectiveCompact ? 'justify-center' : 'justify-between',
          )}
        >
          {!effectiveCompact && <Brand />}
          {!settingsMode && (
            <IconButton
              label={effectiveCompact ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleSidebar}
              className="hidden lg:inline-flex"
            >
              {effectiveCompact ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </IconButton>
          )}
        </div>
        {settingsMode ? (
          <SettingsSidebarNav />
        ) : (
          <NavLinks isAdmin={isAdmin} compact={effectiveCompact} />
        )}
        {!settingsMode && !effectiveCompact && (classrooms?.length ?? 0) > 0 && (
          <div className="min-h-0 overflow-y-auto px-1">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-ink-faint)">
              Recent classrooms
            </p>
            <ul className="space-y-1">
              {recentClassrooms.map((classroom) => (
                <li key={classroom.id}>
                  <Link
                    to="/teacher/classrooms/$classroomId"
                    params={{ classroomId: classroom.id }}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-(--color-surface-2)"
                    activeProps={{ className: 'bg-(--color-surface-2)' }}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        classroomColorClasses(classroom).dot,
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-(--color-ink)">
                        {classroom.cohort_name ||
                          classroom.block ||
                          classroom.course_name}
                      </span>
                      <span className="block truncate text-[11px] text-(--color-ink-faint)">
                        {[classroom.year, `${classroom.student_count} students`]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!settingsMode && !effectiveCompact && (
          <div className="mt-auto border-t border-(--color-border) px-2 pt-4 text-xs text-(--color-ink-faint)">
            <p>Agilearn teacher workspace</p>
            <p className="mt-1">v1.0 · © 2026</p>
          </div>
        )}
      </aside>

      {/* Phone bottom sheet / tablet side drawer for navigation. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/48 backdrop-blur-md"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex max-h-[78dvh] flex-col gap-5 rounded-4xl border border-white/35 bg-[color-mix(in_srgb,var(--color-surface-1)_70%,transparent)] p-4 shadow-(--shadow-pop) ring-1 ring-inset ring-white/20 backdrop-blur-2xl backdrop-saturate-150 md:inset-y-3 md:bottom-auto md:left-3 md:right-auto md:max-h-none md:w-80">
            <div className="flex items-center justify-between">
              <Brand />
              <IconButton label="Close navigation" onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            {settingsMode ? (
              <SettingsSidebarNav onNavigate={() => setDrawerOpen(false)} />
            ) : (
              <NavLinks isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
            )}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        {/* Mobile settings screens carry their own header/back, so the app top
            bar is hidden there (an iOS-style bottom search bar replaces it). */}
        {!settingsOnMobile && (
          <TopBar
            onOpenSearch={() => setSearchOpen(true)}
            onOpenNavigation={() => setDrawerOpen(true)}
          />
        )}
        <TeacherBreadcrumbs />
        {/* Keyed by route: without this the element persists across navigation
            and the enter animation only ever plays on the first page load. */}
        <main
          key={pathname}
          className={cn(
            'page-enter page-stagger mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6',
          )}
        >
          {children}
        </main>
      </div>

      {/* App bottom nav — hidden on settings routes (replaced by the search bar). */}
      {!settingsMode && (
        <nav
          aria-label="Primary navigation"
          onPointerDown={handleMobileNavPointerDown}
          onPointerMove={handleMobileNavPointerMove}
          onPointerUp={handleMobileNavPointerEnd}
          onPointerCancel={handleMobileNavPointerCancel}
          onClickCapture={handleMobileNavClickCapture}
          className="bottom-nav-enter fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md touch-pan-y items-center justify-around rounded-[1.6rem] border border-white/40 bg-[color-mix(in_srgb,var(--color-surface-1)_55%,transparent)] px-2 py-2 shadow-(--shadow-pop) ring-1 ring-inset ring-white/25 backdrop-blur-2xl backdrop-saturate-150 md:hidden"
        >
          <MobileNavLink
            to="/teacher/dashboard"
            label="Home"
            icon={<Home />}
            preview={mobileNavPreview}
          />
          <MobileNavLink
            to="/teacher/classrooms"
            label="Classes"
            icon={<BookOpen />}
            preview={mobileNavPreview}
          />
          <MobileNavLink
            to="/teacher/calendar"
            label="Calendar"
            icon={<CalendarDays />}
            preview={mobileNavPreview}
          />
          <MobileNavLink
            to="/teacher/modules"
            label="Materials"
            icon={<Layers3 />}
            preview={mobileNavPreview}
          />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open more navigation"
            data-mobile-nav-target="more"
            className="flex min-w-14 flex-col items-center gap-1 rounded-full px-3 py-1 text-[11px] leading-none text-(--color-ink-muted) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400)"
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        </nav>
      )}

      {/* Settings keeps search inline on mobile; it does not open the global palette. */}
      {settingsOnMobile ? (
        <SettingsSearchBar />
      ) : (
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      )}
    </div>
  )
}

type MobileNavDestination =
  '/teacher/dashboard' | '/teacher/classrooms' | '/teacher/calendar' | '/teacher/modules'
type MobileNavTarget = MobileNavDestination | 'more'

function isMobileNavTarget(value: string | undefined): value is MobileNavTarget {
  return (
    value === '/teacher/dashboard' ||
    value === '/teacher/classrooms' ||
    value === '/teacher/calendar' ||
    value === '/teacher/modules' ||
    value === 'more'
  )
}

function MobileNavLink({
  to,
  label,
  icon,
  preview,
}: {
  to: MobileNavDestination
  label: string
  icon: ReactNode
  preview: MobileNavTarget | null
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const reduceMotion = useReducedMotion()
  const isCurrentRoute =
    to === '/teacher/dashboard'
      ? pathname === to
      : pathname === to || pathname.startsWith(`${to}/`)
  const isActive = preview ? preview === to : isCurrentRoute

  return (
    <Link
      to={to}
      data-mobile-nav-target={to}
      activeOptions={{ exact: to === '/teacher/dashboard' }}
      className={cn(
        'relative isolate flex min-w-14 flex-col items-center gap-1 rounded-full px-3 py-1 text-[11px] leading-none transition-colors',
        isActive ? 'font-medium text-(--color-accent-fg)' : 'text-(--color-ink-muted)',
      )}
    >
      {isActive && (
        <motion.span
          layoutId="mobile-nav-active-indicator"
          initial={false}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 430, damping: 30, mass: 0.7 }
          }
          className="absolute inset-0 z-0 rounded-full border border-white/45 bg-[color-mix(in_srgb,var(--color-accent-400)_82%,white)] shadow-[0_5px_15px_color-mix(in_srgb,var(--color-accent-400)_24%,transparent)] before:absolute before:inset-x-2 before:top-1 before:h-1/3 before:rounded-full before:bg-white/45 before:blur-[2px] before:content-['']"
        />
      )}
      <motion.span
        animate={{ scale: isActive && !reduceMotion ? 1.08 : 1 }}
        transition={
          reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 24 }
        }
        className="relative z-10 [&>svg]:size-5"
      >
        {icon}
      </motion.span>
      <span className="relative z-10">{label}</span>
    </Link>
  )
}
