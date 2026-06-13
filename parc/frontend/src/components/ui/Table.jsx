import { Pencil, Trash2 } from 'lucide-react'

export function Table({ columns, data, onEdit, onDelete, emptyMessage = 'Aucune donnée.' }) {
  if (!data?.length) {
    return <p className="rounded border border-outline-variant bg-surface-lowest p-6 text-sm text-on-surface-variant">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto rounded border border-outline-variant">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-primary text-on-primary">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 font-semibold">
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-3 py-2 font-semibold">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id ?? idx} className={idx % 2 === 0 ? 'bg-surface-low' : 'bg-surface-lowest'}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 align-top">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(row)} className="rounded border border-outline-variant p-1">
                        <Pencil size={14} />
                      </button>
                    )}
                    {onDelete && (
                      <button type="button" onClick={() => onDelete(row)} className="rounded border border-error p-1 text-error">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
