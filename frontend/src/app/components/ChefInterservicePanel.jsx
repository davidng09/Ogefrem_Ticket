import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { usePaginatedTickets } from '../hooks/useTickets'
import { useTicketTabStats } from '../hooks/useTabStats'
import {
  TICKET_CATEGORIES,
  formatEmittedDate,
  formatPriorityLabel,
  formatServiceLabel,
  getPriorityBadgeClass,
} from '../uiHelpers'
import { TicketDetailLink } from './TicketDetailLink'
import {
  CategoryFilterHeader,
  DateFilterHeader,
  MineOnlyFilterHeader,
  PriorityFilterHeader,
  ServiceFilterHeader,
  SortFilterHeader,
} from './TicketTableFilters'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'

const SORT_OPTIONS_POOL = [
  { value: 'priority_desc', label: 'Priorité (urgent → normale)' },
  { value: 'priority_asc', label: 'Priorité (normale → urgent)' },
  { value: 'date_desc', label: 'Date (récent → ancien)' },
  { value: 'date_asc', label: 'Date (ancien → récent)' },
  { value: 'ticket_asc', label: 'N° ticket (A → Z)' },
  { value: 'ticket_desc', label: 'N° ticket (Z → A)' },
  { value: 'category_asc', label: 'Catégorie (A → Z)' },
  { value: 'service_asc', label: 'Service (A → Z)' },
]

const SORT_OPTIONS_TAKEN = [
  ...SORT_OPTIONS_POOL,
  { value: 'chef_asc', label: 'Chef (A → Z)' },
]

function resetPage(setPage) {
  setPage(1)
}

