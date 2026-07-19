import { useEffect, useState } from "react";
import { Building2, Cpu, Wallet, TrendingUp } from "lucide-react";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/services/api";
import { formatKsh } from "@/lib/format";

interface DashData {
  partner: { name: string; email: string; partner_code?: string; status?: string;
    agreement_type?: string; revenue_share_percent?: number; fixed_amount?: number;
    disbursement_frequency?: string; disbursement_day?: number };
  stations?: Array<{ id: string; station_id: string; station_name?: string; station_address?: string; assigned_at: string; unassigned_at?: string | null }>;
  machines: Array<{ deployment_id?: string; id: string; name: string; model: string; status: string; station_name?: string; deployed_at?: string }>;
  rentals: Array<{ id: string; rental_code: string; station_name?: string; total_amount: number; status: string; created_at: string }>;
  disbursements: Array<{ id: string; period_start: string; period_end: string; amount_payable: number; status: string; station_name?: string; paid_at?: string | null }>;
  revenue: { total_revenue: number; total_rentals: number; month_revenue: number; month_rentals: number };
  pending_payouts: number;
  paid_payouts: number;
}

const PartnerDashboardPage = () => {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const res = await api.partners.myDashboard();
    if (res.success) setData(res.data as DashData);
    else setError(res.error || "Failed to load");
  };
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState title="Couldn't load dashboard" message={error} onRetry={load} />;
  if (!data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${data.partner.name}`}
        description={data.partner.agreement_type === "fixed_rent"
          ? `Fixed payout ${formatKsh(Number(data.partner.fixed_amount || 0))} · ${data.partner.disbursement_frequency}`
          : `${Number(data.partner.revenue_share_percent ?? 0)}% revenue share · ${data.partner.disbursement_frequency}`} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Revenue" value={formatKsh(data.revenue.total_revenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Total Rentals" value={data.revenue.total_rentals} icon={<Cpu className="h-5 w-5" />} />
        <MetricCard title="This Month" value={formatKsh(data.revenue.month_revenue)} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Pending Payouts" value={formatKsh(data.pending_payouts)} icon={<Wallet className="h-5 w-5" />} />
        <MetricCard title="Paid Payouts" value={formatKsh(data.paid_payouts)} icon={<Wallet className="h-5 w-5" />} />
        <MetricCard title="Deployed Machines" value={data.machines.length} icon={<Cpu className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
            <Cpu className="h-4 w-4" />Deployed Machines
          </div>
          <div className="divide-y divide-border">
            {data.machines.length === 0 && <div className="p-4 text-sm text-muted-foreground">No machines deployed to you yet.</div>}
            {data.machines.map((m) => (
              <div key={m.deployment_id || m.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.model}{m.station_name ? ` · ${m.station_name}` : ""}{m.deployed_at ? ` · deployed ${new Date(m.deployed_at).toLocaleDateString()}` : ""}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4" />Payment History
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Period</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Station</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Paid on</th>
          </tr></thead>
          <tbody>
            {data.disbursements.length === 0 && <tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">No disbursements yet.</td></tr>}
            {data.disbursements.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs">{d.period_start} → {d.period_end}</td>
                <td className="px-4 py-3">{d.station_name || "—"}</td>
                <td className="px-4 py-3 font-semibold">{formatKsh(Number(d.amount_payable))}</td>
                <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-3 text-xs">{d.paid_at ? new Date(d.paid_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4" />Recent Rentals
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Code</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Station</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
            <th className="px-4 py-3 text-left text-muted-foreground font-medium">Date</th>
          </tr></thead>
          <tbody>
            {data.rentals.length === 0 && <tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">No rentals yet.</td></tr>}
            {data.rentals.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{r.rental_code}</td>
                <td className="px-4 py-3">{r.station_name}</td>
                <td className="px-4 py-3">{formatKsh(Number(r.total_amount))}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnerDashboardPage;