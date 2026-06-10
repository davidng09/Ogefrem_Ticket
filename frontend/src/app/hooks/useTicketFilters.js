import { useMemo, useState } from 'react'
import { applyTicketFilters } from '../uiHelpers'

export function useTicketFilters(tickets, options = {}) {
  const { enableStatus = false, enableService = false, resolveServiceId } = options
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')

  const filteredTickets = useMemo(() => {
    let result = applyTicketFilters(tickets, { priorityFilter, dateFilter })
    if (enableStatus && statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }
    if (enableService && serviceFilter !== 'all' && resolveServiceId) {
      result = result.filter((t) => String(resolveServiceId(t)) === String(serviceFilter))
    }
    return result
  }, [tickets, priorityFilter, dateFilter, statusFilter, serviceFilter, enableStatus, enableService, resolveServiceId])

  return {
    priorityFilter,
    setPriorityFilter,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    serviceFilter,
    setServiceFilter,
    filteredTickets,
  }
}
