import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { DateFilterHeader, PriorityFilterHeader, ServiceFilterHeader, StatusFilterHeader } from '../components/TicketTableFilters'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { useTeamUsers } from '../hooks/useTeamUsers'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { useTickets } from '../hooks/useTickets'
import {
  formatEmittedDate,
  formatStatusLabel,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  truncateText,
  canReassignChef,
  canReassignSubDirector,
} from '../uiHelpers'

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
  showStatusFilter = false,
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
}) {
  const isChef = variant === 'chef'
  const assigneeLabel = isChef ? 'agent' : 'chef de service'
  const assignButtonLabel = isChef ? 'Assigner les tâches' : 'Transmettre le ticket'
  const columnTitle = mode === 'received' ? (isChef ? 'Affectation' : 'Transmission') : 'Suivi'
  if (tickets.length === 0) {
    return <p className="p-4 text-sm text-on-surface-variant">Aucun ticket dans cette liste.</p>
  }

  return (
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
              {showStatusFilter ? (
                <StatusFilterHeader value={statusFilter} onChange={setStatusFilter} />
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
          {tickets.map((ticket) => {
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
                  <p className="text-xs text-on-surface-variant">{truncateText(ticket.description, 60)}</p>
                </td>
                <td className="p-2">{ticket.category_label}</td>
                <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status)}`}>
                    {formatStatusLabel(ticket.status, ticket)}
                  </span>
                </td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-2">
                  {showAssignForm && (
                    <div className="space-y-2">
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
                            {member.prenom} {member.nom}
                            {member.service_label ? ` — ${member.service_label}` : ''}
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
          })}
        </tbody>
      </table>
    </ScrollablePanel>
  )
}

function ChefServiceView() {
  const { user } = useAuth()
  const { tickets, loading, reload } = useTickets('chef')
  const agents = useTeamUsers('TECHNICIEN', user?.sub_directorate_id, user?.service_id)
  const [activeView, setActiveView] = useState('received')
  const [selectedByTicket, setSelectedByTicket] = useState({})
  const [editingIds, setEditingIds] = useState(new Set())
  const [busyId, setBusyId] = useState(0)
  const [notice, setNotice] = useState('')
  const [pendingReports, setPendingReports] = useState([])
  const [reportModal, setReportModal] = useState(null)
  const [reportComment, setReportComment] = useState('')

  const activeTickets = useMemo(
    () => tickets.filter((t) => t.status !== 'archive'),
    [tickets],
  )

  const receivedTickets = useMemo(
    () => activeTickets.filter((t) => t.status === 'chez_chef_service'),
    [activeTickets],
  )

  const assignedTickets = useMemo(
    () => activeTickets.filter((t) => t.status !== 'chez_chef_service'),
    [activeTickets],
  )

  const receivedFilters = useTicketFilters(receivedTickets)
  const assignedFilters = useTicketFilters(assignedTickets, { enableStatus: true })

  const counts = useMemo(
    () => ({
      received: receivedTickets.length,
      assigned: assignedTickets.length,
      reports: pendingReports.length,
    }),
    [receivedTickets.length, assignedTickets.length, pendingReports.length],
  )

  async function loadPendingReports() {
    try {
      const data = await apiRequest('/reports?scope=chef_service')
      setPendingReports(data.reports || [])
    } catch {
      setPendingReports([])
    }
  }

  useEffect(() => {
    loadPendingReports()
  }, [tickets])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function assignToAgent(ticketId) {
    const agentId = selectedByTicket[ticketId]
    if (!agentId) return
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ technician_id: Number(agentId) }),
      })
      setEditingIds((s) => {
        const next = new Set(s)
        next.delete(ticketId)
        return next
      })
      showNotice('Ticket assigné à un agent.')
      reload()
      loadPendingReports()
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
    reload()
    loadPendingReports()
  }

  if (loading) return <p className="text-sm">Chargement...</p>

  return (
    <div className="space-y-4">
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Tableau de bord — Chef de service DANTIC</h2>
        <p className="text-sm text-on-surface-variant">{user?.service_label}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <DashboardButton
          label="Tickets reçus"
          count={counts.received}
          active={activeView === 'received'}
          onClick={() => setActiveView('received')}
        />
        <DashboardButton
          label="Tickets affectés"
          count={counts.assigned}
          active={activeView === 'assigned'}
          onClick={() => setActiveView('assigned')}
        />
        <DashboardButton
          label="Validation des rapports"
          count={counts.reports}
          active={activeView === 'reports'}
          onClick={() => setActiveView('reports')}
        />
      </section>

      {activeView === 'received' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Tickets reçus</h3>
            <p className="text-xs text-on-surface-variant">
              Transmis par la sous-direction — en attente d&apos;affectation à un agent
            </p>
          </div>
          <TicketTable
            tickets={receivedFilters.filteredTickets}
            mode="received"
            variant="chef"
            priorityFilter={receivedFilters.priorityFilter}
            setPriorityFilter={receivedFilters.setPriorityFilter}
            dateFilter={receivedFilters.dateFilter}
            setDateFilter={receivedFilters.setDateFilter}
            assignees={agents}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={assignToAgent}
            onOpenReport={openReportForTicket}
            busyId={busyId}
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
            showStatusFilter
            assignees={agents}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={assignToAgent}
            onOpenReport={openReportForTicket}
            busyId={busyId}
          />
        </section>
      )}

      {activeView === 'reports' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Validation des rapports</h3>
            <p className="text-xs text-on-surface-variant">
              Rapports soumis par les agents — à valider ou rejeter
            </p>
          </div>
          {pendingReports.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun rapport en attente de validation.</p>
          ) : (
            <div className="divide-y divide-outline-variant">
              {pendingReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-low"
                  onClick={() => {
                    setReportModal(report)
                    setReportComment('')
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{report.ticket_number}</p>
                    <p className="text-xs text-on-surface-variant">{truncateText(report.body, 100)}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {report.author_name} — {formatEmittedDate(report.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-xs ${getPriorityBadgeClass(report.priority)}`}>
                    {report.priority}
                  </span>
                </button>
              ))}
            </div>
          )}
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
  const { tickets, loading, reload } = useTickets('sub_directorate')
  const chefs = useTeamUsers('CHEF_SERVICE', user?.sub_directorate_id)
  const [activeView, setActiveView] = useState('received')
  const [selectedByTicket, setSelectedByTicket] = useState({})
  const [editingIds, setEditingIds] = useState(new Set())
  const [busyId, setBusyId] = useState(0)
  const [notice, setNotice] = useState('')
  const [pendingReports, setPendingReports] = useState([])
  const [reportModal, setReportModal] = useState(null)
  const [reportComment, setReportComment] = useState('')

  const activeTickets = useMemo(
    () => tickets.filter((t) => t.status !== 'archive'),
    [tickets],
  )

  const receivedTickets = useMemo(
    () => activeTickets.filter((t) => t.status === 'chez_sous_direction'),
    [activeTickets],
  )

  const assignedTickets = useMemo(
    () => activeTickets.filter((t) => t.status !== 'chez_sous_direction'),
    [activeTickets],
  )

  const receivedFilters = useTicketFilters(receivedTickets)
  const resolveChefServiceId = useMemo(
    () => (ticket) => chefs.find((c) => c.id === ticket.assigned_chef_id)?.service_id,
    [chefs],
  )
  const sdServices = useMemo(() => {
    const map = new Map()
    chefs.forEach((c) => {
      if (c.service_id && !map.has(c.service_id)) {
        map.set(c.service_id, { id: c.service_id, label: c.service_label || `Service ${c.service_id}` })
      }
    })
    return [...map.values()]
  }, [chefs])
  const assignedFilters = useTicketFilters(assignedTickets, {
    enableStatus: true,
    enableService: true,
    resolveServiceId: resolveChefServiceId,
  })

  const counts = useMemo(
    () => ({
      received: receivedTickets.length,
      assigned: assignedTickets.length,
      reports: pendingReports.length,
    }),
    [receivedTickets.length, assignedTickets.length, pendingReports.length],
  )

  async function loadPendingReports() {
    try {
      const data = await apiRequest('/reports?scope=sub_directorate')
      setPendingReports(data.reports || [])
    } catch {
      setPendingReports([])
    }
  }

  useEffect(() => {
    loadPendingReports()
  }, [tickets])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function forwardToChef(ticketId) {
    const chefId = selectedByTicket[ticketId]
    if (!chefId) return
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/forward-to-chef`, {
        method: 'POST',
        body: JSON.stringify({ chef_id: Number(chefId) }),
      })
      setEditingIds((s) => {
        const next = new Set(s)
        next.delete(ticketId)
        return next
      })
      showNotice('Ticket transmis au chef de service.')
      reload()
      loadPendingReports()
    } finally {
      setBusyId(0)
    }
  }

  async function openReportForTicket(ticket) {
    try {
      const data = await apiRequest(`/tickets/${ticket.id}/sub-directorate-report`)
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
        ? 'Rapport validé — envoyé à la Directrice.'
        : 'Rapport rejeté — renvoyé au chef de service.',
    )
    reload()
    loadPendingReports()
  }

  if (loading) return <p className="text-sm">Chargement...</p>

  return (
    <div className="space-y-4">
      {notice && (
        <div className="fixed right-4 top-4 z-40 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 shadow">
          {notice}
        </div>
      )}

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Tableau de bord — Sous-directeur DANTIC</h2>
        <p className="text-sm text-on-surface-variant">{user?.service_label}</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <DashboardButton
          label="Tickets reçus"
          count={counts.received}
          active={activeView === 'received'}
          onClick={() => setActiveView('received')}
        />
        <DashboardButton
          label="Tickets affectés"
          count={counts.assigned}
          active={activeView === 'assigned'}
          onClick={() => setActiveView('assigned')}
        />
        <DashboardButton
          label="Validation des rapports"
          count={counts.reports}
          active={activeView === 'reports'}
          onClick={() => setActiveView('reports')}
        />
      </section>

      {activeView === 'received' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Tickets reçus</h3>
            <p className="text-xs text-on-surface-variant">
              Transmis par la Directrice — en attente de transmission à un chef de service
            </p>
          </div>
          <TicketTable
            tickets={receivedFilters.filteredTickets}
            mode="received"
            priorityFilter={receivedFilters.priorityFilter}
            setPriorityFilter={receivedFilters.setPriorityFilter}
            dateFilter={receivedFilters.dateFilter}
            setDateFilter={receivedFilters.setDateFilter}
            assignees={chefs}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={forwardToChef}
            onOpenReport={openReportForTicket}
            busyId={busyId}
          />
        </section>
      )}

      {activeView === 'assigned' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Tickets affectés</h3>
            <p className="text-xs text-on-surface-variant">Dossiers dispatchés vers les chefs de service et équipes</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
              <ServiceFilterHeader
                value={assignedFilters.serviceFilter}
                onChange={assignedFilters.setServiceFilter}
                services={sdServices}
              />
            </div>
          </div>
          <TicketTable
            tickets={assignedFilters.filteredTickets}
            mode="assigned"
            priorityFilter={assignedFilters.priorityFilter}
            setPriorityFilter={assignedFilters.setPriorityFilter}
            dateFilter={assignedFilters.dateFilter}
            setDateFilter={assignedFilters.setDateFilter}
            statusFilter={assignedFilters.statusFilter}
            setStatusFilter={assignedFilters.setStatusFilter}
            showStatusFilter
            assignees={chefs}
            selectedByTicket={selectedByTicket}
            setSelectedByTicket={setSelectedByTicket}
            editingIds={editingIds}
            setEditingIds={setEditingIds}
            onAssign={forwardToChef}
            onOpenReport={openReportForTicket}
            busyId={busyId}
          />
        </section>
      )}

      {activeView === 'reports' && (
        <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          <div className="border-b border-outline-variant p-3">
            <h3 className="font-semibold">Validation des rapports</h3>
            <p className="text-xs text-on-surface-variant">
              Rapports techniques des tickets résolus — à valider ou rejeter
            </p>
          </div>
          {pendingReports.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun rapport en attente de validation.</p>
          ) : (
            <div className="divide-y divide-outline-variant">
              {pendingReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-low"
                  onClick={() => {
                    setReportModal(report)
                    setReportComment('')
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold">{report.ticket_number}</p>
                    <p className="text-xs text-on-surface-variant">{truncateText(report.body, 100)}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {report.author_name} — {formatEmittedDate(report.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded px-2 py-1 text-xs ${getPriorityBadgeClass(report.priority)}`}>
                    {report.priority}
                  </span>
                </button>
              ))}
            </div>
          )}
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

export function SubDirectionHub() {
  const { user } = useAuth()
  const isChef = user?.role_code === 'CHEF_SERVICE'

  if (isChef) {
    return <ChefServiceView />
  }

  return <SubDirecteurView />
}
