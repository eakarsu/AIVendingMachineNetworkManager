import React, { useState } from 'react';
import { fetchApi } from '../api';

const DEPOT_OPTIONS = [
  'Midtown Depot',
  'Queens Depot',
  'Brooklyn Depot',
  'Bronx Depot',
  'Jersey City Depot',
];

export default function RestockRoutePlanner() {
  const [driver, setDriver] = useState('Alex Driver');
  const [startLocation, setStartLocation] = useState('Midtown Depot');
  const [maxStops, setMaxStops] = useState(8);
  const [prioritize, setPrioritize] = useState('low-stock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function generateRoute(e) {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchApi('/custom-views/restock-route', {
        method: 'POST',
        body: JSON.stringify({
          driver,
          start_location: startLocation,
          max_stops: Number(maxStops) || 8,
          prioritize,
        }),
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to generate route');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-dark-800 rounded-lg border border-gray-700/50 p-4"
      data-testid="restock-route-planner"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">Restock Route Planner</h2>
        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          driver dispatch
        </span>
      </div>

      <form
        onSubmit={generateRoute}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4"
        data-testid="restock-route-form"
      >
        <label className="flex flex-col text-xs text-gray-400">
          Driver
          <input
            type="text"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            data-testid="rrp-driver-input"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Start Location
          <select
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            data-testid="rrp-start-select"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            {DEPOT_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Max Stops
          <input
            type="number"
            min={1}
            max={50}
            value={maxStops}
            onChange={(e) => setMaxStops(e.target.value)}
            data-testid="rrp-maxstops-input"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Prioritize
          <select
            value={prioritize}
            onChange={(e) => setPrioritize(e.target.value)}
            data-testid="rrp-prioritize-select"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="low-stock">Low Stock</option>
            <option value="high-revenue">High Revenue</option>
          </select>
        </label>

        <div className="md:col-span-2 lg:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            data-testid="rrp-generate-btn"
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating…' : 'Generate Route'}
          </button>
          {result && (
            <span className="text-xs text-gray-400" data-testid="rrp-summary">
              Route <strong className="text-gray-200">{result.route_id}</strong> ·
              {' '}{result.total_stops} stops · {result.total_distance_km} km ·
              {' '}{result.total_minutes} min
            </span>
          )}
        </div>
      </form>

      {error && (
        <div
          className="p-3 mb-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm"
          data-testid="rrp-error"
        >
          {error}
        </div>
      )}

      {result && Array.isArray(result.route) && (
        <div className="overflow-x-auto" data-testid="rrp-route-table">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Machine</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">ETA</th>
                <th className="py-2 pr-3 text-right">Min</th>
                <th className="py-2 pr-3 text-right">Distance (km)</th>
                <th className="py-2 pr-3 text-right">Restock items</th>
              </tr>
            </thead>
            <tbody>
              {result.route.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-800 hover:bg-dark-900/40"
                  data-testid={`rrp-row-${r.id}`}
                >
                  <td className="py-1.5 pr-3 text-gray-400">{r.stop}</td>
                  <td className="py-1.5 pr-3 text-gray-100 font-medium">{r.name}</td>
                  <td className="py-1.5 pr-3 text-gray-300">{r.location}</td>
                  <td className="py-1.5 pr-3 text-gray-200 tabular-nums">{r.eta}</td>
                  <td className="py-1.5 pr-3 text-right text-gray-300 tabular-nums">{r.eta_minutes}</td>
                  <td className="py-1.5 pr-3 text-right text-gray-300 tabular-nums">{r.distance_km}</td>
                  <td className="py-1.5 pr-3 text-right text-gray-300 tabular-nums">{r.restock_items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!result && !error && !loading && (
        <div className="text-xs text-gray-500" data-testid="rrp-empty">
          Configure the inputs above and click <em>Generate Route</em> to plan today’s drive.
        </div>
      )}
    </div>
  );
}
