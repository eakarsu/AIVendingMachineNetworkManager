import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

// Lightweight TSP-by-nearest-neighbour to give a usable order even without a map lib.
function nearestNeighbour(stops, depot) {
  if (!stops.length) return [];
  const remaining = [...stops];
  const route = [];
  let current = depot || stops[0];
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, remaining[i]);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    route.push({ ...next, distance_km: bestD });
    current = next;
  }
  return route;
}
function haversine(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad((b.lat || 0) - (a.lat || 0));
  const dLng = toRad((b.lng || 0) - (a.lng || 0));
  const lat1 = toRad(a.lat || 0);
  const lat2 = toRad(b.lat || 0);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RouteMap() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const [depot, setDepot] = useState({ lat: 40.7128, lng: -74.006 });

  useEffect(() => {
    api.getAll('machines').then(data => {
      const list = Array.isArray(data) ? data : (data.data || []);
      setMachines(list);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const stops = useMemo(() => machines.filter(m => m.lat && m.lng), [machines]);
  const optimised = useMemo(() => nearestNeighbour(stops.map(m => ({ id: m.id, name: m.name, lat: parseFloat(m.lat), lng: parseFloat(m.lng), location: m.location })), depot), [stops, depot]);
  const totalKm = useMemo(() => optimised.reduce((sum, s) => sum + (s.distance_km || 0), 0), [optimised]);

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null); setAiResult(null);
    try { setAiResult(await api.aiRoutes()); } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  const minLat = Math.min(depot.lat, ...stops.map(s => parseFloat(s.lat)));
  const maxLat = Math.max(depot.lat, ...stops.map(s => parseFloat(s.lat)));
  const minLng = Math.min(depot.lng, ...stops.map(s => parseFloat(s.lng)));
  const maxLng = Math.max(depot.lng, ...stops.map(s => parseFloat(s.lng)));
  const padLat = (maxLat - minLat) * 0.15 || 0.05;
  const padLng = (maxLng - minLng) * 0.15 || 0.05;
  const proj = (lat, lng) => ({
    x: ((lng - (minLng - padLng)) / ((maxLng + padLng) - (minLng - padLng))) * 800,
    y: 400 - ((lat - (minLat - padLat)) / ((maxLat + padLat) - (minLat - padLat))) * 400,
  });

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Optimizer (TSP)</h1>
          <p className="text-gray-500 text-sm mt-1">Nearest-neighbour vehicle routing across machines with lat/lng + AI commentary</p>
        </div>
        <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          🤖 AI Route Plan
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Stops</div>
          <div className="text-3xl font-bold text-white mt-1">{optimised.length}</div>
        </div>
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Total Distance</div>
          <div className="text-3xl font-bold text-emerald-400 mt-1">{totalKm.toFixed(1)} km</div>
        </div>
        <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Depot</div>
          <div className="text-sm text-white mt-1 font-mono">{depot.lat.toFixed(3)}, {depot.lng.toFixed(3)}</div>
          <div className="flex gap-2 mt-2">
            <input type="number" step="0.001" placeholder="lat" value={depot.lat}
              onChange={e => setDepot(d => ({ ...d, lat: parseFloat(e.target.value) || 0 }))}
              className="w-1/2 px-2 py-1 bg-dark-900 border border-gray-700 rounded text-white text-xs" />
            <input type="number" step="0.001" placeholder="lng" value={depot.lng}
              onChange={e => setDepot(d => ({ ...d, lng: parseFloat(e.target.value) || 0 }))}
              className="w-1/2 px-2 py-1 bg-dark-900 border border-gray-700 rounded text-white text-xs" />
          </div>
        </div>
      </div>

      <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-6 mb-6">
        <h3 className="text-white font-semibold mb-4">Route Map (schematic)</h3>
        {loading ? <div className="text-gray-500">Loading…</div> : optimised.length === 0 ? (
          <div className="text-gray-500">No machines have lat/lng set.</div>
        ) : (
          <svg viewBox="0 0 800 400" className="w-full h-96 bg-dark-900 rounded">
            <line x1={proj(depot.lat, depot.lng).x} y1={proj(depot.lat, depot.lng).y}
              x2={proj(optimised[0].lat, optimised[0].lng).x} y2={proj(optimised[0].lat, optimised[0].lng).y}
              stroke="#a855f7" strokeWidth="2" strokeDasharray="4,4" />
            {optimised.map((s, i) => {
              if (i === 0) return null;
              const a = proj(optimised[i - 1].lat, optimised[i - 1].lng);
              const b = proj(s.lat, s.lng);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#a855f7" strokeWidth="2" />;
            })}
            <circle cx={proj(depot.lat, depot.lng).x} cy={proj(depot.lat, depot.lng).y} r="10" fill="#10b981" />
            <text x={proj(depot.lat, depot.lng).x + 12} y={proj(depot.lat, depot.lng).y - 8} fill="#10b981" fontSize="11">Depot</text>
            {optimised.map((s, i) => {
              const p = proj(s.lat, s.lng);
              return (
                <g key={s.id}>
                  <circle cx={p.x} cy={p.y} r="8" fill="#3b82f6" />
                  <text x={p.x} y={p.y + 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{i + 1}</text>
                  <text x={p.x + 12} y={p.y - 6} fill="#9ca3af" fontSize="10">{s.name}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="bg-dark-800 border border-gray-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-700/50">
          <h3 className="text-white font-semibold">Optimised Stop Order</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-dark-900/50">
            <tr className="text-left text-gray-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Coords</th>
              <th className="px-4 py-3 text-right">Leg (km)</th>
            </tr>
          </thead>
          <tbody>
            {optimised.map((s, i) => (
              <tr key={s.id} className="border-t border-gray-700/30">
                <td className="px-4 py-3 text-purple-400 font-mono">{i + 1}</td>
                <td className="px-4 py-3 text-white">{s.name}</td>
                <td className="px-4 py-3 text-gray-400">{s.location}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-mono">{s.distance_km.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAI && <AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Route Recommendations" />}
    </div>
  );
}
