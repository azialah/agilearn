import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Search, Settings2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { useProfile } from '@/lib/queries/profiles'
import { useLocale } from '@/lib/locale'
import { NAV_ITEMS } from './navItems'
import { useClassrooms } from '@/lib/queries/classrooms'
import { useAllCourseSubjects } from '@/lib/queries/academicWorkspace'

interface PaletteItem {
  to: string
  label: string
  icon: (props: { className?: string }) => React.ReactNode
}

/**
 * Ctrl+K / Cmd+K jump-to-page palette. WAI-ARIA combobox pattern: focus stays
 * on the text input the whole time, aria-activedescendant points at the
 * "virtually selected" option, arrow keys move that pointer without moving
 * real DOM focus. Escape-to-close and the focus trap come from Radix Dialog.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const { t } = useLocale()
  const isAdmin = profile?.role === 'admin'
  const { data: classrooms = [] } = useClassrooms()
  const { data: subjects = [] } = useAllCourseSubjects()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo<PaletteItem[]>(() => {
    const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map(
      (item) => ({ to: item.to, label: t(item.labelKey), icon: item.icon }),
    )
    const classroomItems = classrooms.slice(0, 8).map((classroom) => ({
      to: `/teacher/classrooms/${classroom.id}`,
      label: classroom.cohort_name || classroom.block || classroom.course_name,
      icon: BookOpen,
    }))
    const subjectItems = subjects.slice(0, 10).map((subject) => ({
      to: `/teacher/classrooms/${subject.classroom_id}`,
      label: `Subject · ${subject.name}`,
      icon: BookOpen,
    }))
    return [
      ...navItems,
      { to: '/settings', label: t('settings'), icon: Settings2 },
      ...classroomItems,
      ...subjectItems,
    ]
  }, [classrooms, isAdmin, subjects, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.label.toLowerCase().includes(q))
  }, [items, query])

  // Global shortcut — works from anywhere in the authenticated app.
  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [onOpenChange])

  // Fresh query + selection every time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function go(item: PaletteItem) {
    onOpenChange(false)
    navigate({ to: item.to })
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = filtered[activeIndex]
      if (item) go(item)
    }
  }

  const activeItem = filtered[activeIndex]
  const activeId = activeItem ? `command-item-${activeItem.to}` : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <DialogTitle className="sr-only">Jump to a page</DialogTitle>
        <div className="-m-6">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <Search
              className="size-4 shrink-0 text-[var(--color-ink-faint)]"
              aria-hidden
            />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="command-palette-list"
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search pages"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pages…"
              className="h-6 w-full bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus-visible:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-faint)] sm:block">
              Esc
            </kbd>
          </div>

          <ul
            id="command-palette-list"
            role="listbox"
            aria-label="Pages"
            className="max-h-72 overflow-y-auto p-2"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-[var(--color-ink-faint)]">
                No matching pages.
              </li>
            )}
            {filtered.map((item, index) => {
              const Icon = item.icon
              const active = index === activeIndex
              return (
                <li
                  key={item.to}
                  id={`command-item-${item.to}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-muted)]',
                  )}
                >
                  <Icon className="text-base text-[var(--color-ink-faint)]" />
                  {item.label}
                </li>
              )
            })}
          </ul>

          <div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-ink-faint)]">
            <kbd className="rounded border border-[var(--color-border)] px-1">↑</kbd>{' '}
            <kbd className="rounded border border-[var(--color-border)] px-1">↓</kbd> to
            navigate ·{' '}
            <kbd className="rounded border border-[var(--color-border)] px-1">Enter</kbd>{' '}
            to select
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
