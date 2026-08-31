import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { keys } from '@/lib/queries/keys'
import {
  listQueuedWrites,
  removeQueuedWrite,
  resolveWrite,
  type QueuedWrite,
} from '@/lib/offlineQueue'
import { useNetworkStatus } from '@/lib/useNetworkStatus'

export interface SyncConflict {
  write: QueuedWrite
  /** What the server holds now, for the "yours vs theirs" comparison. */
  theirs: Record<string, unknown> | null
}

export interface SyncProgress {
  total: number
  done: number
}

/** The row as it stands on the server, or null when it does not exist yet. */
async function fetchServerRow(write: QueuedWrite) {
  const columns = write.onConflict.split(',')
  // The table is only known at runtime, so this one call opts out of the
  // generated row types; every write that reaches here was built from a typed
  // Insert at the call site.
  let query = supabase.from(write.table).select('*')
  for (const column of columns) {
    query = query.eq(column, write.payload[column] as string)
  }
  const { data } = await query.maybeSingle()
  return data as Record<string, unknown> | null
}

/**
 * Drains the offline queue.
 *
 * Flushing is serial and guarded by a single in-flight flag: the `online` event
 * fires repeatedly on a flapping connection, and two overlapping drains would
 * race each other over the same rows.
 */
export function useOfflineSync() {
  const queryClient = useQueryClient()
  const network = useNetworkStatus()
  const [pending, setPending] = useState(0)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [flushing, setFlushing] = useState(false)

  const refreshCount = useCallback(async () => {
    const queued = await listQueuedWrites()
    setPending(queued.length)
  }, [])

  useEffect(() => {
    void refreshCount()
    const onChange = () => void refreshCount()
    window.addEventListener('agilearn-queue-changed', onChange)
    return () => window.removeEventListener('agilearn-queue-changed', onChange)
  }, [refreshCount])

  const flush = useCallback(async () => {
    if (flushing) return
    const queued = await listQueuedWrites()
    if (queued.length === 0) return

    setFlushing(true)
    setProgress({ total: queued.length, done: 0 })
    const parked: SyncConflict[] = []

    try {
      for (const [index, write] of queued.entries()) {
        try {
          const theirs = await fetchServerRow(write)
          const serverUpdatedAt =
            typeof theirs?.updated_at === 'string' ? theirs.updated_at : null

          if (resolveWrite(write, serverUpdatedAt) === 'conflict') {
            parked.push({ write, theirs })
          } else {
            const { error } = await supabase
              .from(write.table)
              .upsert(write.payload as never, { onConflict: write.onConflict })
            if (error) throw error
            await removeQueuedWrite(write.id)
          }
        } catch {
          // Still unreachable, or RLS now refuses the row. Leave it queued and
          // stop — the rest will not fare better on the same connection.
          break
        }
        setProgress({ total: queued.length, done: index + 1 })
      }
    } finally {
      setFlushing(false)
      setProgress(null)
      setConflicts(parked)
      await refreshCount()
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
      // The queue now also carries score writes, so the gradebook has to be
      // refreshed for the same reason attendance is: a replayed edit that is
      // not invalidated stays invisible until something else happens to refetch.
      queryClient.invalidateQueries({ queryKey: keys.grades.all })
    }
  }, [flushing, queryClient, refreshCount])

  // Reconnecting is the common case; the button is for when it does not fire.
  useEffect(() => {
    if (network !== 'offline' && pending > 0 && !flushing) void flush()
  }, [network, pending, flushing, flush])

  const discardConflict = useCallback(
    async (id: string) => {
      await removeQueuedWrite(id)
      setConflicts((current) => current.filter((c) => c.write.id !== id))
      await refreshCount()
    },
    [refreshCount],
  )

  const keepMine = useCallback(
    async (conflict: SyncConflict) => {
      const { error } = await supabase
        .from(conflict.write.table)
        .upsert(conflict.write.payload as never, {
          onConflict: conflict.write.onConflict,
        })
      if (error) throw error
      await removeQueuedWrite(conflict.write.id)
      setConflicts((current) => current.filter((c) => c.write.id !== conflict.write.id))
      await refreshCount()
      queryClient.invalidateQueries({ queryKey: keys.attendance.allSessions })
    },
    [queryClient, refreshCount],
  )

  return { pending, progress, conflicts, flushing, flush, keepMine, discardConflict }
}
