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
  useRentals,
  useRentalsSummary,
  useStations,
  useMachines,
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

// Calculate revenue metrics from rental data
const calculateRevenueMetrics = (rentals: any[]) => {
  const rental_charges = rentals.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const deposits_collected = rentals.reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);
  const refunds_issued = rentals
    .filter((r) => r.deposit_refunded)
    .reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);
  const net_revenue = rental_charges;
  const transaction_volume = rental_charges + deposits_collected;

  return {
    net_revenue,
    rental_charges,
    deposits_collected,
    refunds_issued,
    transaction_volume,
    rentals_count: rentals.length,
  };
};

// Calculate revenue over time from rentals
const calculateRevenueOverTime = (rentals: any[]) => {
  const dailyMap = new Map();

  rentals.forEach((rental) => {
    const date = rental.start_time.split("T")[0];
    const amount = Number(rental.total_amount) || 0;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { period: date, revenue: 0, rentals: 0 });
    }
    const day = dailyMap.get(date);
    day.revenue += amount;
    day.rentals += 1;
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.period.localeCompare(b.period));
};

// Calculate revenue by station from rentals
const calculateRevenueByStation = (rentals: any[], stations: any[]) => {
  const stationMap = new Map();

  rentals.forEach((rental) => {
    const stationId = rental.station_id;
    const station = stations.find((s) => s.id === stationId);
    const stationName = station?.name || rental.station_name || stationId;
    const amount = Number(rental.total_amount) || 0;

    if (!stationMap.has(stationId)) {
      stationMap.set(stationId, {
        name: stationName,
        revenue: 0,
        rentals: 0,
        station_id: stationId,
      });
    }
    const stationData = stationMap.get(stationId);
    stationData.revenue += amount;
    stationData.rentals += 1;
  });

  return Array.from(stationMap.values()).sort((a, b) => b.revenue - a.revenue);
};

// Calculate revenue breakdown by type (deposit, rental_charge, refund)
const calculateRevenueBreakdown = (rentals: any[]) => {
  const rental_charges = rentals.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const deposits = rentals.reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);
  const refunds = rentals
    .filter((r) => r.deposit_refunded)
    .reduce((sum, r) => sum + (Number(r.deposit_amount) || 0), 0);

  return [
    { type: "rental_charge", value: rental_charges, label: "Rental Charges" },
    { type: "deposit", value: deposits, label: "Deposits" },
    { type: "refund", value: refunds, label: "Refunds" },
  ].filter((item) => item.value > 0);
};

