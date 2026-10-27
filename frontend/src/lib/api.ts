const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(opts.headers as any || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text, status: res.status }; }
  if (!res.ok) {
    const msg = data?.detail || data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),

  // Market
  health: () => request('/api/health'),
  marketStatus: () => request('/api/market/status'),
  quote: (symbol: string) => request(`/api/market/quote/${symbol}`),
  chart: (symbol: string, range='1d', interval='5m') => request(`/api/market/chart/${symbol}?range=${range}&interval=${interval}`),
  marketIndices: () => request('/api/market/indices'),

  // Scanner
  scannerRun: (body: any) => request('/api/scanner/run', { method: 'POST', body: JSON.stringify(body) }),
  scannerStatus: () => request('/api/scanner/status'),
  scannerResults: (runId?: number) => request(`/api/scanner/results${runId ? `/${runId}` : ''}`),
  scannerStatusById: (id: number) => request(`/api/scanner/status/${id}`),

  // News
  news: (symbol: string, hours=12) => request(`/api/news/${symbol}?hours=${hours}`),

  // Entry
  entryCheck: (body: any) => request('/api/entry/check', { method: 'POST', body: JSON.stringify(body) }),
  entryStatus: (symbol: string, params={}) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/api/entry/status/${symbol}${q ? `?${q}`:''}`);
  },
  entryWatch: (body: any) => request('/api/entry/watch', { method: 'POST', body: JSON.stringify(body) }),
  entryWatchlist: () => request('/api/entry/watchlist'),

  // Exit
  exitPlan: (body: any) => request('/api/exit/plan', { method: 'POST', body: JSON.stringify(body) }),
  exitGet: (symbol: string) => request(`/api/exit/plan/${symbol}`),
  exitList: () => request('/api/exit/plan'),

  // TimeMachine
  timemachineRun: (body: any) => request('/api/timemachine/run', { method: 'POST', body: JSON.stringify(body) }),
  timemachineGet: (id: number) => request(`/api/timemachine/${id}`),
  timemachineList: () => request('/api/timemachine/'),

  // Budget
  budgetCalc: (body: any) => request('/api/budget/calculate', { method: 'POST', body: JSON.stringify(body) }),
  budgetGet: (symbol: string) => request(`/api/budget/calculate/${symbol}`),

  // Risk
  riskCheck: (body: any) => request('/api/risk/check', { method: 'POST', body: JSON.stringify(body) }),

  // Alerts
  alerts: () => request('/api/alerts'),
  alertsCreate: (body: any) => request('/api/alerts', { method: 'POST', body: JSON.stringify(body) }),
  alertsDelete: (id: number) => request(`/api/alerts/${id}`, { method: 'DELETE' }),

  // Analyst
  analyst: (symbol: string) => request(`/api/analyst/${symbol}`),

  // Pelosi
  pelosi: (params: Record<string,string>={}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/pelosi${q ? `?${q}`:''}`);
  },

  // Paper
  paperPreview: (body: any) => request('/api/paper/order-preview', { method: 'POST', body: JSON.stringify(body) }),
  paperConfirm: (body: any) => request('/api/paper/order-confirm', { method: 'POST', body: JSON.stringify(body) }),
  paperPositions: () => request('/api/paper/positions'),
  paperOrders: () => request('/api/paper/orders'),
  paperBalance: () => request('/api/paper/balance'),
  paperFlatten: (symbol: string) => request(`/api/paper/flatten/${symbol}`, { method: 'POST' }),

  // Auth
  signup: (body: any) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  watchlist: () => request('/api/auth/watchlist'),
  watchlistAdd: (symbol: string) => request('/api/auth/watchlist', { method: 'POST', body: JSON.stringify({ symbol }) }),
  watchlistRemove: (symbol: string) => request(`/api/auth/watchlist/${symbol}`, { method: 'DELETE' }),

  // Settings
  settings: () => request('/api/settings'),
  settingsSave: (body: any) => request('/api/settings', { method: 'POST', body: JSON.stringify(body) }),
  settingsAi: (body: any) => request('/api/settings/ai', { method: 'POST', body: JSON.stringify(body) }),

  // System
  systemStatus: () => request('/api/system/status'),
};
