import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

export default function RouteOptimization() {
  const [machinesText, setMachinesText] = useState('[\n  { "machineId": "M-001", "location": "Lobby A", "lastServiced": "2026-04-30", "stockoutRisk": "high" },\n  { "machineId": "M-014", "location": "Garage Level 2", "lastServiced": "2026-05-04", "stockoutRisk": "low" }\n]');
  const [startLocation, setStartLocation] = useState('');
  const [vehicleConstraints, setVehicleConstraints] = useState('');
  const [objectives, setObjectives] = useState('minimize-distance, priority-stockouts');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setShow(true);
    setLoading(true);
    setError(null);
    setData(null);

    let machines;
    try {
      machines = JSON.parse(machinesText);
    } catch {
      setLoading(false);
      setError('Machines must be valid JSON.');
      return;
    }

    let parsedVehicle = {};
    if (vehicleConstraints.trim()) {
      try { parsedVehicle = JSON.parse(vehicleConstraints); }
      catch { setLoading(false); setError('Vehicle constraints must be valid JSON or empty.'); return; }
    }

    const payload = {
      machines,
      objectives: objectives.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (startLocation.trim()) payload.startLocation = { description: startLocation.trim() };
    if (Object.keys(parsedVehicle).length) payload.vehicleConstraints = parsedVehicle;

    try {
      const result = await api.aiRouteOptimization(payload);
      setData(result);
    } catch (err) {
      if (err.message && err.message.includes('503')) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">AI Route Optimization</h1>
        <p className="text-gray-500 text-sm mt-1">Generate an efficient daily service / restock route across vending machines</p>
      </div>

      <form onSubmit={submit} className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6 space-y-4">
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Machines (JSON array)</span>
          <textarea rows="8" value={machinesText} onChange={(e) => setMachinesText(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white font-mono text-xs" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Start location (optional)</span>
          <input value={startLocation} onChange={(e) => setStartLocation(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" placeholder="e.g., Depot — 123 Main St" />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Vehicle constraints (JSON, optional)</span>
          <textarea rows="3" value={vehicleConstraints} onChange={(e) => setVehicleConstraints(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white font-mono text-xs"
            placeholder='{"capacityUnits": 200, "maxStops": 12, "shiftHours": 8}' />
        </label>
        <label className="block text-sm">
          <span className="text-gray-400 mb-1 block">Objectives (comma separated)</span>
          <input value={objectives} onChange={(e) => setObjectives(e.target.value)}
            className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded text-white" />
        </label>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {loading ? 'Optimizing…' : '🤖 Optimize Route'}
        </button>
      </form>

      {show && <AIOutput data={data} loading={loading} error={error} title="Route Plan" />}
    </div>
  );
}
