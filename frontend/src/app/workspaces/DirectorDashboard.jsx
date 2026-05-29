import { useMemo, useState } from 'react'
import { apiRequest } from '../api'
import { useTickets } from '../hooks/useTickets'
import { useTeamUsers } from '../hooks/useTeamUsers'

const subDirectorates = [
  { id: 1, label: 'Sous-direction Maintenance et Réseau' },
  { id: 2, label: 'Sous-direction Analyse et Développement' },
]

export function DirectorDashboard() {
  const { tickets, loading, reload } = useTickets()
  const [busyId, setBusyId] = useState(0)
  const [priorityById, setPriorityById] = useState({})
  const [slaById, setSlaById] = useState({})
  const [reportTicketId, setReportTicketId] = useState(0)
  const [reports, setReports] = useState([])
  const [comment, setComment] = useState('')

  const kpis = useMemo(() => {
    const opened = tickets.filter((t) => ['nouveau', 'chez_sous_direction', 'chez_chef_service', 'assigne_technicien', 'en_cours'].includes(t.status)).length
    const resolved = tickets.filter((t) => t.status === 'resolu').length
    const total = tickets.length || 1
    const ratio = ((resolved / total) * 100).toFixed(1)
    return { opened, resolvedRatio: ratio }
  }, [tickets])

  const leaders = useTeamUsers('SOUS_DIRECTEUR')

  async function escalate(ticketId, subDirectorateId) {
    setBusyId(ticketId)
    await apiRequest(`/tickets/${ticketId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ sub_directorate_id: subDirectorateId }),
    })
    setBusyId(0)
    reload()
  }

  async function setPriority(ticketId) {
    setBusyId(ticketId)
    await apiRequest(`/tickets/${ticketId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({
        priority: priorityById[ticketId] || 'normale',
        sla_due_at: slaById[ticketId] || null,
      }),
    })
    setBusyId(0)
    reload()
  }

  async function openReports(ticketId) {
    setReportTicketId(ticketId)
    const data = await apiRequest(`/tickets/${ticketId}/reports`)
    setReports(data.reports || [])
  }

  async function validateReport(reportId, decision) {
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment }),
    })
    setComment('')
    if (reportTicketId) {
      openReports(reportTicketId)
    }
  }

  if (loading) return <p className="text-sm">Chargement du dashboard...</p>

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <p className="text-xs uppercase text-on-surface-variant">Tickets ouverts</p>
          <h2 className="text-2xl font-bold">{kpis.opened}</h2>
        </article>
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <p className="text-xs uppercase text-on-surface-variant">Temps moyen de réponse</p>
          <h2 className="text-2xl font-bold">2h 15m</h2>
        </article>
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <p className="text-xs uppercase text-on-surface-variant">Taux de résolution</p>
          <h2 className="text-2xl font-bold">{kpis.resolvedRatio}%</h2>
        </article>
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="border-b border-outline-variant p-3">
          <h3 className="font-semibold">Incidents actifs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="p-2">Ticket</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2">Statut</th>
                <th className="p-2">Priorité</th>
                <th className="p-2">Escalade</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-outline-variant">
                  <td className="p-2">
                    <p className="font-semibold">{ticket.ticket_number}</p>
                    <p className="text-xs text-on-surface-variant">{ticket.description}</p>
                    <button type="button" className="mt-1 text-xs underline" onClick={() => openReports(ticket.id)}>
                      Voir rapports
                    </button>
                  </td>
                  <td className="p-2">{ticket.category_label}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-1 text-xs font-bold ${ticket.priority === 'bloquant' ? 'bg-error text-on-error' : 'border border-outline-variant'}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="space-y-2 p-2">
                    <select
                      className="w-full rounded border border-outline-variant p-1"
                      value={priorityById[ticket.id] || ticket.priority}
                      onChange={(e) => setPriorityById((s) => ({ ...s, [ticket.id]: e.target.value }))}
                    >
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                      <option value="bloquant">Bloquant</option>
                    </select>
                    <input
                      type="datetime-local"
                      className="w-full rounded border border-outline-variant p-1"
                      value={slaById[ticket.id] || ''}
                      onChange={(e) => setSlaById((s) => ({ ...s, [ticket.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setPriority(ticket.id)}
                      className="rounded border border-outline-variant px-2 py-1 text-xs"
                    >
                      Appliquer
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="space-y-1">
                      {subDirectorates.map((target) => (
                        <button
                          key={target.id}
                          type="button"
                          disabled={busyId === ticket.id}
                          onClick={() => escalate(ticket.id, target.id)}
                          className="block w-full rounded border border-outline-variant px-2 py-1 text-left text-xs hover:bg-surface-low"
                        >
                          {target.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {reportTicketId > 0 && (
        <section className="rounded border border-outline-variant bg-surface-lowest p-3 shadow-sm">
          <h3 className="mb-2 font-semibold">Rapports du ticket #{reportTicketId}</h3>
          <textarea
            placeholder="Commentaire de validation/rejet"
            className="mb-2 w-full rounded border border-outline-variant p-2 text-sm"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-xs text-on-surface-variant">Aucun rapport pour ce ticket.</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="rounded border border-outline-variant p-2 text-sm">
                  <p className="font-semibold">
                    v{report.version} - {report.author_name}
                  </p>
                  <p className="mb-2 text-xs text-on-surface-variant">{report.body}</p>
                  <div className="flex gap-2">
                    <button type="button" className="rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => validateReport(report.id, 'approuve')}>
                      Valider
                    </button>
                    <button type="button" className="rounded border border-error px-2 py-1 text-xs text-error" onClick={() => validateReport(report.id, 'rejete')}>
                      Rejeter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {leaders.length > 0 && (
            <p className="mt-2 text-xs text-on-surface-variant">
              Sous-directeurs actifs: {leaders.map((u) => `${u.prenom} ${u.nom}`).join(', ')}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
