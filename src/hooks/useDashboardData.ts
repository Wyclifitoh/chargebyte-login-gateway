/**
 * Typed dashboard data hooks. Each hook hits the real backend through `api`.
 * On error: surfaces a message + emits a toast; UI shows retry via `refetch`.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, ApiResponse } from "@/services/api";
import {
  Rental,
  Machine,
  Station,
  Transaction,
  Notification,
  AuditLog,
  Partner,
  User,
  Campaign,
} from "@/types/dashboard";

export interface HookResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  isFallback: boolean;
  isEmpty: boolean;
  meta?: { total: number; page: number; limit: number; pages?: number };
  refetch: () => void;
}

/** Generic data fetcher. Re-runs when `key` changes (use it as a stable dep string). */
function useFetchWithFallback<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  fallback: T,
  normalize?: (raw: unknown) => T,
  resourceName = "data",
  key = "",
): HookResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [meta, setMeta] = useState<HookResult<T>["meta"]>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [tick, setTick] = useState(0);
  const toastedRef = useRef(false);
  // Capture latest fetcher to avoid re-running on every render
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcherRef.current()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data !== undefined && res.data !== null) {
          const normalized = normalize ? normalize(res.data) : (res.data as T);
          setData(normalized);
          setMeta(res.meta);
          setIsFallback(false);
          toastedRef.current = false;
        } else {
          const msg = res.error || `Failed to load ${resourceName}`;
          setError(msg);
          setIsFallback(true);
          if (!toastedRef.current) { toast.error(msg); toastedRef.current = true; }
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : `Failed to load ${resourceName}`;
        setError(msg);
        setIsFallback(true);
        if (!toastedRef.current) { toast.error(msg); toastedRef.current = true; }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, key]);

  const isEmpty = Array.isArray(data) ? data.length === 0 : !data;

  return {
    data, meta, isLoading, error, isFallback, isEmpty,
    refetch: () => { toastedRef.current = false; setTick((t) => t + 1); },
  };
}

function toArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

// ---------------- Date range helper ----------------
export type DatePeriod = "today" | "yesterday" | "week" | "month" | "all" | "custom";
export interface DateRangeParams {
  period?: DatePeriod;
  date_from?: string;
  date_to?: string;
}

// ---------------- Domain hooks ----------------

export interface RentalsParams extends DateRangeParams {
  page?: number;
  limit?: number;
  status?: string;
  station_id?: string;
  search?: string;
}

export function useRentals(params: RentalsParams = {}) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<Rental[]>(
    () => api.rentals.getAll(params as Record<string, string | number | undefined>) as Promise<ApiResponse<Rental[]>>,
    [],
    (raw) => toArray<Rental>(raw),
    "rentals",
    key,
  );
}

export interface RentalsSummary {
  total_rentals: number;
  total_amount: number;
  total_deposits: number;
  total_refunded: number;
  total_duration_minutes: number;
  active_count: number;
  completed_count: number;
  overdue_count: number;
  cancelled_count: number;
}

const emptyRentalsSummary: RentalsSummary = {
  total_rentals: 0, total_amount: 0, total_deposits: 0, total_refunded: 0,
  total_duration_minutes: 0, active_count: 0, completed_count: 0, overdue_count: 0, cancelled_count: 0,
};

export function useRentalsSummary(params: Omit<RentalsParams, "page" | "limit"> = {}) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RentalsSummary>(
    () => api.rentals.getSummary(params as Record<string, string | number | undefined>) as Promise<ApiResponse<RentalsSummary>>,
    emptyRentalsSummary,
    (raw) => {
      const r = (raw ?? {}) as Partial<RentalsSummary>;
      return {
        total_rentals: Number(r.total_rentals ?? 0),
        total_amount: Number(r.total_amount ?? 0),
        total_deposits: Number(r.total_deposits ?? 0),
        total_refunded: Number(r.total_refunded ?? 0),
        total_duration_minutes: Number(r.total_duration_minutes ?? 0),
        active_count: Number(r.active_count ?? 0),
        completed_count: Number(r.completed_count ?? 0),
        overdue_count: Number(r.overdue_count ?? 0),
        cancelled_count: Number(r.cancelled_count ?? 0),
      };
    },
    "rentals summary",
    key,
  );
}

export function useMachines() {
  return useFetchWithFallback<Machine[]>(
    () => api.machines.getAll() as Promise<ApiResponse<Machine[]>>,
    [], (raw) => toArray<Machine>(raw), "machines",
  );
}

export function useStations() {
  return useFetchWithFallback<Station[]>(
    () => api.stations.getAll() as Promise<ApiResponse<Station[]>>,
    [], (raw) => toArray<Station>(raw), "stations",
  );
}

