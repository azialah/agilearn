import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

/**
 * Per-section screen header. On mobile it shows a "‹ Settings" back link that
 * returns to the master list; on lg the settings sidebar provides navigation,
 * so the back link is hidden.
 */
export function SettingsScreenHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-3">
      <Link
        to="/settings"
        className="inline-flex items-center gap-1 text-sm font-medium text-(--color-accent-350) transition-colors hover:text-(--color-accent-300) lg:hidden"
      >
        <ChevronLeft className="size-4" /> Settings
      </Link>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-(--color-ink)">
          {title}
        </h1>
        {description && <p className="text-sm text-(--color-ink-muted)">{description}</p>}
      </div>
    </div>
  )
}
