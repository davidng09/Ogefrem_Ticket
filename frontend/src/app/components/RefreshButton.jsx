import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

const MIN_SPIN_MS = 600

export function RefreshButton({ onRefresh, className = '', size = 16, disabled = false }) {
  const [spinning, setSpinning] = useState(false)

  async function handleClick() {
    if (spinning || disabled) return
    setSpinning(true)
    try {
      const minSpin = new Promise((resolve) => {
        setTimeout(resolve, MIN_SPIN_MS)
      })
      await Promise.all([Promise.resolve(onRefresh?.()), minSpin])
    } finally {
      setSpinning(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || spinning}
      className={`rounded border border-outline-variant p-2 text-on-surface-variant transition hover:bg-surface-low hover:text-on-surface disabled:opacity-50 ${className}`}
      aria-label="Actualiser"
      title="Actualiser"
    >
      <RefreshCw size={size} className={spinning ? 'animate-spin' : ''} />
    </button>
  )
}
