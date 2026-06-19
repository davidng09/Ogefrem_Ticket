import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'

export function useTickets(scope, view, pagination, listFilters) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paginationMeta, setPaginationMeta] = useState(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (scope) params.set('scope', scope)
      if (view) params.set('view', view)
      if (pagination?.page) params.set('page', String(pagination.page))
      if (pagination?.perPage) params.set('per_page', String(pagination.perPage))
      if (listFilters?.categoryId && listFilters.categoryId !== 'all') {
        params.set('category_id', String(listFilters.categoryId))
      }
      if (listFilters?.priority && listFilters.priority !== 'all') {
        params.set('priority', listFilters.priority)
      }
      if (listFilters?.serviceId && listFilters.serviceId !== 'all') {
        params.set('service_id', String(listFilters.serviceId))
      }
      if (listFilters?.dateFilter && listFilters.dateFilter !== 'all') {
        params.set('date_filter', listFilters.dateFilter)
      }
      if (listFilters?.mineOnly) {
        params.set('mine_only', '1')
      }
      if (listFilters?.sortBy) {
        params.set('sort_by', listFilters.sortBy)
      }
      if (listFilters?.reporterDirection && listFilters.reporterDirection !== 'all') {
        params.set('reporter_direction', listFilters.reporterDirection)
      }
      if (listFilters?.unassignedSd) {
        params.set('unassigned_sd', '1')
      }
      if (listFilters?.subDirectorateId && listFilters.subDirectorateId !== 'all') {
        params.set('sub_directorate_id', String(listFilters.subDirectorateId))
      }
      if (listFilters?.status && listFilters.status !== 'all') {
        params.set('status', listFilters.status)
      }
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await apiRequest(`/tickets${query}`)
      setTickets(data.tickets || [])
      setPaginationMeta(data.pagination || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [
    scope,
    view,
    pagination?.page,
    pagination?.perPage,
    listFilters?.categoryId,
    listFilters?.priority,
    listFilters?.serviceId,
    listFilters?.dateFilter,
    listFilters?.mineOnly,
    listFilters?.sortBy,
    listFilters?.reporterDirection,
    listFilters?.unassignedSd,
    listFilters?.subDirectorateId,
    listFilters?.status,
  ])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return { tickets, loading, error, reload: fetchTickets, pagination: paginationMeta }
}

export function usePaginatedTickets(scope, view, initialPerPage = 25, listFilters) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)
  const result = useTickets(scope, view, { page, perPage }, listFilters)

  function handlePerPageChange(next) {
    setPerPage(next)
    setPage(1)
  }

  return {
    ...result,
    page,
    setPage,
    perPage,
    setPerPage: handlePerPageChange,
  }
}

export function useClientPagination(items, perPage = 10) {
  const [page, setPage] = useState(1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1)
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  const pagination = {
    page: safePage,
    per_page: perPage,
    total,
    total_pages: totalPages,
  }

  const slice = items.slice((safePage - 1) * perPage, safePage * perPage)

  return { items: slice, pagination, page: safePage, setPage }
}
