import { Archive, ArrowRightLeft, CheckCircle2, ClipboardList, History, Layers, NotebookPen, RotateCcw, UserPlus, Users, Wrench, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DateFilterHeader, PriorityFilterHeader, AgentAssignmentFilterHeader, AgentAssignedStatusFilterHeader, AgentClosedOutcomeFilterHeader } from '../components/TicketTableFilters'
import { CoInterventionInviteModal } from '../components/CoInterventionInviteModal'
import { TicketTransferModal } from '../components/TicketTransferModal'
import { MonthlyBundlePanel } from '../components/MonthlyBundlePanel'
import { DashboardTabButton } from '../components/DashboardTabButton'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { WeeklyReportPanel } from '../components/WeeklyReportPanel'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { usePresence } from '../hooks/usePresence'
import { useClientPagination, usePaginatedTickets, useTickets } from '../hooks/useTickets'
import { useTicketTabStats } from '../hooks/useTabStats'
import { usePinnedTickets } from '../hooks/usePinnedTickets'
import { useSeenTabCounts } from '../hooks/useSeenTabCounts'
import { useWeeklyRedactionStats } from '../hooks/useWeeklyRedactionStats'
import { PinTicketButton } from '../components/PinTicketButton'
import { TicketDetailLink } from '../components/TicketDetailLink'
import { HistoryTicketsPanel } from '../components/HistoryTicketsPanel'
import { PaginationBar } from '../components/PaginationBar'
import { RefreshButton } from '../components/RefreshButton'
import {
  formatEmittedDate,
  formatPriorityLabel,
  formatStatusLabel,
  getAgentAssignmentDisplay,
  getAgentMesTicketStatusBadgeClass,
  getAgentTicketBucket,
  getAgentWorkspaceHeader,
  formatAgentMesTicketStatusLabel,
  buildReopenedTicketReportNote,
  isAgentCoIntervenant,
  isAgentPrimaryAssignee,
  isAgentReportRejectedByChef,
  isTicketReturnedToClosed,
  isTicketAwaitingChefAfterReturn,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  isAgentReopenedUnresolved,
  isAgentChefBureauActiveTicket,
  isAgentTicketChefAssigned,
  isReportValidatedByChef,
  sortTicketsWithPinned,
} from '../uiHelpers'
import { applyWorkspaceSearchParams } from '../workspaceNavigation'
import { MonthlyRedactorInbox } from './MonthlyRedactorInbox'

function TicketFiltersBar({ filters }) {
  return (
    <div className="flex flex-wrap gap-4 rounded border border-outline-variant bg-surface-lowest p-3 text-xs uppercase text-on-surface-variant">
      <PriorityFilterHeader value={filters.priorityFilter} onChange={filters.setPriorityFilter} />
      <DateFilterHeader value={filters.dateFilter} onChange={filters.setDateFilter} />
    </div>
  )
}

function AgentAssignedFiltersBar({ filters, assignmentFilter, onAssignmentChange, statusFilter, onStatusChange, isChefBureau }) {
  return (
    <div className="flex flex-wrap gap-4 rounded border border-outline-variant bg-surface-lowest p-3 text-xs uppercase text-on-surface-variant">
      <PriorityFilterHeader value={filters.priorityFilter} onChange={filters.setPriorityFilter} />
      <DateFilterHeader value={filters.dateFilter} onChange={filters.setDateFilter} />
      <AgentAssignmentFilterHeader value={assignmentFilter} onChange={onAssignmentChange} />
      <AgentAssignedStatusFilterHeader
        value={statusFilter}
        onChange={onStatusChange}
        isChefBureau={isChefBureau}
      />
    </div>
  )
}

