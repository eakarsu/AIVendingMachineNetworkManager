import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onLogin();
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autofill = () => {
    setEmail(import.meta.env.VITE_DEMO_EMAIL || '');
    setPassword(import.meta.env.VITE_DEMO_PASSWORD || '');
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <span className="text-4xl">🤖</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Vending Network</h1>
          <p className="text-gray-500 text-sm mt-1">Machine Network Management Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-dark-800 border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-lg text-gray-300 text-sm placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-lg text-gray-300 text-sm placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-primary-500/20"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <button
              onClick={autofill}
              className="w-full py-2.5 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 text-gray-400 hover:text-gray-300 rounded-lg text-xs font-medium transition-all"
            >
              Quick Login (Demo Credentials)
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          AI Vending Machine Network Manager v1.0
        </p>
      </div>
    </div>
  );
}
