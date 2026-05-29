import { useMemo, useState } from 'react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { useTeamUsers } from '../hooks/useTeamUsers'
import { useTickets } from '../hooks/useTickets'

export function SubDirectionHub() {
  const { user } = useAuth()
  const isChef = user?.role_code === 'CHEF_SERVICE'
  const scope = isChef ? 'chef' : 'sub_directorate'
  const { tickets, loading, reload } = useTickets(scope)
  const chefs = useTeamUsers('CHEF_SERVICE', user?.sub_directorate_id)
  const techs = useTeamUsers('TECHNICIEN', user?.sub_directorate_id)
  const [selectedByTicket, setSelectedByTicket] = useState({})
  const [reportComment, setReportComment] = useState('')

  const title = isChef ? 'Affectation des tickets' : 'Contrôle des affectations'

  async function forwardToChef(ticketId) {
    const chefId = selectedByTicket[ticketId]
    if (!chefId) return
    await apiRequest(`/tickets/${ticketId}/forward-to-chef`, {
      method: 'POST',
      body: JSON.stringify({ chef_id: Number(chefId) }),
    })
    reload()
  }

  async function assignToTech(ticketId) {
    const techId = selectedByTicket[ticketId]
    if (!techId) return
    await apiRequest(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ technician_id: Number(techId) }),
    })
    reload()
  }

  async function validateReport(reportId, decision) {
    await apiRequest(`/reports/${reportId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ decision, comment: reportComment }),
    })
    setReportComment('')
  }

  const filtered = useMemo(
    () => tickets.filter((ticket) => ticket.status !== 'archive'),
    [tickets],
  )

  if (loading) return <p className="text-sm">Chargement...</p>

  return (
    <div className="space-y-4">
      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-on-surface-variant">
          {isChef
            ? "Les tickets transmis par votre sous-direction sont visibles ici."
            : 'Filtre automatique par sous-direction.'}
        </p>
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="p-2">Ticket</th>
                <th className="p-2">Catégorie</th>
                <th className="p-2">Statut</th>
                <th className="p-2">{isChef ? 'Assigner à un technicien' : 'Transmettre au chef'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr key={ticket.id} className="border-t border-outline-variant">
                  <td className="p-2">
                    <p className="font-semibold">{ticket.ticket_number}</p>
                    <p className="text-xs text-on-surface-variant">{ticket.description}</p>
                  </td>
                  <td className="p-2">{ticket.category_label}</td>
                  <td className="p-2">{ticket.status}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-outline-variant p-1"
                        value={selectedByTicket[ticket.id] || ''}
                        onChange={(e) =>
                          setSelectedByTicket((state) => ({
                            ...state,
                            [ticket.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Sélectionner</option>
                        {(isChef ? techs : chefs).map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.prenom} {member.nom}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => (isChef ? assignToTech(ticket.id) : forwardToChef(ticket.id))}
                        className="rounded bg-primary px-2 py-1 text-xs text-on-primary"
                      >
                        {isChef ? 'Assigner' : 'Transmettre'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest p-3 shadow-sm">
        <h3 className="mb-2 font-semibold">Validation des rapports</h3>
        <textarea
          className="mb-2 w-full rounded border border-outline-variant p-2 text-sm"
          placeholder="Commentaire en cas de rejet"
          value={reportComment}
          onChange={(e) => setReportComment(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-outline-variant px-2 py-1 text-xs"
            onClick={() => {
              const reportId = Number(prompt('ID du rapport à valider') || 0)
              if (reportId) validateReport(reportId, 'approuve')
            }}
          >
            Valider un rapport
          </button>
          <button
            type="button"
            className="rounded border border-error px-2 py-1 text-xs text-error"
            onClick={() => {
              const reportId = Number(prompt('ID du rapport à rejeter') || 0)
              if (reportId) validateReport(reportId, 'rejete')
            }}
          >
            Rejeter un rapport
          </button>
        </div>
      </section>
    </div>
  )
}
