import { useNavigate } from '@tanstack/react-router'
import { Search, Settings2 } from 'lucide-react'
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
import { useProfile } from '@/lib/queries/profiles'
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/85 px-4 backdrop-blur">
      <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenNav}>
        <MenuIcon />
      </IconButton>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-1.5 text-sm text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-muted)] sm:flex"
      >
        <Search className="size-3.5" aria-hidden />
        Search
        <kbd className="ml-2 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
          {isMac ? '⌘K' : 'Ctrl K'}
        </kbd>
      </button>

      <div className="flex-1" />

      <IconButton label="Search (Ctrl+K)" className="sm:hidden" onClick={onOpenSearch}>
        <Search className="size-4" />
      </IconButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Account menu for ${profile?.full_name || profile?.email || 'your account'}`}
            className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)]"
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
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            {profile?.email}
            {profile?.role === 'admin' && (
              <Badge tone="accent" className="ml-2">
                admin
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
            <Settings2 className="size-4" /> {t('settings')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
