import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/cn'
import { TopBar } from './TopBar'
import { IconButton } from '@/components/ui/IconButton'
import {
  ClassroomIcon,
  CloseIcon,
  DashboardIcon,
  ModuleIcon,
  UsersIcon,
} from '@/components/icons'
import { useProfile } from '@/lib/queries/profiles'

interface NavItem {
  to: string
  label: string
  icon: (props: { className?: string }) => ReactNode
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/classrooms', label: 'Classrooms', icon: ClassroomIcon },
  { to: '/modules', label: 'Modules', icon: ModuleIcon },
  { to: '/admin/users', label: 'Users', icon: UsersIcon, adminOnly: true },
]

function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const IconComp = item.icon
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            activeProps={{
              className:
                'bg-[var(--color-surface-2)] text-[var(--color-ink)] font-medium',
            }}
            activeOptions={{ exact: false }}
          >
            <IconComp className="text-lg text-[var(--color-ink-faint)] group-hover:text-[var(--color-accent-350)]" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 px-2">
      <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-400)] text-sm font-bold text-[var(--color-accent-fg)]">
        A
      </span>
      <span className="text-base font-semibold tracking-tight text-[var(--color-ink)]">
        Agilearn
      </span>
    </Link>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: profile } = useProfile()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 lg:flex">
        <div className="pt-2">
          <Brand />
        </div>
        <NavLinks isAdmin={isAdmin} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col gap-6 border-r border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
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
        <TopBar onOpenNav={() => setDrawerOpen(true)} />
        <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6')}>
          {children}
        </main>
      </div>
    </div>
  )
}
