/**
 * Survives a reload with no connection.
 *
 * Without this the TanStack cache is memory-only: an open tab keeps working
 * offline, but a refresh or a PWA relaunch boots the shell and then fails every
 * query, so the teacher sees an empty app. Offline *editing* needs this even
 * more than offline reading does — a queued score edit is useless if reopening
 * the app shows no grid to edit.
 *
 * `dehydrate`/`hydrate` ship inside the installed @tanstack/react-query, and
 * the IndexedDB helpers already exist for the write queue, so this needs no new
 * dependency (package.json is off-limits).
 *
 * What is deliberately NOT persisted:
 *  - the auth session (it holds tokens; the Supabase client owns its own
 *    storage and its own refresh, and duplicating it here would be a second
 *    copy to leak)
 *  - anything not in a success state, so an error is retried rather than
 *    replayed from disk
 */

import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query'
import { keys } from '@/lib/queries/keys'
import {
  clearCacheSnapshot,
  readCacheSnapshot,
  writeCacheSnapshot,
} from '@/lib/offlineQueue'

/** Anything older than this is more misleading than helpful. */
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

/** Coalesce bursts of cache writes into one IndexedDB round trip. */
const WRITE_DEBOUNCE_MS = 1000

interface Snapshot {
  savedAt: number
  /** Whose cache this is. A different user must never hydrate it. */
  userId: string
  state: unknown
}

/**
 * An allowlist, not a deny-list — this fails closed for every key added later.
 *
 * Only what a teacher needs to keep working offline. Everything else stays out,
 * which matters most for the admin surfaces: the profiles list carries every
 * user in the school with their email, and the audit log and domain requests
 * are the same shape of data. Writing those to plaintext IndexedDB would leave
 * a school-wide PII dump on a staffroom laptop for the snapshot's whole life,
 * cleared only by an explicit sign-out. The session is excluded for the
 * separate reason that it holds tokens.
 */
const PERSISTABLE_PREFIXES = new Set([
  'classrooms',
  'students',
  'grades',
  'attendance',
  'course-subjects',
  'academic-periods',
])

function isPersistable(queryKey: readonly unknown[]): boolean {
  const [prefix] = queryKey
  return typeof prefix === 'string' && PERSISTABLE_PREFIXES.has(prefix)
}

/**
 * Restore a previous snapshot into `client`.
 *
 * Returns false when there was nothing usable — no snapshot, a snapshot from a
 * different user, one that is too old, or storage that refused to open (private
 * mode). Every one of those is a normal outcome, not an error: the app simply
 * fetches as it always did.
 */
export async function hydrateQueryCache(
  client: QueryClient,
  userId: string,
): Promise<boolean> {
  try {
    const snapshot = await readCacheSnapshot<Snapshot>()
    if (!snapshot) return false
    // Someone else's snapshot: drop it rather than leaving the previous
    // teacher's classrooms sitting on a shared device until the next save
    // happens to overwrite them.
    if (snapshot.userId !== userId || Date.now() - snapshot.savedAt > MAX_AGE_MS) {
      await clearCacheSnapshot()
      return false
    }
    hydrate(client, snapshot.state)
    return true
  } catch {
    return false
  }
}

/**
 * Keep writing snapshots until the returned function is called.
 *
 * Subscribes to the query cache rather than polling, debounced so that typing
 * a row of scores produces one write instead of one per cell.
 */
export function persistQueryCache(client: QueryClient, userId: string): () => void {
  let timer: number | undefined
  let disposed = false

  const save = () => {
    timer = undefined
    // Sign-out clears the snapshot immediately, but a save scheduled a moment
    // earlier would write it straight back. No session, no snapshot.
    if (disposed || !client.getQueryData(keys.session)) return
    let state: unknown
    try {
      state = dehydrate(client, {
        shouldDehydrateQuery: (query) =>
          query.state.status === 'success' && isPersistable(query.queryKey),
        // Without this, v5 dehydrates every PAUSED mutation with its full
        // variables. Nothing here carries a credential today, but it is an
        // unguarded channel, and a hydrated mutation has no mutationFn to run
        // anyway — it is dead weight with a sharp edge.
        shouldDehydrateMutation: () => false,
      })
    } catch {
      // A value that will not structured-clone. Skip this snapshot rather than
      // taking the app down over a cache convenience.
      return
    }
    void writeCacheSnapshot({
      savedAt: Date.now(),
      userId,
      state,
    } satisfies Snapshot).catch(() => {
      // Storage full or unavailable — nothing to do but keep running.
    })
  }

  const unsubscribe = client.getQueryCache().subscribe(() => {
    if (disposed || timer !== undefined) return
    timer = window.setTimeout(save, WRITE_DEBOUNCE_MS)
  })

  return () => {
    disposed = true
    if (timer !== undefined) window.clearTimeout(timer)
    unsubscribe()
  }
}
