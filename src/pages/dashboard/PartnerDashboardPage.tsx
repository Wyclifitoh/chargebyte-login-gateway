import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockPartnerMachines, mockStations } from "@/data/mockData";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import { PageHeader, FilterBar } from "@/components/shared";
import { Cpu, DollarSign, Battery } from "lucide-react";

const PartnerDashboardPage = () => {
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    let data = mockPartnerMachines;
    if (locationFilter !== "all") data = data.filter((m) => m.station === locationFilter);
    if (statusFilter !== "all") data = data.filter((m) => m.status === statusFilter);
    return data;
  }, [locationFilter, statusFilter]);

  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0);
  const avgHealth = Math.round(filtered.reduce((s, m) => s + m.powerbankHealth, 0) / (filtered.length || 1));
  const onlineCount = filtered.filter((m) => m.status === "online").length;

  const columns = [
    { key: "name" as const, label: "Machine" },
    { key: "station" as const, label: "Location" },
    { key: "status" as const, label: "Status", render: (v: any) => <StatusBadge status={v} /> },
    { key: "revenue" as const, label: "Revenue", render: (v: any) => `$${Number(v).toLocaleString()}` },
    { key: "availableSlots" as const, label: "Avail. Slots" },
    { key: "lastMaintenance" as const, label: "Last Maintenance" },
    { key: "powerbankHealth" as const, label: "PB Health", render: (v: any) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{v}%</span>
      </div>
    )},
    { key: "totalSessions" as const, label: "Sessions" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Partner Dashboard" description="Monitor your machines and revenue" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Machines" value={filtered.length} icon={<Cpu className="h-5 w-5" />} />
        <MetricCard title="Online" value={onlineCount} change={Math.round((onlineCount / (filtered.length || 1)) * 100)} icon={<Cpu className="h-5 w-5" />} />
        <MetricCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Avg PB Health" value={`${avgHealth}%`} icon={<Battery className="h-5 w-5" />} />
      </div>

      <FilterBar>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {mockStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
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

      <DataTable data={filtered} columns={columns} searchKey="name" searchPlaceholder="Search machines..." />
    </div>
  );
};

export default PartnerDashboardPage;
