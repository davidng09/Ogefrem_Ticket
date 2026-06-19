import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest, downloadFile } from '../api'
import { formatEmittedDate, subDirectorates } from '../uiHelpers'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function DirectorMonthlyReports({ onNotice, archived = false }) {
  const [reports, setReports] = useState([])
  const [groupedByYear, setGroupedByYear] = useState({})
  const [pagination, setPagination] = useState(null)
  const [availableYears, setAvailableYears] = useState([])
  const [selected, setSelected] = useState(null)
  const [comment, setComment] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [sdFilter, setSdFilter] = useState('')
  const [page, setPage] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(true)

  const visibility = archived ? 'archived' : 'active'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        visibility,
        page: String(page),
        per_page: '12',
      })
      if (yearFilter) params.set('year', yearFilter)
      if (monthFilter) params.set('month', monthFilter)
      if (sdFilter) params.set('sub_directorate_id', sdFilter)
      const data = await apiRequest(`/periodic/monthly-reports?${params}`)
      setReports(data.reports || [])
      setGroupedByYear(data.grouped_by_year || {})
      setPagination(data.pagination || null)
      if (data.available_years?.length) {
        setAvailableYears(data.available_years)
      }
    } catch {
      setReports([])
      setGroupedByYear({})
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [visibility, page, yearFilter, monthFilter, sdFilter])

  useEffect(() => {
    load()
  }, [load])

  const yearSections = useMemo(() => {
    const years = Object.keys(groupedByYear)
      .map(Number)
      .sort((a, b) => b - a)
    return years.map((y) => ({
      year: y,
      items: groupedByYear[y] || [],
    }))
  }, [groupedByYear])

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

  async function setVisibility(id, nextVisibility) {
    await apiRequest(`/periodic/monthly-reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: nextVisibility }),
    })
    onNotice?.(nextVisibility === 'archived' ? 'Rapport conservé en archive.' : 'Rapport supprimé.')
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

  function handleYearChange(value) {
    setYearFilter(value)
    setMonthFilter('')
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4 text-xs uppercase text-on-surface-variant">
        <label>
          Année
          <select
            value={yearFilter}
            onChange={(e) => handleYearChange(e.target.value)}
            className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
          >
            <option value="">Toutes</option>
            {(availableYears.length ? availableYears : [new Date().getFullYear()]).map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mois
          <select
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value)
              setPage(1)
            }}
            className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
          >
            <option value="">Tous</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={String(idx + 1)}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sous-direction
          <select
            value={sdFilter}
            onChange={(e) => {
              setSdFilter(e.target.value)
              setPage(1)
            }}
            className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
          >
            <option value="">Toutes</option>
            {subDirectorates.map((sd) => (
              <option key={sd.id} value={String(sd.id)}>
                {sd.short}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
          {loading ? (
            <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
          ) : reports.length === 0 ? (
            <p className="p-4 text-sm text-on-surface-variant">Aucun rapport mensuel.</p>
          ) : (
            <ScrollablePanel className="max-h-[28rem]">
              {yearSections.map(({ year, items }) => (
                <section key={year} className="border-b border-outline-variant last:border-b-0">
                  <h4 className="sticky top-0 bg-surface-low px-3 py-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Année {year}
                  </h4>
                  <div className="divide-y divide-outline-variant">
                    {items.map((r) => (
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
                          {MONTH_NAMES[r.month - 1]} {r.year} — {r.uploader_name} —{' '}
                          {formatEmittedDate(r.uploaded_at)}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </ScrollablePanel>
          )}
          <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="rapports" />
        </div>

        {selected && (
          <div className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
            <h3 className="font-semibold">{selected.sub_directorate_label}</h3>
            <p className="text-xs text-on-surface-variant">
              Période {MONTH_NAMES[selected.month - 1]} {selected.year} — déposé par {selected.uploader_name}
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
