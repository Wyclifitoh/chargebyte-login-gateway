// Phase 6 — Agent Performance page
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, TrendingUp, ClipboardCheck, Search, Users } from "lucide-react";
import { api } from "@/services/api";
import { formatDateTime, formatKsh, formatNumber } from "@/lib/format";
import MetricCard from "@/components/MetricCard";

interface AgentRow {
  id: string; name: string; email: string; role: string; category: string | null;
  days_worked: number; hours_worked: number; on_time_days: number; late_days: number;
  rentals: number; returns: number; revenue: number; reports: number;
  tickets_total: number; tickets_resolved: number;
  attendance_rate: number; punctuality_rate: number; avg_hours: number; score: number;
}

interface AgentDay {
  date: string; first_in: string | null; last_out: string | null;
  location: string | null; hours: number | null;
}

interface AgentReport {
  id: string; report_date: string; location: string;
  rentals_auto: number; returns_auto: number; pending_auto: number;
  machine_cleanliness: string | null; submitted_at: string | null; created_at: string;
}

const scoreColor = (n: number) =>
  n >= 80 ? "bg-green-100 text-green-800" :
  n >= 60 ? "bg-yellow-100 text-yellow-800" :
  n >= 40 ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800";

const PerformancePage = () => {
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AgentRow | null>(null);
  const [detail, setDetail] = useState<{ days: AgentDay[]; reports: AgentReport[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.performance.leaderboard({ days: range }).then((res) => {
      if (!alive) return;
      setRows(((res.data as AgentRow[]) || []));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [range]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setDetailLoading(true);
    api.performance.agent(selected.id, { days: range }).then((res) => {
      const d = res.data as { days: AgentDay[]; reports: AgentReport[] } | null;
      setDetail(d);
      setDetailLoading(false);
    });
  }, [selected, range]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.category || "").toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => {
    const n = rows.length || 1;
    return {
      agents: rows.length,
      avgAttendance: Math.round(rows.reduce((s, r) => s + r.attendance_rate, 0) / n),
      avgPunctuality: Math.round(rows.reduce((s, r) => s + r.punctuality_rate, 0) / n),
      totalRentals: rows.reduce((s, r) => s + r.rentals, 0),
      totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      totalReports: rows.reduce((s, r) => s + r.reports, 0),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Performance"
        description="Attendance, punctuality, rentals handled and daily reports per field agent."
        actions={
          <Select value={range} onValueChange={(v) => setRange(v as "7" | "30" | "90")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Agents" value={totals.agents} icon={<Users className="h-4 w-4" />} />
        <MetricCard title="Avg Attendance" value={`${totals.avgAttendance}%`} icon={<ClipboardCheck className="h-4 w-4" />} />
        <MetricCard title="Avg Punctuality" value={`${totals.avgPunctuality}%`} icon={<Clock className="h-4 w-4" />} />
        <MetricCard title="Rentals Handled" value={totals.totalRentals} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <SectionCard
        title="Leaderboard"
        description={`Ranked by composite score across ${range} days`}
        actions={
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search agent…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        }
      >
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No agent activity" description="No approved clock-in events in the selected range." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Attendance</TableHead>
                  <TableHead className="text-right">Punctuality</TableHead>
                  <TableHead className="text-right">Rentals</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Reports</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                    <TableCell className="font-medium">
                      {i === 0 ? <Trophy className="h-4 w-4 text-yellow-500" /> : i + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.category || r.role} · {r.email}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={scoreColor(r.score)}>{r.score}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.days_worked}</TableCell>
                    <TableCell className="text-right">{r.hours_worked.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{r.attendance_rate}%</TableCell>
                    <TableCell className="text-right">{r.punctuality_rate}%</TableCell>
                    <TableCell className="text-right">{formatNumber(r.rentals)}</TableCell>
                    <TableCell className="text-right">{formatKsh(r.revenue)}</TableCell>
                    <TableCell className="text-right">{r.reports}</TableCell>
                    <TableCell className="text-right">
                      {r.tickets_total ? `${r.tickets_resolved}/${r.tickets_total}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name} — Performance Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? <LoadingState /> : detail && selected ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Composite Score</p>
                  <p className="text-xl font-bold">{selected.score}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg Hours / Day</p>
                  <p className="text-xl font-bold">{selected.avg_hours}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">On-Time / Late</p>
                  <p className="text-xl font-bold">{selected.on_time_days} / {selected.late_days}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Revenue Handled</p>
                  <p className="text-xl font-bold">{formatKsh(selected.revenue)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Daily Shifts</h3>
                {detail.days.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shifts recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Clock In</TableHead>
                          <TableHead>Clock Out</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.days.map((d) => (
                          <TableRow key={d.date}>
                            <TableCell>{d.date}</TableCell>
                            <TableCell>{d.location || "—"}</TableCell>
                            <TableCell>{d.first_in ? formatDateTime(d.first_in) : "—"}</TableCell>
                            <TableCell>{d.last_out ? formatDateTime(d.last_out) : "—"}</TableCell>
                            <TableCell className="text-right">{d.hours?.toFixed(1) ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Submitted Reports ({detail.reports.length})</h3>
                {detail.reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No daily reports in this range.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Rentals</TableHead>
                          <TableHead className="text-right">Returns</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead>Cleanliness</TableHead>
                          <TableHead>Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.reports.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>{r.report_date}</TableCell>
                            <TableCell>{r.location}</TableCell>
                            <TableCell className="text-right">{r.rentals_auto}</TableCell>
                            <TableCell className="text-right">{r.returns_auto}</TableCell>
                            <TableCell className="text-right">{r.pending_auto}</TableCell>
                            <TableCell className="capitalize">{r.machine_cleanliness || "—"}</TableCell>
                            <TableCell>{formatDateTime(r.submitted_at || r.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformancePage;
