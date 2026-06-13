import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'

export function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [matricule, setMatricule] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(matricule, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded border border-outline-variant bg-surface-lowest p-6 shadow-sm">
        <img src="/ogefrem_LOGO.png" alt="OGEFREM" className="mx-auto mb-4 h-12" />
        <h1 className="text-center text-lg font-semibold">Parc informatique</h1>
        <p className="mb-4 text-center text-sm text-on-surface-variant">Connexion DANTIC</p>
        {error && <p className="mb-3 rounded border border-error bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
        <label className="mb-3 block text-sm">
          Matricule
          <input
            className="mt-1 w-full rounded border border-outline-variant px-3 py-2"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            required
          />
        </label>
        <label className="mb-4 block text-sm">
          Mot de passe
          <input
            type="password"
            className="mt-1 w-full rounded border border-outline-variant px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Button type="submit" loading={loading} className="w-full">
          Se connecter
        </Button>
        <p className="mt-4 text-center text-xs text-on-surface-variant">
          <a href="http://localhost/Ogefrem/" className="underline">Retour au hub OGEFREM</a>
        </p>
      </form>
    </div>
  )
}
