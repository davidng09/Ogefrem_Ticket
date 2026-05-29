import { CheckCircle2, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { apiRequest } from '../api'
import { useTickets } from '../hooks/useTickets'

export function TechnicianField() {
  const { user } = useAuth()
  const { tickets, loading, reload } = useTickets()
  const [notesByTicket, setNotesByTicket] = useState({})
  const [doneByTicket, setDoneByTicket] = useState({})

  async function takeCharge(ticketId) {
    await apiRequest(`/tickets/${ticketId}/take-charge`, { method: 'POST' })
    reload()
  }

  async function resolve(ticketId) {
    const body = notesByTicket[ticketId]
    if (!body) return

    await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId, body }),
    })
    await apiRequest(`/tickets/${ticketId}/resolve`, { method: 'POST' })
    setDoneByTicket((state) => ({ ...state, [ticketId]: true }))
    setTimeout(() => {
      setDoneByTicket((state) => ({ ...state, [ticketId]: false }))
      reload()
    }, 150)
  }

  if (loading) return <p className="text-sm">Chargement...</p>

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h1 className="text-xl font-semibold">
          {user?.prenom} {user?.nom} - {tickets.length} à traiter
        </h1>
        <p className="text-sm text-on-surface-variant">Vue technicien terrain</p>
      </header>

      <section className="space-y-3">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{ticket.ticket_number}</p>
                <p className="text-sm">{ticket.description}</p>
              </div>
              <span className={`rounded px-2 py-1 text-xs font-semibold ${ticket.priority === 'bloquant' ? 'bg-error text-on-error' : 'border border-outline-variant'}`}>
                {ticket.priority}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 text-xs text-on-surface-variant md:grid-cols-3">
              <p>Nom: {ticket.reporter_full_name}</p>
              <p>Direction: {ticket.reporter_direction}</p>
              <p>Bureau: {ticket.reporter_office}</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => takeCharge(ticket.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-all duration-150"
              >
                <Wrench size={16} /> Prendre en charge
              </button>
              <textarea
                className="w-full rounded border border-outline-variant p-2 text-sm"
                rows={3}
                placeholder="Rapport technique / note de clôture"
                value={notesByTicket[ticket.id] || ''}
                onChange={(e) => setNotesByTicket((state) => ({ ...state, [ticket.id]: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => resolve(ticket.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded border border-primary px-3 py-2 text-sm font-semibold text-primary transition-all duration-150"
              >
                <CheckCircle2 size={16} className={doneByTicket[ticket.id] ? 'text-green-600' : ''} />
                Marquer comme résolu
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
