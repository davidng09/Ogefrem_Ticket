import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest } from './api'

const ROLE_SIM_KEY = 'ogefrem_role_simulator'
const ROLE_SIM_ENABLED = import.meta.env.VITE_DEV_ROLE_SIMULATOR === 'true'

const simulatedProfiles = {
  DIRECTEUR: { id: 1001, role_code: 'DIRECTEUR', nom: 'KABILA', prenom: 'Stéphanie', service_label: 'Direction DANTIC — Applications NTIC' },
  SOUS_DIRECTEUR: { id: 1002, role_code: 'SOUS_DIRECTEUR', nom: 'MUTAMBA', prenom: 'Arsène', sub_directorate_id: 1, service_label: 'Sous-direction Infrastructures, Réseaux et Télécoms' },
  CHEF_SERVICE: { id: 1003, role_code: 'CHEF_SERVICE', nom: 'MULUMBA', prenom: 'Joel', sub_directorate_id: 1, service_id: 2, service_label: 'Service Réseaux et Sécurité Informatique' },
  TECHNICIEN: { id: 1004, role_code: 'TECHNICIEN', nom: 'MBALA', prenom: 'Jean', sub_directorate_id: 1, service_id: 2, service_label: 'B. Réseaux et Help-Desk' },
  SUPER_ADMIN: { id: 1005, role_code: 'SUPER_ADMIN', nom: 'Admin', prenom: 'Système' },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [simRole, setSimRole] = useState(
    ROLE_SIM_ENABLED ? localStorage.getItem(ROLE_SIM_KEY) || '' : ''
  )

  useEffect(() => {
    if (ROLE_SIM_ENABLED && simRole && simulatedProfiles[simRole]) {
      setUser(simulatedProfiles[simRole])
      setLoading(false)
      return
    }

    apiRequest('/auth/me')
      .then((data) => setUser(data.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [simRole])

  const value = useMemo(
    () => ({
      user,
      loading,
      roleSimulatorEnabled: ROLE_SIM_ENABLED,
      simRole,
      setSimRole: (role) => {
        setSimRole(role)
        if (ROLE_SIM_ENABLED) {
          if (role) localStorage.setItem(ROLE_SIM_KEY, role)
          else localStorage.removeItem(ROLE_SIM_KEY)
        }
      },
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
          setSimRole('')
        }
      },
    }),
    [user, loading, simRole],
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
