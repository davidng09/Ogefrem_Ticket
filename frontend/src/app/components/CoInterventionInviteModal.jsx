import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { Modal } from './Modal'
import { formatServiceLabel } from '../uiHelpers'

export function CoInterventionInviteModal({ ticketId, open, onClose, onInvited }) {
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !ticketId) return
    setLoading(true)
    setSelected([])
    apiRequest(`/tickets/${ticketId}/co-intervention-candidates`)
      .then((data) => setCandidates(data.candidates || []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
  }, [open, ticketId])

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  async function submit() {
    if (!selected.length) return
    setSubmitting(true)
    try {
      await apiRequest(`/tickets/${ticketId}/co-interventions`, {
        method: 'POST',
        body: JSON.stringify({ agent_ids: selected }),
      })
      onInvited?.()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Inviter des co-intervenants" wide>
      <p className="mb-3 text-sm text-on-surface-variant">
        Collègues de votre service DANTIC (maximum 5).
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
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded border-outline-variant"
                />
                <span className="text-sm">
                  <span className="font-semibold">
                    {c.prenom} {c.nom}
                  </span>
                  <span className="text-on-surface-variant">
                    {' '}
                    — {c.role_code === 'CHEF_BUREAU' ? 'Chef de bureau' : 'Agent'}
                    {c.service_label ? ` (${formatServiceLabel(c.service_label)})` : ''}
                  </span>
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
          disabled={submitting || selected.length === 0}
          onClick={submit}
          className="rounded bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary disabled:opacity-50"
        >
          {submitting ? 'Envoi…' : 'Inviter'}
        </button>
      </div>
    </Modal>
  )
}
