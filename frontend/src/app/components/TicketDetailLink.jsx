import { useState } from 'react'
import { Modal } from './Modal'
import { formatEmittedDate, formatPriorityLabel, truncateText } from '../uiHelpers'

export function TicketDetailModal({ ticket, open, onClose, hidePriority = false }) {
  if (!ticket) return null

  const showPriority = !hidePriority && Boolean(ticket.priority_set_by)

  return (
    <Modal open={open} onClose={onClose} title={`Détail du ticket ${ticket.ticket_number}`} wide>
      <div className="space-y-3 text-sm">
        <p className="whitespace-pre-wrap">
          <span className="font-semibold">Description :</span>{' '}
          {ticket.description?.trim() || '—'}
        </p>
        <p>
          <span className="font-semibold">Nom :</span> {ticket.reporter_full_name || '—'}
        </p>
        <p>
          <span className="font-semibold">Matricule :</span> {ticket.reporter_matricule || '—'}
        </p>
        <p>
          <span className="font-semibold">Direction :</span> {ticket.reporter_direction || '—'}
        </p>
        <p>
          <span className="font-semibold">Service :</span> {ticket.reporter_service || '—'}
        </p>
        <p>
          <span className="font-semibold">Bureau :</span> {ticket.reporter_office || '—'}
        </p>
        <p>
          <span className="font-semibold">Catégorie :</span> {ticket.category_label || '—'}
        </p>
        <p>
          <span className="font-semibold">Date émise :</span>{' '}
          {formatEmittedDate(ticket.created_at)}
        </p>
        {showPriority ? (
          <p>
            <span className="font-semibold">Priorité :</span>{' '}
            {formatPriorityLabel(ticket.priority)}
          </p>
        ) : null}
        {showPriority && ticket.sla_due_at ? (
          <p>
            <span className="font-semibold">Échéance :</span>{' '}
            {formatEmittedDate(ticket.sla_due_at)}
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

export function TicketDetailLink({
  ticket,
  className = '',
  showPreview = true,
  previewMax = 60,
  hidePriority = false,
}) {
  const [open, setOpen] = useState(false)
  const description = ticket?.description?.trim() || ''

  return (
    <>
      {showPreview && description ? (
        <p className={`text-on-surface-variant ${className}`}>{truncateText(description, previewMax)}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-1 text-left text-primary underline underline-offset-2 ${className}`}
      >
        Détail du ticket
      </button>
      <TicketDetailModal
        ticket={ticket}
        open={open}
        onClose={() => setOpen(false)}
        hidePriority={hidePriority}
      />
    </>
  )
}
