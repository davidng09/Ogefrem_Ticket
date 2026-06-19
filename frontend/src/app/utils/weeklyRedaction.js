function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isWeekFinalised(week) {
  return week?.report?.status === 'finalise'
}

/** Semaines du mois en cours (passées ou en cours) sans rapport finalisé. */
export function computePendingWeeklyWeeks(weeks, today = todayStr()) {
  if (!Array.isArray(weeks)) return []

  return weeks
    .filter((week) => {
      const start = week.week_start
      const end = week.week_end
      if (!start || !end || today < start) return false
      if (isWeekFinalised(week)) return false
      return today >= start
    })
    .map((week) => ({
      weekIndex: week.week_index,
      isCurrent: today >= week.week_start && today <= week.week_end,
      label: `Réd. Sém. ${week.week_index}`,
    }))
}
