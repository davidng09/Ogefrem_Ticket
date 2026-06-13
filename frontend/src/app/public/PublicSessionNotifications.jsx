import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import { formatEmittedDate } from '../uiHelpers'
import { readSessionTickets } from './publicSessionTickets'

export function PublicSessionNotifications() {
  const [items, setItems] = useState(() => readSessionTickets())
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(panelRef, close, open)

  useEffect(() => {
    function sync() {
      setItems(readSessionTickets())
    }
    window.addEventListener('ogefrem-public-tickets-updated', sync)
    return () => window.removeEventListener('ogefrem-public-tickets-updated', sync)
  }, [])

  const count = items.length

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded border border-outline-variant bg-surface-low p-2"
        aria-label="Notifications de la session"
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
        <div className="absolute right-0 z-30 mt-2 max-h-80 w-80 overflow-y-auto rounded border border-outline-variant bg-surface-lowest p-2 shadow-lg">
          <p className="mb-2 border-b border-outline-variant pb-2 text-xs font-semibold uppercase text-on-surface-variant">
            Tickets soumis cette session ({count})
          </p>
          {count === 0 ? (
            <p className="p-2 text-xs text-on-surface-variant">Aucun ticket soumis pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={`${item.id}-${item.submitted_at}`}
                  className="rounded border border-outline-variant bg-surface-low p-2 text-left"
                >
                  <p className="text-sm font-semibold">{item.ticket_number}</p>
                  <p className="text-xs text-on-surface-variant">
                    {formatEmittedDate(item.submitted_at)}
                    {item.reporter_full_name ? ` — ${item.reporter_full_name}` : ''}
                  </p>
                  {item.category_label && (
                    <p className="mt-1 text-xs text-on-surface-variant">{item.category_label}</p>
                  )}
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
