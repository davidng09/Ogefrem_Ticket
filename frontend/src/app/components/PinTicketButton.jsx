import { Pin } from 'lucide-react'

export function PinTicketButton({ pinned, onToggle, className = '' }) {
  return (
    <button
      type="button"
      title={pinned ? 'Désépingler' : 'Épingler'}
      aria-label={pinned ? 'Désépingler le ticket' : 'Épingler le ticket'}
      aria-pressed={pinned}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`rounded p-1 transition hover:bg-surface-low ${
        pinned ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
      } ${className}`}
    >
      <Pin size={16} strokeWidth={2.25} className={pinned ? 'fill-current' : ''} />
    </button>
  )
}