export function ChefInterservicePanel({ onNotice, onChanged, onTotalChange }) {
  const { user } = useAuth()
  const [subView, setSubView] = useState('pool')
  const [categoryId, setCategoryId] = useState('all')
  const [priority, setPriority] = useState('all')
  const [serviceId, setServiceId] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy] = useState('priority_desc')
  const [mineOnly, setMineOnly] = useState('all')
  const [reporterDirection, setReporterDirection] = useState('all')
  const [services, setServices] = useState([])
  const [chefs, setChefs] = useState([])
  const [delegateByTicket, setDelegateByTicket] = useState({})
  const [claimForm, setClaimForm] = useState({})
  const [busyId, setBusyId] = useState(0)

  const listFilters = useMemo(
    () => ({
      categoryId,
      priority,
      serviceId,
      dateFilter,
      sortBy,
      mineOnly: subView === 'taken' && mineOnly === 'mine',
      reporterDirection,
    }),
    [categoryId, priority, serviceId, dateFilter, sortBy, mineOnly, subView, reporterDirection],
  )

  const scope = subView === 'pool' ? 'interservice_pool' : 'interservice_taken'
  const { stats: scopeStats } = useTicketTabStats(scope, null)
  const {
    tickets,
    loading,
    error,
    reload,
    pagination,
    setPage,
    perPage,
    setPerPage,
  } = usePaginatedTickets(scope, null, 10, listFilters)

  const sortOptions = subView === 'pool' ? SORT_OPTIONS_POOL : SORT_OPTIONS_TAKEN

  useEffect(() => {
    apiRequest('/presence/chefs')
      .then((data) => setChefs(data.chefs || []))
      .catch(() => setChefs([]))
    apiRequest('/meta/services')
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
  }, [])

  useEffect(() => {
    if (pagination?.total !== undefined) {
      onTotalChange?.(pagination.total)
    }
  }, [pagination?.total, onTotalChange])

  useEffect(() => {
    if (subView === 'pool' && sortBy === 'chef_asc') {
      setSortBy('priority_desc')
    }
  }, [subView, sortBy])

  async function claimTicket(ticketId) {
    const form = claimForm[ticketId]
    if (!form?.priority) {
      onNotice?.('Définissez la priorité avant de prendre en charge.')
      return
    }
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/claim-chef`, {
        method: 'POST',
        body: JSON.stringify({
          priority: form.priority,
          sla_due_at: form.sla_due_at || null,
        }),
      })
      onNotice?.('Ticket pris en charge.')
      setClaimForm((s) => {
        const next = { ...s }
        delete next[ticketId]
        return next
      })
      reload()
      onChanged?.()
    } catch (err) {
      onNotice?.(err.message || 'Échec de la prise en charge.')
    } finally {
      setBusyId(0)
    }
  }

  async function delegateTicket(ticketId) {
    const chefId = delegateByTicket[ticketId]
    if (!chefId) return
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/delegate-chef`, {
        method: 'POST',
        body: JSON.stringify({ chef_id: Number(chefId) }),
      })
      onNotice?.('Ticket cédé au chef sélectionné.')
      reload()
      onChanged?.()
    } catch (err) {
      onNotice?.(err.message || 'Échec de la cession.')
    } finally {
      setBusyId(0)
    }
  }

  return (
    <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
      <div className="border-b border-outline-variant p-3">
        <div>
          <h3 className="font-semibold">TOUS LES TICKETS</h3>
          <p className="text-xs text-on-surface-variant">
            Filtres, tri et pagination — définir la priorité puis prendre en charge
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSubView('pool')
              setMineOnly('all')
              resetPage(setPage)
            }}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              subView === 'pool' ? 'bg-primary text-on-primary' : 'border border-outline-variant'
            }`}
          >
            Disponibles
          </button>
          <button
            type="button"
            onClick={() => {
              setSubView('taken')
              resetPage(setPage)
            }}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              subView === 'taken' ? 'bg-primary text-on-primary' : 'border border-outline-variant'
            }`}
          >
            Pris en charge
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-outline-variant px-3 py-2 text-xs uppercase text-on-surface-variant">
        <CategoryFilterHeader
          value={categoryId}
          onChange={(v) => {
            setCategoryId(v)
            resetPage(setPage)
          }}
          categories={TICKET_CATEGORIES}
        />
        <PriorityFilterHeader
          value={priority}
          onChange={(v) => {
            setPriority(v)
            resetPage(setPage)
          }}
        />
        <ServiceFilterHeader
          value={serviceId}
          onChange={(v) => {
            setServiceId(v)
            resetPage(setPage)
          }}
          services={services}
        />
        <DateFilterHeader
          value={dateFilter}
          onChange={(v) => {
            setDateFilter(v)
            resetPage(setPage)
          }}
        />
        <label className="flex items-center gap-1">
          Direction
          <select
            value={reporterDirection}
            onChange={(e) => {
              setReporterDirection(e.target.value)
              resetPage(setPage)
            }}
            className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-xs normal-case"
          >
            <option value="all">Toutes</option>
            {(scopeStats?.directions || []).map((dir) => (
              <option key={dir} value={dir}>
                {dir}
              </option>
            ))}
          </select>
        </label>
        <SortFilterHeader
          value={sortBy}
          onChange={(v) => {
            setSortBy(v)
            resetPage(setPage)
          }}
          options={sortOptions}
        />
        {subView === 'taken' && (
          <MineOnlyFilterHeader
            value={mineOnly}
            onChange={(v) => {
              setMineOnly(v)
              resetPage(setPage)
            }}
          />
        )}
      </div>

      {error ? (
        <p className="border-b border-error/30 bg-error/10 p-4 text-sm text-error">{error}</p>
      ) : null}

      {loading ? (
        <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <ScrollablePanel className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="p-2">Ticket</th>
                <th className="p-2">Direction</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2">Date émise</th>
                <th className="p-2">Service</th>
                <th className="p-2">Priorité</th>
                {subView === 'taken' && <th className="p-2">Pris par</th>}
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={subView === 'taken' ? 8 : 7} className="p-4 text-on-surface-variant">
                    Aucun ticket pour ces critères.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-outline-variant align-top">
                    <td className="p-2">
                      <p className="font-semibold">{ticket.ticket_number}</p>
                      <TicketDetailLink ticket={ticket} className="text-xs" hidePriority={subView === 'pool'} />
                    </td>
                    <td className="p-2 text-xs">{ticket.reporter_direction || '—'}</td>
                    <td className="p-2">{ticket.category_label}</td>
                    <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                    <td className="p-2 text-xs">{formatServiceLabel(ticket.routed_service_label) || '—'}</td>
                    <td className="p-2">
                      {subView === 'pool' ? (
                        <div className="space-y-1">
                          <select
                            className="w-full rounded border border-outline-variant p-1 text-xs"
                            value={claimForm[ticket.id]?.priority || ''}
                            onChange={(e) =>
                              setClaimForm((s) => ({
                                ...s,
                                [ticket.id]: { ...s[ticket.id], priority: e.target.value },
                              }))
                            }
                          >
                            <option value="">Priorité…</option>
                            <option value="normale">Normale</option>
                            <option value="elevee">Élevée</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <input
                            type="datetime-local"
                            className="w-full rounded border border-outline-variant p-1 text-xs"
                            value={claimForm[ticket.id]?.sla_due_at || ''}
                            onChange={(e) =>
                              setClaimForm((s) => ({
                                ...s,
                                [ticket.id]: { ...s[ticket.id], sla_due_at: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ) : (
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                        >
                          {formatPriorityLabel(ticket.priority)}
                        </span>
                      )}
                    </td>
                    {subView === 'taken' && (
                      <td className="p-2 text-xs">
                        <p className="font-medium">{ticket.assigned_chef_name || '—'}</p>
                      </td>
                    )}
                    <td className="p-2">
                      {subView === 'pool' ? (
                        <button
                          type="button"
                          disabled={busyId === ticket.id || !claimForm[ticket.id]?.priority}
                          onClick={() => claimTicket(ticket.id)}
                          className="rounded bg-primary px-2 py-1 text-xs font-semibold text-on-primary disabled:opacity-50"
                        >
                          Prendre en charge
                        </button>
                      ) : Number(ticket.assigned_chef_id) === Number(user?.id) ? (
                        <div className="space-y-1">
                          <select
                            className="w-full rounded border border-outline-variant p-1 text-xs"
                            value={delegateByTicket[ticket.id] || ''}
                            onChange={(e) =>
                              setDelegateByTicket((s) => ({ ...s, [ticket.id]: e.target.value }))
                            }
                          >
                            <option value="">Céder à un chef…</option>
                            {chefs.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.prenom} {c.nom} — {formatServiceLabel(c.routed_service_label || c.service_label)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === ticket.id || !delegateByTicket[ticket.id]}
                            onClick={() => delegateTicket(ticket.id)}
                            className="w-full rounded border border-outline-variant px-2 py-1 text-xs disabled:opacity-50"
                          >
                            Céder
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant">Pris par un collègue</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollablePanel>
      )}
      <PaginationBar
        pagination={pagination}
        onPageChange={setPage}
        itemLabel="tickets"
        perPage={perPage}
        onPerPageChange={setPerPage}
      />
    </section>
  )
}
