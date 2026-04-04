import { useState, useMemo } from "react";
import { ArrowUpDown, Car, CheckCircle, Clock, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { PageHeader, FilterBar, DetailRow, EmptyState } from "@/components/shared";
import { mockExtendedRentals, STATIONS, MACHINES, RENTAL_STATUSES, type ExtendedRental } from "@/data/revenueData";

const RentalsPage = () => {
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [depositFilter, setDepositFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRental, setSelectedRental] = useState<ExtendedRental | null>(null);

  const filtered = useMemo(() => {
    return mockExtendedRentals.filter((r) => {
      if (search && !r.rentalCode.toLowerCase().includes(search.toLowerCase()) && !r.phoneNumber.includes(search)) return false;
      if (stationFilter !== "all" && r.station !== stationFilter) return false;
      if (machineFilter !== "all" && r.machine !== machineFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (depositFilter === "yes" && !r.depositRefunded) return false;
      if (depositFilter === "no" && r.depositRefunded) return false;
      return true;
    });
  }, [search, stationFilter, machineFilter, statusFilter, depositFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof ExtendedRental];
      const bv = b[sortKey as keyof ExtendedRental];
      if (av === undefined || bv === undefined) return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const activeCount = mockExtendedRentals.filter((r) => r.status === "active").length;
  const completedCount = mockExtendedRentals.filter((r) => r.status === "completed").length;
  const overdueCount = mockExtendedRentals.filter((r) => r.status === "overdue").length;
  const cancelledCount = mockExtendedRentals.filter((r) => r.status === "cancelled").length;

  const columns = [
    { key: "rentalCode", label: "Rental Code" },
    { key: "phoneNumber", label: "Phone" },
    { key: "station", label: "Station" },
    { key: "machine", label: "Machine" },
    { key: "powerbankId", label: "Powerbank" },
    { key: "startTime", label: "Start" },
    { key: "endTime", label: "End" },
    { key: "durationMinutes", label: "Duration" },
    { key: "totalAmount", label: "Amount" },
    { key: "depositAmount", label: "Deposit" },
    { key: "depositRefunded", label: "Refunded" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Rentals Management" description="Track and manage all powerbank rentals" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Active Rentals" value={activeCount} icon={<Car className="h-5 w-5" />} />
        <MetricCard title="Completed" value={completedCount} change={8} icon={<CheckCircle className="h-5 w-5" />} />
        <MetricCard title="Overdue" value={overdueCount} icon={<Clock className="h-5 w-5" />} />
        <MetricCard title="Cancelled" value={cancelledCount} icon={<XCircle className="h-5 w-5" />} />
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by rental code or phone...">
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Station" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {STATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Machine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Machines</SelectItem>
            {MACHINES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RENTAL_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={depositFilter} onValueChange={setDepositFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Deposit Refund" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Refunded</SelectItem>
            <SelectItem value="no">Not Refunded</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                  <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} onClick={() => setSelectedRental(r)} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                <td className="px-3 py-3 text-foreground font-mono text-xs">{r.rentalCode}</td>
                <td className="px-3 py-3 text-foreground">{r.phoneNumber}</td>
                <td className="px-3 py-3 text-foreground">{r.station}</td>
                <td className="px-3 py-3 text-foreground">{r.machine}</td>
                <td className="px-3 py-3 text-foreground font-mono text-xs">{r.powerbankId}</td>
                <td className="px-3 py-3 text-foreground whitespace-nowrap">{r.startTime}</td>
                <td className="px-3 py-3 text-foreground whitespace-nowrap">{r.endTime || "—"}</td>
                <td className="px-3 py-3 text-foreground">{r.durationMinutes > 0 ? `${r.durationMinutes} min` : "—"}</td>
                <td className="px-3 py-3 text-foreground font-medium">{r.totalAmount > 0 ? `KES ${r.totalAmount}` : "—"}</td>
                <td className="px-3 py-3 text-foreground">KES {r.depositAmount}</td>
                <td className="px-3 py-3">{r.depositRefunded ? <span className="text-green-600 font-medium">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={12}><EmptyState title="No rentals found" description="Try adjusting your filters" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selectedRental} onOpenChange={() => setSelectedRental(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Rental Details</SheetTitle></SheetHeader>
          {selectedRental && (
            <div className="mt-6 space-y-1">
              <DetailRow label="Rental Code" value={selectedRental.rentalCode} />
              <DetailRow label="Phone Number" value={selectedRental.phoneNumber} />
              <DetailRow label="Station" value={selectedRental.station} />
              <DetailRow label="Machine" value={selectedRental.machine} />
              <DetailRow label="Powerbank" value={selectedRental.powerbankId} />
              <DetailRow label="Start Time" value={selectedRental.startTime} />
              <DetailRow label="End Time" value={selectedRental.endTime || "—"} />
              <DetailRow label="Duration" value={selectedRental.durationMinutes > 0 ? `${selectedRental.durationMinutes} minutes` : "—"} />
              <DetailRow label="Total Amount" value={selectedRental.totalAmount > 0 ? `KES ${selectedRental.totalAmount}` : "—"} />
              <DetailRow label="Deposit" value={`KES ${selectedRental.depositAmount}`} />
              <DetailRow label="Deposit Refunded" value={selectedRental.depositRefunded ? "Yes" : "No"} />
              <DetailRow label="Status" value={<StatusBadge status={selectedRental.status} />} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RentalsPage;
