import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api'
import { formatEmittedDate, formatPriorityLabel, getPriorityBadgeClass, truncateText } from '../uiHelpers'
import { getCurrentYearMonth, getMonthWeeks } from '../utils/calendarWeeks'
import { PaginationBar } from './PaginationBar'
import { ScrollablePanel } from './ScrollablePanel'

const GROUP_OPTIONS = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
]

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function PaginatedReportsPanel({
  endpoint,
  onSelectReport,
  emptyMessage = 'Aucun rapport.',
  variant = 'list',
}) {
  const { year: currentYear, monthIndex: currentMonthIndex } = getCurrentYearMonth()
  const [groupBy, setGroupBy] = useState('month')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonthIndex + 1)
  const [weekIndex, setWeekIndex] = useState(1)
  const [page, setPage] = useState(1)
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState(null)
  const [availableYears, setAvailableYears] = useState([currentYear])
  const [loading, setLoading] = useState(true)

  const weeks = useMemo(() => getMonthWeeks(year, month - 1), [year, month])

  useEffect(() => {
    if (weeks.length && !weeks.some((w) => w.weekIndex === weekIndex)) {
      setWeekIndex(weeks[0]?.weekIndex ?? 1)
    }
  }, [weeks, weekIndex])

  const selectedWeek = weeks.find((w) => w.weekIndex === weekIndex) ?? weeks[0]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        group_by: groupBy,
        year: String(year),
        page: String(page),
        per_page: '15',
      })
      if (groupBy === 'month' || groupBy === 'week') {
        params.set('month', String(month))
      }
      if (groupBy === 'week' && selectedWeek) {
        params.set('week_start', selectedWeek.weekStart)
        params.set('week_end', selectedWeek.weekEnd)
      }
      const separator = endpoint.includes('?') ? '&' : '?'
      const data = await apiRequest(`${endpoint}${separator}${params}`)
      setReports(data.reports || [])
      setPagination(data.pagination || null)
      if (data.available_years?.length) {
        setAvailableYears(data.available_years)
      }
    } catch {
      setReports([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [endpoint, groupBy, year, month, page, selectedWeek])

  useEffect(() => {
    load()
  }, [load])

  function handleGroupChange(next) {
    setGroupBy(next)
    setPage(1)
  }

  function handleYearChange(nextYear) {
    setYear(Number(nextYear))
    setPage(1)
  }

  function handleMonthChange(nextMonth) {
    setMonth(Number(nextMonth))
    setPage(1)
  }

  return (
    <div className="rounded border border-outline-variant bg-surface-lowest shadow-sm">
      <div className="flex flex-wrap items-end gap-3 border-b border-outline-variant p-3">
        <label className="text-xs uppercase text-on-surface-variant">
          Période
          <select
            value={groupBy}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
          >
            {GROUP_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs uppercase text-on-surface-variant">
          Année
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
          >
            {(availableYears.length ? availableYears : [year]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {(groupBy === 'month' || groupBy === 'week') && (
          <label className="text-xs uppercase text-on-surface-variant">
            Mois
            <select
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {groupBy === 'week' && weeks.length > 0 && (
          <label className="text-xs uppercase text-on-surface-variant">
            Semaine
            <select
              value={weekIndex}
              onChange={(e) => {
                setWeekIndex(Number(e.target.value))
                setPage(1)
              }}
              className="mt-1 block rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
            >
              {weeks.map((w) => (
                <option key={w.weekIndex} value={w.weekIndex}>
                  {w.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <p className="p-4 text-sm text-on-surface-variant">Chargement…</p>
      ) : reports.length === 0 ? (
        <p className="p-4 text-sm text-on-surface-variant">{emptyMessage}</p>
      ) : variant === 'table' ? (
        <ScrollablePanel>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="p-2">Ticket</th>
                  <th className="p-2">Catégorie</th>
                  <th className="p-2">Auteur</th>
                  <th className="p-2">Validé le</th>
                  <th className="p-2">Extrait</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((row) => (
                  <tr key={row.id} className="border-t border-outline-variant">
                    <td className="p-2 font-semibold">{row.ticket_number}</td>
                    <td className="p-2">{row.category_label}</td>
                    <td className="p-2">{row.author_name}</td>
                    <td className="p-2 text-xs">{formatEmittedDate(row.validated_at)}</td>
                    <td className="p-2 text-xs text-on-surface-variant">
                      {truncateText(row.report_body, 80)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollablePanel>
      ) : (
        <ScrollablePanel className="divide-y divide-outline-variant">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-surface-low"
              onClick={() => onSelectReport?.(report)}
            >
              <div>
                <p className="text-sm font-semibold">{report.ticket_number}</p>
                <p className="text-xs text-on-surface-variant">{truncateText(report.body, 100)}</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {report.author_name} — {formatEmittedDate(report.created_at)}
                </p>
              </div>
              {report.priority && (
                <span
                  className={`shrink-0 rounded px-2 py-1 text-xs ${getPriorityBadgeClass(report.priority)}`}
                >
                  {formatPriorityLabel(report.priority)}
                </span>
              )}
            </button>
          ))}
        </ScrollablePanel>
      )}

      <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="rapports" />
    </div>
  )
}
