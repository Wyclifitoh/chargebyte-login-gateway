import { Car, Cpu, MapPin, DollarSign, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import MetricCard from "@/components/MetricCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, SectionCard } from "@/components/shared";
import { mockRentals, mockMachines, mockTransactions, revenueByMonth, sessionsByStation } from "@/data/mockData";

const OverviewPage = () => {
  const totalRevenue = mockTransactions.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const activeRentals = mockRentals.filter((r) => r.status === "active").length;
  const onlineMachines = mockMachines.filter((m) => m.status === "online").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Overview" description="Real-time overview of your ChargeByte network" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={totalRevenue.toFixed(2)} prefix="$" change={8.2} icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Active Rentals" value={activeRentals} change={12} icon={<Car className="h-5 w-5" />} />
        <MetricCard title="Online Machines" value={`${onlineMachines}/${mockMachines.length}`} change={-2} icon={<Cpu className="h-5 w-5" />} />
        <MetricCard title="Total Sessions" value={mockMachines.reduce((s, m) => s + m.totalSessions, 0)} change={5.4} icon={<Zap className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Revenue Trend">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Sessions by Station">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sessionsByStation}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Recent Transactions</h3>
        <DataTable
          data={mockTransactions.slice(0, 5)}
          searchKey="customer"
          searchPlaceholder="Search transactions..."
          columns={[
            { key: "id", label: "ID" },
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer" },
            { key: "station", label: "Station" },
            { key: "amount", label: "Amount", render: (v) => `$${Number(v).toFixed(2)}` },
            { key: "type", label: "Type", render: (v) => <span className="capitalize">{String(v)}</span> },
            { key: "status", label: "Status", render: (v) => <StatusBadge status={String(v)} /> },
          ]}
        />
      </div>
    </div>
  );
};

export default OverviewPage;
