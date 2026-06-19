import { Bell, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../api'
import { useClickOutside } from '../hooks/useClickOutside'
import { formatEmittedDate } from '../uiHelpers'
import {
  notifyTrackedTicketsUpdated,
  readTrackedTickets,
  updateTrackedTicket,
} from './publicTrackedTickets'

const POLL_MS = 60_000

function timelineDotClass(step) {
  if (!step.done) {
    return 'border border-outline-variant bg-surface-lowest'
  }
  if (step.code === 'assigned') {
    return 'bg-blue-600 ring-2 ring-blue-200'
  }
  if (step.code === 'resolved') {
    return 'bg-green-600 ring-2 ring-green-200'
  }
  return 'bg-primary'
}

const HIDE_TIMELINE_DATE_CODES = new Set(['submitted', 'received'])

function TimelineSteps({ timeline }) {
  if (!timeline?.length) return null
  return (
    <ol className="mt-3 space-y-2 border-l-2 border-outline-variant pl-3">
      {timeline.map((step) => (
        <li key={step.code} className="relative text-xs">
          <span
            className={`absolute -left-[1.15rem] top-0.5 h-2.5 w-2.5 rounded-full ${timelineDotClass(step)}`}
          />
          <span className={step.done ? 'font-medium text-on-surface' : 'text-on-surface-variant'}>
            {step.label}
          </span>
          {step.done && step.at && !HIDE_TIMELINE_DATE_CODES.has(step.code) && (
            <span className="mt-0.5 block text-[11px] text-on-surface-variant">
              {formatEmittedDate(step.at)}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

function statusBadgeClass(label) {
  if (label === 'Résolu' || label === 'Clôturé') {
    return 'bg-green-100 text-green-800'
  }
  if (label === 'Non résolu') {
    return 'bg-amber-100 text-amber-900'
  }
  if (label === 'En traitement') {
    return 'bg-blue-100 text-blue-800'
  }
  return 'bg-primary/10 text-primary'
}

function DescriptionPopover({ item, open, onClose, onToggle }) {
  const anchorRef = useRef(null)
  useClickOutside(anchorRef, onClose, open)

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="mt-1 text-xs text-primary underline-offset-2 hover:underline"
        aria-expanded={open}
      >
        Description du problème
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-outline-variant bg-surface-lowest p-3 shadow-xl"
          role="dialog"
          aria-label="Description du problème"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-on-surface">Description du problème</p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-0.5 text-on-surface-variant hover:bg-surface-low"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
          {item.category_label && (
            <p className="mb-2 text-[11px] font-semibold uppercase text-on-surface-variant">
              {item.category_label}
            </p>
          )}
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-on-surface">
            {item.description || 'Aucune description enregistrée.'}
          </p>
        </div>
      )}
    </div>
  )
}

export function PublicSessionNotifications() {
  const [items, setItems] = useState(() => readTrackedTickets())
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [descriptionView, setDescriptionView] = useState(null)
  const panelRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(panelRef, close, open)

  const refreshTracking = useCallback(async () => {
    const list = readTrackedTickets()
    if (list.length === 0) {
      setItems([])
      return
    }
    setRefreshing(true)
    try {
      const updated = await Promise.all(
        list.map(async (item) => {
          if (!item.tracking_token) return item
          try {
            const data = await apiRequest(
              `/tickets/public/track?number=${encodeURIComponent(item.ticket_number)}&token=${encodeURIComponent(item.tracking_token)}`,
            )
            const tracking = data.tracking
            return updateTrackedTicket(item.ticket_number, {
              timeline: tracking.timeline,
              status_label: tracking.status_label,
              category_label: tracking.category_label,
              description: tracking.description
                ? String(tracking.description)
                : item.description,
              reporter_full_name: tracking.reporter_full_name || item.reporter_full_name,
              submitted_at: tracking.submitted_at || item.submitted_at,
            })
          } catch {
            return item
          }
        }),
      )
      setItems(readTrackedTickets())
      void updated
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    function sync() {
      setItems(readTrackedTickets())
    }
    window.addEventListener('ogefrem-tracked-tickets-updated', sync)
    return () => window.removeEventListener('ogefrem-tracked-tickets-updated', sync)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    refreshTracking()
    const timer = window.setInterval(refreshTracking, POLL_MS)
    return () => window.clearInterval(timer)
  }, [open, refreshTracking])

  const count = items.length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded border border-outline-variant bg-surface-low p-2"
        aria-label="Suivi des tickets soumis"
        aria-expanded={open}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-on-error">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-[28rem] w-[22rem] overflow-y-auto rounded border border-outline-variant bg-surface-lowest p-2 shadow-lg sm:w-96">
          <div className="mb-2 flex items-center justify-between border-b border-outline-variant pb-2">
            <p className="text-xs font-semibold uppercase text-on-surface-variant">
              Suivi de vos tickets ({count})
            </p>
            <button
              type="button"
              onClick={refreshTracking}
              disabled={refreshing}
              className="rounded p-1 text-on-surface-variant hover:bg-surface-low disabled:opacity-50"
              aria-label="Actualiser"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          {count === 0 ? (
            <p className="p-2 text-xs text-on-surface-variant">Aucun ticket suivi pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.ticket_number}
                  className="rounded border border-outline-variant bg-surface-low p-3 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{item.ticket_number}</p>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.status_label || 'Reçu')}`}
                    >
                      {item.status_label || 'Reçu'}
                    </span>
                  </div>

                  {item.category_label && (
                    <div className="mt-2 rounded bg-surface-lowest p-2">
                      <p className="text-xs font-semibold text-on-surface">{item.category_label}</p>
                      {item.description ? (
                        <DescriptionPopover
                          item={item}
                          open={descriptionView?.ticket_number === item.ticket_number}
                          onClose={() => setDescriptionView(null)}
                          onToggle={() =>
                            setDescriptionView((prev) =>
                              prev?.ticket_number === item.ticket_number ? null : item,
                            )
                          }
                        />
                      ) : (
                        <p className="mt-1 text-xs text-on-surface-variant">Description du problème</p>
                      )}
                    </div>
                  )}

                  <TimelineSteps timeline={item.timeline} />

                  <p className="mt-3 border-t border-outline-variant pt-2 text-[11px] text-on-surface-variant">
                    {item.reporter_full_name && (
                      <span className="font-medium text-on-surface">{item.reporter_full_name}</span>
                    )}
                    {item.reporter_full_name && item.submitted_at && ' · '}
                    {item.submitted_at && formatEmittedDate(item.submitted_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export { notifyTrackedTicketsUpdated }
