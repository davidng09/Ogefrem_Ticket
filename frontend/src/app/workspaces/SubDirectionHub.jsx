import { useEffect, useMemo, useState } from 'react'
import { Archive, ClipboardList, FileText, Inbox, LayoutGrid, AlertTriangle } from 'lucide-react'
import { ChefInterservicePanel } from '../components/ChefInterservicePanel'
import { ChefMonthlyBundleInbox } from '../components/ChefMonthlyBundleInbox'
import { DashboardTabButton } from '../components/DashboardTabButton'
import { RefreshButton } from '../components/RefreshButton'
import { ExecutiveDashboard } from '../components/ExecutiveDashboard'
import { Modal } from '../components/Modal'
import { OnlinePresenceBadge } from '../components/OnlinePresenceBadge'
import { OpenTicketsPanel } from '../components/OpenTicketsPanel'
import { PendingReportsPanel } from '../components/PendingReportsPanel'
import { PaginatedReportsPanel } from '../components/PaginatedReportsPanel'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { TicketDetailLink } from '../components/TicketDetailLink'
import { DateFilterHeader, PriorityFilterHeader, ServiceFilterHeader, ChefAssignedStatusFilterHeader } from '../components/TicketTableFilters'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { usePresence } from '../hooks/usePresence'
import { useTeamUsers } from '../hooks/useTeamUsers'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { usePaginatedTickets } from '../hooks/useTickets'
import { useReportTabStats, useTicketTabStats } from '../hooks/useTabStats'
import { useSeenTabCounts } from '../hooks/useSeenTabCounts'
import { PaginationBar } from '../components/PaginationBar'
import { UnresolvedConstraintsPanel } from '../components/UnresolvedConstraintsPanel'
import {
  formatEmittedDate,
  formatPriorityLabel,
  formatServiceLabel,
  formatStatusLabel,
  getChefServiceWorkspaceHeader,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  canReassignChef,
  canReassignSubDirector,
} from '../uiHelpers'
import { useSearchParams } from 'react-router-dom'
import { applyWorkspaceSearchParams } from '../workspaceNavigation'

