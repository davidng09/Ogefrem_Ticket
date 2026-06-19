function getVisiblePages(page, totalPages, maxVisible = 5) {
  if (totalPages <= 1) return [1]
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)
  const pages = []
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
}

export function PaginationBar({
  pagination,
  onPageChange,
  itemLabel = 'éléments',
  className = '',
  perPage,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50],
}) {
  if (!pagination || pagination.total <= 0) return null

  const { page, total_pages, total, per_page } = pagination
  const from = (page - 1) * per_page + 1
  const to = Math.min(page * per_page, total)
  const pages = getVisiblePages(page, total_pages)

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-3 py-2 text-xs text-on-surface-variant ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Affichage {from}-{to} sur {total} {itemLabel}
        </span>
        {onPerPageChange && (
          <label className="flex items-center gap-1">
            <span>Par page</span>
            <select
              value={perPage ?? per_page}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="rounded border border-outline-variant bg-surface-lowest px-1 py-0.5 text-[10px] font-normal normal-case"
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
          className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-surface-lowest text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-low"
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded border px-2 text-sm font-medium ${
              p === page
                ? 'border-on-surface bg-on-surface text-surface-lowest'
                : 'border-outline-variant bg-surface-lowest hover:bg-surface-low'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
          className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-surface-lowest text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-surface-low"
        >
          ›
        </button>
      </div>
    </div>
  )
}
