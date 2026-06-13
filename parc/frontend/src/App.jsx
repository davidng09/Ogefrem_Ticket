import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { Directions } from './pages/Directions'
import { Fournisseurs } from './pages/Fournisseurs'
import { Inventaire } from './pages/Inventaire'
import { Login } from './pages/Login'
import { Parametres } from './pages/Parametres'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-8 text-sm">Chargement…</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventaire" element={<ProtectedRoute><Inventaire /></ProtectedRoute>} />
      <Route path="/directions" element={<ProtectedRoute><Directions /></ProtectedRoute>} />
      <Route path="/fournisseurs" element={<ProtectedRoute><Fournisseurs /></ProtectedRoute>} />
      <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
