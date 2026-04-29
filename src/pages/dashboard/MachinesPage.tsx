import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, TableSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useMachines } from "@/hooks/useDashboardData";
import { formatDate } from "@/lib/format";

const MachinesPage = () => {
  const { data: machines, isLoading, error, isFallback, refetch } = useMachines();

  return (
    <div className="space-y-6">
      <PageHeader title="Machines Overview" description="View and monitor all charging machines" />

      {isFallback && !isLoading && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          Showing demo data — backend unreachable.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load machines" message={error} onRetry={refetch} />
      ) : machines.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState title="No machines registered" description="Add your first charging machine to get started." />
        </div>
      ) : (
        <DataTable
          data={machines}
          searchKey="name"
          searchPlaceholder="Search machines..."
          columns={[
            { key: "id", label: "ID" },
            { key: "name", label: "Name" },
            { key: "station_name", label: "Station" },
            { key: "model", label: "Model" },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
            { key: "last_maintenance", label: "Last Maintenance", render: (v) => <span>{v ? formatDate(String(v)) : "—"}</span> },
            { key: "available_slots", label: "Avail. Slots" },
            { key: "total_slots", label: "Total Slots" },
          ]}
        />
      )}
    </div>
  );
};

export default MachinesPage;
