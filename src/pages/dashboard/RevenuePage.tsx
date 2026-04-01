import { DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import MetricCard from "@/components/MetricCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { mockTransactions, revenueByMonth } from "@/data/mockData";

const RevenuePage = () => {
  const total = mockTransactions.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const pending = mockTransactions.filter((t) => t.status === "pending").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Revenue Summary</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard title="Total Revenue" value={total.toFixed(2)} prefix="$" change={8.2} icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Pending" value={pending.toFixed(2)} prefix="$" icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Transactions" value={mockTransactions.length} change={5} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DataTable
        data={mockTransactions}
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
  );
};

export default RevenuePage;
