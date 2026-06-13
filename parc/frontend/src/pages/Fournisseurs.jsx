import { ReferentielCrud } from './ReferentielCrud'

export function Fournisseurs() {
  return (
    <ReferentielCrud
      title="Fournisseurs"
      endpoint="/fournisseurs"
      emptyForm={{ nom: '', contact: '', telephone: '', email: '', adresse: '' }}
      mapFormToPayload={(f) => ({
        nom: f.nom,
        contact: f.contact,
        telephone: f.telephone,
        email: f.email,
        adresse: f.adresse,
      })}
      columns={[
        { key: 'nom', label: 'Nom' },
        { key: 'contact', label: 'Contact' },
        { key: 'telephone', label: 'Téléphone' },
        { key: 'email', label: 'Email' },
      ]}
    />
  )
}
