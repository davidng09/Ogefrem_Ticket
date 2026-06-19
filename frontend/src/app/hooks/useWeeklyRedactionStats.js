import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { getCurrentYearMonth } from '../utils/calendarWeeks'
import { computePendingWeeklyWeeks } from '../utils/weeklyRedaction'

export function useWeeklyRedactionStats() {
  const { year, monthIndex } = getCurrentYearMonth()
  const month = monthIndex + 1
  const [pendingWeeks, setPendingWeeks] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest(`/periodic/weekly?year=${year}&month=${month}`)
      setPendingWeeks(computePendingWeeklyWeeks(data.weeks || []))
    } catch {
      setPendingWeeks([])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    reload().catch(() => {})
  }, [reload])

  return {
    pendingWeeks,
    total: pendingWeeks.length,
    loading,
    reload,
  }
}
