import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, getUser } from '../api';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/machines', label: 'Machines', icon: '🏭' },
  { path: '/products', label: 'Products', icon: '📦' },
  { path: '/inventory', label: 'Inventory', icon: '📋', ai: true },
  { path: '/planograms', label: 'Planograms', icon: '🗺️', ai: true },
  { path: '/pricing', label: 'Dynamic Pricing', icon: '💰', ai: true },
  { path: '/routes', label: 'Route Optimization', icon: '🚛', ai: true },
  { path: '/cash', label: 'Cash Reconciliation', icon: '💵', ai: true },
  { path: '/sales', label: 'Sales Analytics', icon: '📈', ai: true },
  { path: '/alerts', label: 'Alerts', icon: '🔔' },
  { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
];

export default function Layout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    logout();
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-dark-800 border-r border-gray-700/50 flex flex-col transition-all duration-300 shrink-0`}>
        <div className="p-4 border-b border-gray-700/50 flex items-center gap-3">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-primary-400 truncate">AI Vending Network</h1>
              <p className="text-xs text-gray-500 truncate">Manager Pro</p>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-white p-1 shrink-0">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`
              }
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.ai && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-medium">AI</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700/50">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-300 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.role || 'operator'}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-xs shrink-0" title="Logout">
                ✕
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full text-center text-gray-500 hover:text-red-400 text-xs" title="Logout">
              ✕
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-dark-900 p-6">
        <Outlet />
      </main>
    </div>
  );
}
