import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { SETTINGS_SECTIONS } from '@/components/layout/settingsSections'

/**
 * iOS-style bottom search bar for the settings routes on mobile. Searches
 * *within* settings (filters the sections inline) — it does NOT open the global
 * command palette.
 */
export function SettingsSearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results = q
    ? SETTINGS_SECTIONS.filter((section) =>
        `${section.label} ${section.description}`.toLowerCase().includes(q),
      )
    : []

  return (
    <div className="bottom-nav-enter fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md lg:hidden">
      {results.length > 0 && (
        <ul className="mb-2 overflow-hidden rounded-[1.4rem] border border-(--color-border) bg-(--color-surface-1) shadow-(--shadow-pop)">
          {results.map((section) => {
            const Icon = section.icon
            return (
              <li key={section.to}>
                <button
                  type="button"
                  onClick={() => {
                    navigate({ to: section.to })
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-3 border-b border-(--color-border) px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-(--color-surface-2)"
                >
                  <Icon className="size-5 shrink-0 text-(--color-accent-350)" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-(--color-ink)">
                      {section.label}
                    </span>
                    <span className="block truncate text-xs text-(--color-ink-muted)">
                      {section.description}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-center gap-2 rounded-full border border-white/40 bg-[color-mix(in_srgb,var(--color-surface-1)_65%,transparent)] px-4 py-3 shadow-(--shadow-pop) ring-1 ring-inset ring-white/25 backdrop-blur-2xl backdrop-saturate-150">
        <Search className="size-5 shrink-0 text-(--color-ink-faint)" aria-hidden />
        <input
          type="search"
          aria-label="Search settings"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search settings…"
          className="w-full bg-transparent text-[16px] text-(--color-ink) placeholder:text-(--color-ink-faint) focus-visible:outline-none"
        />
      </div>
    </div>
  )
}
