import { useEffect, useState } from 'react'
import { apiRequest } from '../api'
import { ScrollablePanel } from './ScrollablePanel'
import { formatEmittedDate } from '../uiHelpers'
import { useAuth } from '../AuthContext'

export function ChefMonthlyBundleInbox() {
  const { user } = useAuth()
  const [bundles, setBundles] = useState([])
  const [drafts, setDrafts] = useState({})
  const [busyId, setBusyId] = useState(null)
  const canComment = user?.role_code === 'CHEF_SERVICE' || user?.role_code === 'SUPER_ADMIN'

  async function load() {
    const data = await apiRequest('/periodic/monthly-bundle/inbox')
    setBundles(data.bundles || [])
  }

  useEffect(() => {
    load().catch(() => setBundles([]))
  }, [])

  async function submitComment(bundleId) {
    const body = (drafts[bundleId] || '').trim()
    if (!body) return
    setBusyId(bundleId)
    try {
      await apiRequest(`/periodic/monthly-bundle/${bundleId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      setDrafts((current) => ({ ...current, [bundleId]: '' }))
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <ScrollablePanel className="max-h-96 space-y-2 bg-surface-lowest p-2">
      {bundles.length === 0 ? (
        <p className="p-2 text-sm text-on-surface-variant">
          Aucun rapport mensuel reçu d&apos;un agent ou d&apos;un chef de bureau.
        </p>
      ) : (
        bundles.map((b) => (
          <details key={b.id} className="rounded border border-outline-variant bg-surface-low p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              {b.sender_prenom} {b.sender_nom} ({b.sender_matricule}) — {b.month}/{b.year}
              <span className="ml-2 text-xs font-normal text-on-surface-variant">
                reçu le {formatEmittedDate(b.sent_at)}
              </span>
            </summary>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs">{b.concatenated_body}</pre>
            {(b.comments || []).length > 0 && (
              <div className="mt-3 space-y-2 border-t border-outline-variant pt-2">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Commentaires chef</p>
                {b.comments.map((c) => (
                  <div key={c.id} className="rounded border border-outline-variant bg-surface-lowest p-2 text-xs">
                    <p className="font-semibold">
                      {c.prenom} {c.nom}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                    <p className="mt-1 text-on-surface-variant">{formatEmittedDate(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
            {canComment && (
              <div className="mt-3 space-y-2 border-t border-outline-variant pt-2">
                <textarea
                  rows={3}
                  className="w-full rounded border border-outline-variant p-2 text-xs"
                  placeholder="Commentaire sur ce bundle mensuel…"
                  value={drafts[b.id] || ''}
                  onChange={(e) => setDrafts((current) => ({ ...current, [b.id]: e.target.value }))}
                />
                <button
                  type="button"
                  disabled={busyId === b.id || !(drafts[b.id] || '').trim()}
                  className="rounded bg-primary px-3 py-1 text-xs text-on-primary disabled:opacity-50"
                  onClick={() => submitComment(b.id)}
                >
                  Ajouter un commentaire
                </button>
              </div>
            )}
          </details>
        ))
      )}
    </ScrollablePanel>
  )
}
