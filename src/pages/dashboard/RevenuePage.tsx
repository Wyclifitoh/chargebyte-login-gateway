import { useState, useMemo } from "react";
import { DollarSign, ArrowUpDown, TrendingUp, Receipt, RefreshCw, Activity } from "lucide-react";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, SectionCard, FilterBar, EmptyState } from "@/components/shared";
import {
  mockRevenueTransactions,
  revenueOverTime,
  revenueByStation,
  revenueByMachine,
  transactionTypeBreakdown,
  STATIONS,
  MACHINES,
  TRANSACTION_TYPES,
} from "@/data/revenueData";

const RevenuePage = () => {
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [machineFilter, setMachineFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    return mockRevenueTransactions.filter((t) => {
      if (search && !t.rentalCode.toLowerCase().includes(search.toLowerCase()) && !t.phoneNumber.includes(search) && !t.mpesaReceipt.toLowerCase().includes(search.toLowerCase())) return false;
      if (stationFilter !== "all" && t.station !== stationFilter) return false;
      if (machineFilter !== "all" && t.machine !== machineFilter) return false;
      if (typeFilter !== "all" && t.transactionType !== typeFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [search, stationFilter, machineFilter, typeFilter, statusFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey as keyof typeof a];
      const bv = b[sortKey as keyof typeof b];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const completedTx = mockRevenueTransactions.filter((t) => t.status === "completed");
  const totalRevenue = completedTx.filter((t) => t.transactionType === "rental_charge" || t.transactionType === "penalty").reduce((s, t) => s + t.amount, 0);
  const rentalCharges = completedTx.filter((t) => t.transactionType === "rental_charge").reduce((s, t) => s + t.amount, 0);
  const deposits = completedTx.filter((t) => t.transactionType === "deposit").reduce((s, t) => s + t.amount, 0);
  const refunds = completedTx.filter((t) => t.transactionType === "refund").reduce((s, t) => s + t.amount, 0);

  const typeLabel = (t: string) => t.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const columns = [
    { key: "date", label: "Date" },
    { key: "rentalCode", label: "Rental Code" },
    { key: "station", label: "Station" },
    { key: "machine", label: "Machine" },
    { key: "transactionType", label: "Type" },
    { key: "amount", label: "Amount" },
    { key: "mpesaReceipt", label: "M-Pesa Receipt" },
    { key: "phoneNumber", label: "Phone" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Visibility" description="Track all revenue streams across stations and machines" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Revenue" value={totalRevenue.toLocaleString()} prefix="KES " change={12.5} icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Rental Charges" value={rentalCharges.toLocaleString()} prefix="KES " icon={<Receipt className="h-5 w-5" />} />
        <MetricCard title="Deposits" value={deposits.toLocaleString()} prefix="KES " icon={<DollarSign className="h-5 w-5" />} />
        <MetricCard title="Refunds" value={refunds.toLocaleString()} prefix="KES " icon={<RefreshCw className="h-5 w-5" />} />
        <MetricCard title="Active Rentals" value={2} icon={<Activity className="h-5 w-5" />} />
        <MetricCard title="Completed" value={5} change={8} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue Over Time">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Revenue by Station">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByStation}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="station" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Revenue by Machine">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByMachine} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="machine" type="category" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={60} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard title="Transaction Type Breakdown">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={transactionTypeBreakdown} dataKey="value" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}>
                {transactionTypeBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by code, phone, or receipt...">
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Station" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stations</SelectItem>
            {STATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Machine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Machines</SelectItem>
            {MACHINES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TRANSACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground">
                  <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 text-foreground whitespace-nowrap">{t.date}</td>
                <td className="px-4 py-3 text-foreground font-mono text-xs">{t.rentalCode}</td>
                <td className="px-4 py-3 text-foreground">{t.station}</td>
                <td className="px-4 py-3 text-foreground">{t.machine}</td>
                <td className="px-4 py-3 text-foreground capitalize">{typeLabel(t.transactionType)}</td>
                <td className="px-4 py-3 text-foreground font-medium">KES {t.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-foreground font-mono text-xs">{t.mpesaReceipt}</td>
                <td className="px-4 py-3 text-foreground">{t.phoneNumber}</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={9}><EmptyState title="No transactions found" description="Try adjusting your filters" /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RevenuePage;
