// Real API service layer with JWT token management
// Replace API_BASE_URL with your backend server URL

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: { total: number; page: number; limit: number };
}

// Token management
const tokenStore = {
  getAccessToken: () => localStorage.getItem('cb_access_token'),
  getRefreshToken: () => localStorage.getItem('cb_refresh_token'),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem('cb_access_token', access);
    localStorage.setItem('cb_refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('cb_access_token');
    localStorage.removeItem('cb_refresh_token');
    localStorage.removeItem('cb_user');
  },
  getUser: () => {
    const u = localStorage.getItem('cb_user');
    return u ? JSON.parse(u) : null;
  },
  setUser: (user: unknown) => localStorage.setItem('cb_user', JSON.stringify(user)),
};

export { tokenStore };

// Core fetch with auth headers and token refresh
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = tokenStore.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

  // Auto-refresh on 401
  if (response.status === 401 && tokenStore.getRefreshToken()) {
    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenStore.getRefreshToken() }),
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json();
      if (refreshData.success) {
        tokenStore.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
        headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
        response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
      }
    } else {
      tokenStore.clearTokens();
      window.location.href = '/';
    }
  }

  return response;
}

async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const res = await authFetch(url);
  return res.json();
}

async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: 'POST', body: JSON.stringify(body) });
  return res.json();
}

async function apiPut<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: 'PUT', body: JSON.stringify(body) });
  return res.json();
}

async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: 'DELETE' });
  return res.json();
}

// API endpoints organized by domain
export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) => apiPost<{ user: unknown; accessToken: string; refreshToken: string }>('/auth/login', { email, password }),
    logout: () => apiPost('/auth/logout', {}),
    refresh: (refreshToken: string) => apiPost('/auth/refresh', { refreshToken }),
    getMe: () => apiGet('/auth/me'),
  },

  // Dashboard overview
  overview: {
    getDashboard: () => apiGet('/overview/dashboard'),
  },

  // Rentals
  rentals: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/rentals${qs}`);
    },
    getById: (id: string) => apiGet(`/rentals/${id}`),
    getStats: () => apiGet('/rentals/stats'),
  },

  // Machines
  machines: {
    getAll: () => apiGet('/machines'),
    getById: (id: string) => apiGet(`/machines/${id}`),
    create: (data: unknown) => apiPost('/machines', data),
    update: (id: string, data: unknown) => apiPut(`/machines/${id}`, data),
    delete: (id: string) => apiDelete(`/machines/${id}`),
  },

  // Stations
  stations: {
    getAll: () => apiGet('/stations'),
    getById: (id: string) => apiGet(`/stations/${id}`),
    create: (data: unknown) => apiPost('/stations', data),
    update: (id: string, data: unknown) => apiPut(`/stations/${id}`, data),
    delete: (id: string) => apiDelete(`/stations/${id}`),
    getDashboard: () => apiGet('/stations/dashboard'),
  },

  // Revenue
  revenue: {
    getSummary: () => apiGet('/revenue/summary'),
    getOverTime: (days?: number) => apiGet(`/revenue/over-time${days ? `?days=${days}` : ''}`),
    getByStation: () => apiGet('/revenue/by-station'),
    getBreakdown: () => apiGet('/revenue/breakdown'),
  },

  // Transactions / M-Pesa
  transactions: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/transactions${qs}`);
    },
    getById: (id: string) => apiGet(`/transactions/${id}`),
    getCallbacks: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/transactions/callbacks${qs}`);
    },
  },

  // Partners
  partners: {
    getAll: () => apiGet('/partners'),
    getById: (id: string) => apiGet(`/partners/${id}`),
    create: (data: unknown) => apiPost('/partners', data),
    update: (id: string, data: unknown) => apiPut(`/partners/${id}`, data),
    getPayouts: () => apiGet('/partners/payouts'),
  },

  // Events
  events: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/events${qs}`);
    },
    getById: (id: string) => apiGet(`/events/${id}`),
    create: (data: unknown) => apiPost('/events', data),
    update: (id: string, data: unknown) => apiPut(`/events/${id}`, data),
  },

  // Activations
  activations: {
    getLocations: () => apiGet('/activations/locations'),
    getContacts: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/activations/contacts${qs}`);
    },
    getStats: () => apiGet('/activations/stats'),
  },

  // Users
  users: {
    getAll: () => apiGet('/users'),
    getById: (id: string) => apiGet(`/users/${id}`),
    create: (data: unknown) => apiPost('/users', data),
    update: (id: string, data: unknown) => apiPut(`/users/${id}`, data),
    delete: (id: string) => apiDelete(`/users/${id}`),
  },

  // Audit
  audit: {
    getLogs: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/audit${qs}`);
    },
  },

  // Notifications
  notifications: {
    getAll: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return apiGet(`/notifications${qs}`);
    },
    resolve: (id: string) => apiPut(`/notifications/${id}/resolve`, {}),
    create: (data: unknown) => apiPost('/notifications', data),
  },
};

export default api;
