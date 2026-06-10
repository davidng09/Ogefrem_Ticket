const PRIORITY_ORDER = { bloquant: 0, haute: 1, normale: 2 }

export const SUB_DIRECTORATE_IRT = 'INFRA_RESEAU_TELECOMS'
export const SUB_DIRECTORATE_AD = 'ANALYSE_DEV_APPS'

export function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'bloquant':
      return 'bg-red-100 text-red-800 border border-red-200'
    case 'haute':
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    case 'normale':
    default:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
  }
}

export function getStatusBadgeClass(status) {
  if (status === 'resolu') {
    return 'bg-green-100 text-green-800 border border-green-200'
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
  if (status === 'chez_sous_direction' && ticket) {
    return getSubDirectorateShortLabel(null, ticket)
  }
  if (status === 'nouveau') return 'Nouveau'
  if (status === 'chez_chef_service') return 'Chez chef de service'
  if (status === 'assigne_technicien') return 'Assigné agent'
  if (status === 'en_cours') return 'En cours'
  if (status === 'archive') return 'Archivé'
  return status
}

export function formatEmittedDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
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
    return new Date(b.created_at) - new Date(a.created_at)
  })
}

export function applyTicketFilters(tickets, { priorityFilter = 'all', dateFilter = 'all' }) {
  let result = [...tickets]

  if (priorityFilter !== 'all') {
    result = result.filter((t) => t.priority === priorityFilter)
  }

  if (dateFilter !== 'all') {
    const now = new Date()
    result = result.filter((t) => {
      const created = new Date(t.created_at)
      if (Number.isNaN(created.getTime())) return false
      if (dateFilter === 'today') {
        return created.toDateString() === now.toDateString()
      }
      if (dateFilter === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return created >= weekAgo
      }
      if (dateFilter === 'month') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        return created.toISOString().slice(0, 10) === dateFilter
      }
      return true
    })
  }

  return sortTicketsByPriority(result)
}

export function getRoleLabel(roleCode) {
  switch (roleCode) {
    case 'DIRECTEUR':
      return 'Directrice DANTIC'
    case 'SOUS_DIRECTEUR':
      return 'Sous-directeur DANTIC'
    case 'CHEF_SERVICE':
      return 'Chef de service DANTIC'
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
  if (ticket?.status !== 'resolu') {
    if (['assigne_technicien', 'en_cours'].includes(ticket?.status)) return 'assigned'
    return 'other'
  }
  if (ticket?.latest_report_status === 'rejete') return 'assigned'
  if (isReportValidatedByChef(ticket?.latest_report_status)) return 'resolved'
  return 'assigned'
}

export function groupHistoryTicketsByPeriod(tickets) {
  const map = {}
  for (const t of tickets) {
    const y = t.archive_year || (t.closed_at ? new Date(t.closed_at).getFullYear() : null)
    const m = t.archive_month || (t.closed_at ? new Date(t.closed_at).getMonth() + 1 : null)
    const w = t.archive_week_index || 0
    if (!y || !m) continue
    const key = `${y}-${String(m).padStart(2, '0')}-S${w}`
    if (!map[key]) map[key] = { year: y, month: m, weekIndex: w, tickets: [] }
    map[key].tickets.push(t)
  }
  return Object.values(map).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    if (a.month !== b.month) return b.month - a.month
    return b.weekIndex - a.weekIndex
  })
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
  },
  {
    id: 2,
    code: SUB_DIRECTORATE_AD,
    label: 'Sous-direction Analyse et Développement des Applications',
    short: 'A&D',
  },
]

export const danticServices = [
  { code: 'SVC_IRT_INFRA', label: 'Service Infrastructure', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { code: 'SVC_IRT_RESEAU', label: 'Service Réseaux et Sécurité Informatique', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { code: 'SVC_IRT_TELECOM', label: 'Service Télécoms et Bureautique', subDirectorateCode: SUB_DIRECTORATE_IRT },
  { code: 'SVC_AD_DEV', label: 'Service Développement et Suivi des Applications', subDirectorateCode: SUB_DIRECTORATE_AD },
  { code: 'SVC_AD_ACM', label: 'Service Analyse, Conception et Maintenance', subDirectorateCode: SUB_DIRECTORATE_AD },
  { code: 'SVC_AD_LIAISON', label: 'Service Liaison Partenaires et Mandataires Tiers', subDirectorateCode: SUB_DIRECTORATE_AD },
]
