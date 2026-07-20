import { useNavigate } from '@tanstack/react-router'
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
import { MenuIcon, SignOutIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { signOut, useProfile } from '@/lib/queries/profiles'
import { useToast } from '@/components/ui/toast'

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const { toast } = useToast()

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    await signOut()
    toast({ title: 'Signed out' })
    navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/85 px-4 backdrop-blur">
      <IconButton label="Open navigation" className="lg:hidden" onClick={onOpenNav}>
        <MenuIcon />
      </IconButton>

      <div className="flex-1" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 hover:bg-[var(--color-surface-2)]">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-accent-500)]/25 text-xs font-semibold text-[var(--color-accent-300)]">
              {initials}
            </span>
            <span className="hidden text-sm text-[var(--color-ink)] sm:block">
              {profile?.full_name || profile?.email}
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
          <DropdownMenuItem onSelect={handleSignOut}>
            <SignOutIcon /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
