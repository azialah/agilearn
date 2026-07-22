import { describe, expect, it } from 'vitest'
import type { ModuleWithRelations } from '@/lib/queries/modules'
import {
  filterModules,
  formatFileSize,
  formatModuleDate,
  MODULE_KIND_META,
  type ModuleFilters,
} from './helpers'

describe('formatFileSize', () => {
  it('renders bytes below a kilobyte verbatim', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('scales into KB, MB, and GB with one decimal', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1.4 * 1024 * 1024)).toBe('1.4 MB')
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3 GB')
  })

  it('drops the decimal once the value reaches three digits', () => {
    expect(formatFileSize(150 * 1024)).toBe('150 KB')
  })

  it('guards against invalid input', () => {
    expect(formatFileSize(-1)).toBe('—')
    expect(formatFileSize(Number.NaN)).toBe('—')
  })
})

describe('formatModuleDate', () => {
  it('formats a valid ISO timestamp', () => {
    expect(formatModuleDate('2026-07-16T10:00:00.000Z')).toContain('2026')
  })

  it('returns a dash for an unparseable value', () => {
    expect(formatModuleDate('not-a-date')).toBe('—')
  })
})

function makeModule(overrides: Partial<ModuleWithRelations>): ModuleWithRelations {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    owner_id: overrides.owner_id ?? 'owner-1',
    classroom_id: overrides.classroom_id ?? null,
    kind: overrides.kind ?? 'resource',
    title: overrides.title ?? 'Untitled',
    description: overrides.description ?? '',
    storage_path: overrides.storage_path ?? 'owner-1/mod/file.pdf',
    file_size: overrides.file_size ?? 1024,
    mime_type: overrides.mime_type ?? 'application/pdf',
    tags: overrides.tags ?? [],
    folder: overrides.folder ?? 'Library',
    grading_period_id: overrides.grading_period_id ?? null,
    created_at: overrides.created_at ?? '2026-07-16T00:00:00.000Z',
    owner: overrides.owner ?? { id: 'owner-1', full_name: 'Ada Lovelace' },
    classroom: overrides.classroom ?? null,
  }
}

const baseFilters: ModuleFilters = { search: '', kind: 'all', mineOnly: false }

describe('filterModules', () => {
  const modules = [
    makeModule({
      id: 'a',
      title: 'Fractions lesson',
      kind: 'lesson_plan',
      owner_id: 'me',
    }),
    makeModule({
      id: 'b',
      title: 'Volcano activity',
      description: 'erupting model',
      kind: 'activity_story',
      owner_id: 'other',
    }),
    makeModule({ id: 'c', title: 'Reading list', kind: 'resource', owner_id: 'other' }),
  ]

  it('returns everything when filters are neutral', () => {
    expect(filterModules(modules, baseFilters, 'me')).toHaveLength(3)
  })

  it('filters by kind', () => {
    const result = filterModules(modules, { ...baseFilters, kind: 'resource' }, 'me')
    expect(result.map((m) => m.id)).toEqual(['c'])
  })

  it('matches the search term against title and description', () => {
    expect(
      filterModules(modules, { ...baseFilters, search: 'erupting' }, 'me').map(
        (m) => m.id,
      ),
    ).toEqual(['b'])
    expect(
      filterModules(modules, { ...baseFilters, search: 'FRACTIONS' }, 'me').map(
        (m) => m.id,
      ),
    ).toEqual(['a'])
  })

  it('restricts to the current user when mineOnly is set', () => {
    const result = filterModules(modules, { ...baseFilters, mineOnly: true }, 'me')
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('returns nothing for mineOnly with no current user', () => {
    expect(filterModules(modules, { ...baseFilters, mineOnly: true }, null)).toEqual([])
  })

  it('combines filters conjunctively', () => {
    const result = filterModules(
      modules,
      { search: 'list', kind: 'resource', mineOnly: false },
      'me',
    )
    expect(result.map((m) => m.id)).toEqual(['c'])
  })
})

describe('MODULE_KIND_META', () => {
  it('has a label and tone for every kind', () => {
    for (const kind of ['lesson_plan', 'activity_story', 'resource'] as const) {
      expect(MODULE_KIND_META[kind].label).toBeTruthy()
      expect(MODULE_KIND_META[kind].tone).toBeTruthy()
    }
  })
})
