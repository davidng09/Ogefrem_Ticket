import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { enrichBreakdownWithDirectionCodes } from '../directionHelpers'

const PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#d97706',
  '#16a34a',
  '#dc2626',
  '#0891b2',
  '#4b5563',
  '#ea580c',
  '#9333ea',
  '#0d9488',
  '#ca8a04',
  '#64748b',
]

function normalizeItems(data, labelMode) {
  const base = (data || [])
    .filter((d) => d.count > 0)
    .map((d) => ({ label: d.label || 'Non défini', count: d.count }))
    .sort((a, b) => b.count - a.count)

  if (labelMode === 'direction') {
    return enrichBreakdownWithDirectionCodes(base)
  }

  return base.map((item) => ({
    ...item,
    shortLabel: item.label,
    fullLabel: item.label,
    rawLabel: item.label,
  }))
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded border border-outline-variant bg-surface-lowest px-2.5 py-1.5 text-xs shadow-md">
      <p className="max-w-[16rem] font-medium text-on-surface">{row.fullLabel}</p>
      <p className="mt-0.5 tabular-nums text-on-surface-variant">
        {row.count} ticket{row.count > 1 ? 's' : ''}
      </p>
    </div>
  )
}

function DirectionSigle({ code, fullName, className = '' }) {
  return (
    <abbr
      title={fullName}
      className={`cursor-help font-semibold tracking-wide no-underline ${className}`}
    >
      {code}
    </abbr>
  )
}

/** Barres horizontales proportionnelles — idéal pour de nombreuses directions */
export function RankedBarBreakdown({
  data,
  emptyMessage = 'Aucune donnée.',
  maxHeight = '16rem',
  topN = 10,
  groupOthers = true,
  labelMode = 'default',
}) {
  const items = normalizeItems(data, labelMode)
  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">{emptyMessage}</p>
  }

  const total = items.reduce((sum, d) => sum + d.count, 0)
  let display = items

  if (groupOthers && items.length > topN) {
    const top = items.slice(0, topN)
    const rest = items.slice(topN)
    const restCount = rest.reduce((s, i) => s + i.count, 0)
    display = [
      ...top,
      {
        label: `Autres (${rest.length} directions)`,
        shortLabel: 'Autres',
        fullLabel: `Autres (${rest.length} directions)`,
        rawLabel: `Autres (${rest.length} directions)`,
        count: restCount,
        isOthers: true,
      },
    ]
  }

  const maxCount = Math.max(...display.map((d) => d.count), 1)

  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant">
        <span className="font-semibold text-primary">{total}</span> ticket{total > 1 ? 's' : ''} au total
        {items.length > 1 && (
          <span className="ml-1">· {items.length} direction{items.length > 1 ? 's' : ''}</span>
        )}
      </p>
      <ul className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight }}>
        {display.map((item, index) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
          const color = item.isOthers ? '#64748b' : PALETTE[index % PALETTE.length]
          const widthPct = Math.max(4, Math.round((item.count / maxCount) * 100))

          return (
            <li key={`${item.rawLabel}-${index}`}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                {labelMode === 'direction' ? (
                  <DirectionSigle code={item.shortLabel} fullName={item.fullLabel} />
                ) : (
                  <span className="min-w-0 truncate font-medium" title={item.fullLabel}>
                    {item.shortLabel}
                  </span>
                )}
                <span className="shrink-0 tabular-nums text-on-surface-variant">
                  <span className="font-semibold text-on-surface">{item.count}</span>
                  <span className="ml-1">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-high">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                  title={item.fullLabel}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Camembert compact — réservé aux jeux de données restreints (≤ 6 catégories) */
export function CompactDonutBreakdown({
  data,
  emptyMessage = 'Aucune donnée.',
  centerLabel = '',
  labelMode = 'default',
}) {
  const items = normalizeItems(data, labelMode)
  const total = items.reduce((sum, d) => sum + d.count, 0)

  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">{emptyMessage}</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative mx-auto h-44 w-full max-w-[11rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="count"
              nameKey="shortLabel"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
            >
              {items.map((entry, index) => (
                <Cell key={entry.rawLabel} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              {centerLabel}
            </span>
          </div>
        )}
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, index) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
          return (
            <li key={item.rawLabel} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                />
                {labelMode === 'direction' ? (
                  <DirectionSigle code={item.shortLabel} fullName={item.fullLabel} />
                ) : (
                  <span className="truncate" title={item.fullLabel}>
                    {item.shortLabel}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {item.count}{' '}
                <span className="text-xs font-normal text-on-surface-variant">({pct}%)</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Choisit automatiquement la visualisation :
 * - barres classées si beaucoup d'entrées ou libellés longs (directions)
 * - camembert si peu de catégories courtes
 */
export function BreakdownChart({
  data,
  emptyMessage,
  prefer = 'auto',
  centerLabel,
  topN = 10,
  labelMode = 'default',
}) {
  const items = normalizeItems(data, labelMode)

  if (!items.length) {
    return <p className="text-sm text-on-surface-variant">{emptyMessage || 'Aucune donnée.'}</p>
  }

  const useBars =
    prefer === 'bars' ||
    labelMode === 'direction' ||
    (prefer === 'auto' && (items.length > 6 || items.some((i) => (i.fullLabel?.length || 0) > 22)))

  if (useBars) {
    return (
      <RankedBarBreakdown
        data={data}
        emptyMessage={emptyMessage}
        topN={topN}
        labelMode={labelMode}
        maxHeight={items.length > 8 ? '18rem' : '14rem'}
      />
    )
  }

  return (
    <CompactDonutBreakdown
      data={data}
      emptyMessage={emptyMessage}
      centerLabel={centerLabel}
      labelMode={labelMode}
    />
  )
}