function TicketTable({
  tickets,
  mode,
  variant = 'sd',
  priorityFilter,
  setPriorityFilter,
  dateFilter,
  setDateFilter,
  statusFilter,
  setStatusFilter,
  serviceFilter,
  setServiceFilter,
  chefAssignedStatusFilter = false,
  showServiceFilter = false,
  services = [],
  assignees,
  selectedByTicket,
  setSelectedByTicket,
  editingIds,
  setEditingIds,
  onAssign,
  onOpenReport,
  busyId,
  assignFormState,
  setAssignFormState,
  pagination,
  onPageChange,
  itemLabel = 'tickets',
}) {
  const isChef = variant === 'chef'
  const assigneeLabel = isChef ? 'agent' : 'chef de service'
  const assignButtonLabel = isChef ? 'Assigner les tâches' : 'Transmettre le ticket'
  const columnTitle = mode === 'received' ? (isChef ? 'Affectation' : 'Transmission') : 'Suivi'

  return (
    <>
    <ScrollablePanel className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="p-2">Ticket</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">
              <DateFilterHeader value={dateFilter} onChange={setDateFilter} />
            </th>
            <th className="p-2">
              {chefAssignedStatusFilter ? (
                <ChefAssignedStatusFilterHeader value={statusFilter} onChange={setStatusFilter} />
              ) : (
                'Statut'
              )}
            </th>
            <th className="p-2">
              <PriorityFilterHeader value={priorityFilter} onChange={setPriorityFilter} />
            </th>
            <th className="p-2">{columnTitle}</th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-4 text-sm text-on-surface-variant">
                Aucun résultat pour ce filtre.
              </td>
            </tr>
          ) : (
          tickets.map((ticket) => {
            const isEditing = editingIds.has(ticket.id)
            const hasAssignee = isChef
              ? Boolean(ticket.assigned_technician_id && ticket.assigned_tech_name)
              : Boolean(ticket.assigned_chef_id && ticket.assigned_chef_name)
            const assigneeName = isChef ? ticket.assigned_tech_name : ticket.assigned_chef_name
            const defaultAssigneeId = isChef ? ticket.assigned_technician_id : ticket.assigned_chef_id
            const showAssignForm = mode === 'received' || (mode === 'assigned' && isEditing)
            const hasPendingReport = isChef ? ticket.has_report_for_chef : ticket.has_report_for_sd
            const canReassign = isChef ? canReassignChef(ticket) : canReassignSubDirector(ticket)

            return (
              <tr key={ticket.id} className="border-t border-outline-variant align-top">
                <td className="p-2">
                  <p className="font-semibold">{ticket.ticket_number}</p>
                  <TicketDetailLink ticket={ticket} className="text-xs" />
                </td>
                <td className="p-2">{ticket.category_label}</td>
                <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status, ticket)}`}>
                    {formatStatusLabel(ticket.status, ticket)}
                  </span>
                </td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>
                    {formatPriorityLabel(ticket.priority)}
                  </span>
                </td>
                <td className="p-2">
                  {showAssignForm && (
                    <div className="space-y-2">
                      {isChef && assignFormState && setAssignFormState && (
                        <>
                          <select
                            className="w-full rounded border border-outline-variant p-1 text-xs"
                            value={assignFormState[ticket.id]?.priority || ticket.priority || 'normale'}
                            onChange={(e) =>
                              setAssignFormState((s) => ({
                                ...s,
                                [ticket.id]: { ...s[ticket.id], priority: e.target.value },
                              }))
                            }
                          >
                            <option value="normale">Normale</option>
                            <option value="elevee">Élevée</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <input
                            type="datetime-local"
                            className="w-full rounded border border-outline-variant p-1 text-xs"
                            value={assignFormState[ticket.id]?.sla_due_at || ''}
                            onChange={(e) =>
                              setAssignFormState((s) => ({
                                ...s,
                                [ticket.id]: { ...s[ticket.id], sla_due_at: e.target.value },
                              }))
                            }
                          />
                        </>
                      )}
                      <select
                        className="w-full rounded border border-outline-variant p-1 text-xs"
                        value={selectedByTicket[ticket.id] || (mode === 'assigned' ? defaultAssigneeId : '') || ''}
                        onChange={(e) =>
                          setSelectedByTicket((s) => ({ ...s, [ticket.id]: e.target.value }))
                        }
                      >
                        <option value="">Choisir un {assigneeLabel}</option>
                        {assignees.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.online ? '● ' : ''}
                            {member.prenom} {member.nom}
                            {member.service_label ? ` — ${formatServiceLabel(member.service_label)}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busyId === ticket.id || !selectedByTicket[ticket.id]}
                        onClick={() => onAssign(ticket.id)}
                        className={`rounded bg-primary px-2 py-1 text-xs font-semibold text-on-primary disabled:opacity-50 ${mode === 'received' ? 'w-full' : ''}`}
                      >
                        {assignButtonLabel}
                      </button>
                    </div>
                  )}
                  {mode === 'assigned' && !showAssignForm && hasAssignee && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs">
                        <span className="font-semibold">{isChef ? 'Agent' : 'Chef'} :</span> {assigneeName}
                      </span>
                      {canReassign && (
                        <button
                          type="button"
                          className="rounded border border-outline-variant px-2 py-1 text-xs"
                          onClick={() => setEditingIds((s) => new Set(s).add(ticket.id))}
                        >
                          Modifier
                        </button>
                      )}
                    </div>
                  )}
                  {mode === 'assigned' &&
                    ticket.status === 'resolu' &&
                    hasPendingReport && (
                      <button
                        type="button"
                        className="mt-2 block rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800"
                        onClick={() => onOpenReport(ticket)}
                      >
                        Voir le rapport
                      </button>
                    )}
                </td>
              </tr>
            )
          })
          )}
        </tbody>
      </table>
    </ScrollablePanel>
    {pagination && onPageChange && (
      <PaginationBar pagination={pagination} onPageChange={onPageChange} itemLabel={itemLabel} />
    )}
    </>
  )
}

