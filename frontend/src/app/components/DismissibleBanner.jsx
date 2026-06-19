import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function DismissibleBanner({
  storageKey,
  children,
  className = '',
  autoHideMs = 12000,
}) {
  const [visible, setVisible] = useState(() => {
    if (!storageKey) return true
    try {
      return sessionStorage.getItem(storageKey) !== '1'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!visible || !autoHideMs) return undefined
    const timer = window.setTimeout(() => setVisible(false), autoHideMs)
    return () => window.clearTimeout(timer)
  }, [visible, autoHideMs])

  function dismiss() {
    setVisible(false)
    if (!storageKey) return
    try {
      sessionStorage.setItem(storageKey, '1')
    } catch {
      /* ignore */
    }
  }

  if (!visible) return null

  return (
    <div className={`relative pr-9 ${className}`}>
      {children}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded p-1 text-on-surface-variant hover:bg-surface-low hover:text-on-surface"
        aria-label="Fermer la notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
