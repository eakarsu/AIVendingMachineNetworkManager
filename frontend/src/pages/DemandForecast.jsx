import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

export default function DemandForecast() {
  const [machineId, setMachineId] = useState('');
  const [days, setDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setShow(true); setLoading(true); setError(null); setData(null);
    try {
      setData(await api.aiDemandForecast({ machine_id: machineId || undefined, horizon_days: Number(days) || 7, notes }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Demand Forecast</h1>
        <p className="text-gray-500 text-sm mt-1">Forecast next-N-day product demand per machine</p>
      </div>

      <form onSubmit={submit} className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6 space-y-4">
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Machine ID (optional)</span>
          <input value={machineId} onChange={e => setMachineId(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" placeholder="leave blank for all" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Horizon (days)</span>
          <input type="number" min="1" max="30" value={days} onChange={e => setDays(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Notes / Context</span>
          <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {loading ? 'Forecasting…' : '🤖 Run Forecast'}
        </button>
      </form>

      {show && <AIOutput data={data} loading={loading} error={error} title="Demand Forecast" />}
    </div>
  );
}