export interface TransactionsParams extends DateRangeParams {
  page?: number; limit?: number; status?: string; transaction_type?: string; search?: string;
}

export function useTransactions(params: TransactionsParams = {}) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<Transaction[]>(
    () => api.transactions.getAll(params as Record<string, string | number | undefined>) as Promise<ApiResponse<Transaction[]>>,
    [], (raw) => toArray<Transaction>(raw), "transactions", key,
  );
}

export function useMpesaCallbacks() {
  return useFetchWithFallback<unknown[]>(
    () => api.transactions.getCallbacks() as Promise<ApiResponse<unknown[]>>,
    [], (raw) => toArray<unknown>(raw), "M-Pesa callbacks",
  );
}

export function useNotifications() {
  return useFetchWithFallback<Notification[]>(
    () => api.notifications.getAll() as Promise<ApiResponse<Notification[]>>,
    [], (raw) => toArray<Notification>(raw), "notifications",
  );
}

export function useAuditLogs() {
  return useFetchWithFallback<AuditLog[]>(
    () => api.audit.getLogs() as Promise<ApiResponse<AuditLog[]>>,
    [], (raw) => toArray<AuditLog>(raw), "audit logs",
  );
}

export function useUsers() {
  return useFetchWithFallback<User[]>(
    () => api.users.getAll() as Promise<ApiResponse<User[]>>,
    [], (raw) => toArray<User>(raw), "users",
  );
}

export function usePartners() {
  return useFetchWithFallback<Partner[]>(
    () => api.partners.getAll() as Promise<ApiResponse<Partner[]>>,
    [], (raw) => toArray<Partner>(raw), "partners",
  );
}

export function useCampaigns() {
  return useFetchWithFallback<Campaign[]>(
    () => api.events.getAll() as Promise<ApiResponse<Campaign[]>>,
    [], (raw) => toArray<Campaign>(raw), "campaigns",
  );
}

// ---------------- Overview ----------------

export interface OverviewData {
  period?: string;
  totalRevenue: number;
  activeRentals: number;
  onlineMachines: number;
  totalMachines: number;
  totalSessions: number;
  recentTransactions: Transaction[];
  revenueByMonth: Array<{ month: string; revenue: number }>;
  sessionsByStation: Array<{ name: string; sessions: number }>;
}

const emptyOverview: OverviewData = {
  totalRevenue: 0, activeRentals: 0, onlineMachines: 0, totalMachines: 0,
  totalSessions: 0, recentTransactions: [], revenueByMonth: [], sessionsByStation: [],
};

interface RawOverview {
  period?: string;
  totalRevenue?: number; activeRentals?: number;
  onlineMachines?: number; totalMachines?: number; totalSessions?: number;
  recentTransactions?: Transaction[];
  revenueByMonth?: Array<{ month: string; revenue: number }>;
  sessionsByStation?: Array<{ name: string; sessions: number }>;
  // legacy-shaped fallback (in case backend returns the old nested shape)
  rentals?: { active_rentals?: number; total_rentals?: number };
  machines?: { online?: number; total_machines?: number };
  transactions?: { total_revenue?: number };
}

export function useOverview(params: DateRangeParams = { period: "today" }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<OverviewData>(
    () => api.overview.getDashboard(params as Record<string, string | undefined>) as Promise<ApiResponse<OverviewData>>,
    emptyOverview,
    (raw) => {
      const r = (raw ?? {}) as RawOverview;
      return {
        period: r.period,
        totalRevenue: Number(r.totalRevenue ?? r.transactions?.total_revenue ?? 0),
        activeRentals: Number(r.activeRentals ?? r.rentals?.active_rentals ?? 0),
        onlineMachines: Number(r.onlineMachines ?? r.machines?.online ?? 0),
        totalMachines: Number(r.totalMachines ?? r.machines?.total_machines ?? 0),
        totalSessions: Number(r.totalSessions ?? r.rentals?.total_rentals ?? 0),
        recentTransactions: r.recentTransactions ?? [],
        revenueByMonth: r.revenueByMonth ?? [],
        sessionsByStation: r.sessionsByStation ?? [],
      };
    },
    "overview",
    key,
  );
}

// ---------------- Revenue ----------------

export interface RevenueSummary {
  total_revenue: number;
  total_transactions: number;
  rental_revenue: number;
  deposit_revenue: number;
  refund_revenue: number;
}
export interface RevenueByStationRow { id: string; name: string; revenue: number; transactions: number; }
export interface RevenueByMachineRow { id: string; name: string; station_name: string; revenue: number; transactions: number; }
export interface RevenueOverTimeRow { period: string; revenue: number; transactions: number; }
export interface RevenueBreakdownRow { type: string; value: number; count: number; }
export interface RevenueTransactionRow extends Transaction {
  rental_code?: string;
  station_name?: string;
  machine_name?: string;
}

