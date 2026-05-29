import { AlertCircle, LogIn, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHomeRouteByRole, useAuth } from '../AuthContext'
import { apiRequest } from '../api'

const DRAFT_KEY = 'ogefrem_ticket_draft'
const FAILED_KEY = 'ogefrem_failed_ticket'

const categories = [
  { id: 1, code: 'RESEAU', label: 'Réseau & WiFi' },
  { id: 2, code: 'HARDWARE', label: 'Hardware & PC' },
  { id: 3, code: 'APPLICATIONS', label: 'Logiciels / Apps' },
  { id: 4, code: 'AUTRES', label: 'Autres' },
  { id: 5, code: 'IMPRESSION', label: 'Impression / Scanner' },
  { id: 6, code: 'ACCES', label: 'Accès & Comptes' },
]

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
  } catch {
    return {}
  }
}

export function PublicPortal() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const initial = useMemo(() => readDraft(), [])
  const [form, setForm] = useState({
    reporter_full_name: initial.reporter_full_name || '',
    reporter_matricule: initial.reporter_matricule || '',
    reporter_direction: initial.reporter_direction || '',
    reporter_service: initial.reporter_service || '',
    reporter_office: initial.reporter_office || '',
    category_id: initial.category_id || 0,
    description: initial.description || '',
  })
  const [loginForm, setLoginForm] = useState({ matricule: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function setField(name, value) {
    const next = { ...form, [name]: value }
    setForm(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  }

  async function submitTicket(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiRequest('/tickets/public', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setMessage('Ticket soumis avec succès.')
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(FAILED_KEY)
      setForm({
        reporter_full_name: '',
        reporter_matricule: '',
        reporter_direction: '',
        reporter_service: '',
        reporter_office: '',
        category_id: 0,
        description: '',
      })
    } catch (err) {
      setError('Connexion perdue. Votre ticket a été sauvegardé localement.')
      localStorage.setItem(FAILED_KEY, JSON.stringify(form))
    }
  }

  async function resendFailedTicket() {
    const payload = localStorage.getItem(FAILED_KEY)
    if (!payload) return
    setError('')
    try {
      await apiRequest('/tickets/public', { method: 'POST', body: payload })
      localStorage.removeItem(FAILED_KEY)
      setMessage('Ticket renvoyé avec succès.')
    } catch {
      setError('Le renvoi a échoué. Réessayez plus tard.')
    }
  }

  async function submitLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const user = await login(loginForm.matricule, loginForm.password)
      navigate(getHomeRouteByRole(user.role_code))
    } catch (err) {
      setError(err.message)
    }
  }

  const hasFailedTicket = Boolean(localStorage.getItem(FAILED_KEY))

  return (
    <div className="mx-auto min-h-screen max-w-7xl p-4">
      <header className="mb-6 rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">OGEFREM Ops Hub</h1>
        <p className="text-sm text-on-surface-variant">Signalement public + accès sécurisé DANTIC</p>
      </header>

      {(error || message) && (
        <div className={`mb-4 rounded border p-3 text-sm ${error ? 'border-error bg-red-50' : 'border-outline-variant bg-surface-low'}`}>
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error || message}</span>
          </div>
        </div>
      )}

      {hasFailedTicket && (
        <button
          type="button"
          onClick={resendFailedTicket}
          className="mb-4 rounded border border-outline-variant bg-surface-low px-3 py-2 text-sm"
        >
          Renvoyer le ticket
        </button>
      )}

      <div className="grid gap-px overflow-hidden rounded border border-outline-variant bg-outline-variant lg:grid-cols-2">
        <section className="bg-surface-lowest p-5">
          <h2 className="mb-4 text-lg font-semibold">Soumettre un ticket</h2>
          <form onSubmit={submitTicket} className="space-y-3">
            <input required placeholder="Nom complet" className="w-full rounded border border-outline-variant p-2" value={form.reporter_full_name} onChange={(e) => setField('reporter_full_name', e.target.value)} />
            <input required placeholder="Matricule Agent" className="w-full rounded border border-outline-variant p-2" value={form.reporter_matricule} onChange={(e) => setField('reporter_matricule', e.target.value)} />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input required placeholder="Direction" className="rounded border border-outline-variant p-2" value={form.reporter_direction} onChange={(e) => setField('reporter_direction', e.target.value)} />
              <input required placeholder="Service" className="rounded border border-outline-variant p-2" value={form.reporter_service} onChange={(e) => setField('reporter_service', e.target.value)} />
              <input required placeholder="Bureau/Local" className="rounded border border-outline-variant p-2" value={form.reporter_office} onChange={(e) => setField('reporter_office', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setField('category_id', category.id)}
                  className={`rounded border p-2 text-sm ${form.category_id === category.id ? 'border-primary bg-surface-low' : 'border-outline-variant bg-surface-lowest'}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <textarea required rows={4} placeholder="Description du problème" className="w-full rounded border border-outline-variant p-2" value={form.description} onChange={(e) => setField('description', e.target.value)} />
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
              <Send size={16} /> Soumettre le ticket
            </button>
          </form>
        </section>

        <section className="bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">Connexion DANTIC</h2>
          <form onSubmit={submitLogin} className="space-y-3">
            <input
              required
              placeholder="Matricule"
              className="w-full rounded border border-outline-variant p-2"
              value={loginForm.matricule}
              onChange={(e) => setLoginForm((s) => ({ ...s, matricule: e.target.value }))}
            />
            <input
              required
              type="password"
              placeholder="Mot de passe"
              className="w-full rounded border border-outline-variant p-2"
              value={loginForm.password}
              onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
            />
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
              <LogIn size={16} /> Se connecter
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
