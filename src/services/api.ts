// Real API service layer with JWT token management.
// Centralized client: auto-attaches bearer token, dedupes refresh, surfaces typed errors.

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://dash.chargebyte.io/api";

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: { total: number; page: number; limit: number; pages?: number };
}

// ---------------- Token store ----------------
const tokenStore = {
  getAccessToken: () => localStorage.getItem("cb_access_token"),
  getRefreshToken: () => localStorage.getItem("cb_refresh_token"),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem("cb_access_token", access);
    localStorage.setItem("cb_refresh_token", refresh);
  },
  clearTokens: () => {
    localStorage.removeItem("cb_access_token");
    localStorage.removeItem("cb_refresh_token");
    localStorage.removeItem("cb_user");
  },
  getUser: () => {
    const u = localStorage.getItem("cb_user");
    return u ? JSON.parse(u) : null;
  },
  setUser: (user: unknown) =>
    localStorage.setItem("cb_user", JSON.stringify(user)),
};

export { tokenStore };

// ---------------- Refresh dedupe ----------------
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data?.accessToken) return null;
    tokenStore.setTokens(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken as string;
  } catch {
    return null;
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// ---------------- Core fetch ----------------
function buildQS(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.append(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = tokenStore.getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });

  if (response.status === 401 && tokenStore.getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    } else {
      tokenStore.clearTokens();
      // Only redirect if not already on login
      if (window.location.pathname !== "/") window.location.href = "/";
    }
  }
  return response;
}

async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const res = await authFetch(url);
  try { return await res.json(); }
  catch { return { success: false, data: null as unknown as T, error: `HTTP ${res.status}` }; }
}
async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: "POST", body: JSON.stringify(body) });
  try { return await res.json(); }
  catch { return { success: false, data: null as unknown as T, error: `HTTP ${res.status}` }; }
}
async function apiPut<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: "PUT", body: JSON.stringify(body) });
  try { return await res.json(); }
  catch { return { success: false, data: null as unknown as T, error: `HTTP ${res.status}` }; }
}
async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const res = await authFetch(url, { method: "DELETE" });
  try { return await res.json(); }
  catch { return { success: false, data: null as unknown as T, error: `HTTP ${res.status}` }; }
}

