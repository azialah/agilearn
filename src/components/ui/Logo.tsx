import { cn } from '@/lib/cn'

/** Brand mark — the app icon reused everywhere a small square logo is needed. */
export function Logo({ size = 8, className }: { size?: 8 | 9; className?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt="Agilearn"
      className={cn(size === 9 ? 'size-9' : 'size-8', 'rounded-md', className)}
    />
  )
}
