const PRIORITY_ORDER = { urgent: 0, elevee: 1, normale: 2, bloquant: 0, haute: 1 }

export const TICKET_CATEGORIES = [
  { id: 1, label: 'Réseau & WiFi' },
  { id: 2, label: 'Hardware & PC' },
  { id: 3, label: 'Logiciels / Apps' },
  { id: 4, label: 'Autres' },
  { id: 5, label: 'Impression / Scanner' },
  { id: 6, label: 'Accès & Comptes' },
]

export const TICKET_PRIORITIES = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'elevee', label: 'Élevée' },
  { value: 'normale', label: 'Normale' },
]

export function formatServiceLabel(label) {
  if (!label) return '—'
  return String(label).replace(/^B\.\s*/i, '').trim() || label
}

export function getAgentWorkspaceHeader(user) {
  const isChefBureau = user?.role_code === 'CHEF_BUREAU'
  const roleWord = isChefBureau ? 'Chef de bureau' : 'Agent'
  const bureau = formatServiceLabel(user?.service_label)
  const danticService =
    user?.dantic_service_label ||
    danticServices.find((service) => service.id === user?.service_id)?.label ||
    null
  const subDirectorate =
    user?.sub_directorate_label ||
    subDirectorates.find((sd) => sd.id === user?.sub_directorate_id)?.label ||
    null

  const titleLine =
    !isChefBureau && bureau && bureau !== '—' ? `${roleWord} ${bureau}` : roleWord

  return {
    titleLine,
    serviceLine: danticService,
    subDirectorateLine: subDirectorate,
  }
}

export function getChefServiceWorkspaceHeader(user) {
  const serviceLine =
    user?.dantic_service_label ||
    danticServices.find((service) => service.id === user?.service_id)?.label ||
    formatServiceLabel(user?.service_label) ||
    'Service DANTIC'
  const subDirectorateLine =
    user?.sub_directorate_label ||
    subDirectorates.find((sd) => sd.id === user?.sub_directorate_id)?.label ||
    null

  return { serviceLine, subDirectorateLine }
}

export function formatPriorityLabel(priority) {
  const map = {
    urgent: 'Urgent',
    elevee: 'Élevée',
    bloquant: 'Urgent',
    haute: 'Élevée',
    normale: 'Normale',
  }
  return map[priority] || priority || 'Normale'
}

export function mapStatusToPublicLabel(status) {
  if (status === 'resolu') return 'Résolu'
  if (status === 'non_resolu') return 'Non résolu'
  if (status === 'archive') return 'Clôturé'
  if (['assigne_technicien', 'en_cours'].includes(status)) return 'En traitement'
  return 'Reçu'
}

export const SUB_DIRECTORATE_IRT = 'INFRA_RESEAU_TELECOMS'
export const SUB_DIRECTORATE_AD = 'ANALYSE_DEV_APPS'

export function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'urgent':
    case 'bloquant':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'elevee':
    case 'haute':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'normale':
    default:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  }
}

export function getPriorityChartColor(priority) {
  switch (priority) {
    case 'urgent':
    case 'bloquant':
      return '#dc2626'
    case 'elevee':
    case 'haute':
      return '#ea580c'
    case 'normale':
    default:
      return '#ca8a04'
  }
}

export function isAgentReopenedUnresolved(ticket) {
  return ticket?.status === 'en_cours' && ticket?.last_reopened_from_status === 'non_resolu'
}

export function isAgentChefBureauActiveTicket(ticket) {
  return (
    ticket?.status === 'en_cours' &&
    ticket?.assigned_tech_role === 'CHEF_BUREAU' &&
    !isAgentReopenedUnresolved(ticket)
  )
}

export function buildReopenedTicketReportNote(ticket) {
  const names = (ticket?.co_interventions || [])
    .map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim())
    .filter(Boolean)
  const coLine = names.length > 0 ? `Co-intervenants : ${names.join(', ')}` : ''
  const previous = ticket?.latest_report_body?.trim() || ''

  if (!coLine) return previous
  if (!previous) return coLine
  if (/^Co-intervenants\s*:/im.test(previous)) {
    return previous.replace(/^Co-intervenants\s*:.*$/im, coLine)
  }
  return `${coLine}\n\n${previous}`
}

export function formatAgentMesTicketStatusLabel(ticket) {
  if (ticket?.co_intervention_status === 'pending') return 'Invitation'
  if (ticket?.co_intervention_status === 'accepted') return 'Co-intervention'
  if (isAgentReopenedUnresolved(ticket)) return 'Réouvert'
  return formatStatusLabel(ticket?.status, ticket)
}

