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
  aiPredictMaintenance: (machineId) => fetchApi(`/maintenance/${machineId}/ai-predict`, { method: 'POST', body: '{}' }),
  aiPlanogramPerformance: (machineId) => fetchApi(`/planograms/${machineId}/ai-performance`, { method: 'POST', body: '{}' }).catch(() => fetchApi('/planograms/ai/optimize', { method: 'POST', body: JSON.stringify({ machine_id: machineId }) })),

  // Telemetry
  telemetryIngest: (payload) => fetchApi('/telemetry/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  telemetrySummary: () => fetchApi('/telemetry/summary'),

  // Cashless reconciliation (uses cash route + AI)
  cashlessReconcile: (payload) => fetchApi('/cash/reconcile', { method: 'POST', body: JSON.stringify(payload) }).catch(() => fetchApi('/cash/ai/analyze', { method: 'POST', body: '{}' })),

  // New AI endpoints (audit pass)
  aiDemandForecast: (payload) => fetchApi('/ai/demand-forecast', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiDynamicPricing: (payload) => fetchApi('/ai/dynamic-pricing', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiPredictiveMaintenanceV2: (payload) => fetchApi('/ai/predictive-maintenance', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiRouteOptimization: (payload) => fetchApi('/ai/route-optimization', { method: 'POST', body: JSON.stringify(payload || {}) }),

  // Apply pass 5
  aiAnomalyDetection: (payload) => fetchApi('/ai/anomaly-detection', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiPaymentSquare: (payload) => fetchApi('/ai/payment-square', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiPaymentNcr: (payload) => fetchApi('/ai/payment-ncr', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiSupplierOrder: (payload) => fetchApi('/ai/supplier-order', { method: 'POST', body: JSON.stringify(payload || {}) }),
  aiLocationTracking: (payload) => fetchApi('/ai/location-tracking', { method: 'POST', body: JSON.stringify(payload || {}) }),
};
