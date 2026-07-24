import { useEffect, useState } from 'react'

export type NetworkStatus = 'online' | 'offline' | 'slow'

interface NetworkConnection {
  effectiveType?: string
  downlink?: number
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getConnection(): NetworkConnection | undefined {
  return (navigator as Navigator & { connection?: NetworkConnection }).connection
}

function isSlow(connection: NetworkConnection | undefined): boolean {
  if (!connection) return false
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
    return true
  return typeof connection.downlink === 'number' && connection.downlink < 0.5
}

/** Live connectivity: offline wins over slow, slow wins over online. */
export function useNetworkStatus(): NetworkStatus {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [slow, setSlow] = useState(() => isSlow(getConnection()))

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const connection = getConnection()
    const syncSlow = () => setSlow(isSlow(connection))
    connection?.addEventListener?.('change', syncSlow)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      connection?.removeEventListener?.('change', syncSlow)
    }
  }, [])

  if (!online) return 'offline'
  if (slow) return 'slow'
  return 'online'
}