export function getAgentMesTicketStatusBadgeClass(ticket) {
  if (ticket?.co_intervention_status === 'pending') {
    return 'bg-amber-100 text-amber-900 border border-amber-200'
  }
  if (ticket?.co_intervention_status === 'accepted') {
    return 'bg-amber-50 text-amber-800 border border-amber-200'
  }
  if (isAgentReopenedUnresolved(ticket)) {
    return 'bg-amber-100 text-amber-900 border border-amber-200'
  }
  return getAgentTicketStatusBadgeClass(ticket?.status, ticket)
}

export function isAgentTicketChefAssigned(ticket) {
  return ticket?.agent_assignment_event_type === 'ticket_assigned'
}

export function isAgentTicketSelfClaimed(ticket) {
  return ['ticket_claimed', 'bureau_claimed'].includes(ticket?.agent_assignment_event_type)
}

export function getAgentAssignmentDisplay(ticket) {
  if (ticket?.co_intervention_status) {
    const roleLabel =
      ticket.co_intervention_primary_role === 'CHEF_BUREAU' ? 'chef de bureau' : 'Agent'
    return {
      type: 'co_intervention',
      prefix: 'Co-intervenant de ',
      text: `${ticket.co_intervention_primary_name || '—'} ${roleLabel}`,
    }
  }
  if (isAgentTicketChefAssigned(ticket) && ticket?.assigned_by_supervisor_name) {
    const roleLabel =
      ticket.assigned_by_supervisor_role === 'CHEF_BUREAU' ? 'chef de bureau' : 'Chef de service'
    return {
      type: 'supervisor',
      prefix: 'affecté par ',
      text: `${ticket.assigned_by_supervisor_name} ${roleLabel}`,
    }
  }
  if (ticket?.agent_assignment_event_type === 'ticket_claimed') {
    return {
      type: 'pool',
      prefix: '',
      text: 'Pris depuis la file du service',
    }
  }
  if (ticket?.agent_assignment_event_type === 'bureau_claimed') {
    return {
      type: 'pool',
      prefix: '',
      text: 'Pris en charge (chef de bureau)',
    }
  }
  if (ticket?.assigned_technician_id && ['assigne_technicien', 'en_cours'].includes(ticket?.status)) {
    return {
      type: 'pool',
      prefix: '',
      text: 'En charge',
    }
  }
  return {
    type: 'pool',
    prefix: '',
    text: 'Non affecté',
  }
}

export function isAgentCoIntervenant(ticket) {
  return Boolean(ticket?.co_intervention_status)
}

export function isAgentPrimaryAssignee(ticket, userId) {
  return Number(ticket?.assigned_technician_id) === Number(userId)
}