function ChefServiceView() {
  const { user } = useAuth()
  const chefHeader = getChefServiceWorkspaceHeader(user)
  const poolData = usePaginatedTickets('pool', null, 10)
  const assignedData = usePaginatedTickets('assigned', null, 10)
  const { subordinates } = usePresence({ enabled: true, trackSubordinates: true })
  const agents = useTeamUsers('TECHNICIEN', user?.sub_directorate_id, user?.service_id)
  const [activeView, setActiveView] = useState('interservice')
  const [selectedByTicket, setSelectedByTicket] = useState({})
  const [assignFormState, setAssignFormState] = useState({})
  const [editingIds, setEditingIds] = useState(new Set())
  const [busyId, setBusyId] = useState(0)
  const [notice, setNotice] = useState('')
  const [pendingReportCount, setPendingReportCount] = useState(0)
  const [reportModal, setReportModal] = useState(null)
  const [reportComment, setReportComment] = useState('')
  const [monthlyBundleCount, setMonthlyBundleCount] = useState(0)
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0)
  const [interserviceCount, setInterserviceCount] = useState(0)

  const interserviceStats = useTicketTabStats('interservice_pool', null)
  const poolStats = useTicketTabStats('pool', null)
  const assignedStats = useTicketTabStats('assigned', null)
  const reportStats = useReportTabStats('chef_service')

  const poolFilters = useTicketFilters(poolData.tickets)
  const assignedFilters = useTicketFilters(assignedData.tickets, { enableStatus: true })

  const counts = useMemo(
    () => ({
      interservice: interserviceStats.stats?.total ?? interserviceCount,
      pool: poolStats.stats?.total ?? poolData.pagination?.total ?? poolData.tickets.length,
      assigned: assignedStats.stats?.total ?? assignedData.pagination?.total ?? assignedData.tickets.length,
      reports: reportStats.stats?.total ?? pendingReportCount,
      monthlyReceived: monthlyBundleCount,
    }),
    [
      interserviceStats.stats?.total,
      interserviceCount,
      poolStats.stats?.total,
      poolData.pagination?.total,
      poolData.tickets.length,
      assignedStats.stats?.total,
      assignedData.pagination?.total,
      assignedData.tickets.length,
      reportStats.stats?.total,
      pendingReportCount,
      monthlyBundleCount,
    ],
  )

  const tabTotals = useMemo(
    () => ({
      interservice: counts.interservice,
      pool: counts.pool,
      assigned: counts.assigned,
      reports: counts.reports + counts.monthlyReceived,
    }),
    [counts],
  )
  const { hasNew, wasConsulted } = useSeenTabCounts(activeView, tabTotals)

  function refreshAll() {
    poolData.reload()
    assignedData.reload()
    interserviceStats.reload()
    poolStats.reload()
    assignedStats.reload()
    reportStats.reload()
  }

  async function loadMonthlyBundleCount() {
    try {
      const bundlesData = await apiRequest('/periodic/monthly-bundle/inbox')
      setMonthlyBundleCount((bundlesData.bundles || []).length)
    } catch {
      setMonthlyBundleCount(0)
    }
  }

  useEffect(() => {
    loadMonthlyBundleCount()
  }, [])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function assignToAgent(ticketId) {
    const agentId = selectedByTicket[ticketId]
    if (!agentId) return
    const form = assignFormState[ticketId] || {}
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          technician_id: Number(agentId),
          priority: form.priority || 'normale',
          sla_due_at: form.sla_due_at || null,
        }),
      })
      setEditingIds((s) => {
        const next = new Set(s)
        next.delete(ticketId)
        return next
      })
      showNotice('Ticket assigné à un agent.')
      refreshAll()
      loadMonthlyBundleCount()
    } finally {
      setBusyId(0)
    }
  }

  async function openReportForTicket(ticket) {
    try {
      const data = await apiRequest(`/tickets/${ticket.id}/chef-report`)
      if (data.report) {
        setReportModal(data.report)
        setReportComment('')
      } else {
        showNotice('Aucun rapport en attente pour ce ticket.')
      }
    } catch {
      showNotice('Impossible de charger le rapport.')
    }
  }

  async function validateReport(reportId, decision) {
    if (decision === 'rejete' && !reportComment.trim()) {
      showNotice('Un commentaire est requis pour rejeter le rapport.')
      return
    }
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: reportComment.trim() || null }),
    })
    setReportModal(null)
    setReportComment('')
    showNotice(
      decision === 'approuve'
        ? 'Rapport validé — envoyé à la sous-direction.'
        : 'Rapport rejeté — renvoyé à l\'agent.',
    )
    refreshAll()
    setReportsRefreshKey((k) => k + 1)
  }

  const loading = poolData.loading && assignedData.loading

  if (loading) return <p className="text-sm">Chargement...</p>

  return (
    <div className="space-y-4">
      <OnlinePresenceBadge onlineCount={subordinates.online_count} />
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{chefHeader.serviceLine}</h2>
            {chefHeader.subDirectorateLine ? (
              <p className="text-sm text-on-surface-variant">{chefHeader.subDirectorateLine}</p>
            ) : null}
          </div>
          <RefreshButton
            onRefresh={async () => {
              refreshAll()
              await loadMonthlyBundleCount()
            }}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <DashboardTabButton
          label="TOUS LES TICKETS"
          icon={LayoutGrid}
          count={counts.interservice}
          categories={interserviceStats.stats?.by_category}
          variant="categories"
          hasNew={hasNew('interservice')}
          consulted={wasConsulted('interservice')}
          active={activeView === 'interservice'}
          onClick={() => setActiveView('interservice')}
        />
        <DashboardTabButton
          label="File du service"
          icon={Inbox}
          count={counts.pool}
          priority={poolStats.stats?.priority}
          variant="priority"
          hasNew={hasNew('pool')}
          consulted={wasConsulted('pool')}
          active={activeView === 'pool'}
          onClick={() => setActiveView('pool')}
        />
        <DashboardTabButton
          label="Tickets affectés"
          icon={ClipboardList}
          count={counts.assigned}
          priority={assignedStats.stats?.priority}
          variant="priority"
          hasNew={hasNew('assigned')}
          consulted={wasConsulted('assigned')}
          active={activeView === 'assigned'}
          onClick={() => setActiveView('assigned')}
        />
        <DashboardTabButton
          label="Validation des rapports"
          icon={FileText}
          count={counts.reports + counts.monthlyReceived}
          reports={reportStats.stats?.reports}
          variant="reports"
          hasNew={hasNew('reports')}
          consulted={wasConsulted('reports')}
          active={activeView === 'reports'}
          onClick={() => setActiveView('reports')}
        />
      </section>

      {activeView === 'interservice' && (
        <ChefInterservicePanel
          onNotice={showNotice}
          onChanged={refreshAll}
          onTotalChange={setInterserviceCount}
        />
      )}

      {activeView === 'pool' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">File du service</h3>
            <p className="text-xs text-on-surface-variant">
              Tickets pris en charge et vus par les membres du service — affectez un agent (● connecté)
              ou laissez-les prendre en main depuis leur espace
            </p>
          </div>
          <TicketTable
            tickets={poolFilters.filteredTickets}
            mode="received"
            variant="chef"
            priorityFilter={poolFilters.priorityFilter}
            setPriorityFilter={poolFilters.setPriorityFilter}
            dateFilter={poolFilters.dateFilter}
            setDateFilter={poolFilters.setDateFilter}
            assignees={agents}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={assignToAgent}
            onOpenReport={openReportForTicket}
            busyId={busyId}
            assignFormState={assignFormState}
            setAssignFormState={setAssignFormState}
            pagination={poolData.pagination}
            onPageChange={poolData.setPage}
          />
        </section>
      )}

      {activeView === 'assigned' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Tickets affectés</h3>
            <p className="text-xs text-on-surface-variant">Suivi des dossiers chez les agents</p>
          </div>
          <TicketTable
            tickets={assignedFilters.filteredTickets}
            mode="assigned"
            variant="chef"
            priorityFilter={assignedFilters.priorityFilter}
            setPriorityFilter={assignedFilters.setPriorityFilter}
            dateFilter={assignedFilters.dateFilter}
            setDateFilter={assignedFilters.setDateFilter}
            statusFilter={assignedFilters.statusFilter}
            setStatusFilter={assignedFilters.setStatusFilter}
            chefAssignedStatusFilter
            assignees={agents}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={assignToAgent}
            onOpenReport={openReportForTicket}
            busyId={busyId}
            pagination={assignedData.pagination}
            onPageChange={assignedData.setPage}
          />
        </section>
      )}

      {activeView === 'reports' && (
        <section className="space-y-4">
          <div>
            <div className="mb-3">
              <h3 className="font-semibold">Validation des rapports ticket</h3>
              <p className="text-xs text-on-surface-variant">
                Rapports soumis par les agents — à valider ou rejeter
              </p>
            </div>
            <PendingReportsPanel
              key={reportsRefreshKey}
              scope="chef_service"
              onSelectReport={(report) => {
                setReportModal(report)
                setReportComment('')
              }}
              onTotalChange={setPendingReportCount}
              emptyMessage="Aucun rapport en attente de validation."
            />
          </div>

          <div className="rounded border border-outline-variant bg-surface-lowest p-3 shadow-sm">
            <h3 className="mb-1 font-semibold">Rapports mensuels reçus</h3>
            <p className="mb-3 text-xs text-on-surface-variant">
              Synthèses hebdomadaires envoyées par les agents (ou chefs de bureau) — pas de dépôt
              directrice depuis cet écran.
            </p>
            <ChefMonthlyBundleInbox />
          </div>
        </section>
      )}

      <Modal
        open={Boolean(reportModal)}
        onClose={() => setReportModal(null)}
        title={reportModal ? `Rapport — ${reportModal.ticket_number}` : 'Rapport'}
        wide
      >
        {reportModal && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-on-surface-variant">
              Auteur : {reportModal.author_name} — Ticket {reportModal.ticket_number}
            </p>
            <p className="rounded border border-outline-variant bg-surface-low p-3 whitespace-pre-wrap">
              {reportModal.body}
            </p>
            <textarea
              className="w-full rounded border border-outline-variant p-2 text-sm"
              rows={3}
              placeholder="Commentaire (obligatoire en cas de rejet)"
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-primary px-3 py-2 text-xs text-on-primary"
                onClick={() => validateReport(reportModal.id, 'approuve')}
              >
                Valider le rapport
              </button>
              <button
                type="button"
                className="rounded border border-error px-3 py-2 text-xs text-error"
                onClick={() => validateReport(reportModal.id, 'rejete')}
              >
                Rejeter le rapport
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function SubDirecteurView() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [activeView, setActiveView] = useState('dashboard')
  const [focusTicketId, setFocusTicketId] = useState(null)
  const [notice, setNotice] = useState('')
  const [reportModal, setReportModal] = useState(null)
  const [reportComment, setReportComment] = useState('')
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0)
  const [dashboardRefreshToken, setDashboardRefreshToken] = useState(0)
  const [openPanelRefreshToken, setOpenPanelRefreshToken] = useState(0)

  const openStats = useTicketTabStats(null, 'open')
  const reportStats = useReportTabStats('sub_directorate')

  const tabTotals = useMemo(
    () => ({
      dashboard: 0,
      open: openStats.stats?.total ?? 0,
      reports: reportStats.stats?.total ?? 0,
    }),
    [openStats.stats?.total, reportStats.stats?.total],
  )
  const { hasNew, wasConsulted } = useSeenTabCounts(activeView, tabTotals)

  useEffect(() => {
    applyWorkspaceSearchParams(searchParams, {
      setTab: setActiveView,
      setFocusTicketId,
    })
  }, [searchParams])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function validateReport(reportId, decision) {
    if (decision === 'rejete' && !reportComment.trim()) {
      showNotice('Un commentaire est requis pour rejeter le rapport.')
      return
    }
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: reportComment.trim() || null }),
    })
    setReportModal(null)
    setReportComment('')
    showNotice(
      decision === 'approuve'
        ? 'Rapport validé — envoyé à la Directrice.'
        : 'Rapport rejeté — renvoyé au chef de service.',
    )
    setReportsRefreshKey((k) => k + 1)
    reportStats.reload()
    openStats.reload()
  }

  async function refreshWorkspace() {
    await Promise.all([openStats.reload(), reportStats.reload()])
    setDashboardRefreshToken((t) => t + 1)
    setOpenPanelRefreshToken((t) => t + 1)
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Pilotage — Sous-directeur DANTIC</h2>
            <p className="text-sm text-on-surface-variant">{formatServiceLabel(user?.service_label)}</p>
          </div>
          <RefreshButton onRefresh={refreshWorkspace} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <DashboardTabButton
          label="Tableau de bord"
          count={0}
          active={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
        />
        <DashboardTabButton
          label="Tickets ouverts"
          count={tabTotals.open}
          hasNew={hasNew('open')}
          active={activeView === 'open'}
          onClick={() => setActiveView('open')}
        />
        <DashboardTabButton
          label="Validation des rapports"
          count={tabTotals.reports}
          reports={reportStats.stats?.reports}
          variant="reports"
          hasNew={hasNew('reports')}
          consulted={wasConsulted('reports')}
          active={activeView === 'reports'}
          onClick={() => setActiveView('reports')}
        />
        <DashboardTabButton
          label="Archives directrice"
          icon={Archive}
          count={0}
          active={activeView === 'archives'}
          onClick={() => setActiveView('archives')}
        />
        <DashboardTabButton
          label="Contraintes"
          icon={AlertTriangle}
          count={0}
          active={activeView === 'constraints'}
          onClick={() => setActiveView('constraints')}
        />
      </section>

      {activeView === 'dashboard' && (
        <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <ExecutiveDashboard
            showSubDirectorateFilter={false}
            showRefreshButton={false}
            onNavigateToOpenTickets={() => setActiveView('open')}
            refreshToken={dashboardRefreshToken}
          />
        </section>
      )}

      {activeView === 'open' && (
        <OpenTicketsPanel
          itemLabel="incidents"
          showRefreshButton={false}
          refreshToken={openPanelRefreshToken}
        />
      )}

      {activeView === 'reports' && (
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Validation des rapports</h3>
            <p className="text-xs text-on-surface-variant">
              Rapports techniques des tickets résolus — à valider ou rejeter
            </p>
          </div>
          <PendingReportsPanel
            key={reportsRefreshKey}
            scope="sub_directorate"
            onSelectReport={(report) => {
              setReportModal(report)
              setReportComment('')
            }}
            emptyMessage="Aucun rapport en attente de validation."
          />
        </section>
      )}

      {activeView === 'archives' && (
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold">Tickets archivés par la directrice</h3>
            <p className="text-xs text-on-surface-variant">
              Rapports ticket validés définitivement — votre sous-direction uniquement
            </p>
          </div>
          <PaginatedReportsPanel
            endpoint="/reports/validated"
            emptyMessage="Aucun ticket archivé par la directrice pour votre sous-direction."
            variant="table"
          />
        </section>
      )}

      {activeView === 'constraints' && (
        <UnresolvedConstraintsPanel focusTicketId={focusTicketId} />
      )}

      <Modal
        open={Boolean(reportModal)}
        onClose={() => setReportModal(null)}
        title={reportModal ? `Rapport — ${reportModal.ticket_number}` : 'Rapport'}
        wide
      >
        {reportModal && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-on-surface-variant">
              Auteur : {reportModal.author_name} — Ticket {reportModal.ticket_number}
            </p>
            <p className="rounded border border-outline-variant bg-surface-low p-3 whitespace-pre-wrap">
              {reportModal.body}
            </p>
            <textarea
              className="w-full rounded border border-outline-variant p-2 text-sm"
              rows={3}
              placeholder="Commentaire (obligatoire en cas de rejet)"
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded bg-primary px-3 py-2 text-xs text-on-primary"
                onClick={() => validateReport(reportModal.id, 'approuve')}
              >
                Valider le rapport
              </button>
              <button
                type="button"
                className="rounded border border-error px-3 py-2 text-xs text-error"
                onClick={() => validateReport(reportModal.id, 'rejete')}
              >
                Rejeter le rapport
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function SubDirectionHub() {
  const { user } = useAuth()
  const isChef = user?.role_code === 'CHEF_SERVICE'

  if (isChef) {
    return <ChefServiceView />
  }

  return <SubDirecteurView />
}
