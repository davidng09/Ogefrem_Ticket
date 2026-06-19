import { useCallback, useEffect, useState } from 'react'

function storageKey(userId) {
  return `ogefrem:agent-pinned:${userId}`
}

function readPinned(userId) {
  if (!userId) return new Set()
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const ids = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

export function usePinnedTickets(userId) {
  const [pinnedIds, setPinnedIds] = useState(() => readPinned(userId))

  useEffect(() => {
    setPinnedIds(readPinned(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    localStorage.setItem(storageKey(userId), JSON.stringify([...pinnedIds]))
  }, [pinnedIds, userId])

  const togglePin = useCallback((ticketId) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(ticketId)) next.delete(ticketId)
      else next.add(ticketId)
      return next
    })
  }, [])

  const isPinned = useCallback((ticketId) => pinnedIds.has(ticketId), [pinnedIds])

  return { pinnedIds, togglePin, isPinned }
}