const RevenuePage = () => {
  const [period, setPeriod] = useState<DatePeriod>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: stations } = useStations();
  const { data: machines } = useMachines();

  // Use same filter params as Rentals page
  const filterParams = {
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    station_id: stationFilter === "all" ? undefined : stationFilter,
    search: search || undefined,
  };

  const {
    data: rentals,
    meta,
    isLoading,
    error,
    isFallback,
    refetch,
  } = useRentals({
    page,
    limit: PAGE_SIZE,
    ...filterParams,
  });

  const { data: summaryData, isLoading: summaryLoading } = useRentalsSummary(filterParams);

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

  // Calculate revenue metrics from the current filtered rentals
  const revenueMetrics = calculateRevenueMetrics(rentals || []);
  const revenueOverTime = calculateRevenueOverTime(rentals || []);
  const revenueByStation = calculateRevenueByStation(rentals || [], stations);
  const revenueBreakdown = calculateRevenueBreakdown(rentals || []);

  const totalPages = meta?.pages ?? 1;
  const total = meta?.total ?? rentals?.length ?? 0;

  // Sort transactions (rentals treated as transactions)
  const sortedRentals = (() => {
    if (!sortKey) return rentals || [];
    return [...(rentals || [])].sort((a, b) => {
      let av: any = a[sortKey as keyof typeof a];
      let bv: any = b[sortKey as keyof typeof b];

      // Handle special cases
      if (sortKey === "created_at") av = a.start_time;
      if (sortKey === "created_at") bv = b.start_time;
      if (sortKey === "amount") av = a.total_amount;
      if (sortKey === "amount") bv = b.total_amount;
      if (sortKey === "transaction_type") av = "rental_charge";
      if (sortKey === "transaction_type") bv = "rental_charge";

      if (av == null || bv == null) return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  const stationName = (id: string) =>
    rentals?.find((r) => r.station_id === id)?.station_name ??
    stations.find((s) => s.id === id)?.name ??
    id;

  const machineName = (id: string) =>
    rentals?.find((r) => r.machine_id === id)?.machine_name ??
    machines.find((m) => m.id === id)?.name ??
    id;

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const columns = [
    { key: "start_time", label: "Date" },
    { key: "rental_code", label: "Rental Code" },
    { key: "station_id", label: "Station" },
    { key: "machine_id", label: "Machine" },
    { key: "status", label: "Type" }, // Using status as type in revenue view
    { key: "total_amount", label: "Amount" },
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

      {isFallback && <FallbackBanner onRetry={refetch} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryLoading || isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-xl" />
          ))
        ) : (
          <>
            <MetricCard
              title="Net Revenue"
              value={formatKsh(revenueMetrics.net_revenue)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Rental Charges"
              value={formatKsh(revenueMetrics.rental_charges)}
              icon={<Receipt className="h-5 w-5" />}
            />
            <MetricCard
              title="Deposits Collected"
              value={formatKsh(revenueMetrics.deposits_collected)}
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              title="Refunds Issued"
              value={formatKsh(revenueMetrics.refunds_issued)}
              icon={<RefreshCw className="h-5 w-5" />}
            />
            <MetricCard
              title="Transaction Volume"
              value={formatKsh(revenueMetrics.transaction_volume)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {!summaryLoading && !isLoading && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Revenue model:</span> Customer pays a
          deposit (held as a liability) and is charged the hourly rate. On return we refund the
          unused deposit. Our <span className="font-medium text-foreground">Net Revenue</span> is
          the rental charge only — currently{" "}
          <span className="font-medium text-foreground">
            {formatKsh(revenueMetrics.net_revenue)}
          </span>{" "}
          across {summaryData?.total_rentals || revenueMetrics.rentals_count} rental
          {(summaryData?.total_rentals || revenueMetrics.rentals_count) === 1 ? "" : "s"}. Deposits
          Held ({formatKsh(revenueMetrics.deposits_collected - revenueMetrics.refunds_issued)}) are
          outstanding liabilities, not revenue.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue Over Time">
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : revenueOverTime.length === 0 ? (
            <EmptyState title="No revenue data" description="No completed rentals in this range." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueOverTime}>
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
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : revenueByStation.length === 0 ? (
            <EmptyState
              title="No station revenue"
              description="No completed rentals in this range."
            />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByStation}>
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

      <SectionCard title="Revenue Breakdown by Type">
        {isLoading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : revenueBreakdown.length === 0 ? (
          <EmptyState title="No data" description="No completed rentals in this range." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={revenueBreakdown}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ label, percent }) => `${label} ${(Number(percent) * 100).toFixed(0)}%`}
              >
                {revenueBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
                formatter={(v: number) => [formatKsh(v), "Amount"]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => onFilterChange(() => setSearch(v))}
        searchPlaceholder="Search by rental code, phone, or powerbank..."
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
            {stations
              .filter((s) => s?.id)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={8} columns={columns.length} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load revenue data" message={error} onRetry={refetch} />
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
                {sortedRentals.map((rental) => (
                  <tr
                    key={rental.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {formatDateTime(rental.start_time)}
                    </td>
                    <td className="px-4 py-3 text-foreground font-mono text-xs">
                      {rental.rental_code}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {rental.station_name ?? stationName(rental.station_id)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {rental.machine_name ?? machineName(rental.machine_id)}
                    </td>
                    <td className="px-4 py-3 text-foreground capitalize">Rental Charge</td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {formatKsh(Number(rental.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-foreground">{rental.phone_number}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rental.status} />
                    </td>
                  </tr>
                ))}
                {sortedRentals.length === 0 && (
                  <tr>
                    <td colSpan={columns.length}>
                      <EmptyState
                        title="No revenue data found"
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
