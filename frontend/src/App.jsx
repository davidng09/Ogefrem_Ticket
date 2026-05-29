import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './app/AuthContext'
import { ProtectedRoute } from './app/ProtectedRoute'
import { RoleRoute } from './app/RoleRoute'
import { WorkspaceLayout } from './app/WorkspaceLayout'
import { PublicPortal } from './app/public/PublicPortal'
import { DirectorDashboard } from './app/workspaces/DirectorDashboard'
import { SubDirectionHub } from './app/workspaces/SubDirectionHub'
import { TechnicianField } from './app/workspaces/TechnicianField'
import { AdminPanel } from './app/workspaces/AdminPanel'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<PublicPortal />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<WorkspaceLayout />}>
            <Route
              path="/app/directeur"
              element={
                <RoleRoute allowed={['DIRECTEUR', 'SUPER_ADMIN']}>
                  <DirectorDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/app/sous-direction"
              element={
                <RoleRoute allowed={['SOUS_DIRECTEUR', 'CHEF_SERVICE', 'SUPER_ADMIN']}>
                  <SubDirectionHub />
                </RoleRoute>
              }
            />
            <Route
              path="/app/technicien"
              element={
                <RoleRoute allowed={['TECHNICIEN', 'SUPER_ADMIN']}>
                  <TechnicianField />
                </RoleRoute>
              }
            />
            <Route
              path="/app/admin"
              element={
                <RoleRoute allowed={['SUPER_ADMIN']}>
                  <AdminPanel />
                </RoleRoute>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
