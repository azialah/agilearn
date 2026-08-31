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
const DB_VERSION = 2
const STORE = 'pending-writes'
/** Dehydrated TanStack Query cache, so a reload offline still has data to
 *  show. Same database because it is the same concern and the same lifetime:
 *  both are dropped on sign-out. See src/lib/queryPersist.ts. */
const CACHE_STORE = 'query-cache'
const CACHE_KEY = 'snapshot'

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
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    // Reachable since DB_VERSION went to 2: another tab still holding the v1
    // connection blocks the upgrade, and without this openDb() never settles.
    request.onblocked = () =>
      reject(new Error('Agilearn is open in another tab; close it and reload.'))
  })
}

async function withNamedStore<T>(
  name: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode)
    const request = run(tx.objectStore(name))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return withNamedStore(STORE, mode, run)
}

/** The last dehydrated query cache, or null when nothing has been stored. */
export async function readCacheSnapshot<T>(): Promise<T | null> {
  const value = await withNamedStore<T | undefined>(CACHE_STORE, 'readonly', (store) =>
    store.get(CACHE_KEY),
  )
  return value ?? null
}

export async function writeCacheSnapshot(snapshot: unknown): Promise<void> {
  await withNamedStore(CACHE_STORE, 'readwrite', (store) =>
    store.put(snapshot, CACHE_KEY),
  )
}

export async function clearCacheSnapshot(): Promise<void> {
  await withNamedStore(CACHE_STORE, 'readwrite', (store) => store.delete(CACHE_KEY))
}

/** Replaces any earlier queued write for the same row. */
export async function enqueueWrite(write: QueuedWrite): Promise<void> {
  await withStore('readwrite', (store) => store.put(write))
}

const QUEUE_TABLES: readonly QueueTable[] = ['attendance_records', 'scores']

export async function listQueuedWrites(): Promise<QueuedWrite[]> {
  const all = await withStore<QueuedWrite[]>('readonly', (store) => store.getAll())
  return all
    .filter(
      // These records outlive app versions, and the table field is what aims
      // supabase.from(). Validate on the way out rather than trusting whatever
      // an older build (or a tampered store) left behind.
      (write): write is QueuedWrite =>
        !!write && QUEUE_TABLES.includes(write.table) && typeof write.id === 'string',
    )
    .sort((a, b) => a.queuedAt - b.queuedAt)
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
