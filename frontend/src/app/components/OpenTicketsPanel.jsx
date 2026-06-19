import { useEffect, useMemo, useState } from 'react'
import { BreakdownChart } from './BreakdownChart'
import { RefreshButton } from './RefreshButton'
import { TicketDetailLink } from './TicketDetailLink'
import { usePaginatedTickets } from '../hooks/useTickets'
import { useTicketTabStats } from '../hooks/useTabStats'
import {
  formatEmittedDate,
  formatPriorityLabel,
  formatStatusLabel,
  getPriorityBadgeClass,
  getPriorityChartColor,
  getStatusBadgeClass,
  subDirectorates,
} from '../uiHelpers'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'

const OPEN_STATUSES = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'chez_sous_direction', label: 'Chez sous-direction' },
  { value: 'chez_chef_service', label: 'Chef de service' },
  { value: 'assigne_technicien', label: 'Assigné technicien' },
  { value: 'en_cours', label: 'En cours' },
]

export function OpenTicketsPanel({
  itemLabel = 'tickets',
  showSubDirectorateFilter = false,
  showRefreshButton = true,
  refreshToken = 0,
}) {
  const [filters, setFilters] = useState({
    categoryId: 'all',
    priority: 'all',
    reporterDirection: 'all',
    unassignedSd: false,
    subDirectorateId: 'all',
    status: 'all',
    dateFilter: 'all',
    sortBy: 'priority_desc',
  })
  const { stats, reload: reloadStats } = useTicketTabStats(null, 'open')
  const { tickets, loading, page, setPage, pagination, reload: reloadTickets } = usePaginatedTickets(
    null,
    'open',
    10,
    filters,
  )

  const directions = useMemo(() => stats?.directions || [], [stats?.directions])

  useEffect(() => {
    setPage(1)
  }, [
    filters.categoryId,
    filters.priority,
    filters.reporterDirection,
    filters.unassignedSd,
    filters.subDirectorateId,
    filters.status,
    filters.dateFilter,
    filters.sortBy,
    setPage,
  ])

  useEffect(() => {
    if (refreshToken > 0) {
      reloadStats()
      reloadTickets()
    }
  }, [refreshToken, reloadStats, reloadTickets])

  const priorityKpis = stats?.priority || { urgent: 0, elevee: 0, normale: 0 }

  return (
    <div className="space-y-4">
      {showRefreshButton && (
        <div className="flex justify-end">
          <RefreshButton
            onRefresh={async () => {
              await Promise.all([reloadStats(), reloadTickets()])
            }}
          />
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold">Directions émettrices (top)</h4>
          <BreakdownChart
            prefer="bars"
            topN={8}
            labelMode="direction"
            data={stats?.by_direction}
            emptyMessage="Aucune donnée par direction."
          />
        </article>
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h4 className="mb-3 text-sm font-semibold">Répartition par priorité</h4>
          <ul className="space-y-2 text-sm">
            {['urgent', 'elevee', 'normale'].map((key) => (
              <li key={key} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getPriorityChartColor(key) }}
                  />
                  {formatPriorityLabel(key)}
                </span>
                <span className="font-semibold tabular-nums">{priorityKpis[key] ?? 0}</span>
              </li>
            ))}
            <li className="flex items-center justify-between border-t border-outline-variant pt-2 text-on-surface-variant">
              <span>Non pris par une sous-direction</span>
              <span className="font-semibold tabular-nums text-error">{stats?.unassigned_sd ?? 0}</span>
            </li>
          </ul>
        </article>
      </section>

      <div className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="border-b border-outline-variant p-3">
          <h3 className="font-semibold">Tickets ouverts</h3>
          <p className="text-xs text-on-surface-variant">
            Filtrez par direction émettrice, priorité, statut ou sous-direction
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={filters.reporterDirection}
              onChange={(e) => setFilters((f) => ({ ...f, reporterDirection: e.target.value }))}
              className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
            >
              <option value="all">Toutes les directions</option>
              {directions.map((dir) => (
                <option key={dir} value={dir}>
                  {dir}
                </option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
              className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgent</option>
              <option value="elevee">Élevée</option>
              <option value="normale">Normale</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
            >
              {OPEN_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {showSubDirectorateFilter && (
              <select
                value={filters.subDirectorateId}
                onChange={(e) => setFilters((f) => ({ ...f, subDirectorateId: e.target.value }))}
                className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
              >
                <option value="all">Toutes sous-directions</option>
                {subDirectorates.map((sd) => (
                  <option key={sd.id} value={String(sd.id)}>
                    {sd.short}
                  </option>
                ))}
              </select>
            )}
            <select
              value={filters.dateFilter}
              onChange={(e) => setFilters((f) => ({ ...f, dateFilter: e.target.value }))}
              className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
            >
              <option value="all">Toutes dates</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <label className="flex items-center gap-1 rounded border border-outline-variant px-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={filters.unassignedSd}
                onChange={(e) => setFilters((f) => ({ ...f, unassignedSd: e.target.checked }))}
              />
              Non pris (sous-dir.)
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
              className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-xs"
            >
              <option value="priority_desc">Priorité ↓</option>
              <option value="priority_asc">Priorité ↑</option>
              <option value="date_desc">Date ↓</option>
              <option value="date_asc">Date ↑</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
        ) : tickets.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">Aucun ticket ouvert.</p>
        ) : (
          <ScrollablePanel className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="p-2">Ticket</th>
                  <th className="p-2">Direction</th>
                  <th className="p-2">Catégorie</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Priorité</th>
                  <th className="p-2">Demandeur</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-outline-variant">
                    <td className="p-2">
                      <p className="font-semibold">{ticket.ticket_number}</p>
                      <TicketDetailLink ticket={ticket} className="text-xs" />
                    </td>
                    <td className="p-2 text-xs">{ticket.reporter_direction || '—'}</td>
                    <td className="p-2">{ticket.category_label}</td>
                    <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                    <td className="p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status, ticket)}`}
                      >
                        {formatStatusLabel(ticket.status, ticket)}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                      >
                        {formatPriorityLabel(ticket.priority)}
                      </span>
                    </td>
                    <td className="p-2 text-xs">{ticket.reporter_full_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollablePanel>
        )}
        <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel={itemLabel} />
      </div>
    </div>
  )
}
