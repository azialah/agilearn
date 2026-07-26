const STORAGE_KEY = 'agilearn-last-route'

/**
 * Only in-app surfaces are worth restoring. Public and auth routes are never
 * saved, so a stale entry can't drop someone back onto a signup step or the
 * marketing page after a relaunch.
 */
const RESTORABLE_PREFIXES = ['/teacher/', '/settings', '/admin'] as const

/** Signup lives under /teacher/ but must never be restored mid-flow. */
const EXCLUDED_PREFIXES = ['/teacher/signup'] as const

export function isRestorablePath(path: string): boolean {
  if (!path.startsWith('/')) return false
  if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) return false
  // Deep session links can 404 once the underlying row is gone.
  if (/\/attendance\/[^/]+$/.test(path)) return false
  return RESTORABLE_PREFIXES.some((p) => path.startsWith(p))
}

export function saveLastRoute(path: string): void {
  try {
    if (isRestorablePath(path)) localStorage.setItem(STORAGE_KEY, path)
  } catch {
    // Private mode / storage disabled — restoring is a nicety, never required.
  }
}

/** The stored route, or null when absent or no longer restorable. */
export function readLastRoute(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw && isRestorablePath(raw) ? raw : null
  } catch {
    return null
  }
}

export function clearLastRoute(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
