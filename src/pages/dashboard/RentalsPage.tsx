import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { mockRentals } from "@/data/mockData";

const RentalsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Rentals Overview</h1>
    <DataTable
      data={mockRentals}
      searchKey="customer"
      searchPlaceholder="Search by customer..."
      columns={[
        { key: "id", label: "ID" },
        { key: "customer", label: "Customer" },
        { key: "station", label: "Station" },
        { key: "machine", label: "Machine" },
        { key: "startTime", label: "Start" },
        { key: "endTime", label: "End", render: (v) => String(v) || "—" },
        { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
        { key: "amount", label: "Amount", render: (v) => Number(v) > 0 ? `$${Number(v).toFixed(2)}` : "—" },
      ]}
    />
  </div>
);

export default RentalsPage;
