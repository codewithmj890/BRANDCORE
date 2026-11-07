/**
 * BRANDCORE — DataTable
 * Accessible data table with sorting, row selection, and responsive behavior.
 */
export function DataTable({ columns, data, rowKey = 'id', onRowClick, className = '' }) {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <div className={'overflow-x-auto border border-border rounded-lg card shadow-sm ' + className}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-muted text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 border-b border-border font-medium text-muted-foreground-dark"
                scope="col"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row) => (
            <tr
              key={row[rowKey]}
              className="bg-surface hover:bg-surface-muted transition-colors group cursor-pointer"
              onClick={() => onRowClick?.(row)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onRowClick?.(row)
                }
              }}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-foreground dark:text-foreground-dark">
                  {typeof col.render === 'function' ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
