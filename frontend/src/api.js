const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: headers(),
  });
  if (res.status === 401 || res.status === 403) {
    logout();
    window.location.href = '/';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getStats: () => fetchApi('/dashboard/stats'),

  // Generic CRUD
  getAll: (resource) => fetchApi(`/${resource}`),
  getOne: (resource, id) => fetchApi(`/${resource}/${id}`),
  create: (resource, data) => fetchApi(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
  update: (resource, id, data) => fetchApi(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (resource, id) => fetchApi(`/${resource}/${id}`, { method: 'DELETE' }),

  // AI endpoints
  aiReplenishment: () => fetchApi('/inventory/ai/replenishment', { method: 'POST', body: '{}' }),
  aiPlanogram: (data) => fetchApi('/planograms/ai/optimize', { method: 'POST', body: JSON.stringify(data || {}) }),
  aiPricing: () => fetchApi('/pricing/ai/optimize', { method: 'POST', body: '{}' }),
  aiRoutes: () => fetchApi('/routes/ai/optimize', { method: 'POST', body: '{}' }),
  aiCash: () => fetchApi('/cash/ai/analyze', { method: 'POST', body: '{}' }),
  aiSales: () => fetchApi('/sales/ai/analyze', { method: 'POST', body: '{}' }),
};