export function useRevenueSummary(params: DateRangeParams = { period: "today" }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RevenueSummary>(
    () => api.revenue.getSummary(params as Record<string, string | undefined>) as Promise<ApiResponse<RevenueSummary>>,
    { total_revenue: 0, total_transactions: 0, rental_revenue: 0, deposit_revenue: 0, refund_revenue: 0 },
    (raw) => {
      const r = (raw ?? {}) as Partial<RevenueSummary>;
      return {
        total_revenue: Number(r.total_revenue ?? 0),
        total_transactions: Number(r.total_transactions ?? 0),
        rental_revenue: Number(r.rental_revenue ?? 0),
        deposit_revenue: Number(r.deposit_revenue ?? 0),
        refund_revenue: Number(r.refund_revenue ?? 0),
      };
    },
    "revenue summary",
    key,
  );
}

export function useRevenueOverTime(params: DateRangeParams & { period_grain?: "daily" | "weekly" | "monthly" } = { period: "month" }) {
  const key = JSON.stringify(params);
  // map period_grain -> backend's `period` query for grain (daily default)
  const backendParams: Record<string, string | undefined> = {
    period: params.period,
    date_from: params.date_from,
    date_to: params.date_to,
  };
  if (params.period_grain) backendParams.period = params.period_grain; // grain wins for over-time
  return useFetchWithFallback<RevenueOverTimeRow[]>(
    () => api.revenue.getOverTime(backendParams) as Promise<ApiResponse<RevenueOverTimeRow[]>>,
    [],
    (raw) => toArray<RevenueOverTimeRow>(raw).map((r) => ({
      period: String(r.period), revenue: Number(r.revenue || 0), transactions: Number(r.transactions || 0),
    })),
    "revenue over time",
    key,
  );
}

export function useRevenueByStation(params: DateRangeParams = { period: "today" }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RevenueByStationRow[]>(
    () => api.revenue.getByStation(params as Record<string, string | undefined>) as Promise<ApiResponse<RevenueByStationRow[]>>,
    [],
    (raw) => toArray<RevenueByStationRow>(raw).map((r) => ({ ...r, revenue: Number(r.revenue || 0), transactions: Number(r.transactions || 0) })),
    "revenue by station",
    key,
  );
}

export function useRevenueByMachine(params: DateRangeParams = { period: "today" }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RevenueByMachineRow[]>(
    () => api.revenue.getByMachine(params as Record<string, string | undefined>) as Promise<ApiResponse<RevenueByMachineRow[]>>,
    [],
    (raw) => toArray<RevenueByMachineRow>(raw).map((r) => ({ ...r, revenue: Number(r.revenue || 0), transactions: Number(r.transactions || 0) })),
    "revenue by machine",
    key,
  );
}

export function useRevenueBreakdown(params: DateRangeParams = { period: "today" }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RevenueBreakdownRow[]>(
    () => api.revenue.getBreakdown(params as Record<string, string | undefined>) as Promise<ApiResponse<RevenueBreakdownRow[]>>,
    [],
    (raw) => toArray<RevenueBreakdownRow>(raw).map((r) => ({ type: String(r.type), value: Number(r.value || 0), count: Number(r.count || 0) })),
    "revenue breakdown",
    key,
  );
}

export interface RevenueTxParams extends DateRangeParams {
  page?: number; limit?: number; status?: string; transaction_type?: string; search?: string;
}

export function useRevenueTransactions(params: RevenueTxParams = { period: "today", page: 1, limit: 25 }) {
  const key = JSON.stringify(params);
  return useFetchWithFallback<RevenueTransactionRow[]>(
    () => api.revenue.getTransactions(params as Record<string, string | number | undefined>) as Promise<ApiResponse<RevenueTransactionRow[]>>,
    [],
    (raw) => toArray<RevenueTransactionRow>(raw),
    "revenue transactions",
    key,
  );
}

// ---------------- Util: build a stable params object outside component renders ----------------

export function useStableParams<T extends object>(params: T): T {
  const ref = useRef<{ key: string; value: T }>({ key: "", value: params });
  const key = JSON.stringify(params);
  if (ref.current.key !== key) ref.current = { key, value: params };
  return ref.current.value;
}

// ---------------- Resolve a friendly date label ----------------
export function useDateRangeLabel(period: DatePeriod, from?: string, to?: string): string {
  return useCallback(() => {
    switch (period) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "week": return "Last 7 days";
      case "month": return "Last 30 days";
      case "all": return "All time";
      case "custom": return from && to ? `${from} → ${to}` : "Custom range";
    }
  }, [period, from, to])();
}
