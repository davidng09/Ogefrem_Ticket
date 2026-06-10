import { CheckCircle2, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DateFilterHeader, PriorityFilterHeader, WeekFilterHeader } from '../components/TicketTableFilters'
import { MonthlyBundlePanel } from '../components/MonthlyBundlePanel'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { WeeklyReportPanel } from '../components/WeeklyReportPanel'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { useTickets } from '../hooks/useTickets'
import {
  formatEmittedDate,
  formatStatusLabel,
  getAgentTicketBucket,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  groupHistoryTicketsByPeriod,
  isReportValidatedByChef,
} from '../uiHelpers'
import { getCurrentYearMonth, groupTicketsByWeek } from '../utils/calendarWeeks'
import { MonthlyRedactorInbox } from './MonthlyRedactorInbox'

function DashboardButton({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border p-4 text-left shadow-sm transition ${
        active
          ? 'border-primary bg-primary/10'
          : 'border-outline-variant bg-surface-lowest hover:bg-surface-low'
      }`}
    >
      <p className="text-xs uppercase text-on-surface-variant">{label}</p>
      <p className="mt-1 text-3xl font-bold text-primary">{count}</p>
    </button>
  )
}

function getRoleLabel(roleCode) {
  const labels = {
    CHEF_SERVICE: 'Chef de service',
    SOUS_DIRECTEUR: 'Sous-directeur',
    DIRECTEUR: 'Directrice',
    SUPER_ADMIN: 'Direction',
  }
  return labels[roleCode] || roleCode
}

function ResolvedTicketRow({ ticket }) {
  return (
    <article className="rounded border border-outline-variant bg-surface-low p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{ticket.ticket_number}</p>
          <p className="text-sm">{ticket.description}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Clôturé le {formatEmittedDate(ticket.closed_at)}
          </p>
        </div>
        <span className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(ticket.status)}`}>
          {formatStatusLabel(ticket.status, ticket)}
        </span>
      </div>
    </article>
  )
}

function AgentTicketCard({
  ticket,
  notesByTicket,
  setNotesByTicket,
  takenChargeIds,
  doneByTicket,
  reportsByTicket,
  onTakeCharge,
  onSubmit,
}) {
  const reports = reportsByTicket[ticket.id] || []
  const latestReport = reports[0]
  const latestStatus = ticket.latest_report_status || latestReport?.status
  const isResolved = ticket.status === 'resolu'
  const isInProgress = ticket.status === 'en_cours'
  const isAssigned = ticket.status === 'assigne_technicien'
  const needsCorrection = isResolved && latestStatus === 'rejete'
  const frozenByChef = isReportValidatedByChef(latestStatus)
  const showTakeCharge = isAssigned && !takenChargeIds.has(ticket.id)
  const showTakenChargeGreen = isInProgress || (isAssigned && takenChargeIds.has(ticket.id))
  const showWorkflow =
    !frozenByChef &&
    (isAssigned || isInProgress || needsCorrection || (isResolved && latestStatus === 'soumis'))
  const showTextarea = isInProgress || needsCorrection
  const showFrozenResolve =
    isResolved && latestStatus === 'soumis' && !needsCorrection && !frozenByChef

  const rejectedValidations =
    latestReport?.validations?.filter((v) => v.decision === 'rejete') || []

  const textareaValue =
    notesByTicket[ticket.id] ??
    (needsCorrection ? ticket.latest_report_body || latestReport?.body || '' : '')

  return (
    <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{ticket.ticket_number}</p>
          <p className="text-sm">{ticket.description}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            Date émise : {formatEmittedDate(ticket.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
          >
            {ticket.priority}
          </span>
          <span className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(ticket.status)}`}>
            {formatStatusLabel(ticket.status, ticket)}
          </span>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-on-surface-variant md:grid-cols-3">
        <p>Nom: {ticket.reporter_full_name}</p>
        <p>Direction: {ticket.reporter_direction}</p>
        <p>Bureau: {ticket.reporter_office}</p>
      </div>

      {needsCorrection && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Rapport à corriger</p>
          {rejectedValidations.length > 0 ? (
            <ul className="mt-2 space-y-2 text-xs">
              {rejectedValidations.map((v, idx) => (
                <li key={idx} className="rounded border border-amber-100 bg-white/60 p-2">
                  <span className="font-semibold">
                    {v.validator_name} ({getRoleLabel(v.validator_role)})
                  </span>
                  {v.comment ? <p className="mt-1 whitespace-pre-wrap">{v.comment}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs">Modifiez votre rapport selon les remarques reçues.</p>
          )}
        </div>
      )}

      {showWorkflow && (
        <div className="space-y-2">
          {showTakeCharge && (
            <button
              type="button"
              onClick={() => onTakeCharge(ticket.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
            >
              <Wrench size={16} /> Prendre en charge
            </button>
          )}
          {showTakenChargeGreen && !showTakeCharge && (
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white opacity-90"
            >
              <Wrench size={16} /> Pris en charge
            </button>
          )}
          {showTextarea && (
            <textarea
              className="w-full rounded border border-outline-variant p-2 text-sm"
              rows={3}
              placeholder="Rapport technique de clôture"
              value={textareaValue}
              onChange={(e) => setNotesByTicket((state) => ({ ...state, [ticket.id]: e.target.value }))}
            />
          )}
          {isInProgress && (
            <button
              type="button"
              onClick={() => onSubmit(ticket.id, true)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
                doneByTicket[ticket.id]
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-primary text-primary'
              }`}
            >
              <CheckCircle2 size={16} />
              Marquer comme résolu
            </button>
          )}
          {needsCorrection && (
            <button
              type="button"
              onClick={() => onSubmit(ticket.id, false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-primary px-3 py-2 text-sm font-semibold text-primary"
            >
              <CheckCircle2 size={16} />
              Soumettre une nouvelle version
            </button>
          )}
          {showFrozenResolve && (
            <button
              type="button"
              disabled
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-green-600 bg-green-600 px-3 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle2 size={16} />
              Marquer comme résolu
            </button>
          )}
        </div>
      )}
    </article>
  )
}