// ---------------- Endpoints ----------------
export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiPost<{ user: unknown; accessToken: string; refreshToken: string }>(
        "/auth/login",
        { email, password },
      ),
    logout: () => apiPost("/auth/logout", {}),
    refresh: (refreshToken: string) => apiPost("/auth/refresh", { refreshToken }),
    getMe: () => apiGet("/auth/me"),
  },

  overview: {
    getDashboard: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/overview/dashboard${buildQS(params)}`),
  },

  rentals: {
    getAll: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/rentals${buildQS(params)}`),
    getById: (id: string) => apiGet(`/rentals/${id}`),
    getSummary: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/rentals/summary${buildQS(params)}`),
    sendSms: (data: { phone_number: string; message: string; rental_id?: string }) =>
      apiPost("/rentals/sms", data),
  },

  machines: {
    getAll: () => apiGet("/machines"),
    getById: (id: string) => apiGet(`/machines/${id}`),
    create: (data: unknown) => apiPost("/machines", data),
    update: (id: string, data: unknown) => apiPut(`/machines/${id}`, data),
    delete: (id: string) => apiDelete(`/machines/${id}`),
  },

  stations: {
    getAll: () => apiGet("/stations"),
    getById: (id: string) => apiGet(`/stations/${id}`),
    create: (data: unknown) => apiPost("/stations", data),
    update: (id: string, data: unknown) => apiPut(`/stations/${id}`, data),
    delete: (id: string) => apiDelete(`/stations/${id}`),
  },

  revenue: {
    getSummary: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/summary${buildQS(params)}`),
    getOverTime: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/over-time${buildQS(params)}`),
    getByStation: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/by-station${buildQS(params)}`),
    getByMachine: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/by-machine${buildQS(params)}`),
    getBreakdown: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/breakdown${buildQS(params)}`),
    getTransactions: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/revenue/transactions${buildQS(params)}`),
  },

  transactions: {
    getAll: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/transactions${buildQS(params)}`),
    getById: (id: string) => apiGet(`/transactions/${id}`),
    getCallbacks: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/transactions/callbacks${buildQS(params)}`),
  },

  partners: {
    getAll: () => apiGet("/partners"),
    getById: (id: string) => apiGet(`/partners/${id}`),
    create: (data: unknown) => apiPost("/partners", data),
    update: (id: string, data: unknown) => apiPut(`/partners/${id}`, data),
    getPayouts: () => apiGet("/partners/payouts"),
    assignStation: (data: unknown) => apiPost("/partners/assign-station", data),
    unassignStation: (stationId: string) => apiDelete(`/partners/stations/${stationId}`),
    assignMachine: (data: unknown) => apiPost("/partners/assign-machine", data),
    unassignMachine: (partnerId: string, machineId: string) =>
      apiDelete(`/partners/${partnerId}/machines/${machineId}`),
  },

  campaigns: {
    getAll: () => apiGet("/campaigns"),
    getById: (id: string) => apiGet(`/campaigns/${id}`),
    create: (data: unknown) => apiPost("/campaigns", data),
    update: (id: string, data: unknown) => apiPut(`/campaigns/${id}`, data),
    delete: (id: string) => apiDelete(`/campaigns/${id}`),
  },

  adClients: {
    getAll: () => apiGet("/advertising-clients"),
    getById: (id: string) => apiGet(`/advertising-clients/${id}`),
    create: (data: unknown) => apiPost("/advertising-clients", data),
    update: (id: string, data: unknown) => apiPut(`/advertising-clients/${id}`, data),
    delete: (id: string) => apiDelete(`/advertising-clients/${id}`),
  },

  mpesa: {
    listIncoming: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/mpesa/incoming${buildQS(params)}`),
    listOutgoing: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/mpesa/outgoing${buildQS(params)}`),
    stkPush: (data: unknown) => apiPost("/mpesa/stk-push", data),
    b2c: (data: unknown) => apiPost("/mpesa/b2c", data),
    b2b: (data: unknown) => apiPost("/mpesa/b2b", data),
    refreshBalance: () => apiPost("/mpesa/balance/refresh", {}),
    getLatestBalance: () => apiGet("/mpesa/balance/latest"),
  },

  profile: {
    setPin: (data: { current_password: string; pin: string }) =>
      apiPost("/users/me/pin", data),
    changePin: (data: { current_pin: string; new_pin: string }) =>
      apiPut("/users/me/pin", data),
  },

  events: {
    getAll: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/events${buildQS(params)}`),
    getById: (id: string) => apiGet(`/events/${id}`),
    create: (data: unknown) => apiPost("/events", data),
    update: (id: string, data: unknown) => apiPut(`/events/${id}`, data),
  },

  activations: {
    getLocations: () => apiGet("/activations/locations"),
    getContacts: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/activations/contacts${buildQS(params)}`),
    getStats: () => apiGet("/activations/stats"),
  },

  users: {
    getAll: () => apiGet("/users"),
    getById: (id: string) => apiGet(`/users/${id}`),
    create: (data: unknown) => apiPost("/users", data),
    update: (id: string, data: unknown) => apiPut(`/users/${id}`, data),
    delete: (id: string) => apiDelete(`/users/${id}`),
  },

  audit: {
    getLogs: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/audit${buildQS(params)}`),
  },

  notifications: {
    getAll: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/notifications${buildQS(params)}`),
    resolve: (id: string) => apiPut(`/notifications/${id}/resolve`, {}),
    create: (data: unknown) => apiPost("/notifications", data),
  },

  operations: {
    getLeads: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/operations/leads${buildQS(params)}`),
    createLead: (data: unknown) => apiPost("/operations/leads", data),
    updateLead: (id: string, data: unknown) => apiPut(`/operations/leads/${id}`, data),
    getReports: (params?: Record<string, string | number | undefined>) =>
      apiGet(`/operations/reports${buildQS(params)}`),
    createReport: (data: unknown) => apiPost("/operations/reports", data),
    getDailyPlans: () => apiGet("/operations/daily-plans"),
    createDailyPlan: (data: unknown) => apiPost("/operations/daily-plans", data),
    toggleDailyPlan: (id: string) => apiPost(`/operations/daily-plans/${id}/toggle`, {}),
  },
};

export default api;
