import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Car, Cpu, Wallet, Zap, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, Plus, Smartphone, LifeBuoy, Clock, FileText, Trophy,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import {
  PageHeader, SectionCard, TableSkeleton, EmptyState, ErrorState,
  FallbackBanner, DateRangeFilter,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview, useRentalsSummary, type DatePeriod } from "@/hooks/useDashboardData";
import { formatKsh, formatDateTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

// ---------------- KPI card ----------------
type Trend = { value: number; label: string } | null;
const KpiCard = ({
  title, value, icon, accent = "primary", trend, onClick,
}: {
  title: string; value: string | number;
  icon: React.ReactNode; accent?: "primary" | "success" | "warning" | "danger";
  trend?: Trend; onClick?: () => void;
}) => {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left rounded-xl border border-border bg-card shadow-sm p-4 transition-all ${
        onClick ? "hover:shadow-md hover:border-primary/40 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${
              trend.value >= 0 ? "text-emerald-600" : "text-destructive"
            }`}>
              {trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span className="font-medium">{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
    </button>
  );
};

const KpiSkeleton = () => (
  <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-2.5">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-32" />
    <Skeleton className="h-3 w-16" />
  </div>
);

// ---------------- Quick action ----------------
const QuickAction = ({ icon: Icon, label, to, onClick }: {
  icon: React.ElementType; label: string; to?: string; onClick?: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (onClick ? onClick() : to && navigate(to))}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-foreground flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
};

// ---------------- Page ----------------
const OverviewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<DatePeriod>("today");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const dateParams = {
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
  };
  const { data, isLoading, error, isFallback, refetch } = useOverview(dateParams);
  const rentalsSummary = useRentalsSummary(dateParams);

  const role = user?.role;
  const isExec = role === "super_admin" || role === "admin";
  const isStaff = role === "staff";
  const isPartner = role === "location_partner" || role === "funding_partner";

  // Alerts: offline machines + overdue rentals
  const offlineMachines = data.totalMachines - data.onlineMachines;
  const overdueCount = rentalsSummary.data.overdue_count;
  const alerts: Array<{ severity: "critical" | "warning"; label: string; to: string }> = [];
  if (overdueCount > 0) alerts.push({ severity: "critical", label: `${overdueCount} overdue rental${overdueCount === 1 ? "" : "s"} need attention`, to: "/dashboard/rentals?status=overdue" });
  if (offlineMachines > 0) alerts.push({ severity: "warning", label: `${offlineMachines} machine${offlineMachines === 1 ? "" : "s"} offline`, to: "/dashboard/machines" });

  const greeting = (() => {
    const h = new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", hour12: false });
    const hn = parseInt(h, 10);
    if (hn < 12) return "Good morning";
    if (hn < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name.split(" ")[0] || ""}`}
        description={isStaff ? "Your shift at a glance." : "Real-time overview of your ChargeByte network."}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(next) => {
            setPeriod(next.period);
            setDateFrom(next.date_from);
            setDateTo(next.date_to);
          }}
        />
      </div>

      {isFallback && <FallbackBanner onRetry={refetch} />}
      {error && !isFallback && <ErrorState title="Couldn't load dashboard" message={error} onRetry={refetch} />}

      {/* Alerts strip */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.to)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                a.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1 font-medium">{a.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {isLoading ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : isExec || isPartner ? (
          <>
            <KpiCard title="Net Revenue" value={formatKsh(rentalsSummary.data.total_amount)}
              icon={<Wallet className="h-5 w-5" />} accent="success"
              onClick={() => navigate("/dashboard/revenue")} />
            <KpiCard title="Active Rentals" value={data.activeRentals}
              icon={<Car className="h-5 w-5" />} accent="primary"
              onClick={() => navigate("/dashboard/rentals?status=active")} />
            <KpiCard title="Machines Online" value={`${data.onlineMachines}/${data.totalMachines}`}
              icon={<Cpu className="h-5 w-5" />}
              accent={offlineMachines > 0 ? "warning" : "success"}
              onClick={() => navigate("/dashboard/machines")} />
            <KpiCard title="Total Sessions" value={data.totalSessions.toLocaleString()}
              icon={<Zap className="h-5 w-5" />} accent="primary"
              onClick={() => navigate("/dashboard/rentals")} />
          </>
        ) : (
          <>
            <KpiCard title="Active Rentals" value={data.activeRentals} icon={<Car className="h-5 w-5" />} accent="primary" />
            <KpiCard title="Sessions" value={data.totalSessions.toLocaleString()} icon={<Zap className="h-5 w-5" />} accent="primary" />
            <KpiCard title="Overdue" value={overdueCount} icon={<AlertTriangle className="h-5 w-5" />}
              accent={overdueCount > 0 ? "danger" : "success"} />
            <KpiCard title="Machines Online" value={`${data.onlineMachines}/${data.totalMachines}`}
              icon={<Cpu className="h-5 w-5" />} accent={offlineMachines > 0 ? "warning" : "success"} />
          </>
        )}
      </div>

      {/* Quick actions */}
      <SectionCard title="Quick actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {isStaff && <>
            <QuickAction icon={Clock} label="Clock In / Out" to="/dashboard/clockin" />
            <QuickAction icon={FileText} label="Submit Daily Report" to="/dashboard/reports" />
            <QuickAction icon={LifeBuoy} label="Log a Support Ticket" to="/dashboard/support" />
          </>}
          {isExec && <>
            <QuickAction icon={Smartphone} label="M-Pesa Payments" to="/dashboard/mpesa" />
            <QuickAction icon={Car} label="Review Overdue" to="/dashboard/rentals?status=overdue" />
            <QuickAction icon={LifeBuoy} label="Open Tickets" to="/dashboard/support" />
            <QuickAction icon={Trophy} label="Agent Performance" to="/dashboard/performance" />
          </>}
          {isPartner && <>
            <QuickAction icon={Cpu} label="My Machines" to="/dashboard/partner" />
            <QuickAction icon={Wallet} label="Revenue Share" to="/dashboard/revenue" />
          </>}
        </div>
      </SectionCard>

      {/* Charts (exec/partner only) */}
      {(isExec || isPartner) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard title="Revenue Trend">
              {isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : data.revenueByMonth.length === 0 ? (
                <EmptyState title="No revenue data" description="No transactions in the selected window." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.revenueByMonth}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      formatter={(v: number) => [formatKsh(v), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
          <SectionCard title="Top Stations">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : data.sessionsByStation.length === 0 ? (
              <EmptyState title="No sessions" description="No rentals in the selected window." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.sessionsByStation.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>
      )}

      {/* Recent transactions */}
      {(isExec || isPartner) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Recent Transactions</h3>
            <button
              onClick={() => navigate("/dashboard/transactions")}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : data.recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <EmptyState title="No transactions yet" description="Transactions will appear here as customers rent powerbanks." />
            </div>
          ) : (
            <DataTable
              data={data.recentTransactions.slice(0, 8)}
              searchKey="phone_number"
              searchPlaceholder="Search transactions..."
              columns={[
                { key: "created_at", label: "Date", render: (v) => <span>{formatDateTime(String(v))}</span> },
                { key: "phone_number", label: "Phone" },
                { key: "transaction_type", label: "Type", render: (v) => <span className="capitalize">{String(v).replace("_", " ")}</span> },
                { key: "amount", label: "Amount", render: (v) => <span className="font-medium">{formatKsh(Number(v))}</span> },
                { key: "mpesa_receipt", label: "M-Pesa Ref", render: (v) => <span className="font-mono text-xs">{v ? String(v) : "—"}</span> },
                { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewPage;
