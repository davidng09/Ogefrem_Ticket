export function Badge({ label, color = '#6B7A99' }) {
  return (
    <span
      className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold"
      style={{
        color,
        borderColor: `${color}44`,
        backgroundColor: `${color}22`,
      }}
    >
      {label}
    </span>
  )
}
