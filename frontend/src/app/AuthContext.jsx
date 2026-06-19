import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const authEpochRef = useRef(0)

  useEffect(() => {
    const epoch = authEpochRef.current
    apiRequest('/auth/me')
      .then((data) => {
        if (epoch === authEpochRef.current) {
          setUser(data.user || null)
        }
      })
      .catch(() => {
        if (epoch === authEpochRef.current) {
          setUser(null)
        }
      })
      .finally(() => {
        if (epoch === authEpochRef.current) {
          setLoading(false)
        }
      })
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
        authEpochRef.current += 1
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
      async updateProfile(payload) {
        const data = await apiRequest('/auth/profile', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        setUser(data.user)
        return data.user
      },
      async changePassword(currentPassword, newPassword) {
        const data = await apiRequest('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        })
        setUser(data.user)
        return data.user
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
    case 'CHEF_BUREAU':
    case 'TECHNICIEN':
      return '/app/agent'
    case 'SUPER_ADMIN':
      return '/app/admin'
    default:
      return '/'
  }
}
