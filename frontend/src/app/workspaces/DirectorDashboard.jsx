import { Archive, CalendarDays, FileText, Inbox, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DirectorMonthlyReports } from '../components/DirectorMonthlyReports'
import { Modal } from '../components/Modal'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { DateFilterHeader, PriorityFilterHeader } from '../components/TicketTableFilters'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { useTickets } from '../hooks/useTickets'
import { apiRequest } from '../api'
import {
  canReassignDirector,
  formatEmittedDate,
  formatStatusLabel,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  subDirectorates,
  truncateText,
} from '../uiHelpers'

function TicketDetailModal({ ticket, open, onClose }) {
  if (!ticket) return null
  return (
    <Modal open={open} onClose={onClose} title={`Détail du ticket ${ticket.ticket_number}`} wide>
      <div className="space-y-3 text-sm">
        <p><span className="font-semibold">Description :</span> {ticket.description}</p>
        <p><span className="font-semibold">Nom :</span> {ticket.reporter_full_name}</p>
        <p><span className="font-semibold">Matricule :</span> {ticket.reporter_matricule}</p>
        <p><span className="font-semibold">Direction :</span> {ticket.reporter_direction}</p>
        <p><span className="font-semibold">Service :</span> {ticket.reporter_service}</p>
        <p><span className="font-semibold">Bureau :</span> {ticket.reporter_office}</p>
        <p><span className="font-semibold">Catégorie :</span> {ticket.category_label}</p>
        <p><span className="font-semibold">Date émise :</span> {formatEmittedDate(ticket.created_at)}</p>
        <p><span className="font-semibold">Priorité :</span> {ticket.priority}</p>
        {ticket.sla_due_at && <p><span className="font-semibold">Échéance :</span> {formatEmittedDate(ticket.sla_due_at)}</p>}
      </div>
    </Modal>
  )
}