export function getAgentTicketStatusBadgeClass(status, ticket = null) {
  if (status === 'assigne_technicien') {
    return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
  return getStatusBadgeClass(status, ticket)
}

export function getStatusBadgeClass(status, ticket = null) {
  if (status === 'resolu') {
    return 'bg-green-100 text-green-800 border border-green-200'
  }
  if (status === 'non_resolu') {
    return 'bg-amber-100 text-amber-900 border border-amber-200'
  }
  if (status === 'chez_chef_service') {
    return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
  if (status === 'en_cours' && ticket?.assigned_tech_role === 'CHEF_BUREAU') {
    return 'bg-violet-100 text-violet-800 border border-violet-200'
  }
  if (status === 'chez_sous_direction') {
    return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
  return 'border border-outline-variant text-on-surface'
}

export function getSubDirectorateShortLabel(codeOrId, ticket = null) {
  const code = codeOrId || ticket?.sub_directorate_code
  const id = Number(ticket?.sub_directorate_id)
  if (code === SUB_DIRECTORATE_IRT || code === 'MAINTENANCE_RESEAU' || id === 1) return 'S/dir. IRT'
  if (code === SUB_DIRECTORATE_AD || code === 'ANALYSE_DEV' || id === 2) return 'S/dir. A&D'
  return 'Sous-direction'
}

export function formatStatusLabel(status, ticket = null) {
  if (status === 'resolu') return 'Résolu'
  if (status === 'non_resolu') return 'Non résolu'
  if (status === 'chez_sous_direction' && ticket) {
    return getSubDirectorateShortLabel(null, ticket)
  }
  if (status === 'nouveau') return 'Nouveau'
  if (status === 'chez_chef_service') return 'Chef de service'
  if (status === 'assigne_technicien') return 'Assigné agent'
  if (status === 'en_cours') {
    return ticket?.assigned_tech_role === 'CHEF_BUREAU' ? 'Chef de bureau' : 'En cours'
  }
  if (status === 'archive') return 'Archivé'
  return status
}

function parseTicketDate(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const datePart = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (datePart) {
      return new Date(Number(datePart[1]), Number(datePart[2]) - 1, Number(datePart[3]))
    }
    const normalized = value.trim().replace(' ', 'T')
    const parsed = new Date(normalized)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isSameLocalDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  )
}

export function formatEmittedDate(value) {
  const date = parseTicketDate(value)
  if (!date) return value ? String(value) : '—'
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function sortTicketsByPriority(tickets) {
  return [...tickets].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99
    const pb = PRIORITY_ORDER[b.priority] ?? 99
    if (pa !== pb) return pa - pb
    const dateA = parseTicketDate(a.created_at)
    const dateB = parseTicketDate(b.created_at)
    return (dateB?.getTime() ?? 0) - (dateA?.getTime() ?? 0)
  })
}

export function applyTicketFilters(tickets, { priorityFilter = 'all', dateFilter = 'all', categoryFilter = 'all' }) {
  let result = [...tickets]

  if (categoryFilter !== 'all') {
    result = result.filter((t) => String(t.category_id) === String(categoryFilter))
  }

  if (priorityFilter !== 'all') {
    result = result.filter((t) => t.priority === priorityFilter)
  }

  if (dateFilter !== 'all') {
    const now = new Date()
    result = result.filter((t) => {
      const created = parseTicketDate(t.created_at)
      if (!created) return false
      if (dateFilter === 'today') {
        return isSameLocalDay(created, now)
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        weekAgo.setHours(0, 0, 0, 0)
        return created >= weekAgo
      }
      if (dateFilter === 'month') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        const [y, m, d] = dateFilter.split('-').map(Number)
        const picked = new Date(y, m - 1, d)
        return isSameLocalDay(created, picked)
      }
      return true
    })
  }

  return sortTicketsByPriority(result)
}

export function sortTicketsWithPinned(tickets, pinnedIds) {
  const pinned = pinnedIds instanceof Set ? pinnedIds : new Set(pinnedIds)
  if (pinned.size === 0) return tickets

  return [...tickets].sort((a, b) => {
    const aPinned = pinned.has(a.id) ? 0 : 1
    const bPinned = pinned.has(b.id) ? 0 : 1
    return aPinned - bPinned
  })
}

export function getRoleLabel(roleCode) {
  switch (roleCode) {
    case 'DIRECTEUR':
      return 'Directrice DANTIC'
    case 'SOUS_DIRECTEUR':
      return 'Sous-directeur DANTIC'
    case 'CHEF_SERVICE':
      return 'Chef de service DANTIC'
    case 'CHEF_BUREAU':
      return 'Chef de bureau DANTIC'
    case 'TECHNICIEN':
      return 'Agent DANTIC'
    case 'SUPER_ADMIN':
      return 'Super admin'
    default:
      return roleCode || 'Inconnu'
  }
}

const REPORT_LOCKED_FOR_REASSIGN = ['valide_chef', 'valide_sd', 'valide_directeur']

export function isReportValidatedByChef(status) {
  return REPORT_LOCKED_FOR_REASSIGN.includes(status)
}

export function canReassignChef(ticket) {
  return ticket?.status === 'assigne_technicien'
}

export function canReassignSubDirector(ticket) {
  return ticket?.status === 'chez_sous_direction'
}

export function canReassignDirector(ticket) {
  return ticket?.status === 'chez_sous_direction'
}

export function getAgentTicketBucket(ticket) {
  if (ticket?.is_agent_archived) return 'history'
  if (ticket?.status === 'non_resolu' || ticket?.status === 'resolu') return 'resolved'
  if (['assigne_technicien', 'en_cours'].includes(ticket?.status)) return 'assigned'
  return 'other'
}

export function isAgentReportRejectedByChef(ticket) {
  return (
    ticket?.status === 'resolu' &&
    ticket?.latest_report_status === 'rejete' &&
    ticket?.latest_report_reject_role === 'CHEF_SERVICE'
  )
}

