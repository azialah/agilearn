import type { BadgeTone } from '@/components/ui/Badge'
import type { ModuleKind } from '@/types/domain'
import type { ModuleWithRelations } from '@/lib/queries/modules'

/** Display metadata for each module kind. */
export const MODULE_KIND_META: Record<ModuleKind, { label: string; tone: BadgeTone }> = {
  lesson_plan: { label: 'Lesson plan', tone: 'accent' },
  activity_story: { label: 'Activity story', tone: 'success' },
  resource: { label: 'Resource', tone: 'neutral' },
  syllabus: { label: 'Syllabus', tone: 'accent' },
  teaching_material: { label: 'Teaching material', tone: 'success' },
}

/** Ordered list of kinds for building selects and filters. */
export const MODULE_KINDS: ModuleKind[] = [
  'lesson_plan',
  'activity_story',
  'resource',
  'syllabus',
  'teaching_material',
]

/**
 * Human-readable file size. Uses binary units (1024) and keeps one decimal for
 * everything above kilobytes so "1.4 MB" reads naturally.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
  return `${rounded} ${units[unitIndex]}`
}

/** Compact date like "Jul 16, 2026" for a module's created_at timestamp. */
export function formatModuleDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export interface ModuleFilters {
  search: string
  kind: ModuleKind | 'all'
  mineOnly: boolean
}

/**
 * Filter modules by kind, a case-insensitive title/description search, and an
 * optional "mine only" flag scoped to the current user. Pure — safe to test.
 */
export function filterModules(
  modules: ModuleWithRelations[],
  filters: ModuleFilters,
  currentUserId: string | null,
): ModuleWithRelations[] {
  const term = filters.search.trim().toLowerCase()
  return modules.filter((module) => {
    if (filters.kind !== 'all' && module.kind !== filters.kind) return false
    if (filters.mineOnly && module.owner_id !== currentUserId) return false
    if (term) {
      const haystack =
        `${module.title} ${module.description} ${module.tags.join(' ')} ${module.owner?.full_name ?? ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    return true
  })
}
