import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/helpers'
import { Button } from '../ui/Button'

export function Header({ title }) {
  const { user, logout } = useAuth()
  const initials = getInitials(user?.prenom, user?.nom)

  return (
    <header className="flex items-center justify-between border-b border-outline-variant bg-surface-lowest px-6 py-4 shadow-sm">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="rounded bg-surface-low px-2 py-1 text-xs">DANTIC — DSI</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
          {initials}
        </span>
        <span className="hidden text-sm sm:inline">
          {user?.prenom} {user?.nom}
        </span>
        <Button variant="secondary" size="sm" onClick={logout}>
          <LogOut size={14} className="mr-1 inline" /> Déconnexion
        </Button>
      </div>
    </header>
  )
}
