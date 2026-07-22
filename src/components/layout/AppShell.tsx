import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'
import { IconButton } from '@/components/ui/IconButton'
import { CloseIcon } from '@/components/icons'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  Layers3,
  MoreHorizontal,
} from 'lucide-react'
import { useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { NAV_ITEMS } from './navItems'
import { TeacherBreadcrumbs } from './TeacherBreadcrumbs'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useAllCourseSubjects } from '@/lib/queries/academicWorkspace'

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
            className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            activeProps={{
              className:
                'bg-[var(--color-surface-2)] text-[var(--color-ink)] font-medium',
            }}
            activeOptions={{ exact: false }}
          >
            <IconComp className="shrink-0 text-lg text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent-350)]" />
            {!compact && <span className="truncate">{t(item.labelKey)}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/teacher/dashboard" className="flex items-center gap-2 px-2">
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
        A
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
          Agilearn
        </span>
      )}
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const { data: profile } = useProfile()
  const { data: classrooms } = useClassrooms()
  const { data: subjects } = useAllCourseSubjects()
  const isAdmin = profile?.role === 'admin'
  const effectiveCompact = sidebarCompact && !sidebarHovered

  useEffect(() => {
    setSidebarCompact(localStorage.getItem('agilearn-sidebar-compact') === 'true')
  }, [])

  function toggleSidebar() {
    setSidebarCompact((current) => {
      const next = !current
      localStorage.setItem('agilearn-sidebar-compact', String(next))
      return next
    })
  }

  return (
    <div
      className={cn(
        'min-h-dvh lg:grid',
        effectiveCompact ? 'lg:grid-cols-[5.75rem_1fr]' : 'lg:grid-cols-[17rem_1fr]',
      )}
    >
      {/* Desktop sidebar */}
      <aside
        onPointerEnter={() => sidebarCompact && setSidebarHovered(true)}
        onPointerLeave={() => setSidebarHovered(false)}
        className="sticky top-0 m-3 hidden h-[calc(100dvh-1.5rem)] flex-col gap-6 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 shadow-[var(--shadow-card)] transition-[width] duration-200 lg:flex"
      >
        <div className="flex items-center justify-between pt-1">
          <Brand compact={effectiveCompact} />
          <IconButton
            label={effectiveCompact ? 'Keep sidebar open' : 'Collapse sidebar'}
            onClick={toggleSidebar}
            className="hidden lg:inline-flex"
          >
            {effectiveCompact ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </div>
        <NavLinks isAdmin={isAdmin} compact={effectiveCompact} />
        {!effectiveCompact && (classrooms?.length ?? 0) > 0 && (
          <div className="min-h-0 overflow-y-auto px-1">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-faint)]">
              Recent classrooms
            </p>
            <div className="space-y-2">
              {classrooms?.slice(0, 3).map((classroom) => (
                <div
                  key={classroom.id}
                  className="rounded-xl bg-[var(--color-surface-2)] p-2"
                >
                  <Link
                    to="/teacher/classrooms/$classroomId"
                    params={{ classroomId: classroom.id }}
                    className="block truncate text-xs font-medium text-[var(--color-ink)]"
                  >
                    {classroom.cohort_name || classroom.block || classroom.course_name}
                  </Link>
                  <div className="mt-1 space-y-1">
                    {subjects
                      ?.filter((subject) => subject.classroom_id === classroom.id)
                      .slice(0, 3)
                      .map((subject) => (
                        <Link
                          key={subject.id}
                          to="/teacher/classrooms/$classroomId"
                          params={{ classroomId: classroom.id }}
                          className="block truncate pl-2 text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-accent-350)]"
                        >
                          {subject.name}
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto border-t border-[var(--color-border)] px-2 pt-4 text-xs text-[var(--color-ink-faint)]">
          {!sidebarCompact && (
            <>
              <p>Agilearn teacher workspace</p>
              <p className="mt-1">v1.0 · © 2026</p>
            </>
          )}
        </div>
      </aside>

      {/* Mobile drawer: account and the less-frequent destinations. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex max-h-[78dvh] flex-col gap-5 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between">
              <Brand />
              <IconButton label="Close navigation" onClick={() => setDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </div>
            <NavLinks isAdmin={isAdmin} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <TopBar
          onOpenNav={() => setDrawerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <TeacherBreadcrumbs />
        <main
          className={cn(
            'page-enter mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-6',
          )}
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center justify-around rounded-[1.6rem] border border-white/25 bg-[color:color-mix(in_srgb,var(--color-surface-1)_86%,transparent)] px-2 py-2 shadow-[var(--shadow-pop)] backdrop-blur-2xl lg:hidden"
      >
        <MobileNavLink to="/teacher/dashboard" label="Home" icon={<Home />} />
        <MobileNavLink to="/teacher/classrooms" label="Classes" icon={<BookOpen />} />
        <MobileNavLink to="/teacher/modules" label="Materials" icon={<Layers3 />} />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open more navigation"
          className="flex min-w-14 flex-col items-center gap-1 rounded-full px-3 py-1 text-xs text-[var(--color-ink-muted)]"
        >
          <MoreHorizontal className="size-5" />
          <span>More</span>
        </button>
      </nav>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}

function MobileNavLink({
  to,
  label,
  icon,
}: {
  to: '/teacher/dashboard' | '/teacher/classrooms' | '/teacher/modules'
  label: string
  icon: ReactNode
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === '/teacher/dashboard' }}
      className="flex min-w-14 flex-col items-center gap-1 rounded-full px-3 py-1 text-xs text-[var(--color-ink-muted)]"
      activeProps={{
        className:
          'flex min-w-14 flex-col items-center gap-1 rounded-full bg-[var(--color-accent-400)] px-3 py-1 text-xs font-medium text-[var(--color-accent-fg)]',
      }}
    >
      <span className="[&>svg]:size-4">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
