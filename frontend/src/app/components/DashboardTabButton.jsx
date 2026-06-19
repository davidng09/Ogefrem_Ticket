import { useEffect, useMemo, useState } from 'react'
import { truncateText } from '../uiHelpers'

const TOTAL_DISPLAY_MS = 5200
const BREAKDOWN_DISPLAY_MS = 2200

function buildPrioritySlides(total, priority) {
  const slides = [
    {
      key: 'total',
      value: total,
      label: 'Total',
      colorClass: 'text-primary',
      duration: TOTAL_DISPLAY_MS,
      isTotal: true,
    },
  ]
  if (priority?.urgent > 0) {
    slides.push({
      key: 'urgent',
      value: priority.urgent,
      label: 'Urgent',
      colorClass: 'text-red-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  if (priority?.elevee > 0) {
    slides.push({
      key: 'elevee',
      value: priority.elevee,
      label: 'Élevée',
      colorClass: 'text-orange-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  if (priority?.normale > 0) {
    slides.push({
      key: 'normale',
      value: priority.normale,
      label: 'Normale',
      colorClass: 'text-yellow-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  return slides
}

function buildCategorySlides(total, categories = []) {
  const categoryColors = [
    'text-blue-600',
    'text-violet-600',
    'text-teal-600',
    'text-rose-600',
    'text-indigo-600',
    'text-cyan-600',
  ]
  const slides = [
    {
      key: 'total',
      value: total,
      label: 'Total',
      colorClass: 'text-primary',
      duration: TOTAL_DISPLAY_MS,
      isTotal: true,
    },
  ]
  categories
    .filter((c) => c.count > 0)
    .slice(0, 6)
    .forEach((cat, index) => {
      slides.push({
        key: `category-${cat.label}`,
        value: cat.count,
        label: truncateText(cat.label, 22),
        colorClass: categoryColors[index % categoryColors.length],
        duration: BREAKDOWN_DISPLAY_MS,
      })
    })
  return slides
}

function buildReportSlides(total, reports) {
  const slides = [
    {
      key: 'total',
      value: total,
      label: 'En attente',
      colorClass: 'text-primary',
      duration: TOTAL_DISPLAY_MS,
      isTotal: true,
    },
  ]
  if (reports?.resolu > 0) {
    slides.push({
      key: 'resolu',
      value: reports.resolu,
      label: 'Résolu',
      colorClass: 'text-green-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  if (reports?.non_resolu > 0) {
    slides.push({
      key: 'non_resolu',
      value: reports.non_resolu,
      label: 'Non résolu',
      colorClass: 'text-error',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  return slides
}

function buildClosedTicketsSlides(total, closed) {
  const slides = [
    {
      key: 'total',
      value: total,
      label: 'Total',
      colorClass: 'text-primary',
      duration: TOTAL_DISPLAY_MS,
      isTotal: true,
    },
  ]
  if (closed?.returned > 0) {
    slides.push({
      key: 'returned',
      value: closed.returned,
      label: 'Redescendu',
      colorClass: 'text-amber-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  if (closed?.non_resolu > 0) {
    slides.push({
      key: 'non_resolu',
      value: closed.non_resolu,
      label: 'Non résolu',
      colorClass: 'text-amber-700',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  if (closed?.resolu > 0) {
    slides.push({
      key: 'resolu',
      value: closed.resolu,
      label: 'Résolu',
      colorClass: 'text-green-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  }
  return slides
}

function buildWeeklyRedactionSlides(pendingWeeks = []) {
  if (!pendingWeeks.length) return []

  const slides = [
    {
      key: 'total',
      value: pendingWeeks.length,
      label: pendingWeeks.length > 1 ? 'À rédiger' : 'Semaine',
      colorClass: 'text-primary',
      duration: TOTAL_DISPLAY_MS,
      isTotal: true,
    },
  ]

  pendingWeeks.forEach((week) => {
    slides.push({
      key: `week-${week.weekIndex}`,
      text: week.label || `Réd. Sém. ${week.weekIndex}`,
      label: week.isCurrent ? 'Semaine en cours' : 'Semaine passée',
      colorClass: week.isCurrent ? 'text-amber-600' : 'text-orange-600',
      duration: BREAKDOWN_DISPLAY_MS,
    })
  })

  return slides
}

function AnimatedTabCount({ slides }) {
  const [index, setIndex] = useState(0)
  const visible = slides.length ? slides : [{ key: 'empty', value: 0, label: '', colorClass: 'text-primary', duration: TOTAL_DISPLAY_MS }]

  const slidesKey = visible.map((s) => `${s.key}:${s.value}`).join('|')

  useEffect(() => {
    setIndex(0)
  }, [slidesKey])

  useEffect(() => {
    if (visible.length <= 1) return undefined
    const current = visible[index] ?? visible[0]
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % visible.length)
    }, current.duration ?? BREAKDOWN_DISPLAY_MS)
    return () => clearTimeout(id)
  }, [index, visible, slidesKey])

  const current = visible[index] ?? visible[0]

  return (
    <div className="tab-count-stage mt-1 h-12">
      <div key={`${current.key}-${index}`} className="tab-count-slide">
        {current.text ? (
          <p className={`text-sm font-bold leading-tight ${current.colorClass}`}>{current.text}</p>
        ) : (
          <p className={`text-3xl font-bold tabular-nums ${current.colorClass}`}>{current.value}</p>
        )}
        {current.label && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
            {current.label}
          </p>
        )}
      </div>
      {visible.length > 1 && (
        <div className="mt-1 flex justify-center gap-1">
          {visible.map((slide, i) => (
            <span
              key={slide.key}
              className={`h-1 w-1 rounded-full transition ${i === index ? 'bg-primary' : 'bg-outline-variant'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NavAnimatedCount({ slides }) {
  const [index, setIndex] = useState(0)
  const visible = slides.length ? slides : [{ key: 'empty', value: 0, label: '', colorClass: 'text-on-surface' }]

  const slidesKey = visible.map((s) => `${s.key}:${s.value}`).join('|')

  useEffect(() => {
    setIndex(0)
  }, [slidesKey])

  useEffect(() => {
    if (visible.length <= 1) return undefined
    const current = visible[index] ?? visible[0]
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % visible.length)
    }, current.duration ?? BREAKDOWN_DISPLAY_MS)
    return () => clearTimeout(id)
  }, [index, visible, slidesKey])

  const current = visible[index] ?? visible[0]

  return (
    <span className="inline-flex min-w-[2.75rem] flex-col items-center leading-none">
      <span
        key={`${current.key}-${index}`}
        className={`tab-count-slide text-xs font-bold tabular-nums ${current.colorClass}`}
      >
        {current.value}
      </span>
      {current.label && visible.length > 1 && (
        <span className="mt-0.5 max-w-[4.5rem] truncate text-[9px] uppercase text-on-surface-variant">
          {current.label}
        </span>
      )}
    </span>
  )
}

export function DashboardTabButton({
  label,
  count = 0,
  active,
  onClick,
  icon: Icon,
  hasNew = false,
  consulted = false,
  variant = 'simple',
  priority,
  reports,
  weeklyPending,
  categories,
  closed,
  hideCount = false,
}) {
  const slides = useMemo(() => {
    if (variant === 'priority') return buildPrioritySlides(count, priority)
    if (variant === 'categories') return buildCategorySlides(count, categories)
    if (variant === 'reports') return buildReportSlides(count, reports)
    if (variant === 'closed') return buildClosedTicketsSlides(count, closed)
    if (variant === 'weekly') return buildWeeklyRedactionSlides(weeklyPending)
    return [
      {
        key: 'total',
        value: count,
        label: '',
        colorClass: 'text-primary',
      },
    ]
  }, [variant, count, priority, categories, reports, weeklyPending, closed])

  const showAnimation =
    !consulted &&
    (((variant === 'priority' || variant === 'reports' || variant === 'categories' || variant === 'closed') &&
      count > 0 &&
      slides.length > 1) ||
      (variant === 'weekly' && slides.length > 0))

  const showWeeklyIdle = variant === 'weekly' && consulted && slides.length > 0
  const weeklyHighlight = slides.find((slide) => slide.key?.startsWith('week-')) ?? slides[0]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded border p-4 text-left shadow-sm transition ${
        active
          ? 'border-primary bg-primary/10'
          : 'border-outline-variant bg-surface-lowest hover:bg-surface-low'
      }`}
    >
      {hasNew && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error"
          aria-label="Nouvelles données"
        />
      )}
      <div className="flex items-center gap-2">
        {Icon ? (
          <Icon
            size={16}
            strokeWidth={active ? 2.25 : 2}
            className={`shrink-0 ${active ? 'text-primary' : 'text-on-surface-variant'}`}
          />
        ) : null}
        <p className="min-w-0 text-xs uppercase leading-snug text-on-surface-variant">{label}</p>
      </div>
      {hideCount ? (
        <p className="mt-1 text-xs text-on-surface-variant">&nbsp;</p>
      ) : showAnimation ? (
        <AnimatedTabCount slides={slides} />
      ) : showWeeklyIdle ? (
        <div className="tab-count-stage mt-1 h-12">
          {weeklyHighlight?.text ? (
            <>
              <p className={`text-sm font-bold leading-tight ${weeklyHighlight.colorClass}`}>
                {weeklyHighlight.text}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                {weeklyHighlight.label}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold tabular-nums text-primary">{weeklyHighlight?.value ?? count}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                {weeklyHighlight?.label || 'À rédiger'}
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="mt-1 text-3xl font-bold tabular-nums text-primary">{count}</p>
      )}
    </button>
  )
}

export function DashboardTabNavItem({
  label,
  count = 0,
  active,
  onClick,
  icon: Icon,
  hasNew = false,
  variant = 'simple',
  priority,
  consulted = false,
}) {
  const slides = useMemo(() => {
    if (variant === 'priority') return buildPrioritySlides(count, priority)
    return [{ key: 'total', value: count, label: '', colorClass: 'text-on-surface' }]
  }, [variant, count, priority])

  const showAnimation =
    !consulted && variant === 'priority' && count > 0 && slides.length > 1
  const showBadge = count > 0 && !showAnimation

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition ${
        active
          ? 'border-b-2 border-primary text-primary'
          : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={active ? 2.25 : 2} />}
      <span className="hidden sm:inline">{label}</span>
      {showAnimation && <NavAnimatedCount slides={slides} />}
      {showBadge && (
        <span className="min-w-[1.25rem] rounded-full bg-surface-high px-1.5 py-0.5 text-xs font-bold tabular-nums text-on-surface">
          {count}
        </span>
      )}
      {hasNew && (
        <span className="h-2 w-2 rounded-full bg-error" aria-label="Nouvelles données" />
      )}
    </button>
  )
}
