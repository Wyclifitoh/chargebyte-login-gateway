import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockCampaigns, mockStations } from "@/data/mockData";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import { Megaphone, Eye, MousePointerClick, DollarSign } from "lucide-react";

const CampaignsPage = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const filtered = useMemo(() => {
    let data = mockCampaigns;
    if (statusFilter !== "all") data = data.filter((c) => c.status === statusFilter);
    if (locationFilter !== "all") data = data.filter((c) => c.locations.includes(locationFilter));
    return data;
  }, [statusFilter, locationFilter]);

  const totalImpressions = filtered.reduce((s, c) => s + c.impressions, 0);
  const totalInteractions = filtered.reduce((s, c) => s + c.interactions, 0);
  const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
  const avgCtr = filtered.length ? (filtered.reduce((s, c) => s + c.ctr, 0) / filtered.length).toFixed(1) : "0";

  const columns = [
    { key: "name" as const, label: "Campaign" },
    { key: "status" as const, label: "Status", render: (v: any) => <StatusBadge status={v} /> },
    { key: "startDate" as const, label: "Start" },
    { key: "endDate" as const, label: "End" },
    { key: "locations" as const, label: "Locations", render: (v: any) => (v as string[]).join(", "), sortable: false },
    { key: "impressions" as const, label: "Impressions", render: (v: any) => Number(v).toLocaleString() },
    { key: "interactions" as const, label: "Interactions", render: (v: any) => Number(v).toLocaleString() },
    { key: "ctr" as const, label: "CTR", render: (v: any) => `${v}%` },
    { key: "spend" as const, label: "Spend", render: (v: any) => `$${Number(v).toLocaleString()}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Campaigns" value={filtered.length} icon={Megaphone} />
        <MetricCard title="Impressions" value={totalImpressions.toLocaleString()} icon={Eye} />
        <MetricCard title="Interactions" value={totalInteractions.toLocaleString()} icon={MousePointerClick} />
        <MetricCard title="Total Spend" value={`$${totalSpend.toLocaleString()}`} icon={DollarSign} />
      </div>

      <Card className="border-border">
        <CardContent className="pt-4 pb-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {mockStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <DataTable data={filtered} columns={columns} searchKey="name" searchPlaceholder="Search campaigns..." />
    </div>
  );
};

export default CampaignsPage;
