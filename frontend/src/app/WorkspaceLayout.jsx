import { Bell } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AccountMenu } from './components/AccountMenu'
import { AppBrand } from './components/AppBrand'
import { PeriodicAlertsBanner } from './components/PeriodicAlertsBanner'
import { WorkspaceBackground } from './components/WorkspaceBackground'
import { getHomeRouteByRole, useAuth } from './AuthContext'
import { apiRequest } from './api'
import { useClickOutside } from './hooks/useClickOutside'
import { getRoleLabel } from './uiHelpers'
import { getNotificationNavigation } from './workspaceNavigation'

function NotificationsDropdown() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(panelRef, close, open)

  useEffect(() => {
    apiRequest('/notifications')
      .then((data) => setItems(data.notifications || []))
      .catch(() => setItems([]))
  }, [])

  const unreadCount = items.filter((n) => Number(n.is_read) === 0).length

  async function handleClick(item) {
    await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' })
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              is_read: 1,
            }
          : entry,
      ),
    )
    const { path, search } = getNotificationNavigation(item, user?.role_code)
    close()
    navigate(`${path}${search}`)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded border border-outline-variant bg-surface-low/80 p-2 backdrop-blur-sm"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-on-error">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-72 w-80 overflow-y-auto rounded border border-outline-variant bg-surface-lowest/90 p-2 shadow-lg backdrop-blur-xl">
          {items.length === 0 ? (
            <p className="p-2 text-xs text-on-surface-variant">Aucune notification</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={`mb-1 w-full rounded border p-2 text-left hover:bg-surface-low ${
                  Number(item.is_read) === 0 ? 'border-primary/40 bg-surface-low/60' : 'border-outline-variant'
                }`}
              >
                <p className="text-xs font-semibold">{item.title}</p>
                <p className="text-xs text-on-surface-variant">{item.message}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayName = [user?.prenom, user?.nom].filter(Boolean).join(' ')

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="workspace-app min-h-screen">
      <WorkspaceBackground />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-lowest/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AppBrand linkTo={getHomeRouteByRole(user?.role_code)} />
          <span className="rounded bg-surface-low/70 px-2 py-1 text-xs backdrop-blur-sm">{getRoleLabel(user?.role_code)}</span>
          <span className="rounded border border-outline-variant/70 bg-surface-lowest/60 px-2 py-1 text-xs text-on-surface-variant backdrop-blur-sm">
            {displayName || 'Utilisateur connecte'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <AccountMenu user={user} onLogout={handleLogout} />
        </div>
      </header>
      <main className="relative z-[1] mx-auto max-w-7xl p-4">
        <PeriodicAlertsBanner />
        <Outlet />
      </main>
    </div>
  )
}