function ClosedTicketsFiltersBar({ filters, outcomeFilter, onOutcomeChange }) {
  return (
    <div className="flex flex-wrap gap-4 rounded border border-outline-variant bg-surface-lowest p-3 text-xs uppercase text-on-surface-variant">
      <PriorityFilterHeader value={filters.priorityFilter} onChange={filters.setPriorityFilter} />
      <DateFilterHeader value={filters.dateFilter} onChange={filters.setDateFilter} />
      <AgentClosedOutcomeFilterHeader value={outcomeFilter} onChange={onOutcomeChange} />
    </div>
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

function ClosedTicketRow({
  ticket,
  userId,
  onReopen,
  reopeningId,
  isPinned,
  onTogglePin,
  notesByTicket = {},
  setNotesByTicket,
  reportsByTicket = {},
  onResubmitReport,
  resubmittingId,
  readOnly = false,
  highlighted = false,
}) {
  const isUnresolved = ticket.status === 'non_resolu'
  const isCoIntervenant = isAgentCoIntervenant(ticket)
  const isPrimary = isAgentPrimaryAssignee(ticket, userId)
  const needsReportCorrection = isPrimary && isAgentReportRejectedByChef(ticket)
  const isReturned = isTicketReturnedToClosed(ticket)
  const awaitingChef = isPrimary && isTicketAwaitingChefAfterReturn(ticket)
  const reports = reportsByTicket[ticket.id] || []
  const latestReport = reports[0]
  const rejectedValidations =
    latestReport?.validations?.filter((v) => v.decision === 'rejete') || []
  const noteValue =
    notesByTicket[ticket.id] ?? (needsReportCorrection ? ticket.latest_report_body || latestReport?.body || '' : '')

  return (
    <article
      className={`rounded border p-3 ${
        highlighted ? 'border-primary ring-1 ring-primary/30' : ''
      } ${
        isPinned
          ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
          : isReturned
            ? 'border-amber-300 bg-amber-50/60 ticket-returned-highlight'
            : 'border-outline-variant bg-surface-low'
      }`}
    >
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
          <TicketDetailLink ticket={ticket} className="text-sm" showPreview={false} />
          <p className="mt-1 text-xs text-on-surface-variant">
            Clôturé le {formatEmittedDate(ticket.closed_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {!readOnly && onTogglePin ? (
            <PinTicketButton pinned={isPinned} onToggle={onTogglePin} />
          ) : null}
          {!readOnly && (
            <span className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(ticket.status, ticket)}`}>
              {formatStatusLabel(ticket.status, ticket)}
            </span>
          )}
        </div>
      </div>
      {isReturned && isPrimary && (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          {awaitingChef ? (
            <p>
              Ticket redescendu — le rapport a été renvoyé au chef de service. Vous pourrez modifier
              et valider après sa décision.
            </p>
          ) : isUnresolved ? (
            <p>Ticket redescendu — vous pouvez le réouvrir pour le traiter à nouveau.</p>
          ) : null}
        </div>
      )}
      {needsReportCorrection && (
        <div className="mt-3 space-y-2">
          <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
            <p className="font-semibold">Rapport à corriger</p>
            {rejectedValidations.length > 0 ? (
              <ul className="mt-2 space-y-2">
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
              <p className="mt-1">Modifiez votre rapport selon les remarques du chef de service.</p>
            )}
          </div>
          <textarea
            className="w-full rounded border border-outline-variant p-2 text-sm"
            rows={4}
            placeholder="Rapport technique de clôture"
            value={noteValue}
            onChange={(e) => setNotesByTicket((state) => ({ ...state, [ticket.id]: e.target.value }))}
          />
          <button
            type="button"
            disabled={resubmittingId === ticket.id}
            onClick={() => onResubmitReport(ticket.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {resubmittingId === ticket.id ? 'Transmission…' : 'Valider le ticket'}
          </button>
        </div>
      )}
      {isUnresolved && onReopen && isPrimary && !isCoIntervenant && !needsReportCorrection && (
        <button
          type="button"
          disabled={reopeningId === ticket.id}
          onClick={() => onReopen(ticket.id)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50"
        >
          <RotateCcw size={16} />
          {reopeningId === ticket.id ? 'Réouverture…' : 'Réouvrir le ticket'}
        </button>
      )}
    </article>
  )
}

function AgentTicketCard({
  ticket,
  userId,
  notesByTicket,
  setNotesByTicket,
  takenChargeIds,
  selectedOutcome,
  reportsByTicket,
  onTakeCharge,
  onSelectOutcome,
  onCloseTicket,
  onRelease,
  onInviteCoIntervention,
  onAcceptCoIntervention,
  onTransfer,
  isChefBureau,
  acceptingCoId,
  isPinned,
  onTogglePin,
}) {
  const reports = reportsByTicket[ticket.id] || []
  const latestReport = reports[0]
  const latestStatus = ticket.latest_report_status || latestReport?.status
  const isCoIntervenant = isAgentCoIntervenant(ticket)
  const isPrimary = isAgentPrimaryAssignee(ticket, userId)
  const isInProgress = ticket.status === 'en_cours'
  const isAssigned = ticket.status === 'assigne_technicien'
  const frozenByChef = isReportValidatedByChef(latestStatus)
  const showTakeCharge = isPrimary && isAssigned && !takenChargeIds.has(ticket.id)
  const showTakenChargeGreen =
    isPrimary && (isInProgress || (isAssigned && takenChargeIds.has(ticket.id)))
  const showCoTakenCharge =
    isCoIntervenant && ticket.co_intervention_status === 'accepted'
  const showCoAccept =
    isCoIntervenant && ticket.co_intervention_status === 'pending'
  const showWorkflow = isPrimary && !frozenByChef && (isAssigned || isInProgress)
  const showTextarea = isPrimary && isInProgress
  const showInviteCo =
    isPrimary &&
    (isAssigned || isInProgress) &&
    (ticket.co_interventions?.length ?? 0) < 5
  const showTransfer =
    isChefBureau && isPrimary && (isAssigned || isInProgress)

  const canRelease = isPrimary && (isAssigned || isInProgress)
  const isReopened = isAgentReopenedUnresolved(ticket)

  const textareaValue =
    notesByTicket[ticket.id] ??
    (isReopened && isPrimary ? buildReopenedTicketReportNote(ticket) : '')

  const assignment = getAgentAssignmentDisplay(ticket)

  return (
    <article
      className={`rounded border p-4 shadow-sm ${
        isPinned
          ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
          : 'border-outline-variant bg-surface-lowest'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-sm font-semibold">{ticket.ticket_number}</p>
            <p
              className={`text-xs ${
                assignment.type === 'supervisor'
                  ? 'font-medium text-blue-600'
                  : assignment.type === 'co_intervention'
                    ? 'font-medium text-amber-700'
                    : 'text-on-surface'
              }`}
            >
              {assignment.prefix}
              {assignment.text}
            </p>
          </div>
          <TicketDetailLink ticket={ticket} className="text-sm" showPreview={false} />
          <p className="mt-1 text-xs text-on-surface-variant">
            Date émise : {formatEmittedDate(ticket.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-0.5">
            {showTransfer && (
              <button
                type="button"
                title="Transmettre à un agent"
                aria-label="Transmettre à un agent"
                onClick={() => onTransfer(ticket.id)}
                className="rounded p-1 text-violet-800 transition hover:bg-violet-50"
              >
                <ArrowRightLeft size={18} strokeWidth={2.25} />
              </button>
            )}
            {showInviteCo && (
              <button
                type="button"
                title="Inviter des co-intervenants"
                aria-label="Inviter des co-intervenants"
                onClick={() => onInviteCoIntervention(ticket.id)}
                className="rounded p-1 text-amber-600 transition hover:bg-amber-50"
              >
                <UserPlus size={18} strokeWidth={2.25} />
              </button>
            )}
            <PinTicketButton pinned={isPinned} onToggle={() => onTogglePin(ticket.id)} />
            {canRelease && (
              <button
                type="button"
                title="Remettre à la file du service"
                aria-label="Remettre à la file du service"
                onClick={() => onRelease(ticket.id)}
                className="rounded p-1 text-on-surface-variant transition hover:bg-surface-low hover:text-error"
              >
                <X size={16} strokeWidth={2.25} />
              </button>
            )}
          </div>
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
          >
            {formatPriorityLabel(ticket.priority)}
          </span>
          <span className={`rounded px-2 py-1 text-xs ${getAgentMesTicketStatusBadgeClass(ticket)}`}>
            {formatAgentMesTicketStatusLabel(ticket)}
          </span>
        </div>
      </div>
      {isPrimary && (ticket.co_interventions?.length ?? 0) > 0 && (
        <p className="mb-2 text-xs text-on-surface-variant">
          Co-intervenants :{' '}
          {ticket.co_interventions.map((c) => `${c.prenom} ${c.nom}`).join(', ')}
        </p>
      )}
      <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-on-surface-variant md:grid-cols-3">
        <p>Nom: {ticket.reporter_full_name}</p>
        <p>Direction: {ticket.reporter_direction}</p>
        <p>Bureau: {ticket.reporter_office}</p>
      </div>

      {isReopened && isPrimary && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Ticket réouvert après clôture non résolue — complétez le rapport et reclôturez le ticket.
          {(ticket.co_interventions?.length ?? 0) > 0 ? (
            <p className="mt-1">
              Les co-intervenants précédents ont été réintégrés automatiquement.
            </p>
          ) : null}
        </div>
      )}

      {isReopened && isCoIntervenant && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          Ticket réouvert — vous êtes de nouveau co-intervenant sur ce dossier (aucune action requise).
        </div>
      )}

      {showCoAccept && (
        <button
          type="button"
          disabled={acceptingCoId === ticket.id}
          onClick={() => onAcceptCoIntervention(ticket.id)}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Users size={16} />
          {acceptingCoId === ticket.id ? 'Acceptation…' : 'Accepter la co-intervention'}
        </button>
      )}
      {showCoTakenCharge && (
        <button
          type="button"
          disabled
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-white opacity-90"
        >
          <Wrench size={16} /> Pris en charge
        </button>
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
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onSelectOutcome(ticket.id, 'resolved')}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
                    selectedOutcome === 'resolved'
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-primary text-primary'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  Ticket résolu
                </button>
                <button
                  type="button"
                  onClick={() => onSelectOutcome(ticket.id, 'unresolved')}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-sm font-semibold ${
                    selectedOutcome === 'unresolved'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-amber-600 text-amber-800'
                  }`}
                >
                  <XCircle size={16} />
                  Ticket non résolu
                </button>
              </div>
              {(selectedOutcome === 'resolved' || selectedOutcome === 'unresolved') && (
                <button
                  type="button"
                  onClick={() => onCloseTicket(ticket.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
                >
                  Clôturer le ticket
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export function TechnicianField() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { pinnedIds, togglePin, isPinned } = usePinnedTickets(user?.id)
  usePresence({ enabled: true })
  const { tickets, loading, error, reload } = useTickets(undefined, 'current')
  const { tickets: poolTickets, loading: poolLoading, error: poolError, reload: reloadPool } =
    useTickets('pool')
  const { tickets: historyTickets, loading: historyLoading, error: historyError, reload: reloadHistory, pagination: historyPagination, page: historyPage, setPage: setHistoryPage } = usePaginatedTickets(
    undefined,
    'history',
    25,
  )
  const [activeView, setActiveView] = useState('assigned')
  const [focusTicketId, setFocusTicketId] = useState(null)
  const [notesByTicket, setNotesByTicket] = useState({})
  const [takenChargeIds, setTakenChargeIds] = useState(new Set())
  const [selectedOutcomeByTicket, setSelectedOutcomeByTicket] = useState({})
  const [notice, setNotice] = useState('')
  const [reportsByTicket, setReportsByTicket] = useState({})
  const [assignmentFilter, setAssignmentFilter] = useState('all')
  const [agentStatusFilter, setAgentStatusFilter] = useState('all')
  const [closedOutcomeFilter, setClosedOutcomeFilter] = useState('all')
  const [reopeningId, setReopeningId] = useState(null)
  const [coInviteTicketId, setCoInviteTicketId] = useState(null)
  const [transferTicketId, setTransferTicketId] = useState(null)
  const [acceptingCoId, setAcceptingCoId] = useState(null)
  const [resubmittingId, setResubmittingId] = useState(null)
  const isChefBureau = user?.role_code === 'CHEF_BUREAU'

  const poolStats = useTicketTabStats('pool', null)
  const weeklyRedaction = useWeeklyRedactionStats()

  const poolFilters = useTicketFilters(poolTickets)

  const assignedRaw = useMemo(
    () => tickets.filter((t) => getAgentTicketBucket(t) === 'assigned'),
    [tickets],
  )

  const assignedTabStats = useMemo(() => {
    const priority = { urgent: 0, elevee: 0, normale: 0 }
    for (const ticket of assignedRaw) {
      if (ticket.priority === 'urgent' || ticket.priority === 'bloquant') priority.urgent += 1
      else if (ticket.priority === 'elevee' || ticket.priority === 'haute') priority.elevee += 1
      else priority.normale += 1
    }
    return { total: assignedRaw.length, priority }
  }, [assignedRaw])
  const resolvedRaw = useMemo(
    () =>
      tickets
        .filter((t) => getAgentTicketBucket(t) === 'resolved')
        .sort((a, b) => new Date(b.closed_at || 0) - new Date(a.closed_at || 0)),
    [tickets],
  )
  const closedTabStats = useMemo(() => {
    let resolu = 0
    let non_resolu = 0
    let returned = 0
    for (const ticket of resolvedRaw) {
      if (ticket.status === 'resolu') resolu += 1
      else if (ticket.status === 'non_resolu') non_resolu += 1
      if (isTicketReturnedToClosed(ticket)) returned += 1
    }
    return { resolu, non_resolu, returned }
  }, [resolvedRaw])

  const assignedFilters = useTicketFilters(assignedRaw)
  const resolvedFilters = useTicketFilters(resolvedRaw)

  const tabTotals = useMemo(
    () => ({
      assigned: assignedTabStats.total,
      pool: poolStats.stats?.total ?? poolTickets.length,
      resolved: closedTabStats.returned,
      notes: weeklyRedaction.total,
    }),
    [assignedTabStats.total, poolStats.stats?.total, poolTickets.length, closedTabStats, resolvedRaw.length, weeklyRedaction.total],
  )
  const { hasNew, wasConsulted } = useSeenTabCounts(activeView, tabTotals, {
    deferConsultFor: ['assigned', 'notes'],
  })

  useEffect(() => {
    applyWorkspaceSearchParams(searchParams, {
      setTab: setActiveView,
      setFocusTicketId,
    })
  }, [searchParams])

  useEffect(() => {
    setTakenChargeIds((prev) => {
      const next = new Set(prev)
      tickets.forEach((t) => {
        if (t.status === 'en_cours' || t.status === 'resolu' || t.status === 'non_resolu') {
          next.add(t.id)
        }
      })
      return next
    })
  }, [tickets])

  useEffect(() => {
    tickets.forEach((t) => {
      if (
        isAgentReopenedUnresolved(t) &&
        Number(t.assigned_technician_id) === Number(user?.id)
      ) {
        setNotesByTicket((prev) => {
          if (prev[t.id] !== undefined) return prev
          return { ...prev, [t.id]: buildReopenedTicketReportNote(t) }
        })
      }
    })
  }, [tickets, user?.id])

  const rejectedClosedIds = useMemo(
    () =>
      resolvedRaw
        .filter((t) => isAgentReportRejectedByChef(t) && Number(t.assigned_technician_id) === Number(user?.id))
        .map((t) => t.id),
    [resolvedRaw, user?.id],
  )

  useEffect(() => {
    const ids = [...rejectedClosedIds]
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
  }, [rejectedClosedIds.join(',')])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  const agentHeader = getAgentWorkspaceHeader(user)

  async function prendreEnChargeFromPool(ticketId) {
    await apiRequest(`/tickets/${ticketId}/claim`, { method: 'POST' })
    await apiRequest(`/tickets/${ticketId}/take-charge`, { method: 'POST' })
    setTakenChargeIds((s) => new Set(s).add(ticketId))
    setActiveView('assigned')
    showNotice('Ticket pris en charge.')
    await Promise.all([reload(), reloadPool(), poolStats.reload()])
  }

  async function takeCharge(ticketId) {
    await apiRequest(`/tickets/${ticketId}/take-charge`, { method: 'POST' })
    setTakenChargeIds((s) => new Set(s).add(ticketId))
    showNotice('Ticket pris en charge.')
    reload()
  }

  async function releaseTicket(ticketId) {
    await apiRequest(`/tickets/${ticketId}/release`, { method: 'POST' })
    setTakenChargeIds((prev) => {
      const next = new Set(prev)
      next.delete(ticketId)
      return next
    })
    setSelectedOutcomeByTicket((prev) => {
      const next = { ...prev }
      delete next[ticketId]
      return next
    })
    setNotesByTicket((prev) => {
      const next = { ...prev }
      delete next[ticketId]
      return next
    })
    showNotice('Ticket remis à la file du service.')
    await Promise.all([reload(), reloadPool(), poolStats.reload()])
  }

  async function acceptCoIntervention(ticketId) {
    setAcceptingCoId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/co-interventions/accept`, { method: 'POST' })
      showNotice('Co-intervention acceptée.')
      await Promise.all([reload(), reloadHistory()])
    } finally {
      setAcceptingCoId(null)
    }
  }

  async function resubmitClosedReport(ticketId) {
    const body = notesByTicket[ticketId]
    if (!body?.trim()) {
      showNotice('Le rapport ne peut pas être vide.')
      return
    }
    setResubmittingId(ticketId)
    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({ ticket_id: ticketId, body: body.trim() }),
      })
      showNotice('Rapport transmis au chef de service.')
      setNotesByTicket((prev) => {
        const next = { ...prev }
        delete next[ticketId]
        return next
      })
      await Promise.all([reload(), reloadHistory()])
    } finally {
      setResubmittingId(null)
    }
  }

  async function reopenTicket(ticketId) {
    setReopeningId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/reopen`, { method: 'POST' })
      setTakenChargeIds((s) => new Set(s).add(ticketId))
      setActiveView('assigned')
      showNotice('Ticket réouvert et repris en charge.')
      await Promise.all([reload(), reloadHistory()])
    } finally {
      setReopeningId(null)
    }
  }

  function selectOutcome(ticketId, outcome) {
    setSelectedOutcomeByTicket((state) => ({ ...state, [ticketId]: outcome }))
  }

  async function closeTicket(ticketId, forcedOutcome) {
    const outcome =
      forcedOutcome !== undefined ? forcedOutcome : selectedOutcomeByTicket[ticketId]
    if (outcome !== false && !outcome) {
      showNotice('Choisissez « Ticket résolu » ou « Ticket non résolu ».')
      return
    }
    await submitReport(ticketId, outcome)
  }

  async function submitReport(ticketId, outcome) {
    const body = notesByTicket[ticketId]
    if (!body?.trim()) {
      showNotice('Le rapport ne peut pas être vide.')
      return
    }

    await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId, body: body.trim() }),
    })
    if (outcome === 'resolved') {
      await apiRequest(`/tickets/${ticketId}/resolve`, { method: 'POST' })
    } else if (outcome === 'unresolved') {
      await apiRequest(`/tickets/${ticketId}/close-unresolved`, { method: 'POST' })
    }

    const isClosing = outcome === 'resolved' || outcome === 'unresolved'
    showNotice(
      outcome === 'resolved'
        ? 'Ticket clôturé comme résolu.'
        : outcome === 'unresolved'
          ? 'Ticket clôturé comme non résolu.'
          : 'Nouvelle version du rapport soumise.',
    )
    setSelectedOutcomeByTicket((state) => {
      const next = { ...state }
      delete next[ticketId]
      return next
    })
    if (isClosing) {
      setTakenChargeIds((prev) => {
        const next = new Set(prev)
        next.delete(ticketId)
        return next
      })
      setNotesByTicket((prev) => {
        const next = { ...prev }
        delete next[ticketId]
        return next
      })
      setActiveView('resolved')
      await Promise.all([reload(), reloadHistory()])
    } else {
      await Promise.all([reload(), reloadHistory()])
    }
  }

  const assignedList = useMemo(() => {
    let list = assignedFilters.filteredTickets
    if (assignmentFilter === 'assigned') {
      list = list.filter((t) => isAgentTicketChefAssigned(t))
    } else if (assignmentFilter === 'unassigned') {
      list = list.filter((t) => !isAgentTicketChefAssigned(t))
    }
    if (agentStatusFilter === 'assigne_technicien') {
      list = list.filter((t) => t.status === 'assigne_technicien')
    } else if (agentStatusFilter === 'chef_bureau') {
      list = list.filter((t) => isAgentChefBureauActiveTicket(t))
    } else if (agentStatusFilter === 'en_cours') {
      list = list.filter((t) => t.status === 'en_cours' && !isAgentReopenedUnresolved(t))
    } else if (agentStatusFilter === 'non_resolu') {
      list = list.filter((t) => isAgentReopenedUnresolved(t))
    }
    return sortTicketsWithPinned(list, pinnedIds)
  }, [assignedFilters.filteredTickets, assignmentFilter, agentStatusFilter, pinnedIds])

  const resolvedList = useMemo(() => {
    let list = resolvedFilters.filteredTickets
    if (closedOutcomeFilter === 'resolu') {
      list = list.filter((t) => t.status === 'resolu')
    } else if (closedOutcomeFilter === 'non_resolu') {
      list = list.filter((t) => t.status === 'non_resolu')
    }
    return sortTicketsWithPinned(list, pinnedIds)
  }, [resolvedFilters.filteredTickets, closedOutcomeFilter, pinnedIds])
  const poolList = poolFilters.filteredTickets

  const {
    items: paginatedAssigned,
    pagination: assignedPagination,
    setPage: setAssignedPage,
  } = useClientPagination(assignedList, 10)
  const {
    items: paginatedPool,
    pagination: poolPagination,
    setPage: setPoolPage,
  } = useClientPagination(poolList, 10)
  const {
    items: paginatedResolved,
    pagination: resolvedPagination,
    setPage: setResolvedPage,
  } = useClientPagination(resolvedList, 10)

  if (loading && historyLoading && poolLoading) {
    return <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
  }

  const loadError = error || poolError || historyError
  if (loadError) {
    return (
      <div className="space-y-3 p-4">
        <p className="rounded border border-error/40 bg-red-50/80 p-3 text-sm text-red-800">
          Impossible de charger les tickets : {loadError}
        </p>
        <RefreshButton
          onRefresh={async () => {
            await Promise.all([reload(), reloadPool()])
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}
      <header className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{agentHeader.titleLine}</h1>
            {agentHeader.serviceLine && (
              <p className="text-sm font-medium text-on-surface">{agentHeader.serviceLine}</p>
            )}
            {agentHeader.subDirectorateLine && (
              <p className="text-sm text-on-surface-variant">{agentHeader.subDirectorateLine}</p>
            )}
            <p className="mt-1 text-sm text-on-surface-variant">
              Tickets, rapports hebdomadaires et rapport mensuel.
            </p>
          </div>
          <RefreshButton
            onRefresh={async () => {
              await Promise.all([
                reload(),
                reloadPool(),
                poolStats.reload(),
                weeklyRedaction.reload(),
              ])
            }}
          />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <DashboardTabButton
          label="Mes tickets"
          icon={ClipboardList}
          count={tabTotals.assigned}
          priority={assignedTabStats.priority}
          variant="priority"
          hasNew={hasNew('assigned')}
          consulted={wasConsulted('assigned')}
          active={activeView === 'assigned'}
          onClick={() => setActiveView('assigned')}
        />
        <DashboardTabButton
          label="File du service"
          icon={Layers}
          count={tabTotals.pool}
          priority={poolStats.stats?.priority}
          variant="priority"
          hasNew={hasNew('pool')}
          consulted={wasConsulted('pool')}
          active={activeView === 'pool'}
          onClick={() => setActiveView('pool')}
        />
        <DashboardTabButton
          label="Tickets clôturés"
          icon={Archive}
          count={resolvedRaw.length}
          variant="closed"
          closed={closedTabStats}
          hasNew={hasNew('resolved')}
          consulted={wasConsulted('resolved')}
          active={activeView === 'resolved'}
          onClick={() => setActiveView('resolved')}
        />
        <DashboardTabButton
          label="Historique"
          icon={History}
          count={historyTickets.length}
          active={activeView === 'history'}
          onClick={() => setActiveView('history')}
        />
        <DashboardTabButton
          label="Note et document"
          icon={NotebookPen}
          count={weeklyRedaction.total}
          weeklyPending={weeklyRedaction.pendingWeeks}
          variant="weekly"
          hasNew={hasNew('notes')}
          consulted={wasConsulted('notes')}
          active={activeView === 'notes'}
          onClick={() => setActiveView('notes')}
        />
      </section>

      {activeView === 'pool' && (
        <div className="space-y-3">
          <TicketFiltersBar filters={poolFilters} />
          <ScrollablePanel className="space-y-3 bg-surface-lowest p-3">
          {poolList.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucun ticket disponible dans la file.</p>
          ) : (
            <>
            {paginatedPool.map((ticket) => (
              <article
                key={ticket.id}
                className="rounded border border-outline-variant bg-surface-low p-4 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{ticket.ticket_number}</p>
                    <TicketDetailLink ticket={ticket} className="text-sm" showPreview={false} hidePriority />
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {ticket.category_label} — {formatEmittedDate(ticket.created_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}
                  >
                    {formatPriorityLabel(ticket.priority)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => prendreEnChargeFromPool(ticket.id)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
                >
                  <Wrench size={16} /> Prendre en charge
                </button>
              </article>
            ))}
            <PaginationBar
              pagination={poolPagination}
              onPageChange={setPoolPage}
              itemLabel="tickets"
            />
            </>
          )}
          </ScrollablePanel>
        </div>
      )}

      {activeView === 'assigned' && (
        <div className="space-y-3">
          <AgentAssignedFiltersBar
            filters={assignedFilters}
            assignmentFilter={assignmentFilter}
            onAssignmentChange={setAssignmentFilter}
            statusFilter={agentStatusFilter}
            onStatusChange={setAgentStatusFilter}
            isChefBureau={isChefBureau}
          />
        <ScrollablePanel className="space-y-3 bg-transparent p-0">
          {assignedList.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Aucun ticket affecté.</p>
          ) : (
            <>
            {paginatedAssigned.map((ticket) => (
              <AgentTicketCard
                key={ticket.id}
                ticket={ticket}
                userId={user?.id}
                notesByTicket={notesByTicket}
                setNotesByTicket={setNotesByTicket}
                takenChargeIds={takenChargeIds}
                selectedOutcome={selectedOutcomeByTicket[ticket.id]}
                reportsByTicket={reportsByTicket}
                onTakeCharge={takeCharge}
                onSelectOutcome={selectOutcome}
                onCloseTicket={closeTicket}
                onRelease={releaseTicket}
                onInviteCoIntervention={setCoInviteTicketId}
                onAcceptCoIntervention={acceptCoIntervention}
                onTransfer={setTransferTicketId}
                isChefBureau={isChefBureau}
                acceptingCoId={acceptingCoId}
                isPinned={isPinned(ticket.id)}
                onTogglePin={togglePin}
              />
            ))}
            <PaginationBar
              pagination={assignedPagination}
              onPageChange={setAssignedPage}
              itemLabel="tickets"
            />
            </>
          )}
        </ScrollablePanel>
        </div>
      )}

      {activeView === 'resolved' && (
        <div className="space-y-3">
          <ClosedTicketsFiltersBar
            filters={resolvedFilters}
            outcomeFilter={closedOutcomeFilter}
            onOutcomeChange={setClosedOutcomeFilter}
          />
          <ScrollablePanel className="space-y-3 bg-surface-lowest p-3">
            {resolvedList.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Aucun ticket clôturé.</p>
            ) : (
              <>
                {paginatedResolved.map((ticket) => (
                  <ClosedTicketRow
                    key={ticket.id}
                    ticket={ticket}
                    userId={user?.id}
                    highlighted={focusTicketId != null && Number(focusTicketId) === Number(ticket.id)}
                    onReopen={reopenTicket}
                    reopeningId={reopeningId}
                    isPinned={isPinned(ticket.id)}
                    onTogglePin={() => togglePin(ticket.id)}
                    notesByTicket={notesByTicket}
                    setNotesByTicket={setNotesByTicket}
                    reportsByTicket={reportsByTicket}
                    onResubmitReport={resubmitClosedReport}
                    resubmittingId={resubmittingId}
                  />
                ))}
                <PaginationBar
                  pagination={resolvedPagination}
                  onPageChange={setResolvedPage}
                  itemLabel="tickets"
                />
              </>
            )}
          </ScrollablePanel>
        </div>
      )}

      {activeView === 'history' && (
        <HistoryTicketsPanel
          tickets={historyTickets}
          userId={user?.id}
          loading={historyLoading}
          serverPagination={historyPagination}
          onServerPageChange={setHistoryPage}
        />
      )}

      {activeView === 'notes' && (
        <div className="space-y-4">
          <WeeklyReportPanel onNotice={showNotice} onSaved={() => weeklyRedaction.reload()} />
          <MonthlyBundlePanel onNotice={showNotice} />
          <MonthlyRedactorInbox onNotice={showNotice} />
        </div>
      )}

      <CoInterventionInviteModal
        ticketId={coInviteTicketId}
        open={Boolean(coInviteTicketId)}
        onClose={() => setCoInviteTicketId(null)}
        onInvited={() => {
          showNotice('Co-intervenants invités.')
          reload()
        }}
      />

      <TicketTransferModal
        ticketId={transferTicketId}
        open={Boolean(transferTicketId)}
        onClose={() => setTransferTicketId(null)}
        onTransferred={() => {
          showNotice('Ticket transmis à l\'agent.')
          reload()
        }}
      />
    </div>
  )
}
