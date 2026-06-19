import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'

export function useTicketTabStats(scope, view, options = {}) {
  const { enabled = true, pollMs = 45000 } = options
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!enabled) return
    try {
      const params = new URLSearchParams()
      if (scope) params.set('scope', scope)
      if (view) params.set('view', view)
      const data = await apiRequest(`/tickets/tab-stats?${params}`)
      setStats(data.stats || null)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [scope, view, enabled])

  useEffect(() => {
    reload()
    if (!enabled || !pollMs) return undefined
    const id = setInterval(reload, pollMs)
    return () => clearInterval(id)
  }, [reload, enabled, pollMs])

  return { stats, loading, reload }
}

export function useReportTabStats(scope, options = {}) {
  const { enabled = true, pollMs = 45000 } = options
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!enabled || !scope) return
    try {
      const data = await apiRequest(`/reports/tab-stats?scope=${encodeURIComponent(scope)}`)
      setStats(data.stats || null)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [scope, enabled])

  useEffect(() => {
    reload()
    if (!enabled || !pollMs) return undefined
    const id = setInterval(reload, pollMs)
    return () => clearInterval(id)
  }, [reload, enabled, pollMs])

  return { stats, loading, reload }
}
