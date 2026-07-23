import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
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
import { Avatar } from '@/components/ui/Avatar'
import { signOut, useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { isMac } from '@/lib/platform'

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

// Navigation below `lg` lives entirely in the bottom navbar (its "More" button
// opens the drawer), so the top bar carries no hamburger — just search + account.
export function TopBar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { data: profile } = useProfile()
  const navigate = useNavigate()
  const { t } = useLocale()
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
  useMotionValueEvent(scrollY, 'change', (y) => {
    if (reduce) return
    const previous = scrollY.getPrevious() ?? 0
    setHidden(y > previous && y > 80)
  })

  return (
    <>
      <div
        aria-hidden
        className="fixed inset-x-0 top-0 z-20 h-2.5"
        onMouseEnter={() => setHidden(false)}
      />
      <motion.header
        animate={{ y: reduce ? 0 : hidden ? '-100%' : '0%' }}
        transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-(--color-border) bg-(--color-surface-0)/85 px-4 backdrop-blur"
      >
        <div className="flex-1" />
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search (Ctrl+K)"
          className="hidden h-9 w-64 items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-1) pl-3 pr-2 text-sm text-(--color-ink-faint) transition-colors hover:border-(--color-border-strong) hover:text-(--color-ink-muted) sm:flex"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-(--color-border) bg-(--color-surface-2) px-1.5 py-0.5 text-[10px] font-medium">
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
              className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface-1) py-1 pl-1 pr-1.5 shadow-sm transition-colors hover:bg-(--color-surface-2) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-400) sm:pr-3"
            >
              <Avatar
                name={profile?.full_name || profile?.email}
                color={profile?.avatar_color}
              />
              <span className="hidden text-sm font-medium text-(--color-ink) sm:block">
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
