import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

export default function DynamicPricingV2() {
  const [marginFloor, setMarginFloor] = useState(0.2);
  const [machineId, setMachineId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setShow(true); setLoading(true); setError(null); setData(null);
    try {
      setData(await api.aiDynamicPricing({
        machine_id: machineId || undefined,
        margin_floor: Number(marginFloor),
        notes,
      }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Dynamic Pricing</h1>
        <p className="text-gray-500 text-sm mt-1">Price recommendations respecting a margin floor</p>
      </div>

      <form onSubmit={submit} className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6 space-y-4">
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Machine ID (optional)</span>
          <input value={machineId} onChange={e => setMachineId(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Margin Floor (e.g. 0.2 for 20%)</span>
          <input type="number" step="0.01" min="0" max="1" value={marginFloor} onChange={e => setMarginFloor(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Notes / Strategy</span>
          <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {loading ? 'Computing…' : '🤖 Recommend Prices'}
        </button>
      </form>

      {show && <AIOutput data={data} loading={loading} error={error} title="Dynamic Pricing Recommendation" />}
    </div>
  );
}
