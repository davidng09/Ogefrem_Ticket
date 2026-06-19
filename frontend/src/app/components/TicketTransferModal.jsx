import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { Modal } from './Modal'
import { formatServiceLabel } from '../uiHelpers'

export function TicketTransferModal({ ticketId, open, onClose, onTransferred }) {
  const [candidates, setCandidates] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !ticketId) return
    setLoading(true)
    setSelectedId('')
    apiRequest(`/tickets/${ticketId}/transfer-candidates`)
      .then((data) => setCandidates(data.candidates || []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [open, ticketId])

  async function submit() {
    if (!selectedId) return
    setSubmitting(true)
    try {
      await apiRequest(`/tickets/${ticketId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ technician_id: Number(selectedId) }),
      })
      onTransferred?.()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Transmettre le ticket à un agent" wide>
      <p className="mb-3 text-sm text-on-surface-variant">
        Choisissez l&apos;agent de votre bureau qui prendra en charge ce ticket.
      </p>
      {loading ? (
        <p className="text-sm text-on-surface-variant">Chargement…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Aucun agent disponible.</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded border border-outline-variant p-2 hover:bg-surface-low">
                <input
                  type="radio"
                  name="transfer-agent"
                  checked={String(selectedId) === String(c.id)}
                  onChange={() => setSelectedId(String(c.id))}
                  className="border-outline-variant"
                />
                <span className="text-sm">
                  <span className="font-semibold">
                    {c.prenom} {c.nom}
                  </span>
                  {c.service_label ? (
                    <span className="text-on-surface-variant">
                      {' '}
                      — {formatServiceLabel(c.service_label)}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-outline-variant px-3 py-1.5 text-sm"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={submitting || !selectedId}
          onClick={submit}
          className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {submitting ? 'Transmission…' : 'Transmettre'}
        </button>
      </div>
    </Modal>
  )
}
