import { getHomeRouteByRole } from './AuthContext'

export function getNotificationNavigation(notification, roleCode) {
  const base = getHomeRouteByRole(roleCode)
  const ticketId = notification?.ticket_id
  const type = notification?.type || ''

  if (type === 'monthly_bundle_received') {
    return { path: base, search: '?tab=reports' }
  }

  if (type === 'ticket_consigne') {
    return { path: base, search: ticketId ? `?tab=constraints&ticketId=${ticketId}` : '?tab=constraints' }
  }

  if (type.includes('report')) {
    return { path: base, search: ticketId ? `?tab=reports&ticketId=${ticketId}` : '?tab=reports' }
  }

  if (ticketId) {
    if (roleCode === 'TECHNICIEN' || roleCode === 'CHEF_BUREAU') {
      return { path: base, search: `?tab=resolved&ticketId=${ticketId}` }
    }
    return { path: base, search: `?tab=open&ticketId=${ticketId}` }
  }

  return { path: base, search: '' }
}

export function applyWorkspaceSearchParams(searchParams, handlers) {
  const tab = searchParams.get('tab')
  const ticketId = searchParams.get('ticketId')
  if (tab && handlers.setTab) handlers.setTab(tab)
  if (ticketId && handlers.setFocusTicketId) handlers.setFocusTicketId(Number(ticketId))
}
