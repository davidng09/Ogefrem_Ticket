export function getInitials(prenom, nom) {
  const a = (prenom || '').charAt(0)
  const b = (nom || '').charAt(0)
  return (a + b).toUpperCase() || 'DA'
}

export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(Number(value))
}
