import { Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useClientPagination } from '../hooks/useTickets'
import {
  applyHistoryTicketFilters,
  collectHistoryFilterOptions,
  formatEmittedDate,
  getAgentAssignmentDisplay,
  getTicketArchivedAt,
  groupHistoryTicketsByMode,
  isAgentCoIntervenant,
} from '../uiHelpers'
import { getCurrentYearMonth, getMonthWeeks } from '../utils/calendarWeeks'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'
import { TicketDetailLink } from './TicketDetailLink'
import {
  CategoryFilterHeader,
  DateFilterHeader,
  HistoryGroupByHeader,
  PriorityFilterHeader,
  ReporterDirectionFilterHeader,
  TicketSearchInput,
} from './TicketTableFilters'

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function HistoryTicketRow({ ticket, userId }) {
  const isCoIntervenant = isAgentCoIntervenant(ticket)
  const archivedAt = getTicketArchivedAt(ticket)

  return (
    <article className="rounded border border-outline-variant bg-surface-low p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{ticket.ticket_number}</p>
            {isCoIntervenant && (
              <Users size={16} className="text-amber-500" title="Co-intervenant" aria-label="Co-intervenant" />
            )}
          </div>
          {isCoIntervenant && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              {getAgentAssignmentDisplay(ticket).prefix}
              {getAgentAssignmentDisplay(ticket).text}
            </p>
          )}
          <TicketDetailLink ticket={ticket} className="text-sm" showPreview={false} hidePriority />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
            {ticket.category_label && <span>Catégorie : {ticket.category_label}</span>}
            {ticket.reporter_direction && <span>Direction : {ticket.reporter_direction}</span>}
            {ticket.assigned_tech_name && <span>Agent : {ticket.assigned_tech_name}</span>}
            {archivedAt && (
              <span>Archivé le {formatEmittedDate(archivedAt.toISOString())}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export function HistoryTicketsPanel({
  tickets,
  userId,
  loading = false,
  serverPagination = null,
  onServerPageChange,
}) {
  const { year: currentYear, monthIndex: currentMonthIndex } = getCurrentYearMonth()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [directionFilter, setDirectionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [groupBy, setGroupBy] = useState('month')
  const [year, setYear] = useState('all')
  const [month, setMonth] = useState(currentMonthIndex + 1)
  const [weekIndex, setWeekIndex] = useState(1)

  const filterOptions = useMemo(() => collectHistoryFilterOptions(tickets), [tickets])
  const weeks = useMemo(() => {
    const y = year === 'all' ? currentYear : Number(year)
    return getMonthWeeks(y, month - 1)
  }, [year, month, currentYear])

  useEffect(() => {
    if (year !== 'all' && filterOptions.years.length && !filterOptions.years.includes(Number(year))) {
      setYear(String(filterOptions.years[0]))
    }
  }, [filterOptions.years, year])

  useEffect(() => {
    if (weeks.length && !weeks.some((w) => w.weekIndex === weekIndex)) {
      setWeekIndex(weeks[0]?.weekIndex ?? 1)
    }
  }, [weeks, weekIndex])

  const filteredTickets = useMemo(
    () =>
      applyHistoryTicketFilters(tickets, {
        search,
        priorityFilter,
        categoryFilter,
        directionFilter,
        dateFilter,
        year: year === 'all' ? null : Number(year),
        month: year === 'all' ? null : month,
        weekIndex: year === 'all' || groupBy !== 'week' ? null : weekIndex,
        groupBy,
      }).sort(
        (a, b) => (getTicketArchivedAt(b)?.getTime() ?? 0) - (getTicketArchivedAt(a)?.getTime() ?? 0),
      ),
    [
      tickets,
      search,
      priorityFilter,
      categoryFilter,
      directionFilter,
      dateFilter,
      year,
      month,
      weekIndex,
      groupBy,
    ],
  )

  const historyGroups = useMemo(
    () => groupHistoryTicketsByMode(filteredTickets, groupBy),
    [filteredTickets, groupBy],
  )

  const flatTickets = useMemo(() => historyGroups.flatMap((g) => g.tickets), [historyGroups])
  const clientPag = useClientPagination(flatTickets, 10)
  const useServerPaging = Boolean(serverPagination)
  const paginatedTickets = useServerPaging ? flatTickets : clientPag.items
  const pagination = useServerPaging ? serverPagination : clientPag.pagination
  const setPage = useServerPaging ? onServerPageChange : clientPag.setPage

  const paginatedGroups = useMemo(() => {
    if (useServerPaging) return [{ key: 'all', label: null, tickets: paginatedTickets }]
    const ids = new Set(paginatedTickets.map((t) => t.id))
    const groups = []
    for (const group of historyGroups) {
      const groupTickets = group.tickets.filter((t) => ids.has(t.id))
      if (groupTickets.length > 0) {
        groups.push({ ...group, tickets: groupTickets })
      }
    }
    return groups
  }, [historyGroups, paginatedTickets, useServerPaging])

  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant">
        Vos tickets clôturés dont le rapport a été validé par le chef de service (date de référence
        : clôture). Distinct des archives officielles de la directrice.
      </p>
      <div className="rounded border border-outline-variant bg-surface-lowest p-3">
        <div className="flex flex-wrap items-end gap-4">
          <TicketSearchInput value={search} onChange={setSearch} />
          <div className="flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
            <PriorityFilterHeader value={priorityFilter} onChange={setPriorityFilter} />
            <CategoryFilterHeader
              value={categoryFilter}
              onChange={setCategoryFilter}
              categories={filterOptions.categories}
            />
            <ReporterDirectionFilterHeader
              value={directionFilter}
              onChange={setDirectionFilter}
              directions={filterOptions.directions}
            />
            <DateFilterHeader
              value={dateFilter}
              onChange={setDateFilter}
              label="Date archivage"
            />
            <HistoryGroupByHeader value={groupBy} onChange={setGroupBy} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
          <label>
            Année
            <select
              value={String(year)}
              onChange={(e) => {
                const next = e.target.value
                setYear(next === 'all' ? 'all' : Number(next))
              }}
              className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
            >
              <option value="all">Toutes</option>
              {(filterOptions.years.length ? filterOptions.years : [currentYear]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {year !== 'all' && (groupBy === 'month' || groupBy === 'week') && (
            <label>
              Mois
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {year !== 'all' && groupBy === 'week' && weeks.length > 0 && (
            <label>
              Semaine
              <select
                value={weekIndex}
                onChange={(e) => setWeekIndex(Number(e.target.value))}
                className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
              >
                {weeks.map((w) => (
                  <option key={w.weekIndex} value={w.weekIndex}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : flatTickets.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Historique vide.</p>
      ) : (
        <ScrollablePanel className="space-y-4 bg-surface-lowest p-3">
          {paginatedGroups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-2 text-sm font-semibold">{group.label}</h3>
              <div className="space-y-2">
                {group.tickets.map((ticket) => (
                  <HistoryTicketRow key={ticket.id} ticket={ticket} userId={userId} />
                ))}
              </div>
            </section>
          ))}
          <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="tickets" />
        </ScrollablePanel>
      )}
    </div>
  )
}
