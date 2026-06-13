import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [readOnly, setReadOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get('/auth/me')
      .then((data) => {
        setUser(data.user || null)
        setReadOnly(Boolean(data.read_only))
      })
      .catch(() => {
        setUser(null)
        setReadOnly(false)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(
    () => ({
      user,
      readOnly,
      loading,
      async login(matricule, password) {
        const data = await api.post('/auth/login', { matricule, password })
        setUser(data.user)
        setReadOnly(data.user?.role_code === 'DIRECTEUR')
        return data.user
      },
      async logout() {
        try {
          await api.post('/auth/logout', {})
        } finally {
          setUser(null)
          setReadOnly(false)
        }
      },
    }),
    [user, readOnly, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
