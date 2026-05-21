import { useEffect, useMemo, useState } from "react";
import { FileText, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyReport, Station } from "@/types/dashboard";

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

const today = () => new Date().toISOString().slice(0, 10);

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

const ReportsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const isSuperAdmin = user?.role === "super_admin";
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<DailyReport | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    const res = await api.clockin.reports.list(params);
    if (res.success) setReports((res.data as DailyReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    api.stations.getAll().then((r) => { if (r.success) setStations((r.data as Station[]) || []); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const stationName = (id?: string | null) => stations.find((s) => s.id === id)?.name || "";

  const open = () => {
    setForm({ ...emptyForm, report_date: today() });
    setDialogOpen(true);
  };

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

  const totals = useMemo(() => reports.reduce((acc, r) => ({
    rentals: acc.rentals + Number(r.rentals || 0),
    returns: acc.returns + Number(r.returns || 0),
    pending: acc.pending + Number(r.pending_returns || 0),
  }), { rentals: 0, returns: 0, pending: 0 }), [reports]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Reports"
        description={isAdmin ? "Agent shift reports across all stations" : "Your daily shift reports"}
        actions={
          <Button onClick={open}><Plus className="h-4 w-4 mr-2" />New Report</Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-lg p-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-4 text-sm">
          <div><span className="text-muted-foreground">Rentals</span> <span className="font-bold">{totals.rentals}</span></div>
          <div><span className="text-muted-foreground">Returns</span> <span className="font-bold">{totals.returns}</span></div>
          <div><span className="text-muted-foreground">Pending</span> <span className="font-bold">{totals.pending}</span></div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : reports.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6 text-muted-foreground" />} title="No reports yet" description="Submit your first daily report when you clock out." />
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
};

export default ReportsPage;
