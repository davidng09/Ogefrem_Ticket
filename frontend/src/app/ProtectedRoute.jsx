import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-on-surface-variant">Chargement session...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
