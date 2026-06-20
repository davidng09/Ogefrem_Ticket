import { useState } from 'react'
import { Modal } from './components/Modal'
import { apiRequest } from './api'
import { useAuth } from './AuthContext'
import { PASSWORD_POLICY_HINT, validatePasswordClient } from './utils/passwordPolicy'

export function ChangePasswordGate({ children }) {
  const { user, loading } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading || !user) return children
  if (!user.must_change_password) return children

  async function submit(e) {
    e.preventDefault()
    setError('')
    const policyError = validatePasswordClient(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setBusy(true)
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open dismissible={false} onClose={() => {}} title="Changement de mot de passe requis" wide>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <p className="text-on-surface-variant">
          Votre administrateur vous a attribué un mot de passe temporaire. Pour des raisons de sécurité,
          définissez un nouveau mot de passe avant d&apos;accéder à l&apos;espace DANTIC.
        </p>
        <p className="rounded border border-outline-variant bg-surface-low px-3 py-2 text-xs text-on-surface-variant">
          {PASSWORD_POLICY_HINT}
        </p>
        {error && <p className="text-error">{error}</p>}
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Mot de passe temporaire (actuel)"
          className="w-full rounded border border-outline-variant p-2"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          className="w-full rounded border border-outline-variant p-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirmer le nouveau mot de passe"
          className="w-full rounded border border-outline-variant p-2"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-primary px-4 py-2 text-on-primary disabled:opacity-50"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer et continuer'}
        </button>
      </form>
    </Modal>
  )
}
