export function SortFilterHeader({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Tri</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function PerPageFilterHeader({ value, onChange, options = [10, 15, 25, 50] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Par page</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  )
}

export function MineOnlyFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Prise en charge</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous les chefs</option>
        <option value="mine">Mes tickets</option>
      </select>
    </div>
  )
}

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
        <option value="urgent">Urgent</option>
        <option value="elevee">Élevée</option>
        <option value="normale">Normale</option>
      </select>
    </div>
  )
}

export function DateFilterHeader({ value, onChange, label = 'Date émise' }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>{label}</span>
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
        <option value="year">Cette année</option>
      </select>
    </div>
  )
}

export function ReporterDirectionFilterHeader({ value, onChange, directions = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Direction</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Toutes</option>
        {directions.map((dir) => (
          <option key={dir} value={dir}>
            {dir}
          </option>
        ))}
      </select>
    </div>
  )
}

export function AuthorFilterHeader({ value, onChange, authors = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Agent</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        {authors.map((author) => (
          <option key={author.id} value={String(author.id)}>
            {author.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function HistoryGroupByHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Regrouper</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="week">Semaine</option>
        <option value="month">Mois</option>
        <option value="year">Année</option>
      </select>
    </div>
  )
}

export function TicketSearchInput({ value, onChange, placeholder = 'Rechercher un ticket…' }) {
  return (
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1 normal-case">
      <span className="text-[10px] uppercase text-on-surface-variant">Recherche</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded border border-outline-variant bg-surface-lowest px-2 py-1 text-sm normal-case"
      />
    </label>
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

export function ChefAssignedStatusFilterHeader({ value, onChange }) {
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
        <option value="chef_bureau">Chef de bureau</option>
        <option value="resolu">Résolu</option>
        <option value="non_resolu">Non résolu</option>
      </select>
    </div>
  )
}

export function AgentAssignmentFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Affectation</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        <option value="assigned">Affecté</option>
        <option value="unassigned">Non affecté</option>
      </select>
    </div>
  )
}

export function AgentAssignedStatusFilterHeader({ value, onChange, isChefBureau = false }) {
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
        {isChefBureau ? (
          <option value="chef_bureau">Chef de bureau</option>
        ) : (
          <option value="assigne_technicien">Assigné agent</option>
        )}
        <option value="en_cours">En cours</option>
        <option value="non_resolu">Réouvert</option>
      </select>
    </div>
  )
}

export function AgentClosedOutcomeFilterHeader({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Clôture</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Tous</option>
        <option value="resolu">Résolu</option>
        <option value="non_resolu">Non résolu</option>
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

export function CategoryFilterHeader({ value, onChange, categories = [] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>Catégorie</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="all">Toutes</option>
        {categories.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.label}
          </option>
        ))}
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
