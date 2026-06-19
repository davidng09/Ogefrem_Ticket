import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { getHomeRouteByRole, useAuth } from '../AuthContext'

export function DanticLoginModal({ open, onClose }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [matricule, setMatricule] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(matricule.trim(), password)
      setMatricule('')
      setPassword('')
      onClose()
      navigate(getHomeRouteByRole(user.role_code))
    } catch (err) {
      setError(err.message || 'Connexion impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="" hideHeader>
      <div className="flex flex-col items-center px-2 pb-2">
        <img
          src="/ogefrem_LOGO.png"
          alt="OGEFREM"
          className="h-14 w-auto rounded-sm object-contain"
        />
        <p className="mt-2 text-lg font-bold tracking-wide text-primary">DANTIC</p>
        <p className="mt-1 text-center text-xs text-on-surface-variant">
          Accès réservé au personnel DANTIC
        </p>

        <form onSubmit={handleSubmit} className="mt-5 w-full space-y-3">
          <input
            required
            autoComplete="username"
            placeholder="Identifiant / Matricule"
            className="w-full rounded border border-outline-variant p-2 text-sm"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
          />
          <input
            required
            type="password"
            autoComplete="current-password"
            placeholder="Mot de passe"
            className="w-full rounded border border-outline-variant p-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <p className="text-center text-[11px] text-on-surface-variant">
            Compte démo : matricule <span className="font-mono">DIR-001</span> — mot de passe{' '}
            <span className="font-mono">Test@2026</span>
          </p>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            Se connecter
          </button>
        </form>
      </div>
    </Modal>
  )
}
