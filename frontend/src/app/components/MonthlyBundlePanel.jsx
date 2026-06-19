import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { formatServiceLabel } from '../uiHelpers'
import { getCurrentYearMonth } from '../utils/calendarWeeks'

export function MonthlyBundlePanel({ onNotice }) {
  const { year, monthIndex } = getCurrentYearMonth()
  const month = monthIndex + 1
  const [recipients, setRecipients] = useState([])
  const [recipientId, setRecipientId] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  async function load() {
    const [recipientsData, preview] = await Promise.all([
      apiRequest('/meta/monthly-bundle-recipients'),
      apiRequest(`/periodic/monthly-bundle/preview?year=${year}&month=${month}`),
    ])
    setRecipients(recipientsData.recipients || [])
    setBody(preview.preview?.body || '')
    setSent(Boolean(preview.preview?.sent))
  }

  useEffect(() => {
    load().catch(() => {})
  }, [year, month])

  async function sendBundle() {
    if (!recipientId) {
      onNotice?.('Choisissez un destinataire (agent ou chef de service).')
      return
    }
    await apiRequest('/periodic/monthly-bundle', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: Number(recipientId),
        year,
        month,
        body,
      }),
    })
    onNotice?.('Rapports hebdomadaires envoyés.')
    load()
  }

  return (
    <section className="space-y-3 rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Envoi fin de mois</h2>
      <p className="text-xs text-on-surface-variant">
        Un seul envoi regroupant toutes vos semaines ({month}/{year}). {sent ? 'Déjà envoyé ce mois.' : ''}
      </p>
      <label className="block text-xs font-semibold uppercase text-on-surface-variant">
        Destinataire (agent ou chef de service)
        <select
          className="mt-1 w-full rounded border border-outline-variant p-2 text-sm"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          <option value="">— Choisir —</option>
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.recipient_kind === 'chef_service' ? 'Chef de service — ' : ''}
              {r.prenom} {r.nom} ({r.matricule}) — {formatServiceLabel(r.service_label)}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="w-full rounded border border-outline-variant bg-surface-lowest p-2 text-sm font-mono text-on-surface"
        rows={10}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
        onClick={sendBundle}
      >
        Envoyer les rapports hebdomadaires
      </button>
    </section>
  )
}
