import { useState } from "react";
import { ArrowUpDown, TrendingUp, RefreshCw, Activity, Wallet } from "lucide-react";
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
  type DatePeriod,
} from "@/hooks/useDashboardData";
import { formatKsh, formatDateTime } from "@/lib/format";
import type { Rental } from "@/types/dashboard";

const PAGE_SIZE = 25;

interface RentalRow extends Rental {
  station_name?: string;
  machine_name?: string;
}

const RevenuePage = () => {
  const [period, setPeriod] = useState<DatePeriod>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof RentalRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filterParams = {
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    station_id: stationFilter === "all" ? undefined : stationFilter,
    search: search || undefined,
  };

  const { data: stations } = useStations();
  const summary = useRentalsSummary(filterParams);
  const rentalsQ = useRentals({ page, limit: PAGE_SIZE, ...filterParams });

  const onFilterChange = (cb: () => void) => {
    cb();
    setPage(1);
  };

  const handleSort = (key: keyof RentalRow) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const rows = (() => {
    const list = rentalsQ.data as RentalRow[];
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null || bv == null) return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  const totalPages = rentalsQ.meta?.pages ?? 1;
  const total = rentalsQ.meta?.total ?? rentalsQ.data.length;

  // Metrics derived from the SAME rentals endpoint used by the Rentals page.
  const netRevenue = summary.data.total_amount;
  const depositsCollected = summary.data.total_deposits;
  const refundsIssued = summary.data.total_refunded;
  const transactionVolume = depositsCollected + refundsIssued;

  const columns: Array<{ key: keyof RentalRow; label: string }> = [
    { key: "created_at", label: "Date" },
    { key: "rental_code", label: "Rental Code" },
    { key: "machine_model", label: "Machine Model" },
    { key: "manufacturer_trade_no", label: "Powerbank S/N" },
    { key: "phone_number", label: "Phone" },
    { key: "total_amount", label: "Revenue" },
    { key: "deposit_amount", label: "Deposit" },
    { key: "deposit_refunded", label: "Refunded" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue Visibility"
        description="Synced with the Rentals Management data source"
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
            rentalsQ.refetch();
          }}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-xl" />
          ))
        ) : (
          <>
            <MetricCard
              title="Net Revenue"
              value={formatKsh(netRevenue)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              title="Deposits Collected"
              value={formatKsh(depositsCollected)}
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              title="Refunds Issued"
              value={formatKsh(refundsIssued)}
              icon={<RefreshCw className="h-5 w-5" />}
            />
            <MetricCard
              title="Transaction Volume"
              value={formatKsh(transactionVolume)}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {!summary.isLoading && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Revenue model:</span> Net Revenue ={" "}
          <span className="font-mono">SUM(total_amount)</span>. Deposits Collected ={" "}
          <span className="font-mono">SUM(deposit_amount)</span>. Refunds Issued ={" "}
          <span className="font-mono">SUM(deposit_refunded)</span>. Transaction Volume ={" "}
          <span className="font-mono">Deposits + Refunds</span>.
        </div>
      )}

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => onFilterChange(() => setSearch(v))}
        searchPlaceholder="Search by rental code, phone, or powerbank..."
      >
        <Select
          value={stationFilter}
          onValueChange={(v) => onFilterChange(() => setStationFilter(v))}
        >
          <SelectTrigger className="w-[180px] h-9">
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
            <SelectItem value="pending_payment">Pending Payment</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <SectionCard title="Rentals — revenue line items">
        {rentalsQ.isLoading ? (
          <TableSkeleton rows={8} columns={columns.length} />
        ) : rentalsQ.error && !rentalsQ.isFallback ? (
          <ErrorState
            title="Couldn't load rentals"
            message={rentalsQ.error}
            onRetry={rentalsQ.refetch}
          />
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((col) => (
                      <th
                        key={String(col.key)}
                        className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
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
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-foreground whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-3 py-3 text-foreground font-mono text-xs">
                        {r.rental_code}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {r.machine_model ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground font-mono text-xs">
                        {r.manufacturer_trade_no ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground">{r.phone_number}</td>
                      <td className="px-3 py-3 text-foreground font-medium">
                        {Number(r.total_amount) > 0 ? formatKsh(r.total_amount) : "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {formatKsh(r.deposit_amount)}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {r.deposit_refunded && Number(r.deposit_refunded) > 0
                          ? formatKsh(Number(r.deposit_refunded))
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length}>
                        <EmptyState
                          title="No rentals found"
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
      </SectionCard>
    </div>
  );
};

export default RevenuePage;
