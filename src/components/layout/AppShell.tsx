import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { IconButton } from '@/components/ui/IconButton'
import { Logo } from '@/components/ui/Logo'
import { CloseIcon } from '@/components/icons'
import { ChevronLeft, ChevronRight, Pin } from 'lucide-react'
import { useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { NAV_ITEMS } from './navItems'
import { SETTINGS_SECTIONS } from './settingsSections'
import { TeacherBreadcrumbs } from './TeacherBreadcrumbs'
import { useClassrooms } from '@/lib/queries/classrooms'
import { readRecentClassrooms, sortByRecentVisit } from '@/lib/recentClassrooms'
import { classroomColorClasses } from '@/lib/classroomColor'
import { SettingsSearchBar } from '@/features/settings/SettingsSearchBar'
import { AppDock } from './AppDock'

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
  const { t } = useLocale()
  return (
    <nav className="flex flex-col gap-1">
      <Link
        to="/teacher/dashboard"
        onClick={onNavigate}
        className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-2) hover:text-(--color-ink)"
      >
        <ChevronLeft className="size-4" /> {t('shellBackToWorkspace')}
      </Link>
      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-(--color-ink-faint)">
        {t('settings')}
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
  const { t } = useLocale()
  const reduceMotion = useReducedMotion()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('agilearn-sidebar-compact')
    return saved === null ? null : saved === 'true'
  })
  const [autoCompact, setAutoCompact] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
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
              label={
                sidebarCompact === true
                  ? t('shellPinnedCollapsed')
                  : effectiveCompact
                    ? t('shellExpandSidebar')
                    : t('shellCollapseSidebar')
              }
              onClick={toggleSidebar}
              className="hidden lg:inline-flex"
            >
              {sidebarCompact === true ? (
                // Distinguishes an explicit pin from the narrow-viewport
                // auto-collapse, which still uses the plain chevron below.
                <Pin className="size-4 fill-current" />
              ) : effectiveCompact ? (
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
              {t('recentClassrooms')}
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
                        {[
                          classroom.year,
                          t('shellStudentCount', { count: classroom.student_count }),
                        ]
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
            <p>{t('shellTeacherWorkspace')}</p>
            <p className="mt-1">{t('shellVersionCopyright')}</p>
          </div>
        )}
      </aside>

      {/* Navigation drawer: a bottom sheet on phones, the same sheet capped and
          centred from md up — deliberately not a full-bleed panel, so the page
          stays visible either side of it and it reads as a menu, not a screen.

          Built on Radix Dialog rather than a bare role="dialog": aria-modal is a
          promise that focus is trapped and the rest of the page is inert, and
          hand-rolling half of that is worse than not claiming it. Content is
          force-mounted so AnimatePresence can play the exit before Radix
          unmounts it. The geometry is bespoke because ResponsiveDrawerContent
          pins itself to the viewport edges, which is the shape this is not. */}
      <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <AnimatePresence>
          {drawerOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  className="fixed inset-0 z-40 bg-black/48 backdrop-blur-md lg:hidden"
                />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content
                asChild
                forceMount
                // No description element exists, and Radix would otherwise point
                // aria-describedby at an id that is not in the document.
                aria-describedby={undefined}
              >
                <motion.aside
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }
                  }
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }
                  }
                  className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-h-[78dvh] max-w-md flex-col gap-5 overflow-y-auto rounded-4xl border border-white/35 bg-[color-mix(in_srgb,var(--color-surface-1)_70%,transparent)] p-4 shadow-(--shadow-pop) outline-none ring-1 ring-inset ring-white/20 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
                >
                  <div className="flex items-center justify-between">
                    {/* Title must own a real DOM node: <Brand> does not forward
                        props, so `asChild` dropped Radix's generated id and left
                        aria-labelledby pointing at nothing — a dialog with no
                        accessible name at all. */}
                    <DialogPrimitive.Title className="sr-only">
                      {t('shellPrimaryNavigation')}
                    </DialogPrimitive.Title>
                    <Brand />
                    <DialogPrimitive.Close asChild>
                      <IconButton label={t('shellCloseNavigation')}>
                        <CloseIcon />
                      </IconButton>
                    </DialogPrimitive.Close>
                  </div>
                  {settingsMode ? (
                    <SettingsSidebarNav onNavigate={() => setDrawerOpen(false)} />
                  ) : (
                    <NavLinks isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
                  )}
                </motion.aside>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-col">
        {/* Mobile settings screens carry their own header/back, so the app top
            bar is hidden there (an iOS-style bottom search bar replaces it). */}
        {!settingsOnMobile && <TopBar onOpenSearch={() => setSearchOpen(true)} />}
        <TeacherBreadcrumbs />
        {/* Keyed by route: without this the element persists across navigation
            and the enter animation only ever plays on the first page load. */}
        <main
          key={pathname}
          className={cn(
            // Bottom padding reserves the dock's measured height (published by
            // BottomDock as --dock-height). The fallback is what applies at the
            // breakpoint where there is no dock at all.
            'page-enter page-stagger mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6',
            'pb-[calc(var(--dock-height,0px)+1.5rem)]',
            // Settings suppresses the dock but puts its own search bar at the
            // bottom of the screen, so those routes reserve their own space.
            // Kept as a CSS breakpoint, not the isMobile state, for the same
            // reason the dock's own visibility is.
            settingsMode && 'max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]',
          )}
        >
          {children}
        </main>
      </div>

      {/* One dock for every audience; it decides its own visibility. */}
      <AppDock onOverflow={() => setDrawerOpen(true)} />

      {/* Settings keeps search inline on mobile; it does not open the global palette. */}
      {settingsOnMobile ? (
        <SettingsSearchBar />
      ) : (
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      )}
    </div>
  )
}
