import { createPortal } from 'react-dom'

export function Modal({ open, onClose, title, children, wide = false, hideHeader = false }) {
  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`workspace-glass-modal max-h-[90vh] overflow-y-auto rounded border border-outline-variant shadow-lg ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : 'modal-title'}
      >
        {!hideHeader && (
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h3 id="modal-title" className="text-base font-semibold">
              {title}
            </h3>
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-surface-low">
              Fermer
            </button>
          </div>
        )}
        {hideHeader && (
          <div className="flex justify-end px-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs hover:bg-surface-low">
              Fermer
            </button>
          </div>
        )}
        <div className={hideHeader ? 'px-4 pb-4' : 'p-4'}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
