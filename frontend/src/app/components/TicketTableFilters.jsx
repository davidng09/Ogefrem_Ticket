export function PriorityFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Priorité</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        <option value="bloquant">Bloquant</option>
        <option value="haute">Haute</option>
        <option value="normale">Normale</option>
      </select>
    </div>
  )
}

export function DateFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Date émise</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Toutes</option>
        <option value="today">Aujourd&apos;hui</option>
        <option value="week">Cette semaine</option>
        <option value="month">Ce mois</option>
      </select>
    </div>
  )
}

export function WeekFilterHeader({ value, onChange, weeks = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Semaine</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Toutes</option>
        {weeks.map((w) => (
          <option key={w.weekIndex} value={String(w.weekIndex)}>
            {w.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function StatusFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Statut</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        <option value="assigne_technicien">Assigné agent</option>
        <option value="en_cours">En cours</option>
        <option value="resolu">Résolu</option>
        <option value="chez_chef_service">Chez chef</option>
        <option value="chez_sous_direction">Chez sous-direction</option>
      </select>
    </div>
  )
}

export function ServiceFilterHeader({ value, onChange, services = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Service</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        {services.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SubDirectorateFilterHeader({ value, onChange, subDirectorates = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Sous-direction</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Toutes</option>
        {subDirectorates.map((sd) => (
          <option key={sd.id} value={String(sd.id)}>
            {sd.short || sd.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function MonthFilterHeader({ value, onChange, periods = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Mois</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        {periods.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
