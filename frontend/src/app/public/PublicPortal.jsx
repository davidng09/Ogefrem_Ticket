import { AlertCircle, AppWindow, KeyRound, Monitor, Printer, Send, Shapes, Users, Wifi } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AppBrand } from '../components/AppBrand'
import { apiRequest } from '../api'
import { DanticLoginModal } from './DanticLoginModal'
import { PublicSessionNotifications } from './PublicSessionNotifications'
import { addSessionTicket, notifyPublicTicketsUpdated } from './publicSessionTickets'

const DRAFT_KEY = 'ogefrem_ticket_draft'
const FAILED_KEY = 'ogefrem_failed_ticket'

const categories = [
  { id: 1, code: 'RESEAU', label: 'Réseau & WiFi', icon: Wifi },
  { id: 2, code: 'HARDWARE', label: 'Hardware & PC', icon: Monitor },
  { id: 3, code: 'APPLICATIONS', label: 'Logiciels / Apps', icon: AppWindow },
  { id: 4, code: 'AUTRES', label: 'Autres', icon: Shapes },
  { id: 5, code: 'IMPRESSION', label: 'Impression / Scanner', icon: Printer },
  { id: 6, code: 'ACCES', label: 'Accès & Comptes', icon: KeyRound },
]

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
  } catch {
    return {}
  }
}

function getCategoryLabel(categoryId) {
  return categories.find((c) => c.id === categoryId)?.label || ''
}

export function PublicPortal() {
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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)

  function setField(name, value) {
    const next = { ...form, [name]: value }
    setForm(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  }

  function recordSuccessfulSubmission(payload, ticketNumber) {
    addSessionTicket({
      ticket_number: ticketNumber,
      reporter_full_name: payload.reporter_full_name,
      category_label: getCategoryLabel(payload.category_id),
      description: payload.description,
    })
    notifyPublicTicketsUpdated()
  }

  async function submitTicket(e) {
    e.preventDefault()
    setMessage('')
    setError('')

    const payload = { ...form, category_id: Number(form.category_id) }

    try {
      const data = await apiRequest('/tickets/public', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const ticketNumber = data.ticket?.ticket_number
      recordSuccessfulSubmission(payload, ticketNumber)
      setMessage(
        ticketNumber
          ? `Ticket ${ticketNumber} soumis avec succès.`
          : 'Ticket soumis avec succès.',
      )
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
    } catch {
      setError('Connexion perdue. Votre ticket a été sauvegardé localement.')
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
      recordSuccessfulSubmission(parsed, data.ticket?.ticket_number)
      localStorage.removeItem(FAILED_KEY)
      setMessage(
        data.ticket?.ticket_number
          ? `Ticket ${data.ticket.ticket_number} renvoyé avec succès.`
          : 'Ticket renvoyé avec succès.',
      )
    } catch {
      setError('Le renvoi a échoué. Réessayez plus tard.')
    }
  }

  const hasFailedTicket = Boolean(localStorage.getItem(FAILED_KEY))

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant bg-surface-lowest px-4 py-3 shadow-sm">
        <AppBrand />
        <div className="flex items-center gap-2">
          <PublicSessionNotifications />
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="rounded border border-outline-variant bg-surface-low p-2"
            aria-label="Connexion DANTIC"
            title="Connexion personnel DANTIC"
          >
            <Users size={18} />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-4">
        <p className="mb-4 text-sm text-on-surface-variant">
          Signalement de ticket — accès DANTIC via l&apos;icône connexion
        </p>

        {(error || message) && (
          <div
            className={`mb-4 rounded border p-3 text-sm ${
              error ? 'border-error bg-red-50 text-red-800' : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
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

        <section className="rounded border border-outline-variant bg-surface-lowest p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Soumettre un ticket</h2>
          <form onSubmit={submitTicket} className="space-y-3">
            <input
              required
              placeholder="Nom complet"
              className="w-full rounded border border-outline-variant p-2"
              value={form.reporter_full_name}
              onChange={(e) => setField('reporter_full_name', e.target.value)}
            />
            <input
              required
              placeholder="Matricule Agent"
              className="w-full rounded border border-outline-variant p-2"
              value={form.reporter_matricule}
              onChange={(e) => setField('reporter_matricule', e.target.value)}
            />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                required
                placeholder="Direction"
                className="rounded border border-outline-variant p-2"
                value={form.reporter_direction}
                onChange={(e) => setField('reporter_direction', e.target.value)}
              />
              <input
                required
                placeholder="Service"
                className="rounded border border-outline-variant p-2"
                value={form.reporter_service}
                onChange={(e) => setField('reporter_service', e.target.value)}
              />
              <input
                required
                placeholder="Bureau/Local"
                className="rounded border border-outline-variant p-2"
                value={form.reporter_office}
                onChange={(e) => setField('reporter_office', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setField('category_id', category.id)}
                    className={`inline-flex items-center gap-2 rounded border p-2 text-sm ${
                      form.category_id === category.id
                        ? 'border-primary bg-surface-low'
                        : 'border-outline-variant bg-surface-lowest'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{category.label}</span>
                  </button>
                )
              })}
            </div>
            <textarea
              required
              rows={4}
              placeholder="Description du problème"
              className="w-full rounded border border-outline-variant p-2"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
            >
              <Send size={16} /> Soumettre le ticket
            </button>
          </form>
        </section>
      </div>

      <DanticLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
