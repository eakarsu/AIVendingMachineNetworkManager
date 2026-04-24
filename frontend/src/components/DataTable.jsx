import React, { useState } from 'react';

export default function DataTable({ columns, data, onRowClick, onDelete, onEdit }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filtered = data.filter(row =>
    columns.some(col => {
      const val = row[col.key];
      return val && String(val).toLowerCase().includes(search.toLowerCase());
    })
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol] ?? '';
    const bVal = b[sortCol] ?? '';
    const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  const formatCell = (col, row) => {
    const val = row[col.key];
    if (val === null || val === undefined) return <span className="text-gray-600">—</span>;
    if (col.render) return col.render(val, row);
    if (col.type === 'status') {
      const colors = {
        active: 'bg-green-500/20 text-green-400',
        completed: 'bg-green-500/20 text-green-400',
        reconciled: 'bg-green-500/20 text-green-400',
        resolved: 'bg-green-500/20 text-green-400',
        acknowledged: 'bg-blue-500/20 text-blue-400',
        inactive: 'bg-gray-500/20 text-gray-400',
        maintenance: 'bg-yellow-500/20 text-yellow-400',
        scheduled: 'bg-blue-500/20 text-blue-400',
        planned: 'bg-blue-500/20 text-blue-400',
        in_progress: 'bg-orange-500/20 text-orange-400',
        draft: 'bg-gray-500/20 text-gray-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        flagged: 'bg-red-500/20 text-red-400',
        under_review: 'bg-orange-500/20 text-orange-400',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[val] || 'bg-gray-500/20 text-gray-400'}`}>
          {val.replace(/_/g, ' ')}
        </span>
      );
    }
    if (col.type === 'severity') {
      const colors = { critical: 'bg-red-500/20 text-red-400', warning: 'bg-yellow-500/20 text-yellow-400', info: 'bg-blue-500/20 text-blue-400' };
      return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[val] || 'bg-gray-500/20 text-gray-400'}`}>{val}</span>;
    }
    if (col.type === 'currency') return <span className="text-emerald-400 font-mono">${Number(val).toFixed(2)}</span>;
    if (col.type === 'date') return new Date(val).toLocaleDateString();
    if (col.type === 'datetime') return new Date(val).toLocaleString();
    if (col.type === 'number') return <span className="font-mono">{Number(val).toLocaleString()}</span>;
    if (col.type === 'variance') {
      const num = Number(val);
      return <span className={`font-mono ${num < 0 ? 'text-red-400' : num > 0 ? 'text-green-400' : 'text-gray-400'}`}>{num >= 0 ? '+' : ''}${num.toFixed(2)}</span>;
    }
    if (col.type === 'boolean') return val ? <span className="text-green-400">Yes</span> : <span className="text-red-400">No</span>;
    return String(val);
  };

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full max-w-sm px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg text-gray-300 text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      <div className="bg-dark-800 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/50">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none"
                  >
                    {col.label}
                    {sortCol === col.key && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-4 py-12 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <tr
                    key={row.id || i}
                    onClick={() => onRowClick?.(row)}
                    className="hover:bg-gray-700/20 cursor-pointer transition-colors"
                  >
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatCell(col, row)}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {onEdit && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                            className="text-primary-400 hover:text-primary-300 text-xs font-medium mr-3"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                            className="text-red-400 hover:text-red-300 text-xs font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-700/50 text-xs text-gray-500">
          Showing {sorted.length} of {data.length} records
        </div>
      </div>
    </div>
  );
}
