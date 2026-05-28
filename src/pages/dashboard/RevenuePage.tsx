import { useState } from "react";
import { ArrowUpDown, TrendingUp, Receipt, RefreshCw, Activity, Wallet } from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import {
  PageHeader,
  SectionCard,
  FilterBar,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Pagination,
  DateRangeFilter,
  FallbackBanner,
} from "@/components/shared";
import {
  useRevenueSummary,
  useRevenueOverTime,
  useRevenueByStation,
  useRevenueBreakdown,
  useRevenueTransactions,
  useStations,
  type DatePeriod,
} from "@/hooks/useDashboardData";
import { formatKsh, formatDateTime } from "@/lib/format";

const PAGE_SIZE = 25;
const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
];

const RevenuePage = () => {
  const [period, setPeriod] = useState<DatePeriod>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const range = {
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
  };

  const { data: stations } = useStations();
  const summary = useRevenueSummary(range);
  const overTime = useRevenueOverTime({ ...range, period_grain: "daily" });
  const byStation = useRevenueByStation(range);
  const breakdown = useRevenueBreakdown(range);
  const transactions = useRevenueTransactions({
    ...range,
    page,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    transaction_type: typeFilter === "all" ? undefined : typeFilter,
    search: search || undefined,
  });

  const onFilterChange = (cb: () => void) => {
    cb();
    setPage(1);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const txRows = (() => {
    const rows = transactions.data;
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      if (av == null || bv == null) return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  // Filter station list to only those with id (defensive)
  const stationOptions = stations.filter((s) => s?.id);

  const totalPages = transactions.meta?.pages ?? 1;
  const total = transactions.meta?.total ?? transactions.data.length;

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const columns = [
    { key: "created_at", label: "Date" },
    { key: "rental_code", label: "Rental Code" },
    { key: "station_name", label: "Station" },
    { key: "machine_name", label: "Machine" },
    { key: "transaction_type", label: "Type" },
    { key: "amount", label: "Amount" },
    { key: "mpesa_receipt", label: "M-Pesa Receipt" },
    { key: "phone_number", label: "Phone" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Visibility"
        description="Track all revenue streams across stations and machines"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter
          period={period}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onChange={(next) =>
            onFilterChange(() => {
              setPeriod(next.period);
              setDateFrom(next.date_from);
              setDateTo(next.date_to);
            })
          }
        />
      </div>

      {summary.isFallback && (
        <FallbackBanner
          onRetry={() => {
            summary.refetch();
            overTime.refetch();
            byStation.refetch();
            breakdown.refetch();
            transactions.refetch();
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summary.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-xl" />
          ))
        ) : (
          <>
            <MetricCard
              title="Net Revenue"
              value={formatKsh(summary.data.net_revenue)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Rental Charges"
              value={formatKsh(summary.data.rental_charges)}
              icon={<Receipt className="h-5 w-5" />}
            />
            <MetricCard
              title="Deposits Collected"
              value={formatKsh(summary.data.deposits_collected)}
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              title="Refunds Issued"
              value={formatKsh(summary.data.refunds_issued)}
              icon={<RefreshCw className="h-5 w-5" />}
            />
            <MetricCard
              title="Transaction Volume"
              value={formatKsh(summary.data.transaction_volume)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {!summary.isLoading && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Revenue model:</span> Customer pays a
          deposit (held as a liability) and is charged the hourly rate. On return we refund the
          unused deposit. Our <span className="font-medium text-foreground">Net Revenue</span> is
          the rental charge only — currently{" "}
          <span className="font-medium text-foreground">{formatKsh(summary.data.net_revenue)}</span>{" "}
          across {summary.data.rentals_count} rental{summary.data.rentals_count === 1 ? "" : "s"}.{" "}
          Deposits Held ({formatKsh(summary.data.deposits_collected - summary.data.refunds_issued)})
          are outstanding liabilities, not revenue.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue Over Time">
          {overTime.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : overTime.data.length === 0 ? (
            <EmptyState
              title="No revenue data"
              description="No completed transactions in this range."
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={overTime.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  formatter={(v: number) => [formatKsh(v), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Revenue by Station">
          {byStation.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : byStation.data.length === 0 ? (
            <EmptyState
              title="No station revenue"
              description="No completed transactions in this range."
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byStation.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                  }}
                  formatter={(v: number) => [formatKsh(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Transaction Type Breakdown">
        {breakdown.isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : breakdown.data.length === 0 ? (
          <EmptyState title="No data" description="No completed transactions in this range." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={breakdown.data}
                dataKey="value"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ type, percent }) =>
                  `${typeLabel(String(type))} ${(Number(percent) * 100).toFixed(0)}%`
                }
              >
                {breakdown.data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
                formatter={(v: number) => [formatKsh(v), "Revenue"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => onFilterChange(() => setSearch(v))}
        searchPlaceholder="Search by rental code, M-Pesa receipt, or phone..."
      >
        <Select
          value={stationFilter}
          onValueChange={(v) => onFilterChange(() => setStationFilter(v))}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Station" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {stationOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => onFilterChange(() => setTypeFilter(v))}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="rental_charge">Rental Charge</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="topup">Top-up</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => onFilterChange(() => setStatusFilter(v))}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {transactions.isLoading ? (
        <TableSkeleton rows={8} columns={9} />
      ) : transactions.error && !transactions.isFallback ? (
        <ErrorState
          title="Couldn't load transactions"
          message={transactions.error}
          onRetry={transactions.refetch}
        />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txRows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {formatDateTime(t.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {t.rental_code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{t.station_name ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{t.machine_name ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground capitalize">
                      {typeLabel(t.transaction_type)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {formatKsh(Number(t.amount))}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {t.mpesa_receipt ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">{t.phone_number}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
                {txRows.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        title="No transactions found"
                        description="Try adjusting your filters or date range."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            pageSize={PAGE_SIZE}
          />
        </>
      )}
    </div>
  );
};

export default RevenuePage;
