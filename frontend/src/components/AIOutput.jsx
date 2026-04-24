import React from 'react';

function renderValue(value, depth = 0) {
  if (value === null || value === undefined) return <span className="text-gray-500">—</span>;
  if (typeof value === 'boolean') return <span className={value ? 'text-green-400' : 'text-red-400'}>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span className="text-blue-400 font-mono">{value.toLocaleString()}</span>;
  if (typeof value === 'string') {
    if (['critical', 'high'].includes(value.toLowerCase())) return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">{value}</span>;
    if (['medium', 'warning'].includes(value.toLowerCase())) return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">{value}</span>;
    if (['low', 'info', 'good', 'excellent', 'stable', 'growing'].includes(value.toLowerCase())) return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">{value}</span>;
    if (['declining', 'poor', 'weak'].includes(value.toLowerCase())) return <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">{value}</span>;
    if (value.startsWith('$') || value.endsWith('%')) return <span className="text-emerald-400 font-semibold">{value}</span>;
    return <span className="text-gray-300">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-500">None</span>;
    if (typeof value[0] === 'string') {
      return (
        <ul className="space-y-1 mt-1">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-primary-400 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3 mt-2">
        {value.map((item, i) => (
          <div key={i} className="bg-dark-800/50 border border-gray-700/30 rounded-lg p-3">
            {renderObject(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return <div className="mt-1">{renderObject(value, depth + 1)}</div>;
  }
  return <span className="text-gray-300">{String(value)}</span>;
}

function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return renderValue(obj, depth);

  const entries = Object.entries(obj);
  if (depth > 3) {
    return <span className="text-gray-400 text-xs">{JSON.stringify(obj)}</span>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => {
        if (key === 'raw' || key === 'model') return null;
        const isSimple = typeof value !== 'object' || value === null;
        return (
          <div key={key} className={isSimple ? 'flex items-start gap-2' : ''}>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0 min-w-[120px]">
              {formatKey(key)}:
            </span>
            <div className="flex-1">{renderValue(value, depth)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AIOutput({ data, loading, error, title }) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6 fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h3 className="text-purple-400 font-semibold">AI Analysis in Progress</h3>
            <p className="text-gray-400 text-sm">Processing data with AI model...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 fade-in">
        <h3 className="text-red-400 font-semibold mb-2">AI Analysis Error</h3>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const result = data.result || data;
  const summary = result.summary || result.message;

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl overflow-hidden fade-in">
      {/* Header */}
      <div className="bg-purple-900/30 px-6 py-4 border-b border-purple-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h3 className="text-purple-300 font-semibold">{title || 'AI Analysis Results'}</h3>
            {data.model && <p className="text-xs text-gray-500">Model: {data.model}</p>}
          </div>
        </div>
        <div className="pulse-dot w-2 h-2 bg-green-400 rounded-full"></div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="px-6 py-4 border-b border-purple-500/10">
          <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {Object.entries(result).map(([key, value]) => {
          if (key === 'summary' || key === 'message' || key === 'raw' || key === 'model') return null;
          return (
            <div key={key} className="border-b border-gray-700/30 pb-4 last:border-0 last:pb-0">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {formatKey(key)}
              </h4>
              {renderValue(value)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
