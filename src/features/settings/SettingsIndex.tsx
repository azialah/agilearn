import { useEffect, useState } from 'react'
import { Link, Navigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SETTINGS_SECTIONS } from '@/components/layout/settingsSections'

/**
 * Settings landing. On mobile it's the iOS-style grouped master list you drill
 * into. On lg the sidebar drives navigation, so we jump straight to the first
 * section's detail pane.
 */
export function SettingsIndex() {
  const [isLarge, setIsLarge] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsLarge(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  if (isLarge) return <Navigate to="/settings/profile" replace />

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Personalize and secure your teaching workspace."
      />

      <div className="overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-1) shadow-(--shadow-card)">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.to}
              to={section.to}
              className="flex items-center gap-3 border-b border-(--color-border) px-4 py-3.5 transition-colors last:border-b-0 hover:bg-(--color-surface-2)"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-500)/12 text-(--color-accent-350)">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-(--color-ink)">
                  {section.label}
                </span>
                <span className="block truncate text-xs text-(--color-ink-muted)">
                  {section.description}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-(--color-ink-faint)" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
