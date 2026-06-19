import { AlertCircle, AppWindow, CheckCircle, KeyRound, Monitor, Printer, Send, Shapes, Users, Wifi } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AppBrand } from '../components/AppBrand'
import { SplineHero } from '../components/SplineHero'
import { ThemeToggle } from '../components/ThemeToggle'
import { apiRequest } from '../api'
import { DanticLoginModal } from './DanticLoginModal'
import { PublicSessionNotifications } from './PublicSessionNotifications'
import { addTrackedTicket, notifyTrackedTicketsUpdated } from './publicTrackedTickets'
import { formatDirectionValue, OGEFREM_DIRECTIONS } from '../directionHelpers'

const DRAFT_KEY = 'ogefrem_ticket_draft'
const FAILED_KEY = 'ogefrem_failed_ticket'
const PROFILE_KEY = 'ogefrem_reporter_profile'

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}')
  } catch {
    return {}
  }
}

function readDraft() {
  return readJson(DRAFT_KEY)
}

function readProfile() {
  return readJson(PROFILE_KEY)
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

function pickIdentity(fields) {
  return {
    reporter_full_name: fields.reporter_full_name || '',
    reporter_matricule: fields.reporter_matricule || '',
    reporter_direction: fields.reporter_direction || '',
    reporter_service: fields.reporter_service || '',
    reporter_office: fields.reporter_office || '',
  }
}

const SUCCESS_MESSAGE =
  "Ticket soumis avec succès. Consultez la cloche pour suivre l'avancement."
const SUCCESS_TOAST_MS = 5000

const categories = [
  { id: 1, code: 'RESEAU', label: 'Réseau & WiFi', icon: Wifi },
  { id: 2, code: 'HARDWARE', label: 'Hardware & PC', icon: Monitor },
  { id: 3, code: 'APPLICATIONS', label: 'Logiciels / Apps', icon: AppWindow },
  { id: 4, code: 'AUTRES', label: 'Autres', icon: Shapes },
  { id: 5, code: 'IMPRESSION', label: 'Impression / Scanner', icon: Printer },
  { id: 6, code: 'ACCES', label: 'Accès & Comptes', icon: KeyRound },
]

function getCategoryLabel(categoryId) {
  return categories.find((c) => c.id === categoryId)?.label || ''
}

export function PublicPortal() {
  const initial = useMemo(() => {
    const draft = readDraft()
    const profile = readProfile()
    return {
      reporter_full_name: draft.reporter_full_name || profile.reporter_full_name || '',
      reporter_matricule: draft.reporter_matricule || profile.reporter_matricule || '',
      reporter_direction: draft.reporter_direction || profile.reporter_direction || '',
      reporter_service: draft.reporter_service || profile.reporter_service || '',
      reporter_office: draft.reporter_office || profile.reporter_office || '',
      category_id: draft.category_id || 0,
      description: draft.description || '',
    }
  }, [])
  const [form, setForm] = useState(initial)
  const [successToast, setSuccessToast] = useState('')
  const [error, setError] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const [trackingToken, setTrackingToken] = useState('')

  useEffect(() => {
    if (!successToast) return undefined
    const timer = window.setTimeout(() => setSuccessToast(''), SUCCESS_TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [successToast])

  function setField(name, value) {
    const next = { ...form, [name]: value }
    setForm(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    const identityFields = [
      'reporter_full_name',
      'reporter_matricule',
      'reporter_direction',
      'reporter_service',
      'reporter_office',
    ]
    if (identityFields.includes(name)) {
      saveProfile(pickIdentity(next))
    }
  }

  function recordSuccessfulSubmission(payload, ticket) {
    addTrackedTicket({
      ticket_number: ticket?.ticket_number,
      tracking_token: ticket?.tracking_token,
      reporter_full_name: payload.reporter_full_name,
      category_label: getCategoryLabel(payload.category_id),
      description: payload.description,
    })
    notifyTrackedTicketsUpdated()
    if (ticket?.tracking_token) {
      setTrackingToken(ticket.tracking_token)
    }
  }

  async function submitTicket(e) {
    e.preventDefault()
    setSuccessToast('')
    setError('')

    if (!form.category_id || Number(form.category_id) <= 0) {
      setError('Veuillez sélectionner une catégorie.')
      return
    }

    const payload = { ...form, category_id: Number(form.category_id) }

    try {
      const data = await apiRequest('/tickets/public', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const ticket = data.ticket
      recordSuccessfulSubmission(payload, ticket)
      setSuccessToast(SUCCESS_MESSAGE)
      localStorage.removeItem(FAILED_KEY)
      const identity = pickIdentity(form)
      saveProfile(identity)
      const nextForm = { ...identity, category_id: 0, description: '' }
      setForm(nextForm)
      localStorage.setItem(DRAFT_KEY, JSON.stringify(nextForm))
    } catch (err) {
      setError(err?.message || 'Connexion perdue. Votre ticket a été sauvegardé localement.')
      localStorage.setItem(FAILED_KEY, JSON.stringify(payload))
    }
  }

  async function resendFailedTicket() {
    const payload = localStorage.getItem(FAILED_KEY)
    if (!payload) return
    setError('')
    try {
      const parsed = JSON.parse(payload)
      const data = await apiRequest('/tickets/public', { method: 'POST', body: payload })
      recordSuccessfulSubmission(parsed, data.ticket)
      localStorage.removeItem(FAILED_KEY)
      setSuccessToast(SUCCESS_MESSAGE)
    } catch {
      setError('Le renvoi a échoué. Réessayez plus tard.')
    }
  }

  const hasFailedTicket = Boolean(localStorage.getItem(FAILED_KEY))

  const labelClass = 'pointer-events-auto mb-1 block text-sm font-medium text-on-surface'
  const fieldClass =
    'pointer-events-auto w-full rounded border border-outline-variant/50 !bg-surface-lowest/40 px-2.5 py-2 text-sm backdrop-blur-lg'
  const categoryBtnClass = (selected) =>
    `pointer-events-auto inline-flex items-center gap-2 rounded border px-2.5 py-2 text-sm backdrop-blur-lg ${
      selected
        ? 'border-primary bg-surface-low/55'
        : 'border-outline-variant/50 bg-surface-lowest/40'
    }`

  return (
    <div className="relative h-[100dvh] overflow-hidden">
      <SplineHero />

      <div className="pointer-events-none relative z-10 flex h-full flex-col overflow-hidden">
        <header className="pointer-events-auto sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant/40 bg-surface-lowest/65 px-4 py-3 shadow-sm backdrop-blur-md">
          <AppBrand />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PublicSessionNotifications />
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded border border-outline-variant/60 bg-surface-low/70 p-2 backdrop-blur-sm"
              aria-label="Connexion DANTIC"
              title="Connexion personnel DANTIC"
            >
              <Users size={18} />
            </button>
          </div>
        </header>

        <main className="pointer-events-none min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-3 py-4">

            {error && (
              <div className="pointer-events-auto mb-4 rounded border border-error/60 bg-red-50/85 p-3 text-sm text-red-800 backdrop-blur-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {hasFailedTicket && (
              <button
                type="button"
                onClick={resendFailedTicket}
                className="pointer-events-auto mb-4 rounded border border-outline-variant/50 bg-surface-low/45 px-3 py-2 text-sm backdrop-blur-lg"
              >
                Renvoyer le ticket
              </button>
            )}

            <section className="pointer-events-auto w-full rounded-xl border border-outline-variant/40 bg-surface-lowest/50 p-5 shadow-lg backdrop-blur-xl">
              <h2 className="mb-3.5 text-center text-lg font-semibold">Soumettre un ticket</h2>
              <form onSubmit={submitTicket} className="space-y-2.5">
                <div>
                  <label className={labelClass} htmlFor="reporter_full_name">
                    Nom complet
                  </label>
                  <input
                    id="reporter_full_name"
                    required
                    placeholder="David NGENDENZA"
                    className={fieldClass}
                    value={form.reporter_full_name}
                    onChange={(e) => setField('reporter_full_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reporter_matricule">
                    Matricule agent
                  </label>
                  <input
                    id="reporter_matricule"
                    required
                    placeholder="XXXXXXXX"
                    className={fieldClass}
                    value={form.reporter_matricule}
                    onChange={(e) => setField('reporter_matricule', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reporter_direction">
                    Direction
                  </label>
                  <select
                    id="reporter_direction"
                    required
                    className={fieldClass}
                    value={form.reporter_direction}
                    onChange={(e) => setField('reporter_direction', e.target.value)}
                  >
                    <option value="">Veuillez sélectionner</option>
                    {OGEFREM_DIRECTIONS.map((direction) => {
                      const value = formatDirectionValue(direction)
                      return (
                        <option key={direction.code} value={value}>
                          {value}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="reporter_service">
                      Service
                    </label>
                    <input
                      id="reporter_service"
                      required
                      placeholder="Veuillez préciser"
                      className={fieldClass}
                      value={form.reporter_service}
                      onChange={(e) => setField('reporter_service', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="reporter_office">
                      Bureau / Local
                    </label>
                    <input
                      id="reporter_office"
                      required
                      placeholder="Veuillez préciser"
                      className={fieldClass}
                      value={form.reporter_office}
                      onChange={(e) => setField('reporter_office', e.target.value)}
                    />
                  </div>
                </div>
                <p className="pt-1 text-sm font-medium text-on-surface">
                  Quelle est la catégorie de votre problème ?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const Icon = category.icon
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setField('category_id', category.id)}
                        className={categoryBtnClass(form.category_id === category.id)}
                      >
                        <Icon size={15} />
                        <span className="leading-tight">{category.label}</span>
                      </button>
                    )
                  })}
                </div>
                <textarea
                  required
                  rows={4}
                  placeholder="Description du problème"
                  className={fieldClass}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
                <button
                  type="submit"
                  className="pointer-events-auto inline-flex w-full items-center justify-center gap-2 rounded bg-primary/90 px-3 py-2 text-sm font-semibold text-on-primary backdrop-blur-sm"
                >
                  <Send size={16} /> Soumettre le ticket
                </button>
              </form>
            </section>
          </div>
        </main>
      </div>

      {successToast && (
        <div
          role="status"
          aria-live="polite"
          className="toast-success pointer-events-auto fixed right-4 top-20 z-50 max-w-sm rounded-lg border border-green-500/50 bg-green-600/95 p-4 text-sm text-white shadow-xl backdrop-blur-md sm:right-6"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <span>{successToast}</span>
              {trackingToken && (
                <p className="mt-2 text-xs opacity-90">
                  Code de suivi (conservez-le) :{' '}
                  <code className="break-all font-mono">{trackingToken}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <DanticLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
