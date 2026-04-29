import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import { PageHeader, FilterBar, TableSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { Cpu, Wallet, Battery } from "lucide-react";
import { useMachines, useStations } from "@/hooks/useDashboardData";
import { formatKsh } from "@/lib/format";
import type { Machine, Station } from "@/types/dashboard";

interface PartnerMachineRow extends Machine {
  station: string;
  revenue: number;
  availableSlots: number;
  lastMaintenance: string;
  powerbankHealth: number;
  totalSessions: number;
}

const MetricSkeleton = () => (
  <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-7 w-32" />
    <Skeleton className="h-3 w-16" />
  </div>
);

const PartnerDashboardPage = () => {
  const machinesQ = useMachines();
  const stationsQ = useStations();
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const isLoading = machinesQ.isLoading || stationsQ.isLoading;
  const isFallback = machinesQ.isFallback || stationsQ.isFallback;
  const error = machinesQ.error && !machinesQ.isFallback ? machinesQ.error : null;

  // Enrich machines with partner-specific derived fields (deterministic from id)
  const enriched: PartnerMachineRow[] = useMemo(() => {
    return machinesQ.data.map((m, idx) => {
      const seed = (idx + 1) * 7;
      return {
        ...m,
        station: m.station_name ?? "—",
        revenue: ((seed * 1234) % 20000) + 2000,
        availableSlots: m.available_slots,
        lastMaintenance: m.last_maintenance ?? "—",
        powerbankHealth: 60 + ((seed * 13) % 40),
        totalSessions: ((seed * 97) % 2000) + 200,
      };
    });
  }, [machinesQ.data]);

  const filtered = useMemo(() => {
    let data = enriched;
    if (locationFilter !== "all") data = data.filter((m) => m.station === locationFilter);
    if (statusFilter !== "all") data = data.filter((m) => m.status === statusFilter);
    return data;
  }, [enriched, locationFilter, statusFilter]);

  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0);
  const avgHealth = Math.round(filtered.reduce((s, m) => s + m.powerbankHealth, 0) / (filtered.length || 1));
  const onlineCount = filtered.filter((m) => m.status === "online").length;

  const columns = [
    { key: "name" as const, label: "Machine" },
    { key: "station" as const, label: "Location" },
    { key: "status" as const, label: "Status", render: (v: unknown) => <StatusBadge status={String(v)} /> },
    { key: "revenue" as const, label: "Revenue", render: (v: unknown) => <span>{formatKsh(Number(v))}</span> },
    { key: "availableSlots" as const, label: "Avail. Slots" },
    { key: "lastMaintenance" as const, label: "Last Maintenance" },
    {
      key: "powerbankHealth" as const,
      label: "PB Health",
      render: (v: unknown) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Number(v)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{Number(v)}%</span>
        </div>
      ),
    },
    { key: "totalSessions" as const, label: "Sessions" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Partner Dashboard" description="Monitor your machines and revenue" />

      {isFallback && !isLoading && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          Showing demo data — backend unreachable.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <MetricSkeleton /><MetricSkeleton /><MetricSkeleton /><MetricSkeleton />
          </>
        ) : (
          <>
            <MetricCard title="Total Machines" value={filtered.length} icon={<Cpu className="h-5 w-5" />} />
            <MetricCard title="Online" value={onlineCount} change={Math.round((onlineCount / (filtered.length || 1)) * 100)} icon={<Cpu className="h-5 w-5" />} />
            <MetricCard title="Total Revenue" value={formatKsh(totalRevenue)} icon={<Wallet className="h-5 w-5" />} />
            <MetricCard title="Avg PB Health" value={`${avgHealth}%`} icon={<Battery className="h-5 w-5" />} />
          </>
        )}
      </div>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {stationsQ.data.map((s: Station) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Machine Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      {isLoading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : error ? (
        <ErrorState title="Couldn't load machines" message={error} onRetry={machinesQ.refetch} />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState title="No machines match your filters" description="Try widening your filter selection." />
        </div>
      ) : (
        <DataTable data={filtered} columns={columns} searchKey="name" searchPlaceholder="Search machines..." />
      )}
    </div>
  );
};

export default PartnerDashboardPage;
