export function StatCard({ icon: Icon, label, value, color = '#000000', sub }) {
  return (
    <article
      className="rounded border border-outline-variant bg-surface-lowest p-4 shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-on-surface-variant">{label}</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{value}</p>
          {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
        </div>
        {Icon && <Icon size={22} style={{ color }} />}
      </div>
    </article>
  )
}
