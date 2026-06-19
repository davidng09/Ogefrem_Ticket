/** Semaines lun–ven d'un mois calendaire (S1…Sn). monthIndex: 0–11 (Date JS). */
export function getMonthWeeks(year, monthIndex) {
  const weeks = []
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  let weekIndex = 0
  let day = 1

  while (day <= daysInMonth) {
    const dow = new Date(year, monthIndex, day).getDay()
    if (dow === 0 || dow === 6) {
      day += 1
      continue
    }
    weekIndex += 1
    const start = day
    let end = day
    while (day <= daysInMonth) {
      const wd = new Date(year, monthIndex, day).getDay()
      if (wd === 0 || wd === 6) break
      end = day
      day += 1
      if (wd === 5) break
    }
    weeks.push({
      weekIndex,
      weekStart: toDateStr(year, monthIndex, start),
      weekEnd: toDateStr(year, monthIndex, end),
      label: `S${weekIndex} (${fmtDay(start)}–${fmtDay(end)} ${monthLabel(monthIndex)} ${year})`,
    })
  }
  return weeks
}

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function fmtDay(d) {
  return String(d).padStart(2, '0')
}

function monthLabel(m) {
  return ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'][m]
}

export function getCurrentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), monthIndex: now.getMonth() }
}

export function getDefaultReportMonth() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function parseClosedDate(ticket) {
  const raw = ticket.closed_at || ticket.created_at
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getTicketWeekKey(ticket, year, monthIndex) {
  const d = parseClosedDate(ticket)
  if (!d || d.getFullYear() !== year || d.getMonth() !== monthIndex) return null
  const day = d.getDate()
  for (const w of getMonthWeeks(year, monthIndex)) {
    const start = Number(w.weekStart.slice(8, 10))
    const end = Number(w.weekEnd.slice(8, 10))
    if (day >= start && day <= end) return w.weekIndex
  }
  return null
}

export function groupTicketsByWeek(tickets, year, monthIndex) {
  const weeks = getMonthWeeks(year, monthIndex)
  const groups = weeks.map((w) => ({ ...w, tickets: [] }))
  const byIndex = Object.fromEntries(groups.map((g) => [g.weekIndex, g]))
  for (const t of tickets) {
    const key = getTicketWeekKey(t, year, monthIndex)
    if (key && byIndex[key]) byIndex[key].tickets.push(t)
  }
  return groups
}

export function isFridayOrLater() {
  const dow = new Date().getDay()
  return dow === 5 || dow === 6 || dow === 0
}

export function formatYearMonth(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}
