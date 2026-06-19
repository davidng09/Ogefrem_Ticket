/** Référentiel des directions Ogefrem (sigle + libellé complet) */
export const OGEFREM_DIRECTIONS = [
  { code: 'DFM', label: 'Direction du Fret Multimodal' },
  { code: 'DTFM', label: 'Direction des Taux de Fret multimodal' },
  { code: 'DFAC', label: 'Direction des Facilitations et Assistance aux chargeurs' },
  { code: 'DGIT', label: 'Direction de Gestion des Instruments de Traçabilité' },
  { code: 'DEP', label: 'Direction des Etudes et Planification' },
  { code: 'DSG', label: 'Direction des Services Généraux' },
  { code: 'DOCG', label: "Direction de l'Organisation et Contrôle de Gestion" },
  { code: 'DRH', label: 'Direction des Ressources Humaines' },
  { code: 'DFIN', label: 'Direction Financière' },
  { code: 'DAI', label: "Direction d'Audit Interne" },
  { code: 'DAJ', label: 'Direction des Affaires Juridiques' },
  { code: 'DII', label: "Direction de l'Inspection Interne" },
  {
    code: 'DSAERM',
    label: 'Direction de Suivi des Activités des Entités, Représentations et Mandataires',
  },
  { code: 'DRPC', label: 'Direction des Relations Publiques et Communication' },
  { code: 'DG', label: 'Direction Générale' },
  { code: 'DCOM', label: 'Direction Communication' },
  { code: 'DLOG', label: 'Direction Logistique' },
  { code: 'DAUD', label: 'Direction Audit Interne' },
  { code: 'DANTIC', label: 'Direction DANTIC' },
]

const byCode = new Map(OGEFREM_DIRECTIONS.map((d) => [d.code.toUpperCase(), d]))
const byLabelNorm = new Map(
  OGEFREM_DIRECTIONS.map((d) => [normalizeDirectionText(d.label), d]),
)

function normalizeDirectionText(value) {
  return (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function formatDirectionValue({ code, label }) {
  return `${code} : ${label}`
}

/**
 * Résout un libellé stocké en base vers { code, fullName, raw }.
 * Gère les formats « DFIN : Direction Financière », libellé seul ou sigle seul.
 */
export function resolveDirection(raw) {
  const input = (raw || '').trim()
  if (!input) {
    return { code: '—', fullName: 'Non renseignée', raw: input }
  }
  if (input.startsWith('Autres (')) {
    return { code: 'Autres', fullName: input, raw: input }
  }
  if (input === 'Non renseignée' || input === 'Non défini') {
    return { code: '—', fullName: input, raw: input }
  }

  const colonMatch = input.match(/^([A-Za-z][A-Za-z0-9]{1,7})\s*:\s*(.+)$/)
  if (colonMatch) {
    const code = colonMatch[1].toUpperCase()
    const tail = colonMatch[2].trim()
    const known = byCode.get(code)
    return {
      code,
      fullName: known?.label || tail,
      raw: input,
    }
  }

  const upper = input.toUpperCase()
  if (byCode.has(upper)) {
    const known = byCode.get(upper)
    return { code: known.code, fullName: known.label, raw: input }
  }

  const norm = normalizeDirectionText(input)
  if (byLabelNorm.has(norm)) {
    const known = byLabelNorm.get(norm)
    return { code: known.code, fullName: known.label, raw: input }
  }

  for (const d of OGEFREM_DIRECTIONS) {
    const labelNorm = normalizeDirectionText(d.label)
    if (norm === labelNorm || norm.includes(labelNorm) || labelNorm.includes(norm)) {
      return { code: d.code, fullName: d.label, raw: input }
    }
  }

  const firstToken = input.split(/\s+/)[0]?.toUpperCase()
  if (firstToken && byCode.has(firstToken)) {
    const known = byCode.get(firstToken)
    return { code: known.code, fullName: known.label, raw: input }
  }

  return { code: guessDirectionCode(input), fullName: input, raw: input }
}

function guessDirectionCode(label) {
  const words = label
    .replace(/^direction\s+(des?|du|de l'|de la|de)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return label.slice(0, 4).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words
    .slice(0, 4)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function enrichBreakdownWithDirectionCodes(items) {
  return (items || []).map((item) => {
    const resolved = resolveDirection(item.label)
    return {
      ...item,
      shortLabel: resolved.code,
      fullLabel: resolved.fullName,
      rawLabel: item.label,
    }
  })
}
