import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useCallback, useEffect, useState } from 'react'
import { RefreshButton } from './RefreshButton'
import { BreakdownChart } from './BreakdownChart'
import { apiRequest } from '../api'
import { useTicketTabStats } from '../hooks/useTabStats'
import { formatEmittedDate, formatPriorityLabel, formatServiceLabel, getPriorityChartColor, subDirectorates } from '../uiHelpers'

const PERIODS = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '3 mois' },
  { value: '365d', label: 'Année' },
]

function KpiCard({ label, value, suffix = '', hint = '', onClick }) {
  const className =
    'rounded border border-outline-variant bg-surface-lowest p-4 text-left shadow-sm' +
    (onClick ? ' cursor-pointer transition hover:border-primary hover:bg-surface-low' : '')

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p className="mt-1 text-2xl font-bold text-primary">
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-on-surface-variant">{suffix}</span>}
        </p>
        {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
      </button>
    )
  }

  return (
    <article className={className}>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-on-surface-variant">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </article>
  )
}

export function ExecutiveDashboard({
  showSubDirectorateFilter = false,
  onNavigateToOpenTickets,
  refreshToken = 0,
  showRefreshButton = true,
}) {
  const [period, setPeriod] = useState('30d')
  const [subDirectorateId, setSubDirectorateId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { stats: openStats } = useTicketTabStats(null, 'open', { pollMs: 60000 })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ period })
      if (showSubDirectorateFilter && subDirectorateId) {
        params.set('sub_directorate_id', subDirectorateId)
      }
      const res = await apiRequest(`/analytics/dashboard?${params}`)
      setData(res.dashboard)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period, subDirectorateId, showSubDirectorateFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (refreshToken > 0) load()
  }, [refreshToken, load])

  if (loading && !data) {
    return <p className="text-sm text-on-surface-variant">Chargement du tableau de bord…</p>
  }

  if (error) {
    return (
      <p className="rounded border border-error/40 bg-red-50/80 p-3 text-sm text-red-800">
        {error}
      </p>
    )
  }

  if (!data) return null

  const { kpis, series, breakdowns, alerts, tables } = data
  const volumeData = (series.submitted_by_week || []).map((row, i) => ({
    week: row.week,
    soumis: row.count,
    resolus: series.resolved_by_week?.[i]?.count ?? 0,
  }))

  const priorityData = (breakdowns.by_priority || []).map((row) => ({
    ...row,
    displayLabel: formatPriorityLabel(row.label),
    priority: row.label,
  }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {showSubDirectorateFilter && (
          <select
            value={subDirectorateId}
            onChange={(e) => setSubDirectorateId(e.target.value)}
            className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm"
          >
            <option value="">Toutes les sous-directions</option>
            {subDirectorates.map((sd) => (
              <option key={sd.id} value={String(sd.id)}>
                {sd.short}
              </option>
            ))}
          </select>
        )}
        {showRefreshButton && <RefreshButton onRefresh={load} />}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tickets ouverts"
          value={openStats?.total ?? kpis.open}
          onClick={onNavigateToOpenTickets}
        />
        <KpiCard
          label="Délai moyen résolution"
          value={kpis.avg_resolution_hours}
          suffix="h"
          hint={`Première réponse : ${kpis.avg_first_response_hours}h`}
        />
        <KpiCard
          label="Taux résolution"
          value={kpis.resolved + kpis.open > 0 ? Math.round((kpis.resolved / (kpis.resolved + kpis.open)) * 100) : 0}
          suffix="%"
          hint={`${kpis.resolved} résolus · ${kpis.sla_breached} SLA dépassés`}
        />
        <KpiCard label="Rapports en attente" value={kpis.pending_reports} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="SLA dépassés" value={kpis.sla_breached} />
        <KpiCard label="Résolus (période)" value={kpis.resolved} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">
            {showSubDirectorateFilter
              ? 'Directions émettrices (tickets soumis)'
              : 'Directions — interventions de votre périmètre'}
          </h3>
          <BreakdownChart
            prefer="bars"
            topN={8}
            labelMode="direction"
            data={
              showSubDirectorateFilter
                ? breakdowns.by_reporter_direction
                : breakdowns.by_intervention_direction
            }
            emptyMessage="Aucune donnée par direction."
          />
        </article>

        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Distribution par catégorie</h3>
          <BreakdownChart
            prefer="auto"
            centerLabel="DANTIC"
            data={breakdowns.by_category}
            emptyMessage="Aucune donnée par catégorie."
          />
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Volume d&apos;incidents (soumis / résolus)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="soumis" name="Signalés" stroke="#dc2626" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolus" name="Résolus" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Par priorité</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayLabel" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.priority} fill={getPriorityChartColor(entry.priority)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Par service</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdowns.by_service || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      {alerts?.length > 0 && (
        <section className="rounded border border-amber-200 bg-amber-50/80 p-4">
          <h3 className="mb-2 text-sm font-semibold text-amber-900">Alertes SLA</h3>
          <ul className="space-y-1 text-sm text-amber-900">
            {alerts.map((a) => (
              <li key={a.ticket_number}>
                {a.ticket_number} — {formatServiceLabel(a.service_label)} — échéance {formatEmittedDate(a.sla_due_at)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Top retards</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="p-1">Ticket</th>
                <th className="p-1">Service</th>
                <th className="p-1">Heures</th>
              </tr>
            </thead>
            <tbody>
              {(tables.top_delays || []).map((row) => (
                <tr key={row.ticket_number} className="border-t border-outline-variant">
                  <td className="p-1 font-medium">{row.ticket_number}</td>
                  <td className="p-1">{formatServiceLabel(row.service_label)}</td>
                  <td className="p-1">{row.delay_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold">Services les plus sollicités</h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="p-1">Service</th>
                <th className="p-1">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {(tables.top_services || []).map((row) => (
                <tr key={row.service_label} className="border-t border-outline-variant">
                  <td className="p-1">{formatServiceLabel(row.service_label)}</td>
                  <td className="p-1 font-medium">{row.ticket_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  )
}