function ReportDetailModal({ report, open, onClose, onValidate, onReject, comment, setComment }) {
  if (!report) return null
  return (
    <Modal open={open} onClose={onClose} title={`Rapport — ${report.ticket_number}`} wide>
      <div className="space-y-3 text-sm">
        <p className="text-xs text-on-surface-variant">Ticket : {report.ticket_number} — {report.category_label}</p>
        <p className="text-xs text-on-surface-variant">Auteur : {report.author_name}</p>
        <p className="rounded border border-outline-variant bg-surface-low p-3 whitespace-pre-wrap">{report.body}</p>
        <textarea
          placeholder="Commentaire (rejet ou validation)"
          className="w-full rounded border border-outline-variant p-2 text-sm"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="button" className="rounded bg-primary px-3 py-2 text-xs text-on-primary" onClick={() => onValidate(report.id)}>
            Valider le rapport
          </button>
          <button type="button" className="rounded border border-error px-3 py-2 text-xs text-error" onClick={() => onReject(report.id)}>
            Rejeter le rapport
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TicketTable({
  tickets,
  mode,
  priorityFilter,
  setPriorityFilter,
  dateFilter,
  setDateFilter,
  onOpenDetail,
  onAssign,
  onOpenReport,
  formState,
  setFormState,
  editingIds,
  setEditingIds,
  busyId,
}) {
  if (tickets.length === 0) {
    return <p className="p-4 text-sm text-on-surface-variant">Aucun ticket dans cette liste.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
          <tr>
            <th className="p-2">Ticket</th>
            <th className="p-2">Catégorie</th>
            <th className="p-2">
              <DateFilterHeader value={dateFilter} onChange={setDateFilter} />
            </th>
            <th className="p-2">Statut</th>
            <th className="p-2">
              <PriorityFilterHeader value={priorityFilter} onChange={setPriorityFilter} />
            </th>
            {mode === 'received' && <th className="p-2">Affectation</th>}
            {mode === 'sent' && <th className="p-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => {
            const isEditing = editingIds.has(ticket.id)
            const isAssigned = Boolean(ticket.director_assigned_at || ticket.sub_directorate_id)
            const showForm = mode === 'received' || (mode === 'sent' && isEditing && ticket.status === 'chez_sous_direction')
            const form = formState[ticket.id] || {
              priority: ticket.priority,
              sla_due_at: ticket.sla_due_at ? ticket.sla_due_at.slice(0, 16) : '',
              sub_directorate_id: ticket.sub_directorate_id || '',
            }

            return (
              <tr key={ticket.id} className="border-t border-outline-variant align-top">
                <td className="p-2">
                  <p className="font-semibold">{ticket.ticket_number}</p>
                  <p className="text-xs text-on-surface-variant">{truncateText(ticket.description, 60)}</p>
                  <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => onOpenDetail(ticket)}>
                    Détail du ticket
                  </button>
                </td>
                <td className="p-2">{ticket.category_label}</td>
                <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                <td className="p-2">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(ticket.status)}`}>
                    {formatStatusLabel(ticket.status, ticket)}
                  </span>
                </td>
                <td className="p-2">
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </td>
                {mode === 'received' && (
                  <td className="p-2">
                    {!showForm && isAssigned ? (
                      <button
                        type="button"
                        className="rounded border border-outline-variant px-2 py-1 text-xs"
                        onClick={() => setEditingIds((s) => new Set(s).add(ticket.id))}
                      >
                        Modifier
                      </button>
                    ) : (
                      <div className="space-y-2 min-w-[200px]">
                        <select
                          className="w-full rounded border border-outline-variant p-1 text-xs"
                          value={form.priority}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              [ticket.id]: { ...form, priority: e.target.value },
                            }))
                          }
                        >
                          <option value="normale">Normale</option>
                          <option value="haute">Haute</option>
                          <option value="bloquant">Bloquant</option>
                        </select>
                        <input
                          type="datetime-local"
                          className="w-full rounded border border-outline-variant p-1 text-xs"
                          value={form.sla_due_at}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              [ticket.id]: { ...form, sla_due_at: e.target.value },
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-1">
                          {subDirectorates.map((sd) => (
                            <button
                              key={sd.id}
                              type="button"
                              onClick={() =>
                                setFormState((s) => ({
                                  ...s,
                                  [ticket.id]: { ...form, sub_directorate_id: sd.id },
                                }))
                              }
                              className={`rounded border px-2 py-1 text-xs transition ${
                                Number(form.sub_directorate_id) === sd.id
                                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                                  : 'border-outline-variant hover:bg-surface-low'
                              }`}
                            >
                              {sd.short}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={busyId === ticket.id || !form.sub_directorate_id}
                          onClick={() => onAssign(ticket.id, form)}
                          className="w-full rounded bg-primary px-2 py-1 text-xs font-semibold text-on-primary disabled:opacity-50"
                        >
                          Valider
                        </button>
                      </div>
                    )}
                  </td>
                )}
                {mode === 'sent' && (
                  <td className="p-2 space-y-1">
                    {canReassignDirector(ticket) && !isEditing && (
                      <button
                        type="button"
                        className="block rounded border border-outline-variant px-2 py-1 text-xs"
                        onClick={() => setEditingIds((s) => new Set(s).add(ticket.id))}
                      >
                        Modifier
                      </button>
                    )}
                    {isEditing && ticket.status === 'chez_sous_direction' && (
                      <div className="space-y-2">
                        <select
                          className="w-full rounded border border-outline-variant p-1 text-xs"
                          value={form.priority}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              [ticket.id]: { ...form, priority: e.target.value },
                            }))
                          }
                        >
                          <option value="normale">Normale</option>
                          <option value="haute">Haute</option>
                          <option value="bloquant">Bloquant</option>
                        </select>
                        <input
                          type="datetime-local"
                          className="w-full rounded border border-outline-variant p-1 text-xs"
                          value={form.sla_due_at}
                          onChange={(e) =>
                            setFormState((s) => ({
                              ...s,
                              [ticket.id]: { ...form, sla_due_at: e.target.value },
                            }))
                          }
                        />
                        <div className="flex flex-wrap gap-1">
                          {subDirectorates.map((sd) => (
                            <button
                              key={sd.id}
                              type="button"
                              onClick={() =>
                                setFormState((s) => ({
                                  ...s,
                                  [ticket.id]: { ...form, sub_directorate_id: sd.id },
                                }))
                              }
                              className={`rounded border px-2 py-1 text-xs ${
                                Number(form.sub_directorate_id) === sd.id
                                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                                  : 'border-outline-variant'
                              }`}
                            >
                              {sd.short}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={busyId === ticket.id}
                          onClick={() => onAssign(ticket.id, form)}
                          className="rounded bg-primary px-2 py-1 text-xs text-on-primary"
                        >
                          Valider
                        </button>
                      </div>
                    )}
                    {ticket.has_report_for_director && (
                      <button
                        type="button"
                        className="badge-report block rounded border px-2 py-1 text-xs"
                        onClick={() => onOpenReport(ticket)}
                      >
                        Voir rapport
                      </button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DirectorDashboard() {
  const { tickets, loading, reload } = useTickets()
  const [busyId, setBusyId] = useState(0)
  const [notice, setNotice] = useState('')
  const [detailTicket, setDetailTicket] = useState(null)
  const [reportModal, setReportModal] = useState(null)
  const [pendingReports, setPendingReports] = useState([])
  const [validatedReports, setValidatedReports] = useState([])
  const [comment, setComment] = useState('')
  const [formState, setFormState] = useState({})
  const [editingIds, setEditingIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('received')
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [seenCounts, setSeenCounts] = useState({})

  const receivedRaw = useMemo(() => tickets.filter((t) => t.status === 'nouveau'), [tickets])
  const sentRaw = useMemo(() => tickets.filter((t) => t.status !== 'nouveau'), [tickets])
  const sentReportCount = useMemo(
    () => sentRaw.filter((t) => Number(t.has_report_for_director) > 0).length,
    [sentRaw],
  )
  const receivedFilters = useTicketFilters(receivedRaw)
  const sentFilters = useTicketFilters(sentRaw)

  const tabs = useMemo(
    () => [
      {
        id: 'received',
        label: 'Reçus',
        icon: Inbox,
        title: 'Tickets reçus',
        subtitle: "En attente d'affectation vers une sous-direction",
        count: receivedRaw.length,
      },
      {
        id: 'sent',
        label: 'En cours',
        icon: Send,
        title: 'Tickets envoyés / en cours',
        subtitle: 'Suivi des tickets affectés aux sous-directions',
        count: sentReportCount,
      },
      {
        id: 'reports',
        label: 'Rapports',
        icon: FileText,
        title: 'Rapports ticket',
        subtitle: 'En attente de validation directrice',
        count: pendingReports.length,
      },
      {
        id: 'monthly',
        label: 'Mensuels',
        icon: CalendarDays,
        title: 'Rapports mensuels sous-directions',
        subtitle: 'Lecture, commentaire et archivage',
        count: monthlyCount,
      },
      {
        id: 'archives',
        label: 'Archives',
        icon: Archive,
        title: 'Archives',
        subtitle: 'Rapports mensuels archivés et rapports ticket validés',
        count: 0,
      },
    ],
    [receivedRaw.length, sentReportCount, pendingReports.length, monthlyCount],
  )

  const activeTabMeta = tabs.find((t) => t.id === activeTab)

  function tabHasNew(tab) {
    return tab.count > 0 && tab.count > (seenCounts[tab.id] ?? 0)
  }

  useEffect(() => {
    const current = tabs.find((t) => t.id === activeTab)
    if (!current) return
    setSeenCounts((prev) => ({ ...prev, [activeTab]: current.count }))
  }, [activeTab, tabs])

  async function loadReports() {
    try {
      const [pending, validated, monthly] = await Promise.all([
        apiRequest('/reports?scope=director'),
        apiRequest('/reports/validated'),
        apiRequest('/periodic/monthly-reports?visibility=active'),
      ])
      setPendingReports(pending.reports || [])
      setValidatedReports(validated.reports || [])
      setMonthlyCount((monthly.reports || []).length)
    } catch {
      setPendingReports([])
      setValidatedReports([])
      setMonthlyCount(0)
    }
  }

  useEffect(() => {
    loadReports()
  }, [tickets])

  function showNotice(msg) {
    setNotice(msg)
    setTimeout(() => setNotice(''), 2600)
  }

  async function assignTicket(ticketId, form) {
    setBusyId(ticketId)
    try {
      await apiRequest(`/tickets/${ticketId}/assign-sub-directorate`, {
        method: 'POST',
        body: JSON.stringify({
          priority: form.priority,
          sla_due_at: form.sla_due_at || null,
          sub_directorate_id: Number(form.sub_directorate_id),
        }),
      })
      setEditingIds((s) => {
        const next = new Set(s)
        next.delete(ticketId)
        return next
      })
      showNotice('Ticket affecté à la sous-direction.')
      reload()
    } finally {
      setBusyId(0)
    }
  }

  async function openReportForTicket(ticket) {
    try {
      const data = await apiRequest(`/tickets/${ticket.id}/director-report`)
      if (data.report) {
        setReportModal(data.report)
        setComment('')
      } else {
        showNotice('Aucun rapport en attente pour ce ticket.')
      }
    } catch {
      showNotice('Impossible de charger le rapport.')
    }
  }

  async function validateReport(reportId) {
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'approuve', comment }),
    })
    setComment('')
    setReportModal(null)
    showNotice('Rapport validé et archivé.')
    reload()
    loadReports()
  }

  async function rejectReport(reportId) {
    if (!comment.trim()) {
      showNotice('Un commentaire est requis pour rejeter le rapport.')
      return
    }
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'rejete', comment: comment.trim() }),
    })
    setComment('')
    setReportModal(null)
    showNotice('Rapport rejeté — renvoyé à la sous-direction.')
    reload()
    loadReports()
  }

  if (loading) return <p className="text-sm">Chargement du dashboard...</p>

  return (
    <div className="space-y-4">
      {notice && (
        <div className="notice-info fixed right-4 top-4 z-40 rounded border px-3 py-2 text-sm shadow">
          {notice}
        </div>
      )}

      <nav className="sticky top-0 z-10 flex flex-wrap items-center gap-0 border-b border-outline-variant bg-surface/95 backdrop-blur">
        <div className="flex flex-wrap items-stretch">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.25 : 2} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tabHasNew(tab) && (
                  <span
                    className="absolute right-1 top-2 h-2 w-2 rounded-full bg-error"
                    aria-label="Nouvelles données"
                  />
                )}
              </button>
            )
          })}
        </div>
        {activeTabMeta && (
          <div className="min-w-0 flex-1 border-l border-outline-variant px-4 py-2">
            <h2 className="truncate text-sm font-semibold">{activeTabMeta.title}</h2>
            <p className="truncate text-xs text-on-surface-variant">{activeTabMeta.subtitle}</p>
          </div>
        )}
      </nav>

      {activeTab === 'received' && (
      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <ScrollablePanel>
        <TicketTable
          tickets={receivedFilters.filteredTickets}
          mode="received"
          priorityFilter={receivedFilters.priorityFilter}
          setPriorityFilter={receivedFilters.setPriorityFilter}
          dateFilter={receivedFilters.dateFilter}
          setDateFilter={receivedFilters.setDateFilter}
          onOpenDetail={setDetailTicket}
          onAssign={assignTicket}
          onOpenReport={openReportForTicket}
          formState={formState}
          setFormState={setFormState}
          editingIds={editingIds}
          setEditingIds={setEditingIds}
          busyId={busyId}
        />
        </ScrollablePanel>
      </section>
      )}

      {activeTab === 'sent' && (
      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <ScrollablePanel>
        <TicketTable
          tickets={sentFilters.filteredTickets}
          mode="sent"
          priorityFilter={sentFilters.priorityFilter}
          setPriorityFilter={sentFilters.setPriorityFilter}
          dateFilter={sentFilters.dateFilter}
          setDateFilter={sentFilters.setDateFilter}
          onOpenDetail={setDetailTicket}
          onAssign={assignTicket}
          onOpenReport={openReportForTicket}
          formState={formState}
          setFormState={setFormState}
          editingIds={editingIds}
          setEditingIds={setEditingIds}
          busyId={busyId}
        />
        </ScrollablePanel>
      </section>
      )}

      {activeTab === 'reports' && (
      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        {pendingReports.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">Aucun rapport en attente.</p>
        ) : (
          <ScrollablePanel className="divide-y divide-outline-variant">
            {pendingReports.map((report) => (
              <button
                key={report.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-low"
                onClick={() => setReportModal(report)}
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
          </ScrollablePanel>
        )}
      </section>
      )}

      {activeTab === 'monthly' && (
      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <DirectorMonthlyReports onNotice={showNotice} archived={false} />
      </section>
      )}

      {activeTab === 'archives' && (
      <>
      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="p-3">
          <DirectorMonthlyReports onNotice={showNotice} archived />
        </div>
      </section>
      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        {validatedReports.length === 0 ? (
          <p className="p-4 text-sm text-on-surface-variant">Aucun rapport archivé.</p>
        ) : (
          <ScrollablePanel>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="p-2">Ticket</th>
                  <th className="p-2">Catégorie</th>
                  <th className="p-2">Auteur</th>
                  <th className="p-2">Validé le</th>
                  <th className="p-2">Extrait</th>
                </tr>
              </thead>
              <tbody>
                {validatedReports.map((row) => (
                  <tr key={row.id} className="border-t border-outline-variant">
                    <td className="p-2 font-semibold">{row.ticket_number}</td>
                    <td className="p-2">{row.category_label}</td>
                    <td className="p-2">{row.author_name}</td>
                    <td className="p-2 text-xs">{formatEmittedDate(row.validated_at)}</td>
                    <td className="p-2 text-xs text-on-surface-variant">{truncateText(row.report_body, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </ScrollablePanel>
        )}
      </section>
      </>
      )}

      <TicketDetailModal ticket={detailTicket} open={Boolean(detailTicket)} onClose={() => setDetailTicket(null)} />
      <ReportDetailModal
        report={reportModal}
        open={Boolean(reportModal)}
        onClose={() => setReportModal(null)}
        onValidate={validateReport}
        onReject={rejectReport}
        comment={comment}
        setComment={setComment}
      />
    </div>
  )
}
