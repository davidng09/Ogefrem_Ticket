const STORAGE_KEY = 'ogefrem_tracked_tickets'

export function readTrackedTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addTrackedTicket(entry) {
  const list = readTrackedTickets()
  const next = [
    {
      ticket_number: entry.ticket_number || '—',
      tracking_token: entry.tracking_token || '',
      submitted_at: entry.submitted_at || new Date().toISOString(),
      reporter_full_name: entry.reporter_full_name || '',
      category_label: entry.category_label || '',
      description: entry.description ? String(entry.description) : '',
      timeline: entry.timeline || null,
      status_label: entry.status_label || 'Reçu',
    },
    ...list.filter((t) => t.ticket_number !== entry.ticket_number),
  ]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function updateTrackedTicket(ticketNumber, patch) {
  const list = readTrackedTickets().map((t) =>
    t.ticket_number === ticketNumber ? { ...t, ...patch } : t,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function notifyTrackedTicketsUpdated() {
  window.dispatchEvent(new Event('ogefrem-tracked-tickets-updated'))
}
