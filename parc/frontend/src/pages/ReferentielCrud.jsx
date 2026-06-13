import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Table } from '../components/ui/Table'

export function ReferentielCrud({ title, endpoint, columns, emptyForm, mapFormToPayload }) {
  const { readOnly } = useAuth()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editRow, setEditRow] = useState(null)
  const [error, setError] = useState('')

  function load() {
    api.get(endpoint).then((data) => setItems(data.items || []))
  }

  useEffect(() => {
    load()
  }, [endpoint])

  async function save() {
    setError('')
    try {
      const payload = mapFormToPayload(form)
      if (editRow) {
        await api.patch(`${endpoint}/${editRow.id}`, payload)
      } else {
        await api.post(endpoint, payload)
      }
      setOpen(false)
      setEditRow(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove(row) {
    if (!window.confirm('Supprimer cet élément ?')) return
    try {
      await api.delete(`${endpoint}/${row.id}`)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <Layout title={title}>
      <div className="mb-4 flex justify-end">
        {!readOnly && (
          <Button onClick={() => { setEditRow(null); setForm(emptyForm); setOpen(true) }}>
            <Plus size={16} className="mr-1 inline" /> Ajouter
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        data={items}
        onEdit={readOnly ? undefined : (row) => { setEditRow(row); setForm({ ...emptyForm, ...row }); setOpen(true) }}
        onDelete={readOnly ? undefined : remove}
      />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editRow ? 'Modifier' : 'Ajouter'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save}>Enregistrer</Button>
          </div>
        }
      >
        {error && <p className="mb-2 text-sm text-error">{error}</p>}
        {Object.keys(emptyForm).map((key) => (
          <label key={key} className="mb-3 block text-sm capitalize">
            {key.replace('_', ' ')}
            <input
              className="mt-1 w-full rounded border px-2 py-2"
              value={form[key] ?? ''}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
      </Modal>
    </Layout>
  )
}
