import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/queries/profiles'
import { hydrateQueryCache, persistQueryCache } from '@/lib/queryPersist'

/**
 * Restores the previous query cache on boot and keeps saving it.
 *
 * Renders nothing — it exists because the persistence has to be tied to a
 * mounted lifetime and to the signed-in user, and there is no auth context in
 * this app to hang it off.
 *
 * Scoped by user id so a shared laptop never hydrates one teacher's classrooms
 * under another's account. Sign-out drops the snapshot outright (see the
 * onAuthStateChange handler in queries/profiles.ts).
 */
export function OfflineCache() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const userId = session?.user.id
  const startedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || startedFor.current === userId) return
    startedFor.current = userId
    let stop: (() => void) | undefined
    let cancelled = false

    // Hydrate first, then subscribe: starting the writer first would snapshot
    // the empty cache over the one we are about to read.
    void hydrateQueryCache(queryClient, userId).then(() => {
      if (cancelled) return
      stop = persistQueryCache(queryClient, userId)
    })

    return () => {
      cancelled = true
      stop?.()
      startedFor.current = null
    }
  }, [queryClient, userId])

  return null
}
