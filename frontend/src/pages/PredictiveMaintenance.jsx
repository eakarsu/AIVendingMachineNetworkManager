import React, { useState, useEffect } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

export default function PredictiveMaintenance() {
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    api.getAll('machines').then(data => {
      const list = Array.isArray(data) ? data : (data.data || []);
      setMachines(list);
      if (list.length) setMachineId(list[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const runPredict = async () => {
    if (!machineId) return;
    setShowAI(true); setAiLoading(true); setAiError(null); setAiResult(null);
    try { setAiResult(await api.aiPredictMaintenance(machineId)); }
    catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Predictive Maintenance</h1>
          <p className="text-gray-500 text-sm mt-1">Predict component failures from fault codes, history, and alerts</p>
        </div>
      </div>

      <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6">
        <div className="flex items-end gap-4">
          <label className="block text-sm flex-1">
            <span className="text-gray-400 mb-1 block">Machine</span>
            <select value={machineId} onChange={e => setMachineId(e.target.value)} disabled={loading}
              className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white">
              {machines.map(m => <option key={m.id} value={m.id}>{m.name} — {m.location}</option>)}
            </select>
          </label>
          <button onClick={runPredict} disabled={!machineId || aiLoading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            🤖 Predict Failure Risk
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          AI analyses recent fault codes, maintenance history, and alerts to estimate failure probability,
          components at risk (compressor, bill validator, vend motor), and recommended preventive-maintenance dates.
        </p>
      </div>

      {showAI && <AIOutput data={aiResult} loading={aiLoading} error={aiError} title="Predictive Maintenance Analysis" />}
    </div>
  );
}
