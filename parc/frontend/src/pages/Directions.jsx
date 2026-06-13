import { ReferentielCrud } from './ReferentielCrud'

export function Directions() {
  return (
    <ReferentielCrud
      title="Directions OGEFREM"
      endpoint="/directions"
      emptyForm={{ code: '', nom: '' }}
      mapFormToPayload={(f) => ({ code: f.code, nom: f.nom })}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'nom', label: 'Nom' },
      ]}
    />
  )
}
