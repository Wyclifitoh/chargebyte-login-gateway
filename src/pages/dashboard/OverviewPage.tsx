import { useState } from "react";
import { Car, Cpu, Wallet, Zap } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import MetricCard from "@/components/MetricCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import {
  PageHeader, SectionCard, TableSkeleton, EmptyState, ErrorState,
  FallbackBanner, DateRangeFilter,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview, type DatePeriod } from "@/hooks/useDashboardData";
import { formatKsh, formatDate } from "@/lib/format";

const MetricSkeleton = () => (
  <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-32" />
    <Skeleton className="h-3 w-16" />
  </div>
);

const OverviewPage = () => {
  const [period, setPeriod] = useState<DatePeriod>("today");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const { data, isLoading, error, isFallback, refetch } = useOverview({
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Real-time overview of your ChargeByte network"
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
      {error && !isFallback && (
        <ErrorState title="Couldn't load dashboard" message={error} onRetry={refetch} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <MetricSkeleton /><MetricSkeleton /><MetricSkeleton /><MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard title="Total Revenue" value={formatKsh(data.totalRevenue)} icon={<Wallet className="h-5 w-5" />} />
            <MetricCard title="Active Rentals" value={data.activeRentals} icon={<Car className="h-5 w-5" />} />
            <MetricCard title="Online Machines" value={`${data.onlineMachines}/${data.totalMachines}`} icon={<Cpu className="h-5 w-5" />} />
            <MetricCard title="Total Sessions" value={data.totalSessions.toLocaleString()} icon={<Zap className="h-5 w-5" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Revenue Trend (last 30 days)">
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : data.revenueByMonth.length === 0 ? (
            <EmptyState title="No revenue data" description="No transactions in the selected window." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  formatter={(v: number) => [formatKsh(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
        <SectionCard title="Sessions by Station">
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : data.sessionsByStation.length === 0 ? (
            <EmptyState title="No sessions" description="No rentals in the selected window." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.sessionsByStation}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Recent Transactions</h3>
        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : data.recentTransactions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <EmptyState
              title="No transactions yet"
              description="Transactions will appear here as customers rent powerbanks."
            />
          </div>
        ) : (
          <DataTable
            data={data.recentTransactions.slice(0, 10)}
            searchKey="phone_number"
            searchPlaceholder="Search transactions..."
            columns={[
              { key: "id", label: "ID" },
              { key: "created_at", label: "Date", render: (v) => <span>{formatDate(String(v))}</span> },
              { key: "phone_number", label: "Phone" },
              { key: "transaction_type", label: "Type", render: (v) => <span className="capitalize">{String(v).replace("_", " ")}</span> },
              { key: "amount", label: "Amount", render: (v) => <span>{formatKsh(Number(v))}</span> },
              { key: "mpesa_receipt", label: "M-Pesa Ref", render: (v) => <span>{v ? String(v) : "—"}</span> },
              { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default OverviewPage;
