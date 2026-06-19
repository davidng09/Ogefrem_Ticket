import { useCallback, useEffect, useRef, useState } from 'react'

export function useSeenTabCounts(activeTabId, tabTotals, options = {}) {
  const { deferConsultFor = [] } = options
  const deferredHandled = useRef(new Set())
  const deferKey = deferConsultFor.join('|')
  const [seen, setSeen] = useState({})
  const [consulted, setConsulted] = useState({})

  useEffect(() => {
    if (!activeTabId || tabTotals[activeTabId] === undefined) return
    setSeen((prev) => {
      const nextCount = tabTotals[activeTabId]
      if (prev[activeTabId] === nextCount) return prev
      return { ...prev, [activeTabId]: nextCount }
    })

    if (deferConsultFor.includes(activeTabId) && !deferredHandled.current.has(activeTabId)) {
      deferredHandled.current.add(activeTabId)
      return
    }

    setConsulted((prev) => {
      if (prev[activeTabId]) return prev
      return { ...prev, [activeTabId]: true }
    })
  }, [activeTabId, tabTotals, deferKey])
  const hasNew = useCallback(
    (tabId) => {
      const current = tabTotals[tabId] ?? 0
      return current > 0 && current > (seen[tabId] ?? 0)
    },
    [seen, tabTotals],
  )

  const wasConsulted = useCallback((tabId) => consulted[tabId] ?? false, [consulted])

  return { hasNew, wasConsulted }
}
