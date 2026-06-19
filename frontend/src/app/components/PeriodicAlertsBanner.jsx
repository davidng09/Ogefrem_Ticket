import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { apiRequest } from '../api'
import { useAuth } from '../AuthContext'
import { DismissibleBanner } from './DismissibleBanner'

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export function PeriodicAlertsBanner() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState([])
  const [period, setPeriod] = useState(null)

  useEffect(() => {
    if (!user?.role_code) return
    const allowed = ['CHEF_SERVICE', 'DIRECTEUR', 'SUPER_ADMIN']
    if (!allowed.includes(user.role_code)) return

    apiRequest('/periodic/monthly-send-alerts')
      .then((data) => {
        setAlerts(data.alerts || [])
        setPeriod({ year: data.year, month: data.month })
      })
      .catch(() => {
        setAlerts([])
      })
  }, [user?.role_code, user?.id])

  if (!alerts.length || !period) return null

  const monthLabel = MONTH_NAMES[(period.month || 1) - 1] || period.month
  const storageKey = `ogefrem.periodic-alerts-${user?.id}-${period.year}-${period.month}`

  return (
    <DismissibleBanner
      storageKey={storageKey}
      className="mb-4 rounded border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex items-start gap-2">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div className="min-w-0 pr-2">
          <p className="font-semibold">Rappels rapports mensuels — {monthLabel} {period.year}</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {alerts.slice(0, 6).map((alert, index) => (
              <li key={`${alert.kind}-${alert.label}-${index}`}>
                {alert.kind === 'missing_agent_bundle'
                  ? `Envoi hebdo mensuel manquant : ${alert.label}`
                  : `PDF officiel manquant : ${alert.label}`}
              </li>
            ))}
            {alerts.length > 6 && (
              <li className="list-none text-on-surface-variant">… et {alerts.length - 6} autre(s)</li>
            )}
          </ul>
        </div>
      </div>
    </DismissibleBanner>
  )
}
