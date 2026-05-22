import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { fetchApi } from '../api';

function fmtCurrency(n) {
  if (n == null || isNaN(n)) return '$0';
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function SalesByMachine() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synth, setSynth] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchApi('/custom-views/sales-by-machine')
      .then((data) => {
        if (!alive) return;
        setRows(Array.isArray(data?.machines) ? data.machines : []);
        setSynth(Boolean(data?.synthesized));
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

  if (loading) {
    return (
      <div className="p-4 text-gray-400" data-testid="sales-by-machine-loading">
        Loading sales chart...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-red-400" data-testid="sales-by-machine-error">
        Error: {error}
      </div>
    );
  }

  const chartData = rows.map((r) => ({
    name: r.name,
    revenue: Math.round(Number(r.revenue) * 100) / 100,
    units: Number(r.units || 0),
  }));

  return (
    <div className="bg-dark-800 rounded-lg border border-gray-700/50 p-4" data-testid="sales-by-machine">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">Top 15 Machines by Revenue</h2>
        {synth && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            synthesized
          </span>
        )}
      </div>
      <div style={{ width: '100%', height: 420 }} data-testid="sales-by-machine-chart">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={70}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#cbd5e1', fontSize: 11 }}
              tickFormatter={fmtCurrency}
            />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value, name) => {
                if (name === 'revenue') return [fmtCurrency(value), 'Revenue'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1' }} />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
