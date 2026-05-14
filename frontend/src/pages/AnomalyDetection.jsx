import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

// Apply pass 5: surfaces /api/ai/anomaly-detection
export default function AnomalyDetection() {
  const [machineId, setMachineId] = useState('M-001');
  const [salesText, setSalesText] = useState('[\n  {"productId":"P-1","ts":"2026-05-08T10:00Z","amount":1.5}\n]');
  const [cashText, setCashText] = useState('[\n  {"ts":"2026-05-08T18:00Z","collected":35.0}\n]');
  const [restockText, setRestockText] = useState('[]');
  const [flagsText, setFlagsText] = useState('[]');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const parseOr = (s, label) => { try { return JSON.parse(s || '[]'); } catch { throw new Error(`${label} must be valid JSON`); } };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payload = {
        machineId,
        salesEvents: parseOr(salesText, 'Sales events'),
        cashCollections: parseOr(cashText, 'Cash collections'),
        restockEvents: parseOr(restockText, 'Restock events'),
        telemetryFlags: parseOr(flagsText, 'Telemetry flags'),
      };
      const result = await api.aiAnomalyDetection(payload);
      setData(result);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('not configured')) {
        setError('AI not configured. Set OPENROUTER_API_KEY in the backend environment.');
      } else {
        setError(err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-4">Anomaly Detection</h1>
      <p className="text-gray-400 mb-4 text-sm">Cash-vs-sales reconciliation, free-vend detection, tamper signals.</p>
      <form onSubmit={submit} className="space-y-3 max-w-3xl">
        <input className="input w-full" placeholder="Machine ID" value={machineId} onChange={(e) => setMachineId(e.target.value)} />
        <label className="block text-sm">Sales events (JSON array):</label>
        <textarea className="input w-full font-mono" rows={4} value={salesText} onChange={(e) => setSalesText(e.target.value)} />
        <label className="block text-sm">Cash collections (JSON array):</label>
        <textarea className="input w-full font-mono" rows={3} value={cashText} onChange={(e) => setCashText(e.target.value)} />
        <label className="block text-sm">Restock events (JSON array):</label>
        <textarea className="input w-full font-mono" rows={2} value={restockText} onChange={(e) => setRestockText(e.target.value)} />
        <label className="block text-sm">Telemetry flags (JSON array):</label>
        <textarea className="input w-full font-mono" rows={2} value={flagsText} onChange={(e) => setFlagsText(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Analysing...' : 'Detect Anomalies'}</button>
      </form>
      {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>}
      {data && <div className="mt-4"><AIOutput result={data} /></div>}
    </div>
  );
}
