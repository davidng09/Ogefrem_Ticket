import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'

export function useTickets(scope, view) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (scope) params.set('scope', scope)
      if (view) params.set('view', view)
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await apiRequest(`/tickets${query}`)
      setTickets(data.tickets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [scope, view])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return { tickets, loading, error, reload: fetchTickets }
}
