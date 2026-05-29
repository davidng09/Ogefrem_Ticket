import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'

export function useTickets(scope) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
      const data = await apiRequest(`/tickets${query}`)
      setTickets(data.tickets || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return { tickets, loading, error, reload: fetchTickets }
}
