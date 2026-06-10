import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { getCurrentYearMonth } from '../utils/calendarWeeks'

export function MonthlyBundlePanel({ onNotice }) {
  const { year, monthIndex } = getCurrentYearMonth()
  const month = monthIndex + 1
  const [agents, setAgents] = useState([])
  const [recipientId, setRecipientId] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  async function load() {
    const [agentsData, preview] = await Promise.all([
      apiRequest('/meta/agents-sub-directorate'),
      apiRequest(`/periodic/monthly-bundle/preview?year=${year}&month=${month}`),
    ])
    setAgents(agentsData.agents || [])
    setBody(preview.preview?.body || '')
    setSent(Boolean(preview.preview?.sent))
  }

  useEffect(() => {
    load().catch(() => {})
  }, [year, month])

  async function sendBundle() {
    if (!recipientId) {
      onNotice?.('Choisissez un collègue de votre sous-direction.')
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
        Collègue rédacteur (même sous-direction)
        <select
          className="mt-1 w-full rounded border border-outline-variant p-2 text-sm"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          <option value="">— Choisir —</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.prenom} {a.nom} ({a.matricule}) — {a.service_label}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="w-full rounded border border-outline-variant p-2 text-sm font-mono"
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
