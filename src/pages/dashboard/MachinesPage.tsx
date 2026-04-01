import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { mockMachines } from "@/data/mockData";

const MachinesPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Machines Overview</h1>
    <DataTable
      data={mockMachines}
      searchKey="name"
      searchPlaceholder="Search machines..."
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "station", label: "Station" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
        { key: "lastActive", label: "Last Active" },
        { key: "totalSessions", label: "Sessions" },
      ]}
    />
  </div>
);

export default MachinesPage;
