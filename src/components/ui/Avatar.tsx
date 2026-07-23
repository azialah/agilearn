import { cn } from '@/lib/cn'

export type AvatarColor = 'orange' | 'plum' | 'teal' | 'blue'

const colors: Record<AvatarColor, string> = {
  orange: 'bg-(--color-accent-400) text-(--color-accent-fg)',
  plum: 'bg-violet-500 text-white',
  teal: 'bg-teal-600 text-white',
  blue: 'bg-sky-600 text-white',
}

function initialsFromName(name?: string | null) {
  return (name || '?')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface AvatarProps {
  name?: string | null
  color?: string | null
  className?: string
}

export function Avatar({ name, color, className }: AvatarProps) {
  const avatarColor: AvatarColor =
    color === 'plum' || color === 'teal' || color === 'blue' ? color : 'orange'

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm',
        colors[avatarColor],
        className,
      )}
    >
      {initialsFromName(name)}
    </span>
  )
}
