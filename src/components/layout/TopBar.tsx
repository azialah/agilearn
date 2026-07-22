import { useNavigate } from '@tanstack/react-router'
import { HardDrive, LogOut, Search, Settings2, UserRound } from 'lucide-react'
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
import { MenuIcon } from '@/components/icons'
import { Avatar } from '@/components/ui/Avatar'
import { signOut, useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'

export function TopBar({
  onOpenNav,
  onOpenSearch,
}: {
  onOpenNav: () => void
  onOpenSearch: () => void
}) {
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const { t } = useLocale()
  const firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || ''
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/85 px-4 backdrop-blur">
      <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenNav}>
        <MenuIcon />
      </IconButton>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-1.5 text-sm text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-muted)] sm:flex"
      >
        <Search className="size-3.5" aria-hidden />
        Search
        <kbd className="ml-2 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
          {isMac ? 'Cmd K' : 'Ctrl K'}
        </kbd>
      </button>
      <IconButton label="Search (Ctrl+K)" className="sm:hidden" onClick={onOpenSearch}>
        <Search className="size-4" />
      </IconButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Account menu for ${profile?.full_name || profile?.email || 'your account'}`}
            className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)]"
          >
            <Avatar
              name={profile?.full_name || profile?.email}
              color={profile?.avatar_color}
            />
            <span className="hidden text-sm text-[var(--color-ink)] sm:block">
              {firstName || profile?.email}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 rounded-[1.5rem] p-2">
          <DropdownMenuLabel className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <div className="flex items-center gap-3">
              <Avatar
                name={profile?.full_name || profile?.email}
                color={profile?.avatar_color}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {profile?.full_name || 'Teacher account'}
                </p>
                <p className="truncate text-xs font-normal text-[var(--color-ink-muted)]">
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
    </header>
  )
}