/** Ticket revenu de l'historique vers Tickets clôturés (rejet SD ou chef). */
export function isTicketReturnedToClosed(ticket) {
  if (!['resolu', 'non_resolu'].includes(ticket?.status ?? '')) return false
  if (ticket?.is_agent_archived) return false
  return (
    ticket?.latest_report_status === 'rejete' &&
    ['SOUS_DIRECTEUR', 'CHEF_SERVICE'].includes(ticket?.latest_report_reject_role)
  )
}

/** Résolu renvoyé au chef par la sous-direction — l'agent attend le rejet chef. */
export function isTicketAwaitingChefAfterReturn(ticket) {
  return (
    ticket?.status === 'resolu' &&
    ticket?.latest_report_status === 'rejete' &&
    ticket?.latest_report_reject_role === 'SOUS_DIRECTEUR'
  )
}

export function groupHistoryTicketsByPeriod(tickets) {
  return groupHistoryTicketsByMode(tickets, 'week')
}

export function getTicketArchivedAt(ticket) {
  if (ticket?.archived_at) {
    const d = parseTicketDate(ticket.archived_at)
    if (d) return d
  }
  const y = Number(ticket?.archive_year)
  const m = Number(ticket?.archive_month)
  if (y && m && !Number.isNaN(y) && !Number.isNaN(m)) {
    return new Date(y, m - 1, 1)
  }
  return parseTicketDate(ticket?.closed_at)
}

function matchesArchiveDateFilter(archivedAt, dateFilter) {
  if (!dateFilter || dateFilter === 'all' || !archivedAt) return true
  const now = new Date()
  if (dateFilter === 'today') return isSameLocalDay(archivedAt, now)
  if (dateFilter === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(now.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)
    return archivedAt >= weekAgo
  }
  if (dateFilter === 'month') {
    return archivedAt.getMonth() === now.getMonth() && archivedAt.getFullYear() === now.getFullYear()
  }
  if (dateFilter === 'year') {
    return archivedAt.getFullYear() === now.getFullYear()
  }
  return true
}

