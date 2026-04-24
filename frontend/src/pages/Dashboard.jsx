import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const features = [
  { path: '/machines', title: 'Machine Management', icon: '🏭', desc: 'Monitor and manage all vending machines across the network', color: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30', statKey: 'machines', statLabel: 'Total Machines', statSub: 'active', statSubLabel: 'Active' },
  { path: '/products', title: 'Product Catalog', icon: '📦', desc: 'Manage product inventory, pricing, and supplier information', color: 'from-emerald-500/20 to-emerald-600/20', border: 'border-emerald-500/30', statKey: 'products', statLabel: 'Total Products', statSub: null },
  { path: '/inventory', title: 'Inventory & AI Replenishment', icon: '📋', desc: 'Track stock levels with AI-powered replenishment predictions', color: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/30', ai: true, statKey: 'inventory', statLabel: 'Tracked Items', statSub: 'low_stock', statSubLabel: 'Low Stock' },
  { path: '/planograms', title: 'AI Planogram Optimization', icon: '🗺️', desc: 'Optimize product placement with AI-driven planogram suggestions', color: 'from-indigo-500/20 to-indigo-600/20', border: 'border-indigo-500/30', ai: true },
  { path: '/pricing', title: 'AI Dynamic Pricing', icon: '💰', desc: 'Maximize revenue with AI-optimized dynamic pricing strategies', color: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/30', ai: true },
  { path: '/routes', title: 'AI Route Optimization', icon: '🚛', desc: 'Optimize restocking routes to minimize time and fuel costs', color: 'from-cyan-500/20 to-cyan-600/20', border: 'border-cyan-500/30', ai: true },
  { path: '/cash', title: 'AI Cash Reconciliation', icon: '💵', desc: 'Detect anomalies and reconcile cash collections with AI analysis', color: 'from-green-500/20 to-green-600/20', border: 'border-green-500/30', ai: true },
  { path: '/sales', title: 'AI Sales Analytics', icon: '📈', desc: 'Analyze sales trends and forecast revenue with AI insights', color: 'from-rose-500/20 to-rose-600/20', border: 'border-rose-500/30', ai: true, statKey: 'sales', statLabel: 'Sales (30d)', statSub: 'revenue', statSubLabel: 'Revenue', isCurrency: true },
  { path: '/alerts', title: 'Alerts & Notifications', icon: '🔔', desc: 'Monitor system alerts, warnings, and critical notifications', color: 'from-red-500/20 to-red-600/20', border: 'border-red-500/30', statKey: 'alerts', statLabel: 'Total Alerts', statSub: 'active', statSubLabel: 'Active' },
  { path: '/maintenance', title: 'Maintenance Tracking', icon: '🔧', desc: 'Schedule and track maintenance tasks across the machine network', color: 'from-orange-500/20 to-orange-600/20', border: 'border-orange-500/30', statKey: 'maintenance', statLabel: 'Total Tasks', statSub: 'pending', statSubLabel: 'Pending' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">AI-Powered Vending Machine Network Overview</p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stats.machines?.active || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active Machines</p>
          </div>
          <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-emerald-400">${(stats.sales?.revenue || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Revenue (30d)</p>
          </div>
          <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-red-400">{stats.inventory?.low_stock || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Low Stock Items</p>
          </div>
          <div className="bg-dark-800 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-yellow-400">{stats.alerts?.active || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active Alerts</p>
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {features.map((f) => (
          <div
            key={f.path}
            onClick={() => navigate(f.path)}
            className={`bg-gradient-to-br ${f.color} border ${f.border} rounded-xl p-5 cursor-pointer hover:scale-[1.02] transition-all duration-200 group`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{f.icon}</span>
              {f.ai && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-semibold border border-purple-500/30">
                  AI POWERED
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-white group-hover:text-primary-300 transition-colors">
              {f.title}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{f.desc}</p>

            {stats && f.statKey && stats[f.statKey] && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-4">
                <div>
                  <span className="text-lg font-bold text-white">
                    {f.isCurrency ? `$${stats[f.statKey].total?.toLocaleString() || 0}` : stats[f.statKey].total || 0}
                  </span>
                  <span className="text-[10px] text-gray-500 ml-1.5">{f.statLabel}</span>
                </div>
                {f.statSub && stats[f.statKey][f.statSub] !== undefined && (
                  <div>
                    <span className="text-lg font-bold text-gray-300">
                      {f.isCurrency ? `$${stats[f.statKey][f.statSub]?.toLocaleString() || 0}` : stats[f.statKey][f.statSub] || 0}
                    </span>
                    <span className="text-[10px] text-gray-500 ml-1.5">{f.statSubLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
