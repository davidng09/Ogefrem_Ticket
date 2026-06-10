import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { getCurrentYearMonth } from '../utils/calendarWeeks'

export function MonthlyRedactorInbox({ onNotice }) {
  const { year, monthIndex } = getCurrentYearMonth()
  const month = monthIndex + 1
  const [bundles, setBundles] = useState([])
  const [file, setFile] = useState(null)

  async function load() {
    const data = await apiRequest('/periodic/monthly-bundle/inbox')
    setBundles(data.bundles || [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  async function uploadReport() {
    if (!file) {
      onNotice?.('Sélectionnez un fichier PDF ou Word.')
      return
    }
    const form = new FormData()
    form.append('file', file)
    form.append('year', String(year))
    form.append('month', String(month))
    await apiRequest('/periodic/monthly-reports', { method: 'POST', body: form })
    onNotice?.('Rapport mensuel transmis à la directrice.')
    setFile(null)
  }

  return (
    <section className="space-y-3 rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Rédaction mensuelle sous-direction</h2>
      <ScrollablePanel className="space-y-2 bg-surface-lowest p-2">
        {bundles.length === 0 ? (
          <p className="p-2 text-sm text-on-surface-variant">Aucun paquet reçu pour le moment.</p>
        ) : (
          bundles.map((b) => (
            <details key={b.id} className="rounded border border-outline-variant p-2">
              <summary className="cursor-pointer text-sm font-semibold">
                {b.sender_prenom} {b.sender_nom} — {b.month}/{b.year}
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs">{b.concatenated_body}</pre>
            </details>
          ))
        )}
      </ScrollablePanel>
      <div className="space-y-2 border-t border-outline-variant pt-3">
        <p className="text-xs text-on-surface-variant">
          Déposez le rapport final ({month}/{year}) après rédaction dans Word.
        </p>
        <input
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
        />
        <button
          type="button"
          className="rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          onClick={uploadReport}
        >
          Transmettre à la directrice
        </button>
      </div>
    </section>
  )
}
