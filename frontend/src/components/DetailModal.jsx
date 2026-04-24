import React from 'react';

function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatValue(key, value) {
  if (value === null || value === undefined) return '—';
  if (key.includes('date') || key.includes('_at') || key.includes('serviced')) {
    try { return new Date(value).toLocaleString(); } catch { return String(value); }
  }
  if (key.includes('amount') || key.includes('price') || key.includes('cost') || key.includes('variance') || key.includes('revenue')) {
    return `$${Number(value).toFixed(2)}`;
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export default function DetailModal({ item, onClose, onEdit, onDelete, title }) {
  if (!item) return null;

  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    reconciled: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    maintenance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    flagged: 'bg-red-500/20 text-red-400 border-red-500/30',
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const skipKeys = ['id', 'created_at', 'updated_at'];
  const entries = Object.entries(item).filter(([k]) => !skipKeys.includes(k));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-gray-700/50 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-dark-800">
          <h2 className="text-lg font-semibold text-white">{title || 'Record Details'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[50vh] space-y-3">
          <div className="text-xs text-gray-500 mb-2">ID: {item.id}</div>
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start gap-3 py-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-36 shrink-0 pt-0.5">
                {formatKey(key)}
              </span>
              <span className="text-sm text-gray-300 flex-1">
                {key === 'status' || key === 'severity' ? (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[value] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                    {String(value).replace(/_/g, ' ')}
                  </span>
                ) : typeof value === 'object' && value !== null ? (
                  <pre className="text-xs bg-dark-900 rounded p-2 overflow-x-auto text-gray-400">{JSON.stringify(value, null, 2)}</pre>
                ) : (
                  formatValue(key, value)
                )}
              </span>
            </div>
          ))}
          {item.created_at && (
            <div className="text-xs text-gray-600 pt-2 border-t border-gray-700/30">
              Created: {new Date(item.created_at).toLocaleString()} | Updated: {new Date(item.updated_at || item.created_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700/50 bg-dark-900/50">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item)}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
