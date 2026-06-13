import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiRequest('/auth/me')
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(matricule, password) {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ matricule, password }),
        })
        setUser(data.user)
        return data.user
      },
      async logout() {
        try {
          await apiRequest('/auth/logout', { method: 'POST' })
        } finally {
          setUser(null)
        }
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}

export function getHomeRouteByRole(roleCode) {
  switch (roleCode) {
    case 'DIRECTEUR':
      return '/app/directeur'
    case 'SOUS_DIRECTEUR':
    case 'CHEF_SERVICE':
      return '/app/sous-direction'
    case 'TECHNICIEN':
      return '/app/agent'
    case 'SUPER_ADMIN':
      return '/app/admin'
    default:
      return '/'
  }
}
