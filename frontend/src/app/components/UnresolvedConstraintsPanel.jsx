import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { apiRequest } from '../api'
import { formatEmittedDate, formatPriorityLabel, getPriorityBadgeClass } from '../uiHelpers'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'
import { TicketDetailLink } from './TicketDetailLink'
import { DismissibleBanner } from './DismissibleBanner'

function ConsigneThread({ consignes }) {
  if (!consignes?.length) {
    return <p className="text-xs text-on-surface-variant">Aucune consigne pour l&apos;instant.</p>
  }
  return (
    <ul className="space-y-2">
      {consignes.map((c) => (
        <li key={c.id} className="rounded border border-outline-variant bg-surface-lowest p-2 text-xs">
          <p className="font-semibold">
            {c.prenom} {c.nom}
            <span className="ml-2 font-normal text-on-surface-variant">({c.author_role})</span>
          </p>
          <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
          <p className="mt-1 text-on-surface-variant">{formatEmittedDate(c.created_at)}</p>
        </li>
      ))}
    </ul>
  )
}

function ConstraintTicketCard({ ticket, onAdded, highlight }) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [consignes, setConsignes] = useState(ticket.consignes || [])

  async function submitConsigne() {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await apiRequest(`/tickets/${ticket.id}/consignes`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim() }),
      })
      const entry = {
        id: Date.now(),
        body: draft.trim(),
        author_role: '…',
        created_at: new Date().toISOString(),
        prenom: '',
        nom: 'Vous',
      }
      setConsignes((current) => [...current, entry])
      setDraft('')
      onAdded?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <details
      open={highlight}
      className={`rounded border bg-surface-low p-3 ${highlight ? 'border-primary ring-1 ring-primary/30' : 'border-outline-variant'}`}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{ticket.ticket_number}</span>
          <span className={`rounded px-2 py-0.5 text-xs ${getPriorityBadgeClass(ticket.priority)}`}>
            {formatPriorityLabel(ticket.priority)}
          </span>
          {ticket.sub_directorate_code && (
            <span className="text-xs text-on-surface-variant">{ticket.sub_directorate_code}</span>
          )}
          {ticket.closed_at && (
            <span className="text-xs text-on-surface-variant">
              Clôturé le {formatEmittedDate(ticket.closed_at)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-on-surface-variant">
          {ticket.category_label}
          {ticket.tech_nom ? ` — ${ticket.tech_prenom} ${ticket.tech_nom}` : ''}
        </p>
      </summary>
      <div className="mt-3 space-y-3 border-t border-outline-variant pt-3">
        <TicketDetailLink ticket={ticket} className="text-xs" />
        {ticket.latest_report_body && (
          <div>
            <p className="text-xs font-semibold uppercase text-on-surface-variant">Rapport de clôture</p>
            <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-outline-variant bg-surface-lowest p-2 text-xs">
              {ticket.latest_report_body}
            </pre>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase text-on-surface-variant">Consignes</p>
          <div className="mt-2">
            <ConsigneThread consignes={consignes} />
          </div>
        </div>
        <div className="space-y-2">
          <textarea
            rows={3}
            className="w-full rounded border border-outline-variant p-2 text-sm"
            placeholder="Ajouter une consigne pour l'agent ou le chef de service…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !draft.trim()}
            className="rounded bg-primary px-3 py-1.5 text-xs text-on-primary disabled:opacity-50"
            onClick={submitConsigne}
          >
            Publier la consigne
          </button>
        </div>
      </div>
    </details>
  )
}

export function UnresolvedConstraintsPanel({ focusTicketId = null }) {
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(nextPage = page) {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/tickets/unresolved-constraints?page=${nextPage}&per_page=10`)
      setTickets(data.tickets || [])
      setPagination(data.pagination || null)
    } catch (err) {
      setError(err.message)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(page)
  }, [page])

  if (loading && tickets.length === 0) {
    return <p className="text-sm text-on-surface-variant">Chargement des contraintes…</p>
  }

  if (error) {
    return <p className="text-sm text-error">{error}</p>
  }

  return (
    <section className="space-y-3">
      <DismissibleBanner
        storageKey="ogefrem.constraints-info-banner"
        className="flex items-start gap-2 rounded border border-amber-300/60 bg-amber-50/80 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 pr-2">
          <p className="font-semibold">Tickets non résolus — contraintes et consignes</p>
          <p className="text-xs opacity-90">
            Consultation des rapports de clôture et ajout de consignes par ticket (lecture seule sur le flux opérationnel).
          </p>
        </div>
      </DismissibleBanner>
      <ScrollablePanel className="max-h-[32rem] space-y-2 bg-surface-lowest p-2">
        {tickets.length === 0 ? (
          <p className="p-2 text-sm text-on-surface-variant">Aucun ticket non résolu pour le moment.</p>
        ) : (
          tickets.map((ticket) => (
            <ConstraintTicketCard
              key={ticket.id}
              ticket={ticket}
              highlight={focusTicketId != null && Number(focusTicketId) === Number(ticket.id)}
              onAdded={() => load(page)}
            />
          ))
        )}
      </ScrollablePanel>
      {pagination && pagination.total_pages > 1 && (
        <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="tickets" />
      )}
    </section>
  )
}
