import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

export default function PredictiveMaintenanceV2() {
  const [machineId, setMachineId] = useState('');
  const [telemetry, setTelemetry] = useState('');
  const [history, setHistory] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setShow(true); setLoading(true); setError(null); setData(null);
    try {
      setData(await api.aiPredictiveMaintenanceV2({
        machine_id: machineId || undefined,
        telemetry: telemetry,
        history: history,
      }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Predictive Maintenance (v2)</h1>
        <p className="text-gray-500 text-sm mt-1">Risk score and preventive actions from telemetry/history</p>
      </div>

      <form onSubmit={submit} className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6 space-y-4">
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Machine ID</span>
          <input value={machineId} onChange={e => setMachineId(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Telemetry Snapshot (JSON or notes)</span>
          <textarea rows="4" value={telemetry} onChange={e => setTelemetry(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white font-mono text-xs" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Maintenance History</span>
          <textarea rows="4" value={history} onChange={e => setHistory(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {loading ? 'Analysing…' : '🤖 Predict Risk'}
        </button>
      </form>

      {show && <AIOutput data={data} loading={loading} error={error} title="Predictive Maintenance v2" />}
    </div>
  );
}
