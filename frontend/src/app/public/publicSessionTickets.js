const SESSION_KEY = 'ogefrem_public_session_tickets'

export function readSessionTickets() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addSessionTicket(entry) {
  const list = readSessionTickets()
  const next = [
    {
      id: entry.id || Date.now(),
      ticket_number: entry.ticket_number || '—',
      submitted_at: entry.submitted_at || new Date().toISOString(),
      reporter_full_name: entry.reporter_full_name || '',
      category_label: entry.category_label || '',
      description: entry.description ? String(entry.description).slice(0, 120) : '',
    },
    ...list,
  ]
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
  return next
}

export function clearSessionTickets() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function notifyPublicTicketsUpdated() {
  window.dispatchEvent(new Event('ogefrem-public-tickets-updated'))
}
