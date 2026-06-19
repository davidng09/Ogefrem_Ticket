import { useMemo, useState } from 'react'
import { applyTicketFilters } from '../uiHelpers'

export function useTicketFilters(tickets, options = {}) {
  const { enableStatus = false, enableService = false, enableCategory = false, resolveServiceId } = options
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredTickets = useMemo(() => {
    let result = applyTicketFilters(tickets, { priorityFilter, dateFilter, categoryFilter: enableCategory ? categoryFilter : 'all' })
    if (enableStatus && statusFilter !== 'all') {
      if (statusFilter === 'chef_bureau') {
        result = result.filter(
          (t) => t.status === 'en_cours' && t.assigned_tech_role === 'CHEF_BUREAU',
        )
      } else {
        result = result.filter((t) => t.status === statusFilter)
      }
    }
    if (enableService && serviceFilter !== 'all' && resolveServiceId) {
      result = result.filter((t) => String(resolveServiceId(t)) === String(serviceFilter))
    }
    return result
  }, [tickets, priorityFilter, dateFilter, categoryFilter, statusFilter, serviceFilter, enableStatus, enableService, enableCategory, resolveServiceId])

  return {
    priorityFilter,
    setPriorityFilter,
    dateFilter,
    setDateFilter,
    statusFilter,
    setStatusFilter,
    serviceFilter,
    setServiceFilter,
    categoryFilter,
    setCategoryFilter,
    filteredTickets,
  }
}
