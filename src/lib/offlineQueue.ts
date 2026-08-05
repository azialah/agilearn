/**
 * Durable queue for writes made while offline.
 *
 * IndexedDB, not localStorage: a teacher marking attendance in a classroom with
 * no signal must not lose the period's work when the PWA is force-quit, and the
 * optimistic cache in TanStack Query only lives as long as the tab does.
 *
 * Hand-rolled rather than pulling in idb-keyval — this is one object store with
 * four operations, and package.json is off-limits.
 */

const DB_NAME = 'agilearn-offline'
const DB_VERSION = 1
const STORE = 'pending-writes'

export type QueueTable = 'attendance_records' | 'scores'

export interface QueuedWrite {
  /** Stable per logical row, so a retry upserts instead of duplicating. */
  id: string
  table: QueueTable
  payload: Record<string, unknown>
  /** Conflict target for the upsert, e.g. 'session_id,student_id'. */
  onConflict: string
  /** The row's updated_at when this edit was made; null when it was new. */
  baseUpdatedAt: string | null
  queuedAt: number
  /** Human-readable, used by the review list — never parsed. */
  label: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = run(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/** Replaces any earlier queued write for the same row. */
export async function enqueueWrite(write: QueuedWrite): Promise<void> {
  await withStore('readwrite', (store) => store.put(write))
}

export async function listQueuedWrites(): Promise<QueuedWrite[]> {
  const all = await withStore<QueuedWrite[]>('readonly', (store) => store.getAll())
  return all.sort((a, b) => a.queuedAt - b.queuedAt)
}

export async function removeQueuedWrite(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearQueue(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
}

/**
 * Server wins when the row moved on after this edit was queued.
 *
 * Returning 'conflict' parks the write for the teacher to resolve rather than
 * overwriting a colleague's newer correction or silently dropping their own.
 */
export function resolveWrite(
  queued: Pick<QueuedWrite, 'baseUpdatedAt'>,
  serverUpdatedAt: string | null,
): 'apply' | 'conflict' {
  // The row did not exist when this was queued, and still does not: a plain insert.
  if (!queued.baseUpdatedAt) return serverUpdatedAt ? 'conflict' : 'apply'
  if (!serverUpdatedAt) return 'apply'
  return new Date(serverUpdatedAt) > new Date(queued.baseUpdatedAt) ? 'conflict' : 'apply'
}
