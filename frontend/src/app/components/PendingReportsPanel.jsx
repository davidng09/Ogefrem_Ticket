import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { formatEmittedDate, truncateText } from '../uiHelpers'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'
import {
  AuthorFilterHeader,
  CategoryFilterHeader,
  DateFilterHeader,
  PriorityFilterHeader,
  ReporterDirectionFilterHeader,
  TicketSearchInput,
} from './TicketTableFilters'

export function PendingReportsPanel({
  scope,
  onSelectReport,
  emptyMessage = 'Aucun rapport en attente.',
  onTotalChange,
}) {
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [closedDateFilter, setClosedDateFilter] = useState('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterOptions, setFilterOptions] = useState({
    authors: [],
    directions: [],
    categories: [],
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadFilterOptions = useCallback(async () => {
    try {
      const data = await apiRequest(`/reports/filter-options?scope=${scope}`)
      setFilterOptions({
        authors: data.authors || [],
        directions: (data.directions || []).map((d) => d.label),
        categories: data.categories || [],
      })
    } catch {
      setFilterOptions({ authors: [], directions: [], categories: [] })
    }
  }, [scope])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        scope,
        page: String(page),
        per_page: '10',
      })
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (authorFilter !== 'all') params.set('author_id', authorFilter)
      if (directionFilter !== 'all') params.set('reporter_direction', directionFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (dateFilter !== 'all') params.set('date_filter', dateFilter)
      if (closedDateFilter !== 'all') params.set('closed_date_filter', closedDateFilter)

      const data = await apiRequest(`/reports?${params}`)
      setReports(data.reports || [])
      setPagination(data.pagination || null)
    } catch {
      setReports([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [scope, page, debouncedSearch, authorFilter, directionFilter, categoryFilter, priorityFilter, dateFilter, closedDateFilter])

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, authorFilter, directionFilter, categoryFilter, priorityFilter, dateFilter, closedDateFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (pagination?.total !== undefined) {
      onTotalChange?.(pagination.total)
    }
  }, [pagination?.total, onTotalChange])

  function resetPage() {
    setPage(1)
  }

  return (
    <div className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
      <div className="space-y-3 border-b border-outline-variant p-3">
        <div className="flex flex-wrap items-end gap-4">
          <TicketSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              resetPage()
            }}
            placeholder="N° ticket, agent, direction…"
          />
        </div>
        <div className="flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
          <AuthorFilterHeader
            value={authorFilter}
            onChange={(value) => {
              setAuthorFilter(value)
              resetPage()
            }}
            authors={filterOptions.authors}
          />
          <ReporterDirectionFilterHeader
            value={directionFilter}
            onChange={(value) => {
              setDirectionFilter(value)
              resetPage()
            }}
            directions={filterOptions.directions}
          />
          <CategoryFilterHeader
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value)
              resetPage()
            }}
            categories={filterOptions.categories}
          />
          <PriorityFilterHeader
            value={priorityFilter}
            onChange={(value) => {
              setPriorityFilter(value)
              resetPage()
            }}
          />
          <DateFilterHeader
            value={dateFilter}
            onChange={(value) => {
              setDateFilter(value)
              resetPage()
            }}
            label="Date soumission"
          />
          <DateFilterHeader
            value={closedDateFilter}
            onChange={(value) => {
              setClosedDateFilter(value)
              resetPage()
            }}
            label="Date clôture"
          />
        </div>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
      ) : reports.length === 0 ? (
        <p className="p-4 text-sm text-on-surface-variant">{emptyMessage}</p>
      ) : (
        <ScrollablePanel className="divide-y divide-outline-variant">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-low"
              onClick={() => onSelectReport?.(report)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{report.ticket_number}</p>
                <p className="text-xs text-on-surface-variant">{truncateText(report.body, 100)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                  <span>Agent : {report.author_name}</span>
                  {report.category_label && <span>Catégorie : {report.category_label}</span>}
                  {report.reporter_direction && <span>Direction : {report.reporter_direction}</span>}
                  <span>Soumis le {formatEmittedDate(report.created_at)}</span>
                </div>
              </div>
            </button>
          ))}
        </ScrollablePanel>
      )}
      <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="rapports" />
    </div>
  )
}
