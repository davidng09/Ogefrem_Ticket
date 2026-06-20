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
import { AlertTriangle, CheckCircle2, Clock, Layers } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
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

function formatOverdueLabel(slaDueAt) {
  if (!slaDueAt) return '—'
  const hours = Math.max(0, Math.floor((Date.now() - new Date(slaDueAt).getTime()) / 3600000))
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  const rem = hours % 24
  return rem > 0 ? `${days} j ${rem} h` : `${days} j`
}

function formatDelayHours(hours) {
  const h = Number(hours) || 0
  if (h >= 48) return `${Math.round(h / 24)} j`
  if (h >= 24) return `${Math.floor(h / 24)} j ${h % 24} h`
  return `${h} h`
}

function InsightPanel({ icon: Icon, title, subtitle, count, accent = 'default', children }) {
  const accentHeader =
    accent === 'warning'
      ? 'border-amber-200/80 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-950/30'
      : 'bg-surface-low'

  return (
    <article className="flex min-h-[18rem] flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-lowest shadow-sm">
      <header className={`flex items-start justify-between gap-3 border-b border-outline-variant px-4 py-3 ${accentHeader}`}>
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              accent === 'warning'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                : 'bg-surface-container text-primary'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p> : null}
          </div>
        </div>
        {count != null ? (
          <span className="shrink-0 rounded-full border border-outline-variant bg-surface-lowest px-2.5 py-0.5 text-xs font-semibold tabular-nums text-on-surface">
            {count}
          </span>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">{children}</div>
    </article>
  )
}

function EmptyInsight({ icon: Icon, message }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <Icon className="h-8 w-8 text-on-surface-variant/40" aria-hidden />
      <p className="max-w-[14rem] text-xs text-on-surface-variant">{message}</p>
    </div>
  )
}

function RankedBar({ value, max, tone = 'primary' }) {
  const pct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0
  const fill = tone === 'warning' ? 'bg-amber-500' : tone === 'danger' ? 'bg-red-500' : 'bg-primary'

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container">
      <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function InsightScrollArea({ children, className = '' }) {
  return (
    <div className={`insight-panel-scroll min-h-0 flex-1 ${className}`} tabIndex={0}>
      {children}
    </div>
  )
}

function SlaAlertsPanel({ alerts }) {
  if (!alerts?.length) {
    return (
      <InsightPanel
        icon={CheckCircle2}
        title="Alertes SLA"
        subtitle="Tickets ouverts hors délai"
        count={0}
      >
        <EmptyInsight icon={CheckCircle2} message="Aucune alerte SLA active — tous les délais sont respectés." />
      </InsightPanel>
    )
  }

  return (
    <InsightPanel
      icon={AlertTriangle}
      title="Alertes SLA"
      subtitle="Tickets ouverts hors délai"
      count={alerts.length}
      accent="warning"
    >
      <InsightScrollArea>
        <ul className="flex flex-col gap-2">
          {alerts.map((alert) => (
            <li
              key={alert.ticket_number}
              className="rounded-md border border-amber-200/70 border-l-[3px] border-l-amber-500 bg-amber-50/50 px-3 py-2.5 dark:border-amber-800 dark:border-l-amber-500 dark:bg-amber-950/25"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-mono text-xs font-semibold text-on-surface">{alert.ticket_number}</p>
                <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
                  +{formatOverdueLabel(alert.sla_due_at)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-on-surface-variant">
                {formatServiceLabel(alert.service_label)}
              </p>
              <p className="mt-1.5 text-[11px] text-amber-900/90 dark:text-amber-200/90">
                Échéance {formatEmittedDate(alert.sla_due_at)}
              </p>
            </li>
          ))}
        </ul>
      </InsightScrollArea>
    </InsightPanel>
  )
}

function TopDelaysPanel({ rows }) {
  const maxDelay = useMemo(
    () => Math.max(1, ...(rows || []).map((r) => Number(r.delay_hours) || 0)),
    [rows],
  )

  if (!rows?.length) {
    return (
      <InsightPanel icon={Clock} title="Top retards" subtitle="Tickets ouverts les plus anciens" count={0}>
        <EmptyInsight icon={Clock} message="Aucun ticket ouvert avec retard significatif sur la période." />
      </InsightPanel>
    )
  }

  return (
    <InsightPanel
      icon={Clock}
      title="Top retards"
      subtitle="Tickets ouverts les plus anciens"
      count={rows.length}
    >
      <InsightScrollArea>
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={row.ticket_number} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-container text-[10px] font-bold tabular-nums text-on-surface-variant">
                    {index + 1}
                  </span>
                  <span className="truncate font-mono text-xs font-semibold text-on-surface">{row.ticket_number}</span>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                  {formatDelayHours(row.delay_hours)}
                </span>
              </div>
              <RankedBar
                value={Number(row.delay_hours) || 0}
                max={maxDelay}
                tone={index === 0 ? 'danger' : index < 3 ? 'warning' : 'primary'}
              />
              <p className="truncate text-[11px] text-on-surface-variant">{formatServiceLabel(row.service_label)}</p>
            </li>
          ))}
        </ol>
      </InsightScrollArea>
    </InsightPanel>
  )
}

function TopServicesPanel({ rows }) {
  const maxCount = useMemo(
    () => Math.max(1, ...(rows || []).map((r) => Number(r.ticket_count) || 0)),
    [rows],
  )
  const total = useMemo(
    () => (rows || []).reduce((sum, r) => sum + (Number(r.ticket_count) || 0), 0),
    [rows],
  )

  if (!rows?.length) {
    return (
      <InsightPanel icon={Layers} title="Services les plus sollicités" subtitle="Volume sur la période" count={0}>
        <EmptyInsight icon={Layers} message="Aucune donnée de service sur la période sélectionnée." />
      </InsightPanel>
    )
  }

  return (
    <InsightPanel
      icon={Layers}
      title="Services les plus sollicités"
      subtitle={`${total} ticket${total > 1 ? 's' : ''} répartis ci-dessous`}
      count={rows.length}
    >
      <ol className="flex flex-1 flex-col gap-3">
        {rows.map((row, index) => {
          const count = Number(row.ticket_count) || 0
          const share = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <li key={row.service_label || index} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-container text-[10px] font-bold tabular-nums text-on-surface-variant">
                    {index + 1}
                  </span>
                  <p className="line-clamp-2 text-xs font-medium leading-snug text-on-surface">
                    {formatServiceLabel(row.service_label)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold tabular-nums text-primary">{count}</p>
                  <p className="text-[10px] tabular-nums text-on-surface-variant">{share} %</p>
                </div>
              </div>
              <RankedBar value={count} max={maxCount} tone="primary" />
            </li>
          )
        })}
      </ol>
    </InsightPanel>
  )
}

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

      <section aria-label="Vue opérationnelle">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-on-surface">Vue opérationnelle</h2>
          <p className="text-xs text-on-surface-variant">
            Alertes SLA, tickets les plus en retard et services les plus demandés
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <SlaAlertsPanel alerts={alerts} />
          <TopDelaysPanel rows={tables?.top_delays} />
          <TopServicesPanel rows={tables?.top_services} />
        </div>
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
    </div>
  )
}
