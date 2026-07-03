import { useState } from "react";
import {
  ArrowUpDown,
  Car,
  CheckCircle,
  Clock,
  XCircle,
  MessageSquare,
  Wallet,
  Coins,
  Timer,
  Send,
  Download,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import {
  PageHeader,
  FilterBar,
  DetailRow,
  EmptyState,
  TableSkeleton,
  ErrorState,
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
import { api } from "@/services/api";
import type { Rental } from "@/types/dashboard";

interface RentalRow extends Rental {
  station_name?: string;
  machine_model?: string; // We'll use this instead of machine_name
}

const PAGE_SIZE = 25;

const formatDuration = (mins: number) => {
  if (!mins || mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

// Generate a short numeric ID from rental code
const getShortId = (rentalCode: string) => {
  // Extract numbers from the rental code or use hash
  const numbers = rentalCode.replace(/\D/g, "");
  if (numbers.length >= 4) {
    return numbers.slice(0, 6); // First 6 digits
  }
  // Fallback: use last 6 characters of the code
  return rentalCode.slice(-6);
};

const RentalsPage = () => {
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all"); // New machine filter
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState<DatePeriod>("all");
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof RentalRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<RentalRow | null>(null);

  // SMS modal state
  const [smsTarget, setSmsTarget] = useState<RentalRow | null>(null);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsSending, setSmsSending] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Manual refund (B2C) state
  const [refundTarget, setRefundTarget] = useState<RentalRow | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundRemarks, setRefundRemarks] = useState("");
  const [refundPin, setRefundPin] = useState("");
  const [refundSending, setRefundSending] = useState(false);

  const { data: stations } = useStations();
  const { data: machines } = useMachines();

  // Filters shared between page list & summary
  const filterParams = {
    period,
    date_from: period === "custom" ? dateFrom : undefined,
    date_to: period === "custom" ? dateTo : undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    station_id: stationFilter === "all" ? undefined : stationFilter,
    machine_model: machineFilter === "all" ? undefined : machineFilter, // Add machine filter
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
  const { data: summary, isLoading: summaryLoading } = useRentalsSummary(filterParams);

  const stationName = (id: string) =>
    (rentals as RentalRow[]).find((r) => r.station_id === id)?.station_name ??
    stations.find((s) => s.id === id)?.name ??
    id;

  // Get machine model from rentals data
  const getMachineModel = (rental: RentalRow) => {
    return rental.machine_model || rental.model || "N/A";
  };

  // Get unique machine models for filter
  const uniqueModels = Array.from(
    new Set((rentals as RentalRow[]).map((r) => r.machine_model || r.model).filter(Boolean)),
  ).sort();

  // Local sort over the current page
  const sorted = (() => {
    const rows = rentals as RentalRow[];
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null || bv == null) return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  })();

  const handleSort = (key: keyof RentalRow) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const total = meta?.total ?? rentals.length;
  const totalPages = meta?.pages ?? 1;

  // Updated columns - removed rental_code, using machine_model
  const columns: Array<{ key: keyof RentalRow; label: string }> = [
    { key: "id", label: "Rental ID" },
    { key: "phone_number", label: "Phone" },
    { key: "station_id", label: "Station" },
    { key: "machine_model", label: "Machine" },
    { key: "start_time", label: "Start" },
    { key: "end_time", label: "End" },
    { key: "duration_minutes", label: "Duration" },
    { key: "total_amount", label: "Amount" },
    { key: "deposit_amount", label: "Deposit" },
    { key: "deposit_refunded", label: "Refunded" },
    { key: "status", label: "Status" },
  ];

  const onFilterChange = (cb: () => void) => {
    cb();
    setPage(1);
  };

  const openSms = (r: RentalRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSmsTarget(r);
    setSmsPhone(r.phone_number || "");
    const shortId = getShortId(r.rental_code || r.id);
    setSmsMessage(`Hi, regarding your rental #${shortId}: `);
  };

  const openRefund = (r: RentalRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const owed = Math.max(Number(r.deposit_amount || 0) - Number(r.deposit_refunded || 0), 0);
    setRefundTarget(r);
    setRefundAmount(String(owed || r.deposit_amount || 0));
    const shortId = getShortId(r.rental_code || r.id);
    setRefundRemarks(`Refund for rental #${shortId}`);
    setRefundPin("");
  };

  const sendRefund = async () => {
    if (!refundTarget) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid refund amount");
      return;
    }
    if (!/^\d{4}$/.test(refundPin)) {
      toast.error("Enter your 4-digit transaction PIN");
      return;
    }
    setRefundSending(true);
    try {
      const res = await api.mpesa.b2c({
        phone_number: refundTarget.phone_number,
        amount: amt,
        remarks: refundRemarks || `Refund ${refundTarget.rental_code}`,
        occasion: refundTarget.rental_code,
        pin: refundPin,
      });
      if (res.success) {
        toast.success(`Refund of Ksh ${amt} queued to ${refundTarget.phone_number}`);
        setRefundTarget(null);
        refetch();
      } else {
        toast.error(res.error || "Refund failed");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundSending(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.rentals.downloadXlsx(filterParams);
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rentals_${period}_${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const sendSms = async () => {
    if (!smsPhone.trim() || !smsMessage.trim()) {
      toast.error("Phone and message are required");
      return;
    }
    setSmsSending(true);
    try {
      const res = await api.rentals.sendSms({
        phone_number: smsPhone.trim(),
        message: smsMessage.trim(),
        rental_id: smsTarget?.id,
      });
      if (res.success) {
        toast.success(`SMS sent to ${smsPhone}`);
        setSmsTarget(null);
        setSmsMessage("");
      } else {
        toast.error(res.error || "Failed to send SMS");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send SMS");
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rentals Management" description="Track and manage all powerbank rentals" />

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
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            {total > 0 && (
              <>
                Showing {rentals.length} of {total} rentals
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={exportExcel}
            disabled={exporting || isLoading}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-1.5" />
            {exporting ? "Exporting…" : "Export Excel"}
          </Button>
        </div>
      </div>

      {isFallback && <FallbackBanner onRetry={refetch} />}

      {/* Period-wide revenue / volume cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue (Amount)"
          value={summaryLoading ? "…" : formatKsh(summary.total_amount)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Deposits (Refundable)"
          value={summaryLoading ? "…" : formatKsh(summary.total_deposits)}
          icon={<Coins className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Duration"
          value={summaryLoading ? "…" : formatDuration(summary.total_duration_minutes)}
          icon={<Timer className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Rentals"
          value={summaryLoading ? "…" : summary.total_rentals}
          icon={<Car className="h-5 w-5" />}
        />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Active"
          value={summary.active_count}
          icon={<Car className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed"
          value={summary.completed_count}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Overdue"
          value={summary.overdue_count}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Cancelled"
          value={summary.cancelled_count}
          icon={<XCircle className="h-5 w-5" />}
        />
      </div>

      <FilterBar
        searchValue={search}
        onSearchChange={(v) => onFilterChange(() => setSearch(v))}
        searchPlaceholder="Search by phone, or machine model..."
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
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* New Machine Model Filter */}
        <Select
          value={machineFilter}
          onValueChange={(v) => onFilterChange(() => setMachineFilter(v))}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Machine Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Machines</SelectItem>
            {uniqueModels.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
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
        <TableSkeleton rows={8} columns={12} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load rentals" message={error} onRetry={refetch} />
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
                  <th className="px-3 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const shortId = getShortId(r.rental_code || r.id);
                  const machineModel = r.machine_model || r.model || "N/A";

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 text-foreground font-mono text-xs">#{shortId}</td>
                      <td className="px-3 py-3 text-foreground">{r.phone_number}</td>
                      <td className="px-3 py-3 text-foreground">
                        {r.station_name ?? stationName(r.station_id)}
                      </td>
                      <td className="px-3 py-3 text-foreground font-mono">{machineModel}</td>
                      <td className="px-3 py-3 text-foreground whitespace-nowrap">
                        {formatDateTime(r.start_time)}
                      </td>
                      <td className="px-3 py-3 text-foreground whitespace-nowrap">
                        {r.end_time ? formatDateTime(r.end_time) : "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        {Number(r.duration_minutes) > 0 ? `${r.duration_minutes} min` : "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground font-medium">
                        {Number(r.total_amount) > 0 ? formatKsh(r.total_amount) : "—"}
                      </td>
                      <td className="px-3 py-3 text-foreground">{formatKsh(r.deposit_amount)}</td>
                      <td className="px-3 py-3">
                        {Number(r.deposit_refunded) > 0 ? (
                          <span className="text-green-600 font-medium">
                            {formatKsh(Number(r.deposit_refunded))}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {(r.status === "pending" || r.status === "pending_payment") && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => openRefund(r, e)}
                              className="h-8"
                            >
                              <Wallet className="h-3.5 w-3.5 mr-1.5" />
                              Refund
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => openSms(r, e)}
                            className="h-8"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                            SMS
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={12}>
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

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Rental Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-1">
              <DetailRow
                label="Rental ID"
                value={`#${getShortId(selected.rental_code || selected.id)}`}
              />
              <DetailRow label="Phone Number" value={selected.phone_number} />
              <DetailRow
                label="Station"
                value={selected.station_name ?? stationName(selected.station_id)}
              />
              <DetailRow
                label="Machine Model"
                value={selected.machine_model || selected.model || "N/A"}
              />
              <DetailRow label="Start Time" value={formatDateTime(selected.start_time)} />
              <DetailRow
                label="End Time"
                value={selected.end_time ? formatDateTime(selected.end_time) : "—"}
              />
              <DetailRow
                label="Duration"
                value={
                  Number(selected.duration_minutes) > 0
                    ? `${selected.duration_minutes} minutes`
                    : "—"
                }
              />
              <DetailRow
                label="Total Amount"
                value={Number(selected.total_amount) > 0 ? formatKsh(selected.total_amount) : "—"}
              />
              <DetailRow label="Deposit" value={formatKsh(selected.deposit_amount)} />
              <DetailRow
                label="Deposit Refunded"
                value={selected.deposit_refunded ? "Yes" : "No"}
              />
              <DetailRow label="Status" value={<StatusBadge status={selected.status} />} />
              <div className="pt-4">
                <Button onClick={(e) => openSms(selected, e)} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS to {selected.phone_number}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* SMS Dialog */}
      <Dialog open={!!smsTarget} onOpenChange={(open) => !open && setSmsTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS</DialogTitle>
            <DialogDescription>
              {smsTarget && (
                <>
                  Rental{" "}
                  <span className="font-mono">
                    #{getShortId(smsTarget.rental_code || smsTarget.id)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Phone Number
              </label>
              <Input
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+2547XXXXXXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Message{" "}
                <span className="text-muted-foreground font-normal">({smsMessage.length}/160)</span>
              </label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                maxLength={480}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsTarget(null)} disabled={smsSending}>
              Cancel
            </Button>
            <Button
              onClick={sendSms}
              disabled={smsSending || !smsPhone.trim() || !smsMessage.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {smsSending ? "Sending..." : "Send SMS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual B2C Refund Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual M-Pesa Refund (B2C)</DialogTitle>
            <DialogDescription>
              {refundTarget && (
                <>
                  Refund the customer for rental{" "}
                  <span className="font-mono">
                    #{getShortId(refundTarget.rental_code || refundTarget.id)}
                  </span>
                  . Funds will be sent via Safaricom B2C to the rental phone number.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone Number</label>
              <Input value={refundTarget?.phone_number || ""} disabled readOnly />
              <p className="text-xs text-muted-foreground mt-1">
                Locked to the rental's registered phone number.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount (Ksh)</label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Remarks</label>
              <Input value={refundRemarks} onChange={(e) => setRefundRemarks(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Transaction PIN (4 digits)</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={refundPin}
                onChange={(e) => setRefundPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundTarget(null)}
              disabled={refundSending}
            >
              Cancel
            </Button>
            <Button
              onClick={sendRefund}
              disabled={refundSending || !refundAmount || refundPin.length !== 4}
            >
              <Send className="h-4 w-4 mr-2" />
              {refundSending ? "Sending..." : "Send Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalsPage;
