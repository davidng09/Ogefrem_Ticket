import { useEffect, useState } from 'react'
import { apiRequest, apiUrl } from '../api'
import { ScrollablePanel } from './ScrollablePanel'
import { getCurrentYearMonth } from '../utils/calendarWeeks'

export function WeeklyReportPanel({ onNotice, onSaved }) {
  const { year, monthIndex } = getCurrentYearMonth()
  const month = monthIndex + 1
  const [weeks, setWeeks] = useState([])
  const [drafts, setDrafts] = useState({})
  const [reminder, setReminder] = useState(null)
  const [expanded, setExpanded] = useState(null)

  async function load() {
    const [wData, rData] = await Promise.all([
      apiRequest(`/periodic/weekly?year=${year}&month=${month}`),
      apiRequest('/periodic/weekly/pending-reminder'),
    ])
    setWeeks(wData.weeks || [])
    setReminder(rData.reminder)
    const weekList = wData.weeks || []
    const next = {}
    weekList.forEach((w) => {
      next[w.week_index] = w.report?.body || w.template || ''
    })
    setDrafts(next)
    if (weekList.length) {
      const target =
        rData.reminder?.pending && rData.reminder?.week_index != null
          ? rData.reminder.week_index
          : weekList.find((w) => !w.report)?.week_index ?? weekList[weekList.length - 1]?.week_index
      setExpanded(target)
    }
  }

  useEffect(() => {
    load().catch(() => {})
  }, [year, month])

  async function save(weekIndex, status = 'finalise') {
    await apiRequest('/periodic/weekly', {
      method: 'POST',
      body: JSON.stringify({
        year,
        month,
        week_index: weekIndex,
        body: drafts[weekIndex],
        status,
      }),
    })
    onNotice?.('Rapport hebdomadaire enregistré.')
    await load()
    onSaved?.()
  }

  function exportPdf(reportId) {
    window.open(apiUrl(`/periodic/weekly/${reportId}/export`), '_blank', 'noopener')
  }

  return (
    <section className="space-y-3 rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Rapports hebdomadaires</h2>
      {reminder?.pending && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 animate-pulse">
          Rappel : rédigez votre rapport pour {reminder.week_label || 'cette semaine'}.
        </div>
      )}
      <ScrollablePanel className="divide-y divide-outline-variant bg-surface-lowest p-2">
        {weeks.map((w) => (
          <div key={w.week_index} className="p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-semibold"
              onClick={() => setExpanded(expanded === w.week_index ? null : w.week_index)}
            >
              {w.label}
              <span className="text-xs text-on-surface-variant">
                {w.report ? (w.report.status === 'finalise' ? 'Rédigé' : 'Brouillon') : 'À rédiger'}
                {w.resolution_count === 0 && !w.report && (
                  <span className="ml-2 text-amber-700">· aucune résolution</span>
                )}
              </span>
            </button>
            {expanded === w.week_index && (
              <div className="mt-2 space-y-2">
                {w.resolution_count === 0 && !w.report && (
                  <p className="rounded border border-dashed border-amber-300 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 animate-[fadeIn_0.4s_ease-out]">
                    Aucune résolution enregistrée sur cette période — vous pouvez laisser le rapport vide ou
                    noter l&apos;absence d&apos;activité.
                  </p>
                )}
                <textarea
                  className="w-full rounded border border-outline-variant bg-surface-lowest p-2 text-sm font-mono text-on-surface"
                  rows={12}
                  value={drafts[w.week_index] || ''}
                  onChange={(e) => setDrafts((s) => ({ ...s, [w.week_index]: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-outline-variant px-3 py-1 text-xs"
                    onClick={() => save(w.week_index, 'brouillon')}
                  >
                    Modifier / brouillon
                  </button>
                  <button
                    type="button"
                    className="rounded bg-primary px-3 py-1 text-xs text-on-primary"
                    onClick={() => save(w.week_index, 'finalise')}
                  >
                    Enregistrer
                  </button>
                  {w.report?.id && (
                    <button
                      type="button"
                      className="rounded border border-primary px-3 py-1 text-xs text-primary"
                      onClick={() => exportPdf(w.report.id)}
                    >
                      Export PDF
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </ScrollablePanel>
    </section>
  )
}
