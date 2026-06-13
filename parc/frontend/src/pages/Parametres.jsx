import { useState } from 'react'
import { ReferentielCrud } from './ReferentielCrud'

const tabs = [
  { id: 'marques', label: 'Marques' },
  { id: 'types', label: 'Types' },
  { id: 'etats', label: 'États' },
]

export function Parametres() {
  const [tab, setTab] = useState('marques')

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-outline-variant px-7 pt-7">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm ${tab === t.id ? 'border-primary font-semibold' : 'border-transparent text-on-surface-variant'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'marques' && (
        <ReferentielCrud
          title="Marques"
          endpoint="/marques"
          emptyForm={{ nom: '' }}
          mapFormToPayload={(f) => ({ nom: f.nom })}
          columns={[{ key: 'nom', label: 'Nom' }]}
        />
      )}
      {tab === 'types' && (
        <ReferentielCrud
          title="Types d'équipements"
          endpoint="/types"
          emptyForm={{ code: '', label: '', sort_order: '0' }}
          mapFormToPayload={(f) => ({ code: f.code, label: f.label, sort_order: Number(f.sort_order || 0) })}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'label', label: 'Libellé' },
            { key: 'sort_order', label: 'Ordre' },
          ]}
        />
      )}
      {tab === 'etats' && (
        <ReferentielCrud
          title="États"
          endpoint="/etats"
          emptyForm={{ code: '', label: '', couleur: '#6B7A99', sort_order: '0' }}
          mapFormToPayload={(f) => ({
            code: f.code,
            label: f.label,
            couleur: f.couleur,
            sort_order: Number(f.sort_order || 0),
          })}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'label', label: 'Libellé' },
            { key: 'couleur', label: 'Couleur' },
          ]}
        />
      )}
    </div>
  )
}
