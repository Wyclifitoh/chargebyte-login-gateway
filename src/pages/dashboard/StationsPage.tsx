import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { mockStations } from "@/data/mockData";

const StationsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Stations Overview</h1>
    <DataTable
      data={mockStations}
      searchKey="name"
      searchPlaceholder="Search stations..."
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "location", label: "Location" },
        { key: "machines", label: "Machines" },
        { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
        { key: "revenue", label: "Revenue", render: (v) => `$${Number(v).toLocaleString()}` },
      ]}
    />
  </div>
);

export default StationsPage;
