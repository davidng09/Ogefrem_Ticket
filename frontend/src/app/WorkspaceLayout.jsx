import { Bell, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { getHomeRouteByRole, useAuth } from './AuthContext'
import { apiRequest } from './api'

function RoleSimulator() {
  const { roleSimulatorEnabled, simRole, setSimRole } = useAuth()
  if (!roleSimulatorEnabled) return null

  return (
    <select
      value={simRole}
      onChange={(e) => setSimRole(e.target.value)}
      className="rounded border border-outline-variant bg-surface-low px-2 py-1 text-xs"
    >
      <option value="">Role Simulator off</option>
      <option value="DIRECTEUR">Directeur</option>
      <option value="SOUS_DIRECTEUR">Sous-directeur</option>
      <option value="CHEF_SERVICE">Chef de service</option>
      <option value="TECHNICIEN">Technicien</option>
      <option value="SUPER_ADMIN">Super Admin</option>
    </select>
  )
}

function NotificationsDropdown() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    apiRequest('/notifications')
      .then((data) => setItems(data.notifications || []))
      .catch(() => setItems([]))
  }, [])

  const unreadCount = items.filter((n) => Number(n.is_read) === 0).length

  async function markRead(id) {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' })
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              is_read: 1,
            }
          : item,
      ),
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded border border-outline-variant bg-surface-low p-2"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold text-on-error">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-72 w-80 overflow-y-auto rounded border border-outline-variant bg-surface-lowest p-2 shadow-sm">
          {items.length === 0 ? (
            <p className="p-2 text-xs text-on-surface-variant">Aucune notification</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markRead(item.id)}
                className="mb-1 w-full rounded border border-outline-variant p-2 text-left hover:bg-surface-low"
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

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-lowest px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={getHomeRouteByRole(user?.role_code)} className="text-sm font-semibold">
            OGEFREM Ops Hub
          </Link>
          <span className="rounded bg-surface-low px-2 py-1 text-xs">{user?.role_code}</span>
        </div>
        <div className="flex items-center gap-2">
          <RoleSimulator />
          <NotificationsDropdown />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded border border-outline-variant bg-surface-low px-2 py-1 text-xs"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
