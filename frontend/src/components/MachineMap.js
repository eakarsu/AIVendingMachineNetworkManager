import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { fetchApi } from '../api';

const STATUS_COLORS = {
  online: '#22c55e',     // green
  offline: '#ef4444',    // red
  low_stock: '#f59e0b',  // amber
};

function colorFor(status) {
  return STATUS_COLORS[status] || '#6b7280';
}

export default function MachineMap() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchApi('/custom-views/machine-locations')
      .then((data) => {
        if (!alive) return;
        setMachines(Array.isArray(data?.machines) ? data.machines : []);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message || 'Failed to load');
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const center = useMemo(() => {
    if (machines.length === 0) return [40.73, -73.99];
    const lat = machines.reduce((a, m) => a + Number(m.lat), 0) / machines.length;
    const lng = machines.reduce((a, m) => a + Number(m.lng), 0) / machines.length;
    return [lat, lng];
  }, [machines]);

  const counts = useMemo(() => {
    const c = { online: 0, offline: 0, low_stock: 0 };
    machines.forEach((m) => {
      if (c[m.status] !== undefined) c[m.status] += 1;
    });
    return c;
  }, [machines]);

  if (loading) {
    return (
      <div className="p-4 text-gray-400" data-testid="machine-map-loading">
        Loading machine map...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-red-400" data-testid="machine-map-error">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg border border-gray-700/50 p-4" data-testid="machine-map">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">Machine Location Map</h2>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.online }} />
            <span className="text-gray-300">Online ({counts.online})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.low_stock }} />
            <span className="text-gray-300">Low Stock ({counts.low_stock})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS.offline }} />
            <span className="text-gray-300">Offline ({counts.offline})</span>
          </span>
        </div>
      </div>
      <div style={{ height: 480, width: '100%' }} data-testid="machine-map-container">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', borderRadius: 8 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {machines.map((m) => (
            <CircleMarker
              key={m.id}
              center={[Number(m.lat), Number(m.lng)]}
              radius={9}
              pathOptions={{
                color: colorFor(m.status),
                fillColor: colorFor(m.status),
                fillOpacity: 0.75,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.9}>
                {m.name} — {m.status}
              </Tooltip>
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div>{m.location}</div>
                  <div>
                    Status: <strong>{m.status}</strong>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
