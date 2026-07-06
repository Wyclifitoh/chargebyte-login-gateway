import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, TableSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useMachines } from "@/hooks/useDashboardData";
import { formatDate } from "@/lib/format";
import { api } from "@/services/api";

type MachineRow = {
  id: string;
  name?: string;
  station_name?: string;
  model?: string;
  status?: string;
  last_maintenance?: string | null;
  available_slots?: number;
  total_slots?: number;
  cabinet_device_id?: string | null;
  manufacturer_cabinet_id?: string | null;
  signal_strength?: number | null;
  empty_slots?: number | null;
  busy_slots?: number | null;
  is_online?: number | boolean | null;
  last_synced_at?: string | null;
};

const MachinesPage = () => {
  const { data: machines, isLoading, error, isFallback, refetch } = useMachines();
  const [syncing, setSyncing] = useState<string | null>(null);

  const runSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await api.machines.sync(id);
      if (res.success) {
        toast.success("Cabinet synced");
        refetch();
      } else {
        toast.error(res.error || "Sync failed");
      }
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Machines Overview" description="Live cabinet telemetry from the manufacturer API." />

      {isFallback && !isLoading && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          Showing demo data — backend unreachable.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} columns={9} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load machines" message={error} onRetry={refetch} />
      ) : machines.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState title="No machines registered" description="Add your first charging machine to get started." />
        </div>
      ) : (
        <DataTable
          data={machines as unknown as MachineRow[]}
          searchKey="name"
          searchPlaceholder="Search machines..."
          columns={[
            { key: "name", label: "Name" },
            { key: "station_name", label: "Station" },
            { key: "cabinet_device_id", label: "Device ID", render: (v) => <span className="font-mono text-xs">{v ? String(v) : "—"}</span> },
            { key: "manufacturer_cabinet_id", label: "Cabinet ID", render: (v) => <span className="font-mono text-xs">{v ? String(v) : "—"}</span> },
            { key: "is_online", label: "Online", render: (v) => <StatusBadge status={v ? "online" : "offline"} /> },
            { key: "signal_strength", label: "Signal", render: (v) => (v == null ? "—" : `${v}`) },
            {
              key: "empty_slots",
              label: "Slots (free/busy/total)",
              render: (_v, row: MachineRow) =>
                `${row.empty_slots ?? "—"} / ${row.busy_slots ?? "—"} / ${row.total_slots ?? "—"}`,
            },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
            { key: "last_synced_at", label: "Last sync", render: (v) => <span>{v ? formatDate(String(v)) : "—"}</span> },
            {
              key: "id",
              label: "Actions",
              render: (_v, row: MachineRow) => (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!row.cabinet_device_id || syncing === row.id}
                  onClick={() => runSync(row.id)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing === row.id ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default MachinesPage;
