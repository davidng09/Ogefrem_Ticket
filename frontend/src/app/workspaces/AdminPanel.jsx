import { useEffect, useMemo, useState } from 'react'
import { DateFilterHeader, PriorityFilterHeader } from '../components/TicketTableFilters'
import { ScrollablePanel } from '../components/ScrollablePanel'
import { apiRequest } from '../api'
import { useTicketFilters } from '../hooks/useTicketFilters'
import { usePaginatedTickets } from '../hooks/useTickets'
import { PaginationBar } from '../components/PaginationBar'
import { PASSWORD_POLICY_HINT } from '../utils/passwordPolicy'
import {
  formatEmittedDate,
  formatStatusLabel,
  getPriorityBadgeClass,
  getRoleLabel,
  getStatusBadgeClass,
  subDirectorates,
} from '../uiHelpers'

const initialForm = {
  matricule: '',
  password: '',
  nom: '',
  prenom: '',
  email: '',
  role_code: 'TECHNICIEN',
  sub_directorate_id: '',
  service_id: '',
  service_label: '',
}

export function AdminPanel() {
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const { tickets, loading: ticketsLoading, pagination, setPage } = usePaginatedTickets(null, null, 15)
  const { priorityFilter, setPriorityFilter, dateFilter, setDateFilter, filteredTickets } =
    useTicketFilters(tickets)

  async function loadUsers() {
    const data = await apiRequest('/admin/users')
    setUsers(data.users || [])
  }

  useEffect(() => {
    loadUsers().catch(() => setUsers([]))
    apiRequest('/meta/services')
      .then((data) => setServices(data.services || []))
      .catch(() => setServices([]))
  }, [])

  const filteredServices = useMemo(() => {
    if (!form.sub_directorate_id) return services
    return services.filter((s) => String(s.sub_directorate_id) === String(form.sub_directorate_id))
  }, [services, form.sub_directorate_id])

  async function submitCreate(e) {
    e.preventDefault()
    await apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        sub_directorate_id: form.sub_directorate_id ? Number(form.sub_directorate_id) : null,
        service_id: form.service_id ? Number(form.service_id) : null,
      }),
    })
    setForm(initialForm)
    setMessage('Compte créé. L’utilisateur devra changer son mot de passe à la première connexion.')
    loadUsers()
  }

  async function resetPassword(userId) {
    const password = prompt('Nouveau mot de passe')
    if (!password) return
    await apiRequest(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    })
    setMessage('Mot de passe réinitialisé. L’utilisateur devra le changer à la prochaine connexion.')
  }

  async function toggleActive(userId, isActive) {
    await apiRequest(`/admin/users/${userId}/active`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !isActive }),
    })
    loadUsers()
  }

  async function archiveResolved() {
    const data = await apiRequest('/admin/archive-resolved', { method: 'POST' })
    setMessage(`${data.archived || 0} ticket(s) archivés.`)
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h2 className="text-xl font-semibold">Super Admin — Comptes et archivage</h2>
        {message && <p className="mt-2 text-sm text-on-surface-variant">{message}</p>}
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Vue tickets globale</h3>
        {ticketsLoading ? (
          <p className="text-sm">Chargement des tickets...</p>
        ) : (
          <ScrollablePanel className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
                <tr>
                  <th className="p-2">Ticket</th>
                  <th className="p-2">Catégorie</th>
                  <th className="p-2">
                    <DateFilterHeader value={dateFilter} onChange={setDateFilter} />
                  </th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">
                    <PriorityFilterHeader value={priorityFilter} onChange={setPriorityFilter} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-sm text-on-surface-variant">
                      Aucun ticket.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-outline-variant">
                      <td className="p-2">
                        <p className="font-semibold">{ticket.ticket_number}</p>
                        <TicketDetailLink ticket={ticket} className="text-xs" />
                      </td>
                      <td className="p-2">{ticket.category_label}</td>
                      <td className="p-2 text-xs">{formatEmittedDate(ticket.created_at)}</td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(ticket.status, ticket)}`}>
                          {formatStatusLabel(ticket.status, ticket)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`rounded px-2 py-1 text-xs ${getPriorityBadgeClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollablePanel>
        )}
        <PaginationBar pagination={pagination} onPageChange={setPage} itemLabel="tickets" />
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <h3 className="mb-2 font-semibold">Créer un compte DANTIC</h3>
        <form onSubmit={submitCreate} className="grid gap-2 md:grid-cols-3">
          <input required placeholder="Matricule" className="rounded border border-outline-variant p-2 text-sm" value={form.matricule} onChange={(e) => setForm((s) => ({ ...s, matricule: e.target.value }))} />
          <input
            required
            placeholder="Mot de passe initial"
            title={PASSWORD_POLICY_HINT}
            className="rounded border border-outline-variant p-2 text-sm"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          />
          <p className="text-xs text-on-surface-variant md:col-span-2">{PASSWORD_POLICY_HINT}</p>
          <select className="rounded border border-outline-variant p-2 text-sm" value={form.role_code} onChange={(e) => setForm((s) => ({ ...s, role_code: e.target.value }))}>
            <option value="DIRECTEUR">Directrice DANTIC</option>
            <option value="SOUS_DIRECTEUR">Sous-directeur DANTIC</option>
            <option value="CHEF_SERVICE">Chef de service DANTIC</option>
            <option value="CHEF_BUREAU">Chef de bureau DANTIC</option>
            <option value="TECHNICIEN">Agent DANTIC</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </select>
          <input required placeholder="Nom" className="rounded border border-outline-variant p-2 text-sm" value={form.nom} onChange={(e) => setForm((s) => ({ ...s, nom: e.target.value }))} />
          <input required placeholder="Prénom" className="rounded border border-outline-variant p-2 text-sm" value={form.prenom} onChange={(e) => setForm((s) => ({ ...s, prenom: e.target.value }))} />
          <input placeholder="Email" className="rounded border border-outline-variant p-2 text-sm" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          <select
            className="rounded border border-outline-variant p-2 text-sm"
            value={form.sub_directorate_id}
            onChange={(e) => setForm((s) => ({ ...s, sub_directorate_id: e.target.value, service_id: '' }))}
          >
            <option value="">Sous-direction (optionnel)</option>
            {subDirectorates.map((sd) => (
              <option key={sd.id} value={sd.id}>
                {sd.label}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-outline-variant p-2 text-sm"
            value={form.service_id}
            onChange={(e) => setForm((s) => ({ ...s, service_id: e.target.value }))}
          >
            <option value="">Service DANTIC (optionnel)</option>
            {filteredServices.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.label}
              </option>
            ))}
          </select>
          <input placeholder="Libellé bureau (optionnel)" className="rounded border border-outline-variant p-2 text-sm md:col-span-2" value={form.service_label} onChange={(e) => setForm((s) => ({ ...s, service_label: e.target.value }))} />
          <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-on-primary">
            Créer
          </button>
        </form>
      </section>

      <section className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Utilisateurs</h3>
          <button type="button" className="rounded border border-outline-variant px-2 py-1 text-xs" onClick={archiveResolved}>
            Archiver les résolus &gt; 30j
          </button>
        </div>
          <ScrollablePanel className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-low text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="p-2">Matricule</th>
                <th className="p-2">Nom</th>
                <th className="p-2">Rôle</th>
                <th className="p-2">Actif</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-outline-variant">
                  <td className="p-2">{user.matricule}</td>
                  <td className="p-2">
                    {user.prenom} {user.nom}
                  </td>
                  <td className="p-2">{getRoleLabel(user.role_code)}</td>
                  <td className="p-2">{Number(user.is_active) === 1 ? 'Oui' : 'Non'}</td>
                  <td className="flex gap-2 p-2">
                    <button type="button" className="rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => resetPassword(user.id)}>
                      Reset MP
                    </button>
                    <button type="button" className="rounded border border-outline-variant px-2 py-1 text-xs" onClick={() => toggleActive(user.id, Number(user.is_active) === 1)}>
                      {Number(user.is_active) === 1 ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollablePanel>
      </section>
    </div>
  )
}
