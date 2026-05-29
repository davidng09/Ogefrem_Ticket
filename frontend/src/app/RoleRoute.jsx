import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RoleRoute({ allowed, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (!allowed.includes(user.role_code)) return <Navigate to="/" replace />
  return children
}
