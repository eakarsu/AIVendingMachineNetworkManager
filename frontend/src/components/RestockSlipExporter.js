import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api';

function getToken() {
  return localStorage.getItem('token');
}

export default function RestockSlipExporter() {
  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [driver, setDriver] = useState('Alex Driver');
  const [loadingList, setLoadingList] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [lastFilename, setLastFilename] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchApi('/custom-views/machine-locations')
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data?.machines) ? data.machines : [];
        setMachines(list);
        if (list.length > 0) setMachineId(String(list[0].id));
        setLoadingList(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Failed to load machines');
        setLoadingList(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function printSlip(e) {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);
    setLastFilename(null);
    if (!machineId) {
      setError('Pick a machine first.');
      return;
    }
    setPrinting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/custom-views/restock-slip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          machine_id: Number(machineId),
          route_id: routeId || undefined,
          driver,
        }),
      });
      if (!res.ok) {
        let msg = 'Failed to generate slip';
        try {
          const data = await res.json();
          msg = data.error || msg;
        } catch (_) {
          msg = `HTTP ${res.status}`;
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const picked = machines.find((m) => String(m.id) === String(machineId));
      const filename = `restock-slip-${(picked && picked.name) || machineId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setLastFilename(filename);
    } catch (err) {
      setError(err.message || 'Failed to generate slip');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div
      className="bg-dark-800 rounded-lg border border-gray-700/50 p-4"
      data-testid="restock-slip-exporter"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">Restock Slip Exporter</h2>
        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          PDF
        </span>
      </div>

      <form
        onSubmit={printSlip}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3"
        data-testid="slip-form"
      >
        <label className="flex flex-col text-xs text-gray-400">
          Machine
          <select
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            disabled={loadingList}
            data-testid="slip-machine-select"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          >
            {loadingList && <option value="">Loading…</option>}
            {!loadingList && machines.length === 0 && (
              <option value="">No machines</option>
            )}
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — {m.location}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Route # (optional)
          <input
            type="text"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            placeholder="e.g. RT-20260518-001"
            data-testid="slip-route-input"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          />
        </label>

        <label className="flex flex-col text-xs text-gray-400">
          Driver
          <input
            type="text"
            value={driver}
            onChange={(e) => setDriver(e.target.value)}
            data-testid="slip-driver-input"
            className="mt-1 bg-dark-900 text-gray-100 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500"
          />
        </label>

        <div className="md:col-span-2 lg:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={printing || loadingList || !machineId}
            data-testid="slip-print-btn"
            className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {printing ? 'Printing…' : 'Print Slip'}
          </button>
          {lastFilename && (
            <span
              className="text-xs text-green-300"
              data-testid="slip-last-filename"
            >
              Downloaded: {lastFilename}
            </span>
          )}
        </div>
      </form>

      {error && (
        <div
          className="p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm"
          data-testid="slip-error"
        >
          {error}
        </div>
      )}

      {!error && !lastFilename && !printing && (
        <div className="text-xs text-gray-500" data-testid="slip-help">
          Pick a machine, optionally enter a route #, then click <em>Print Slip</em> to download a PDF.
        </div>
      )}
    </div>
  );
}
