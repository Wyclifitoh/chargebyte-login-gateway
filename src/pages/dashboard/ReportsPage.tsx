import { useEffect, useMemo, useState, useCallback } from "react";
import { FileText, Save, Trash2, Plus, Download, DollarSign, Users, MapPin, LifeBuoy, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { downloadCsv, type CsvColumn } from "@/lib/csv";
import type { DailyReport, Station, Rental } from "@/types/dashboard";

// ---------- helpers ----------
function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", year: "numeric", month: "short", day: "2-digit" }); }
  catch { return iso; }
}
function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const hh = d.toLocaleString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", "");
    return `${hh}hrs`;
  } catch { return iso; }
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return iso; }
}
const money = (n: number | string | null | undefined) =>
  `Ksh ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, days: number) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
};

type Preset = "today" | "7d" | "30d" | "mtd" | "custom";
function applyPreset(p: Preset): { from: string; to: string } {
  const t = today();
  const now = new Date();
  switch (p) {
    case "today": return { from: t, to: t };
    case "7d": return { from: addDays(t, -6), to: t };
    case "30d": return { from: addDays(t, -29), to: t };
    case "mtd": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { from: first, to: t };
    }
    default: return { from: "", to: "" };
  }
}

// ---------- Date range filter (shared) ----------
function DateFilter({ preset, from, to, onChange }: {
  preset: Preset; from: string; to: string;
  onChange: (p: Preset, from: string, to: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg p-4">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Range</label>
        <Select value={preset} onValueChange={(v) => {
          const p = v as Preset;
          const r = applyPreset(p);
          onChange(p, r.from, r.to);
        }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="mtd">Month to date</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">From</label>
        <Input type="date" value={from} onChange={(e) => onChange("custom", e.target.value, to)} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">To</label>
        <Input type="date" value={to} onChange={(e) => onChange("custom", from, e.target.value)} />
      </div>
    </div>
  );
}

// ---------- Tab: Shifts (Daily Reports) ----------
const emptyForm = {
  report_date: today(),
  station_id: "",
  location: "",
  rentals: 0,
  returns: 0,
  pending_returns: 0,
  powerbanks_arrival: 0,
  powerbanks_departure: 0,
  notes: "",
};

function ShiftsTab({ isAdmin, isSuperAdmin }: { isAdmin: boolean; isSuperAdmin: boolean }) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<DailyReport | null>(null);
  const [preset, setPreset] = useState<Preset>("30d");
  const initial = applyPreset("30d");
  const [dateFrom, setDateFrom] = useState(initial.from);
  const [dateTo, setDateTo] = useState(initial.to);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    const res = await api.clockin.reports.list(params);
    if (res.success) setReports((res.data as DailyReport[]) || []);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.stations.getAll().then((r) => { if (r.success) setStations((r.data as Station[]) || []); });
  }, []);

  const stationName = (id?: string | null) => stations.find((s) => s.id === id)?.name || "";
  const totals = useMemo(() => reports.reduce((a, r) => ({
    rentals: a.rentals + Number(r.rentals || 0),
    returns: a.returns + Number(r.returns || 0),
    pending: a.pending + Number(r.pending_returns || 0),
  }), { rentals: 0, returns: 0, pending: 0 }), [reports]);

  const openNew = () => { setForm({ ...emptyForm, report_date: today() }); setDialogOpen(true); };

  const submit = async () => {
    if (!form.location.trim()) { toast.error("Location is required"); return; }
    setSubmitting(true);
    try {
      const res = await api.clockin.reports.upsert(form);
      if (res.success) { toast.success("Report saved"); setDialogOpen(false); load(); }
      else toast.error(res.error || "Failed");
    } finally { setSubmitting(false); }
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.clockin.reports.remove(confirmDel.id);
    if (res.success) { toast.success("Removed"); load(); }
    else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  const exportCsv = () => {
    if (!reports.length) { toast.error("Nothing to export"); return; }
    downloadCsv(`shift-reports-${dateFrom || "all"}-${dateTo || today()}`, reports, [
      { key: "report_date", label: "Date", format: (r) => fmtDate(r.report_date) },
      { key: "agent_name", label: "Agent" },
      { key: "location", label: "Location" },
      { key: "rentals", label: "Rentals" },
      { key: "returns", label: "Returns" },
      { key: "pending_returns", label: "Pending" },
      { key: "powerbanks_arrival", label: "PB Arrival" },
      { key: "powerbanks_departure", label: "PB Departure" },
      { key: "time_in", label: "Time In", format: (r) => fmtTime(r.time_in) },
      { key: "time_out", label: "Time Out", format: (r) => fmtTime(r.time_out) },
      { key: "notes", label: "Notes" },
    ]);
    toast.success(`Exported ${reports.length} reports`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <DateFilter preset={preset} from={dateFrom} to={dateTo}
          onChange={(p, f, t) => { setPreset(p); setDateFrom(f); setDateTo(t); }} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!reports.length}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Rentals</p>
          <p className="text-2xl font-bold">{totals.rentals}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Returns</p>
          <p className="text-2xl font-bold">{totals.returns}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{totals.pending}</p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : reports.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6 text-muted-foreground" />} title="No reports in range" description={isAdmin ? "Try widening the date range." : "Submit your first daily report when you clock out."} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Agent</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-right px-3 py-2">Rentals</th>
                <th className="text-right px-3 py-2">Returns</th>
                <th className="text-right px-3 py-2">Pending</th>
                <th className="text-right px-3 py-2">PB Arrival</th>
                <th className="text-right px-3 py-2">PB Departure</th>
                <th className="text-left px-3 py-2">Time In</th>
                <th className="text-left px-3 py-2">Time Out</th>
                {isSuperAdmin && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{fmtDate(r.report_date)}</td>
                  <td className="px-3 py-2 font-medium">{r.agent_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.location}
                    {r.station_id && stationName(r.station_id) && stationName(r.station_id) !== r.location && (
                      <span className="text-xs"> · {stationName(r.station_id)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.rentals}
                    {r.rentals_auto ? <span className="block text-xs text-muted-foreground">auto: {r.rentals_auto}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right">{r.returns}</td>
                  <td className="px-3 py-2 text-right">
                    {r.pending_returns > 0 ? <Badge variant="destructive">{r.pending_returns}</Badge> : 0}
                  </td>
                  <td className="px-3 py-2 text-right">{r.powerbanks_arrival}</td>
                  <td className="px-3 py-2 text-right">{r.powerbanks_departure}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtTime(r.time_in)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtTime(r.time_out)}</td>
                  {isSuperAdmin && (
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDel(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Daily Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Station</label>
                <Select
                  value={form.station_id}
                  onValueChange={(v) => {
                    const s = stations.find((x) => x.id === v);
                    setForm({ ...form, station_id: v, location: s?.name || form.location });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Choose station" /></SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Location label</label>
              <Input placeholder="e.g. Pins/Alloy" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Rentals</label>
                <Input type="number" min={0} value={form.rentals} onChange={(e) => setForm({ ...form, rentals: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Returns</label>
                <Input type="number" min={0} value={form.returns} onChange={(e) => setForm({ ...form, returns: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pending Returns</label>
                <Input type="number" min={0} value={form.pending_returns} onChange={(e) => setForm({ ...form, pending_returns: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Powerbanks on Arrival</label>
                <Input type="number" min={0} value={form.powerbanks_arrival} onChange={(e) => setForm({ ...form, powerbanks_arrival: parseInt(e.target.value || "0", 10) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Powerbanks on Departure</label>
                <Input type="number" min={0} value={form.powerbanks_departure} onChange={(e) => setForm({ ...form, powerbanks_departure: parseInt(e.target.value || "0", 10) })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">Time in/out are pulled automatically from your clock-in/out for the day.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}><Save className="h-4 w-4 mr-2" />{submitting ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete this report?"
        description={`Report from ${confirmDel ? fmtDate(confirmDel.report_date) : ""} (${confirmDel?.location}) will be permanently removed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={remove}
      />
    </div>
  );
}

