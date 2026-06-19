import { LogOut, Menu, User } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext'
import { useClickOutside } from '../hooks/useClickOutside'
import { formatServiceLabel, getRoleLabel } from '../uiHelpers'
import { ThemeToggle } from './ThemeToggle'

function ProfileForm({ user, onClose }) {
  const { updateProfile, changePassword } = useAuth()
  const [profile, setProfile] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
  })
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setProfile({
      prenom: user?.prenom || '',
      nom: user?.nom || '',
      email: user?.email || '',
    })
  }, [user])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateProfile(profile)
      setMessage('Profil mis à jour.')
    } catch (err) {
      setError(err.message || 'Échec de la mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e) {
    e.preventDefault()
    if (passwords.next !== passwords.confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await changePassword(passwords.current, passwords.next)
      setPasswords({ current: '', next: '', confirm: '' })
      setMessage('Mot de passe modifié.')
    } catch (err) {
      setError(err.message || 'Échec du changement de mot de passe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClose}
        className="text-xs text-primary underline-offset-2 hover:underline"
      >
        Retour au menu
      </button>

      <form onSubmit={saveProfile} className="space-y-2 border-b border-outline-variant pb-3">
        <p className="text-xs font-semibold uppercase text-on-surface-variant">Identité</p>
        <input
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Prénom"
          value={profile.prenom}
          onChange={(e) => setProfile((s) => ({ ...s, prenom: e.target.value }))}
          required
        />
        <input
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Nom"
          value={profile.nom}
          onChange={(e) => setProfile((s) => ({ ...s, nom: e.target.value }))}
          required
        />
        <input
          type="email"
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Adresse e-mail"
          value={profile.email}
          onChange={(e) => setProfile((s) => ({ ...s, email: e.target.value }))}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
        >
          Enregistrer le profil
        </button>
      </form>

      <form onSubmit={savePassword} className="space-y-2">
        <p className="text-xs font-semibold uppercase text-on-surface-variant">Mot de passe</p>
        <input
          type="password"
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Mot de passe actuel"
          value={passwords.current}
          onChange={(e) => setPasswords((s) => ({ ...s, current: e.target.value }))}
          required
        />
        <input
          type="password"
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Nouveau mot de passe"
          value={passwords.next}
          onChange={(e) => setPasswords((s) => ({ ...s, next: e.target.value }))}
          required
        />
        <input
          type="password"
          className="w-full rounded border border-outline-variant px-2 py-1.5 text-sm"
          placeholder="Confirmer le mot de passe"
          value={passwords.confirm}
          onChange={(e) => setPasswords((s) => ({ ...s, confirm: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded border border-outline-variant px-3 py-2 text-xs font-semibold hover:bg-surface-low disabled:opacity-50"
        >
          Changer le mot de passe
        </button>
      </form>

      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}

export function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const panelRef = useRef(null)
  const close = useCallback(() => {
    setOpen(false)
    setShowProfile(false)
  }, [])
  useClickOutside(panelRef, close, open)

  const displayName = [user?.prenom, user?.nom].filter(Boolean).join(' ')

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-outline-variant bg-surface-low/80 p-2 backdrop-blur-sm"
        aria-label="Menu du compte"
        aria-expanded={open}
      >
        <Menu size={18} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 max-h-[85vh] w-80 overflow-y-auto rounded border border-outline-variant bg-surface-lowest/95 p-4 shadow-lg backdrop-blur-xl">
          {showProfile ? (
            <ProfileForm user={user} onClose={() => setShowProfile(false)} />
          ) : (
            <>
              <div className="space-y-1 border-b border-outline-variant pb-3">
                <p className="text-sm font-semibold">{displayName || 'Utilisateur'}</p>
                <p className="text-xs text-on-surface-variant">{getRoleLabel(user?.role_code)}</p>
                {user?.matricule && (
                  <p className="text-xs text-on-surface-variant">Matricule : {user.matricule}</p>
                )}
                {user?.email && (
                  <p className="text-xs text-on-surface-variant">{user.email}</p>
                )}
                {user?.service_label && (
                  <p className="text-xs text-on-surface-variant">{formatServiceLabel(user.service_label)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="mt-3 inline-flex w-full items-center gap-2 rounded border border-outline-variant px-3 py-2 text-xs font-medium hover:bg-surface-low"
              >
                <User size={14} />
                Modifier mon profil
              </button>
              <div className="mt-3 flex items-center justify-between border-b border-outline-variant py-3">
                <span className="text-xs font-medium text-on-surface-variant">Thème</span>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  close()
                  onLogout()
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border border-outline-variant px-3 py-2 text-xs font-medium hover:bg-surface-low"
              >
                <LogOut size={14} />
                Déconnexion
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
