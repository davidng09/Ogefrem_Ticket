import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'

const HEARTBEAT_MS = 30_000

export function usePresence({ enabled = true, trackSubordinates = false } = {}) {
  const [subordinates, setSubordinates] = useState({ online_count: 0, users: [] })

  const heartbeat = useCallback(async () => {
    if (!enabled) return
    try {
      await apiRequest('/presence/heartbeat', { method: 'POST', body: '{}' })
    } catch {
      // ignore
    }
  }, [enabled])

  const refreshSubordinates = useCallback(async () => {
    if (!enabled || !trackSubordinates) return
    try {
      const data = await apiRequest('/presence/subordinates')
      setSubordinates({ online_count: data.online_count ?? 0, users: data.users || [] })
    } catch {
      setSubordinates({ online_count: 0, users: [] })
    }
  }, [enabled, trackSubordinates])

  useEffect(() => {
    if (!enabled) return undefined
    heartbeat()
    refreshSubordinates()
    const timer = window.setInterval(() => {
      heartbeat()
      refreshSubordinates()
    }, HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [enabled, heartbeat, refreshSubordinates])

  return { subordinates, refreshSubordinates }
}
