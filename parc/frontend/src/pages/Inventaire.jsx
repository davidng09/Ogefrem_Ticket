import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/layout/Layout'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Table } from '../components/ui/Table'
import { formatDate, formatMoney } from '../utils/helpers'

const emptyForm = {
  type_id: '',
  marque_id: '',
  modele: '',
  etat_id: '',
  direction_id: '',
  fournisseur_id: '',
  numero_serie: '',
  date_acquisition: '',
  date_garantie_fin: '',
  prix_acquisition: '',
  emplacement_libre: '',
  notes: '',
  detenteur: { matricule: '', nom_complet: '', direction: '', service: '', bureau: '' },
}

export function Inventaire() {
  const { readOnly } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ types: [], marques: [], etats: [], directions: [], fournisseurs: [] })
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    const params = q ? `?q=${encodeURIComponent(q)}` : ''
    api.get(`/equipements${params}`).then((data) => setItems(data.equipements || []))
  }, [q])

  useEffect(() => {
    api.get('/meta').then((data) => setMeta(data))
    load()
  }, [load])

  async function handleCreate(e) {
    e?.preventDefault?.()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        type_id: Number(form.type_id),
        marque_id: Number(form.marque_id),
        etat_id: form.etat_id ? Number(form.etat_id) : undefined,
        direction_id: form.direction_id ? Number(form.direction_id) : null,
        fournisseur_id: form.fournisseur_id ? Number(form.fournisseur_id) : null,
      }
      if (!form.detenteur.matricule) delete payload.detenteur
      await api.post('/equipements', payload)
      setOpen(false)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'numero_inventaire', label: 'N° inventaire' },
    { key: 'modele', label: 'Modèle' },
    { key: 'type_label', label: 'Type' },
    {
      key: 'etat_label',
      label: 'État',
      render: (row) => <Badge label={row.etat_label} color={row.etat_couleur} />,
    },
    {
      key: 'detenteur',
      label: 'Détenteur',
      render: (row) => row.detenteur_nom || row.emplacement_libre || '—',
    },
    { key: 'date_garantie_fin', label: 'Garantie', render: (row) => formatDate(row.date_garantie_fin) },
    { key: 'prix_acquisition', label: 'Prix', render: (row) => formatMoney(row.prix_acquisition) },
  ]

  return (
    <Layout title="Inventaire">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            className="w-full rounded border border-outline-variant py-2 pl-9 pr-3 text-sm"
            placeholder="Rechercher n° inventaire, série, modèle, détenteur…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>
        {!readOnly && (
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1 inline" /> Nouvel équipement
          </Button>
        )}
      </div>

      <Table columns={columns} data={items} emptyMessage="Aucun équipement trouvé." />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ajouter un équipement"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button loading={loading} onClick={handleCreate}>Enregistrer</Button>
          </div>
        }
      >
        {error && <p className="mb-3 text-sm text-error">{error}</p>}
        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Type *
              <select className="mt-1 w-full rounded border px-2 py-2" value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} required>
                <option value="">—</option>
                {meta.types?.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Marque *
              <select className="mt-1 w-full rounded border px-2 py-2" value={form.marque_id} onChange={(e) => setForm({ ...form, marque_id: e.target.value })} required>
                <option value="">—</option>
                {meta.marques?.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm">Modèle *
            <input className="mt-1 w-full rounded border px-2 py-2" value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })} required />
          </label>
          <label className="block text-sm">N° série
            <input className="mt-1 w-full rounded border px-2 py-2" value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
          </label>
          <p className="text-xs font-semibold uppercase text-on-surface-variant">Affectation (optionnel)</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Matricule" className="rounded border px-2 py-2 text-sm" value={form.detenteur.matricule} onChange={(e) => setForm({ ...form, detenteur: { ...form.detenteur, matricule: e.target.value } })} />
            <input placeholder="Nom complet" className="rounded border px-2 py-2 text-sm" value={form.detenteur.nom_complet} onChange={(e) => setForm({ ...form, detenteur: { ...form.detenteur, nom_complet: e.target.value } })} />
            <input placeholder="Direction" className="rounded border px-2 py-2 text-sm" value={form.detenteur.direction} onChange={(e) => setForm({ ...form, detenteur: { ...form.detenteur, direction: e.target.value } })} />
            <input placeholder="Service" className="rounded border px-2 py-2 text-sm" value={form.detenteur.service} onChange={(e) => setForm({ ...form, detenteur: { ...form.detenteur, service: e.target.value } })} />
            <input placeholder="Bureau" className="col-span-2 rounded border px-2 py-2 text-sm" value={form.detenteur.bureau} onChange={(e) => setForm({ ...form, detenteur: { ...form.detenteur, bureau: e.target.value } })} />
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
