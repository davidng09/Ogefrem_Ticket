import { useEffect, useMemo, useState } from 'react'
import { apiRequest, downloadFile } from '../api'
import { formatEmittedDate, subDirectorates } from '../uiHelpers'
import { MonthFilterHeader, SubDirectorateFilterHeader } from './TicketTableFilters'
import { ScrollablePanel } from './ScrollablePanel'

export function DirectorMonthlyReports({ onNotice, archived = false }) {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [comment, setComment] = useState('')
  const [sdFilter, setSdFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [downloading, setDownloading] = useState(false)

  async function load() {
    const visibility = archived ? 'archived' : 'active'
    const data = await apiRequest(`/periodic/monthly-reports?visibility=${visibility}`)
    setReports(data.reports || [])
  }

  useEffect(() => {
    load().catch(() => {})
  }, [archived])

  const monthPeriods = useMemo(() => {
    const map = new Map()
    reports.forEach((r) => {
      const value = `${r.year}-${String(r.month).padStart(2, '0')}`
      if (!map.has(value)) {
        map.set(value, { value, label: `${r.month}/${r.year}` })
      }
    })
    return [...map.values()].sort((a, b) => b.value.localeCompare(a.value))
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (sdFilter !== 'all' && String(r.sub_directorate_id) !== sdFilter) return false
      if (monthFilter !== 'all') {
        const key = `${r.year}-${String(r.month).padStart(2, '0')}`
        if (key !== monthFilter) return false
      }
      return true
    })
  }, [reports, sdFilter, monthFilter])

  async function saveComment() {
    if (!selected || !comment.trim()) return
    await apiRequest(`/periodic/monthly-reports/${selected.id}/comment`, {
      method: 'POST',
      body: JSON.stringify({ body: comment.trim() }),
    })
    setComment('')
    onNotice?.('Commentaire enregistré.')
    load()
  }

  async function setVisibility(id, visibility) {
    await apiRequest(`/periodic/monthly-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility }),
    })
    onNotice?.(visibility === 'archived' ? 'Rapport conservé en archive.' : 'Rapport supprimé.')
    setSelected(null)
    load()
  }

  async function handleDownload() {
    if (!selected) return
    setDownloading(true)
    try {
      await downloadFile(
        `/periodic/monthly-reports/${selected.id}/download`,
        selected.original_name || 'rapport-mensuel',
      )
    } catch {
      onNotice?.('Impossible de télécharger le fichier.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-xs uppercase text-on-surface-variant">
        <SubDirectorateFilterHeader
          value={sdFilter}
          onChange={setSdFilter}
          subDirectorates={subDirectorates}
        />
        <MonthFilterHeader value={monthFilter} onChange={setMonthFilter} periods={monthPeriods} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ScrollablePanel className="divide-y divide-outline-variant bg-surface-lowest">
          {filteredReports.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun rapport mensuel.</p>
          ) : (
            filteredReports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className={`w-full p-3 text-left transition hover:bg-surface-low ${
                  selected?.id === r.id ? 'bg-primary/5' : ''
                }`}
              >
                <p className="text-sm font-semibold">{r.sub_directorate_label}</p>
                <p className="text-xs text-on-surface-variant">
                  {r.month}/{r.year} — {r.uploader_name} — {formatEmittedDate(r.uploaded_at)}
                </p>
              </button>
            ))
          )}
        </ScrollablePanel>

        {selected && (
          <div className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
            <h3 className="font-semibold">{selected.sub_directorate_label}</h3>
            <p className="text-xs text-on-surface-variant">
              Période {selected.month}/{selected.year} — déposé par {selected.uploader_name}
            </p>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="mt-3 inline-block rounded border border-primary px-3 py-2 text-sm text-primary disabled:opacity-50"
            >
              {downloading ? 'Téléchargement…' : `Télécharger ${selected.original_name}`}
            </button>
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold uppercase text-on-surface-variant">
                Commentaire
                <textarea
                  className="mt-1 w-full rounded border border-outline-variant p-2 text-sm"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Votre commentaire sur ce rapport mensuel"
                />
              </label>
              <button
                type="button"
                className="rounded bg-primary px-3 py-2 text-xs text-on-primary"
                onClick={saveComment}
              >
                Enregistrer le commentaire
              </button>
            </div>
            {selected.comments?.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-outline-variant pt-3 text-sm">
                {selected.comments.map((c) => (
                  <li key={c.id} className="rounded bg-surface-low p-2">
                    <p className="text-xs text-on-surface-variant">
                      {c.author_name} — {formatEmittedDate(c.created_at)}
                    </p>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {!archived && (
              <div className="mt-4 flex gap-2 border-t border-outline-variant pt-3">
                <button
                  type="button"
                  className="rounded bg-primary px-3 py-2 text-xs text-on-primary"
                  onClick={() => setVisibility(selected.id, 'archived')}
                >
                  Conserver
                </button>
                <button
                  type="button"
                  className="rounded border border-error px-3 py-2 text-xs text-error"
                  onClick={() => setVisibility(selected.id, 'deleted')}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