export function applyHistoryTicketFilters(
  tickets,
  {
    search = '',
    priorityFilter = 'all',
    categoryFilter = 'all',
    directionFilter = 'all',
    dateFilter = 'all',
    year = null,
    month = null,
    weekIndex = null,
    groupBy = 'month',
  } = {},
) {
  const needle = search.trim().toLowerCase()
  return tickets.filter((ticket) => {
    const archivedAt = getTicketArchivedAt(ticket)
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false
    if (categoryFilter !== 'all' && String(ticket.category_id) !== String(categoryFilter)) return false
    if (directionFilter !== 'all') {
      const dir = (ticket.reporter_direction || 'Non renseignée').trim() || 'Non renseignée'
      if (dir !== directionFilter) return false
    }
    if (!matchesArchiveDateFilter(archivedAt, dateFilter)) return false

    if (year) {
      const y = Number(ticket.archive_year) || archivedAt?.getFullYear()
      if (y !== Number(year)) return false
    }
    if (month && (groupBy === 'month' || groupBy === 'week')) {
      const m = Number(ticket.archive_month) || (archivedAt ? archivedAt.getMonth() + 1 : null)
      if (m !== Number(month)) return false
    }
    if (weekIndex && groupBy === 'week') {
      const w = Number(ticket.archive_week_index) || 0
      if (w !== Number(weekIndex)) return false
    }

    if (!needle) return true
    const haystack = [
      ticket.ticket_number,
      ticket.description,
      ticket.category_label,
      ticket.reporter_direction,
      ticket.assigned_tech_name,
      ticket.reporter_full_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function groupHistoryTicketsByMode(tickets, groupBy = 'month') {
  const map = {}
  const ungrouped = []

  for (const ticket of tickets) {
    const archivedAt = getTicketArchivedAt(ticket)
    const y = Number(ticket.archive_year) || archivedAt?.getFullYear() || null
    const m = Number(ticket.archive_month) || (archivedAt ? archivedAt.getMonth() + 1 : null)
    const w = Number(ticket.archive_week_index) || 0

    if (!y) {
      ungrouped.push(ticket)
      continue
    }

    let key
    let label
    if (groupBy === 'year') {
      key = `y-${y}`
      label = String(y)
    } else if (groupBy === 'month') {
      if (!m) {
        ungrouped.push(ticket)
        continue
      }
      key = `y-${y}-m-${String(m).padStart(2, '0')}`
      label = `${String(m).padStart(2, '0')}/${y}`
    } else {
      if (!m) {
        ungrouped.push(ticket)
        continue
      }
      key = `y-${y}-m-${String(m).padStart(2, '0')}-s-${w}`
      label = `${String(m).padStart(2, '0')}/${y} — Semaine S${w}`
    }

    if (!map[key]) {
      map[key] = { key, year: y, month: m, weekIndex: w, label, tickets: [] }
    }
    map[key].tickets.push(ticket)
  }

  const groups = Object.values(map).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if ((a.month || 0) !== (b.month || 0)) return (b.month || 0) - (a.month || 0)
    return (b.weekIndex || 0) - (a.weekIndex || 0)
  })

  for (const group of groups) {
    group.tickets.sort(
      (a, b) => (getTicketArchivedAt(b)?.getTime() ?? 0) - (getTicketArchivedAt(a)?.getTime() ?? 0),
    )
  }

  if (ungrouped.length > 0) {
    groups.push({
      key: 'fallback',
      year: null,
      month: null,
      weekIndex: null,
      label: 'Archives',
      fallback: true,
      tickets: ungrouped,
    })
  }

  return groups
}

export function collectHistoryFilterOptions(tickets) {
  const categories = new Map()
  const directions = new Set()
  for (const ticket of tickets) {
    if (ticket.category_id && ticket.category_label) {
      categories.set(String(ticket.category_id), ticket.category_label)
    }
    directions.add((ticket.reporter_direction || 'Non renseignée').trim() || 'Non renseignée')
  }
  return {
    categories: [...categories.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    directions: [...directions].sort((a, b) => a.localeCompare(b, 'fr')),
    years: [...new Set(tickets.map((t) => Number(t.archive_year) || getTicketArchivedAt(t)?.getFullYear()).filter(Boolean))]
      .sort((a, b) => b - a),
  }
}

export function formatHoursRemainingUntil(closedAt, hoursWindow = 48) {
  if (!closedAt) return null
  const end = new Date(closedAt).getTime() + hoursWindow * 60 * 60 * 1000
  const diffMs = end - Date.now()
  if (diffMs <= 0) return null
  const hours = Math.ceil(diffMs / (60 * 60 * 1000))
  return hours <= 1 ? 'moins d\'1 h' : `${hours} h`
}

export function truncateText(text, max = 80) {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/** Organigramme DANTIC — sous-directions (ids stables en seed) */
export const subDirectorates = [
  {
    id: 1,
    code: SUB_DIRECTORATE_IRT,
    label: 'Sous-direction Infrastructures, Réseaux et Télécoms',
    short: 'IRT',
    compact: 'IRT',
  },
  {
    id: 2,
    code: SUB_DIRECTORATE_AD,
    label: 'Sous-direction Analyse et Développement des Applications',
    short: 'A&D',
    compact: 'An. & Dév.',
  },
]

export function formatSubDirectorateCompact(sdOrId) {
  const sd =
    typeof sdOrId === 'object'
      ? sdOrId
      : subDirectorates.find((item) => String(item.id) === String(sdOrId))
  return sd?.compact || sd?.short || '—'
}

export const danticServices = [
  { id: 1, code: 'SVC_IRT_INFRA', label: 'Service Infrastructure', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { id: 2, code: 'SVC_IRT_RESEAU', label: 'Service Réseaux et Sécurité Informatique', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { id: 3, code: 'SVC_IRT_TELECOM', label: 'Service Télécoms et Bureautique', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { id: 4, code: 'SVC_AD_DEV', label: 'Service Développement et Suivi des Applications', subDirectorateCode: SUB_DIRECTORATE_AD },
  { id: 5, code: 'SVC_AD_ACM', label: 'Service Analyse, Conception et Maintenance', subDirectorateCode: SUB_DIRECTORATE_AD },
  { id: 6, code: 'SVC_AD_LIAISON', label: 'Service Liaison Partenaires et Mandataires Tiers', subDirectorateCode: SUB_DIRECTORATE_AD },
]

/** Identifiant sous-direction de l'utilisateur (profil ou service DANTIC). */
export function getUserSubDirectorateId(user) {
  if (!user) return ''
  if (user.sub_directorate_id) return String(user.sub_directorate_id)
  const service = danticServices.find((item) => item.id === user.service_id)
  if (!service) return ''
  const sd = subDirectorates.find((item) => item.code === service.subDirectorateCode)
  return sd ? String(sd.id) : ''
}
