import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Telemetry() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIngest, setShowIngest] = useState(false);
  const [machineId, setMachineId] = useState('');
  const [fillLevel, setFillLevel] = useState('');
  const [salesJson, setSalesJson] = useState('[{"product_id":1,"quantity":1}]');
  const [faultCodes, setFaultCodes] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.telemetrySummary().then(setSummary).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError(null); setResult(null);
    try {
      const payload = {
        machine_id: parseInt(machineId, 10),
        fill_level: fillLevel ? parseFloat(fillLevel) : undefined,
        sales_data: salesJson ? JSON.parse(salesJson) : undefined,
        fault_codes: faultCodes ? faultCodes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      };
      const res = await api.telemetryIngest(payload);
      setResult(res);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Machine Telemetry</h1>
          <p className="text-gray-500 text-sm mt-1">MDB / DEX-style ingest of machine telemetry, sales, and fault codes</p>
        </div>
        <button onClick={() => setShowIngest(s => !s)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          {showIngest ? '✕ Close' : '⚡ Simulate Telemetry'}
        </button>
      </div>

      {showIngest && (
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Telemetry Ingest</h3>
          <form onSubmit={submit} className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-gray-400 mb-1 block">Machine ID *</span>
              <input type="number" required value={machineId} onChange={e => setMachineId(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
            </label>
            <label className="block text-sm">
              <span className="text-gray-400 mb-1 block">Fill Level (%)</span>
              <input type="number" min="0" max="100" value={fillLevel} onChange={e => setFillLevel(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="text-gray-400 mb-1 block">Sales Data (JSON array)</span>
              <textarea rows={3} value={salesJson} onChange={e => setSalesJson(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white font-mono text-xs" />
            </label>
            <label className="block text-sm col-span-2">
              <span className="text-gray-400 mb-1 block">Fault Codes (comma-separated, e.g. EA1,VEND_FAIL)</span>
              <input value={faultCodes} onChange={e => setFaultCodes(e.target.value)}
                className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
            </label>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                {submitting ? 'Sending…' : 'Send Telemetry'}
              </button>
            </div>
          </form>
          {error && <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded p-3 text-sm text-red-300">{error}</div>}
          {result && (
            <div className="mt-4 bg-emerald-900/20 border border-emerald-500/30 rounded p-3 text-sm text-emerald-200">
              <div className="font-semibold mb-1">✓ Ingested</div>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="bg-dark-800 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h3 className="text-white font-semibold">Live Machine Status (24h)</h3>
        </div>
        {loading ? <div className="p-8 text-center text-gray-500">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-dark-900/50">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active Alerts</th>
                <th className="px-4 py-3">Sales 24h</th>
                <th className="px-4 py-3">Fill %</th>
              </tr>
            </thead>
            <tbody>
              {summary.map(row => {
                const fillPct = Math.round(row.fill_pct || 0);
                const alertColor = row.active_alerts > 5 ? 'text-red-400' : row.active_alerts > 0 ? 'text-yellow-400' : 'text-green-400';
                return (
                  <tr key={row.id} className="border-t border-gray-700/30 hover:bg-dark-900/30">
                    <td className="px-4 py-3 text-white">{row.name}</td>
                    <td className="px-4 py-3 text-gray-400">{row.location}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">{row.status}</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${alertColor}`}>{row.active_alerts}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono">${parseFloat(row.sales_24h || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${fillPct < 20 ? 'bg-red-500' : fillPct < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${fillPct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400">{fillPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {summary.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No telemetry data yet — send a telemetry packet to populate.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