// ---------- Generic date-range report tab (Revenue / Agents / Stations / Support) ----------
type DatasetRow = Record<string, unknown>;
interface KpiTile { label: string; value: string }

function ReportTab<T extends DatasetRow>({
  fetcher, columns, kpis, filenamePrefix, emptyText,
}: {
  fetcher: (from: string, to: string) => Promise<T[]>;
  columns: CsvColumn<T>[];
  kpis?: (rows: T[]) => KpiTile[];
  filenamePrefix: string;
  emptyText: string;
}) {
  const [preset, setPreset] = useState<Preset>("30d");
  const initial = applyPreset("30d");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher(from, to)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((e) => { console.error(e); toast.error("Failed to load report"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, fetcher]);

  const tiles = kpis?.(rows) ?? [];

  const exportCsv = () => {
    if (!rows.length) { toast.error("Nothing to export"); return; }
    downloadCsv(`${filenamePrefix}-${from || "all"}-${to || today()}`, rows, columns);
    toast.success(`Exported ${rows.length} rows`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <DateFilter preset={preset} from={from} to={to}
          onChange={(p, f, t) => { setPreset(p); setFrom(f); setTo(t); }} />
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {tiles.length > 0 && (
        <div className={`grid gap-3 grid-cols-2 md:grid-cols-${Math.min(tiles.length, 4)}`}>
          {tiles.map((t) => (
            <div key={t.label} className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-2xl font-bold">{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} columns={columns.length} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6 text-muted-foreground" />} title="No data in range" description={emptyText} />
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {columns.map((c) => <th key={String(c.key)} className="text-left px-3 py-2">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c) => {
                    const raw = c.format ? c.format(r) : (r as Record<string, unknown>)[c.key as string];
                    return <td key={String(c.key)} className="px-3 py-2">{raw as React.ReactNode ?? "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Fetchers ----------
async function fetchRentals(from: string, to: string): Promise<Rental[]> {
  const params: Record<string, string> = { limit: "1000" };
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.rentals.getAll(params);
  return res.success ? ((res.data as Rental[]) || []) : [];
}

interface PerfRow { user_id: string; name: string; email: string; shifts: number; hours: number; rentals: number; reports: number; tickets_resolved: number; score: number }
async function fetchPerformance(from: string, to: string): Promise<PerfRow[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.performance.leaderboard(params);
  return res.success ? ((res.data as PerfRow[]) || []) : [];
}

interface StationRow { station_id: string; station_name: string; rentals: number; revenue: number; deposits: number; refunds: number }
async function fetchStationBreakdown(from: string, to: string): Promise<StationRow[]> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.revenue.byStation(params);
  return res.success ? ((res.data as StationRow[]) || []) : [];
}

interface SupportRow { id: string; ticket_number: string; subject: string; priority: string; status: string; category: string; requester_name?: string; assignee_name?: string; created_at: string; resolved_at?: string | null; sla_due_at?: string | null }
async function fetchSupport(from: string, to: string): Promise<SupportRow[]> {
  const params: Record<string, string | number> = { limit: 1000 };
  if (from) params.from = from;
  if (to) params.to = to;
  const res = await api.support.list(params);
  return res.success ? ((res.data as SupportRow[]) || []) : [];
}

// ---------- Main Page ----------
const ReportsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports Hub"
        description="Cross-module operational, financial, and team reports with CSV export"
      />

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="shifts"><ClipboardList className="h-4 w-4 mr-2" />Shifts</TabsTrigger>
          {isAdmin && <TabsTrigger value="revenue"><DollarSign className="h-4 w-4 mr-2" />Revenue</TabsTrigger>}
          {isAdmin && <TabsTrigger value="agents"><Users className="h-4 w-4 mr-2" />Agents</TabsTrigger>}
          {isAdmin && <TabsTrigger value="stations"><MapPin className="h-4 w-4 mr-2" />Stations</TabsTrigger>}
          {isAdmin && <TabsTrigger value="support"><LifeBuoy className="h-4 w-4 mr-2" />Support</TabsTrigger>}
        </TabsList>

        <TabsContent value="shifts">
          <ShiftsTab isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="revenue">
            <ReportTab<Rental>
              fetcher={fetchRentals}
              filenamePrefix="revenue-rentals"
              emptyText="No rentals in this date range."
              kpis={(rows) => {
                const rev = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
                const dep = rows.reduce((s, r) => s + Number(r.deposit_amount || 0), 0);
                const ref = rows.reduce((s, r) => s + (r.deposit_refunded ? Number(r.deposit_amount || 0) : 0), 0);
                return [
                  { label: "Rentals", value: String(rows.length) },
                  { label: "Net Revenue", value: money(rev) },
                  { label: "Deposits", value: money(dep) },
                  { label: "Refunds", value: money(ref) },
                ];
              }}
              columns={[
                { key: "rental_code", label: "Rental" },
                { key: "phone_number", label: "Phone" },
                { key: "machine_model", label: "Machine" },
                { key: "manufacturer_trade_no", label: "Serial" },
                { key: "start_time", label: "Start", format: (r) => fmtDateTime(r.start_time) },
                { key: "end_time", label: "End", format: (r) => fmtDateTime(r.end_time) },
                { key: "duration_minutes", label: "Minutes" },
                { key: "total_amount", label: "Revenue", format: (r) => Number(r.total_amount || 0) },
                { key: "deposit_amount", label: "Deposit", format: (r) => Number(r.deposit_amount || 0) },
                { key: "deposit_refunded", label: "Refunded", format: (r) => (r.deposit_refunded ? "Yes" : "No") },
                { key: "status", label: "Status" },
              ]}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="agents">
            <ReportTab<PerfRow>
              fetcher={fetchPerformance}
              filenamePrefix="agent-performance"
              emptyText="No agent activity in this date range."
              kpis={(rows) => {
                const totalHours = rows.reduce((s, r) => s + Number(r.hours || 0), 0);
                const totalRentals = rows.reduce((s, r) => s + Number(r.rentals || 0), 0);
                const avg = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.score || 0), 0) / rows.length) : 0;
                return [
                  { label: "Agents", value: String(rows.length) },
                  { label: "Total Hours", value: totalHours.toFixed(1) },
                  { label: "Rentals Handled", value: String(totalRentals) },
                  { label: "Avg Score", value: `${avg}/100` },
                ];
              }}
              columns={[
                { key: "name", label: "Agent" },
                { key: "email", label: "Email" },
                { key: "shifts", label: "Shifts" },
                { key: "hours", label: "Hours", format: (r) => Number(r.hours || 0).toFixed(1) },
                { key: "rentals", label: "Rentals" },
                { key: "reports", label: "Reports" },
                { key: "tickets_resolved", label: "Tickets" },
                { key: "score", label: "Score", format: (r) => `${r.score}/100` },
              ]}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="stations">
            <ReportTab<StationRow>
              fetcher={fetchStationBreakdown}
              filenamePrefix="station-performance"
              emptyText="No station activity in this date range."
              kpis={(rows) => {
                const rev = rows.reduce((s, r) => s + Number(r.revenue || 0), 0);
                const rentals = rows.reduce((s, r) => s + Number(r.rentals || 0), 0);
                return [
                  { label: "Stations", value: String(rows.length) },
                  { label: "Total Rentals", value: String(rentals) },
                  { label: "Total Revenue", value: money(rev) },
                ];
              }}
              columns={[
                { key: "station_name", label: "Station" },
                { key: "rentals", label: "Rentals" },
                { key: "revenue", label: "Revenue", format: (r) => Number(r.revenue || 0) },
                { key: "deposits", label: "Deposits", format: (r) => Number(r.deposits || 0) },
                { key: "refunds", label: "Refunds", format: (r) => Number(r.refunds || 0) },
              ]}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="support">
            <ReportTab<SupportRow>
              fetcher={fetchSupport}
              filenamePrefix="support-tickets"
              emptyText="No tickets in this date range."
              kpis={(rows) => {
                const open = rows.filter((r) => r.status !== "resolved" && r.status !== "closed").length;
                const resolved = rows.filter((r) => r.status === "resolved" || r.status === "closed").length;
                const breaches = rows.filter((r) => r.sla_due_at && !r.resolved_at && new Date(r.sla_due_at) < new Date()).length;
                return [
                  { label: "Total", value: String(rows.length) },
                  { label: "Open", value: String(open) },
                  { label: "Resolved", value: String(resolved) },
                  { label: "SLA Breaches", value: String(breaches) },
                ];
              }}
              columns={[
                { key: "ticket_number", label: "Ticket" },
                { key: "subject", label: "Subject" },
                { key: "category", label: "Category" },
                { key: "priority", label: "Priority" },
                { key: "status", label: "Status" },
                { key: "requester_name", label: "Requester" },
                { key: "assignee_name", label: "Assignee" },
                { key: "created_at", label: "Created", format: (r) => fmtDateTime(r.created_at) },
                { key: "sla_due_at", label: "SLA Due", format: (r) => fmtDateTime(r.sla_due_at) },
                { key: "resolved_at", label: "Resolved", format: (r) => fmtDateTime(r.resolved_at) },
              ]}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ReportsPage;