export function TechnicianField() {
  const { user } = useAuth()
  const { year, monthIndex } = getCurrentYearMonth()
  const { tickets, loading, reload } = useTickets(undefined, 'current')
  const { tickets: historyTickets, loading: historyLoading } = useTickets(undefined, 'history')
  const [activeView, setActiveView] = useState('assigned')
  const [notesByTicket, setNotesByTicket] = useState({})
  const [takenChargeIds, setTakenChargeIds] = useState(new Set())
  const [doneByTicket, setDoneByTicket] = useState({})
  const [notice, setNotice] = useState('')
  const [reportsByTicket, setReportsByTicket] = useState({})
  const [weekFilter, setWeekFilter] = useState('all')
  const [resolvedPriorityFilter, setResolvedPriorityFilter] = useState('all')

  const assignedRaw = useMemo(
    () => tickets.filter((t) => getAgentTicketBucket(t) === 'assigned'),
    [tickets],
  )
  const resolvedRaw = useMemo(
    () => tickets.filter((t) => getAgentTicketBucket(t) === 'resolved'),
    [tickets],
  )
  const resolvedByWeek = useMemo(
    () => groupTicketsByWeek(resolvedRaw, year, monthIndex),
    [resolvedRaw, year, monthIndex],
  )
  const historyGroups = useMemo(() => groupHistoryTicketsByPeriod(historyTickets), [historyTickets])

  const assignedFilters = useTicketFilters(assignedRaw)

  const filteredResolvedByWeek = useMemo(() => {
    let groups = resolvedByWeek
    if (weekFilter !== 'all') {
      groups = groups.filter((g) => String(g.weekIndex) === weekFilter)
    }
    if (resolvedPriorityFilter !== 'all') {
      groups = groups.map((g) => ({
        ...g,
        tickets: g.tickets.filter((t) => t.priority === resolvedPriorityFilter),
      }))
    }
    return groups
  }, [resolvedByWeek, weekFilter, resolvedPriorityFilter])

  useEffect(() => {
    setTakenChargeIds((prev) => {
      const next = new Set(prev)
      tickets.forEach((t) => {
        if (t.status === 'en_cours' || t.status === 'resolu') {
          next.add(t.id)
        }
      })
      return next
    })
  }, [tickets])

  const correctionIds = useMemo(
    () =>
      assignedRaw
        .filter((t) => t.status === 'resolu' && t.latest_report_status === 'rejete')
        .map((t) => t.id),
    [assignedRaw],
  )

  useEffect(() => {
    const ids = [...correctionIds]
    if (ids.length === 0) return
    Promise.all(
      ids.map((id) =>
        apiRequest(`/tickets/${id}/reports`).then((data) => ({ id, reports: data.reports || [] })),
      ),
    )
      .then((rows) => {
        setReportsByTicket((prev) => {
          const next = { ...prev }
          rows.forEach((r) => {
            next[r.id] = r.reports
          })
          return next
        })
        setNotesByTicket((prev) => {
          const next = { ...prev }
          rows.forEach((r) => {
            const latest = r.reports[0]
            if (latest?.status === 'rejete' && next[r.id] === undefined) {
              next[r.id] = latest.body
            }
          })
          return next
        })
      })
      .catch(() => {})
  }, [correctionIds.join(',')])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function takeCharge(ticketId) {
    await apiRequest(`/tickets/${ticketId}/take-charge`, { method: 'POST' })
    setTakenChargeIds((s) => new Set(s).add(ticketId))
    showNotice('Ticket pris en charge.')
    reload()
  }

  async function submitReport(ticketId, markResolved) {
    const body = notesByTicket[ticketId]
    if (!body?.trim()) {
      showNotice('Le rapport ne peut pas être vide.')
      return
    }

    await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId, body: body.trim() }),
    })
    if (markResolved) {
      await apiRequest(`/tickets/${ticketId}/resolve`, { method: 'POST' })
    }
    setDoneByTicket((state) => ({ ...state, [ticketId]: true }))
    showNotice(
      markResolved
        ? 'Ticket marqué comme résolu et rapport soumis.'
        : 'Nouvelle version du rapport soumise.',
    )
    setTimeout(() => {
      setDoneByTicket((state) => ({ ...state, [ticketId]: false }))
      reload()
    }, 150)
  }

  if (loading && historyLoading) return <p className="text-sm">Chargement...</p>

  const assignedList = assignedFilters.filteredTickets

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}
      <header className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h1 className="text-xl font-semibold">
          {user?.prenom} {user?.nom} — Agent terrain
        </h1>
        <p className="text-sm text-on-surface-variant">
          Tickets, rapports hebdomadaires et cycle mensuel DANTIC
        </p>
        {activeView === 'assigned' && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
            <PriorityFilterHeader
              value={assignedFilters.priorityFilter}
              onChange={assignedFilters.setPriorityFilter}
            />
            <DateFilterHeader
              value={assignedFilters.dateFilter}
              onChange={assignedFilters.setDateFilter}
            />
          </div>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <DashboardButton
          label="Tickets affectés"
          count={assignedRaw.length}
          active={activeView === 'assigned'}
          onClick={() => setActiveView('assigned')}
        />
        <DashboardButton
          label="Tickets résolus"
          count={resolvedRaw.length}
          active={activeView === 'resolved'}
          onClick={() => setActiveView('resolved')}
        />
        <DashboardButton
          label="Historique"
          count={historyTickets.length}
          active={activeView === 'history'}
          onClick={() => setActiveView('history')}
        />
      </section>

      {activeView === 'assigned' && (
        <ScrollablePanel className="space-y-3 bg-transparent p-0">
          {assignedList.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucun ticket affecté.</p>
          ) : (
            assignedList.map((ticket) => (
              <AgentTicketCard
                key={ticket.id}
                ticket={ticket}
                notesByTicket={notesByTicket}
                setNotesByTicket={setNotesByTicket}
                takenChargeIds={takenChargeIds}
                doneByTicket={doneByTicket}
                reportsByTicket={reportsByTicket}
                onTakeCharge={takeCharge}
                onSubmit={submitReport}
              />
            ))
          )}
        </ScrollablePanel>
      )}

      {activeView === 'resolved' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 rounded border border-outline-variant bg-surface-lowest p-3 text-xs uppercase text-on-surface-variant">
            <WeekFilterHeader
              value={weekFilter}
              onChange={setWeekFilter}
              weeks={resolvedByWeek.filter((g) => g.tickets.length > 0)}
            />
            <PriorityFilterHeader value={resolvedPriorityFilter} onChange={setResolvedPriorityFilter} />
          </div>
          <ScrollablePanel className="space-y-4 bg-surface-lowest p-3">
            {filteredResolvedByWeek.every((g) => g.tickets.length === 0) ? (
              <p className="text-sm text-on-surface-variant">Aucun ticket résolu ce mois.</p>
            ) : (
              filteredResolvedByWeek.map(
                (group) =>
                  group.tickets.length > 0 && (
                    <section key={group.weekIndex}>
                      <h3 className="mb-2 text-sm font-semibold">{group.label}</h3>
                      <div className="space-y-2">
                        {group.tickets.map((ticket) => (
                          <ResolvedTicketRow key={ticket.id} ticket={ticket} />
                        ))}
                      </div>
                    </section>
                  ),
              )
            )}
          </ScrollablePanel>
          <WeeklyReportPanel onNotice={showNotice} />
          <MonthlyBundlePanel onNotice={showNotice} />
        </div>
      )}

      {activeView === 'history' && (
        <ScrollablePanel className="space-y-4 bg-surface-lowest p-3">
          {historyGroups.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Historique vide.</p>
          ) : (
            historyGroups.map((group) => (
              <section key={`${group.year}-${group.month}-S${group.weekIndex}`}>
                <h3 className="mb-2 text-sm font-semibold">
                  {group.month}/{group.year} — Semaine S{group.weekIndex}
                </h3>
                <div className="space-y-2">
                  {group.tickets.map((ticket) => (
                    <ResolvedTicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              </section>
            ))
          )}
        </ScrollablePanel>
      )}

      <MonthlyRedactorInbox onNotice={showNotice} />
    </div>
  )
}
