import { useEffect, useMemo, useState } from "react";
import { Plus, Search, MapPin, Locate, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

interface FieldActivity {
  id: string; user_id: string; user_name?: string; department?: string | null;
  activity_type: string; station_id?: string | null; station_name?: string | null;
  client_name?: string | null; location?: string | null;
  latitude?: number | null; longitude?: number | null;
  check_in_at?: string | null; check_out_at?: string | null;
  activities?: string | null; findings?: string | null;
  issues?: string | null; recommendations?: string | null;
  activity_date: string; created_at: string;
}

const ACTIVITY_TYPES = ["Station Visit", "Client Meeting", "Maintenance", "Installation", "Inspection", "Delivery", "Survey", "Other"];

const emptyForm = {
  activity_date: new Date().toISOString().slice(0, 10),
  activity_type: "Station Visit", department: "", client_name: "",
  location: "", latitude: "" as string, longitude: "" as string,
  check_in_at: "", check_out_at: "", activities: "", findings: "",
  issues: "", recommendations: "",
};

const FieldActivitiesPage = () => {
  const { user } = useAuth();
  const isPriv = user?.role === "super_admin" || user?.role === "admin";
  const [rows, setRows] = useState<FieldActivity[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FieldActivity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<FieldActivity | null>(null);

  const load = async () => {
    setLoading(true);
    const [d, dept] = await Promise.all([api.ops.fieldActivities.list(), api.ops.departments()]);
    if (d.success) setRows(d.data as FieldActivity[]);
    if (dept.success) setDepartments(dept.data as string[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (typeFilter && r.activity_type !== typeFilter) return false;
    if (search) {
      const hay = `${r.activity_type} ${r.location || ""} ${r.client_name || ""} ${r.station_name || ""} ${r.user_name || ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, typeFilter, search]);

  const captureGPS = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not available"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm((f) => ({ ...f, latitude: String(p.coords.latitude), longitude: String(p.coords.longitude) })); toast.success("Location captured"); },
      () => toast.error("Could not get location"),
    );
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, check_in_at: new Date().toISOString().slice(0, 16) }); setOpen(true); };
  const openEdit = (r: FieldActivity) => {
    setEditing(r);
    setForm({
      activity_date: r.activity_date.slice(0, 10), activity_type: r.activity_type,
      department: r.department || "", client_name: r.client_name || "",
      location: r.location || "", latitude: r.latitude ? String(r.latitude) : "",
      longitude: r.longitude ? String(r.longitude) : "",
      check_in_at: r.check_in_at ? r.check_in_at.slice(0, 16) : "",
      check_out_at: r.check_out_at ? r.check_out_at.slice(0, 16) : "",
      activities: r.activities || "", findings: r.findings || "",
      issues: r.issues || "", recommendations: r.recommendations || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    const payload = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      check_in_at: form.check_in_at || null,
      check_out_at: form.check_out_at || null,
    };
    const res = editing ? await api.ops.fieldActivities.update(editing.id, payload) : await api.ops.fieldActivities.create(payload);
    setSubmitting(false);
    if (res.success) { toast.success("Saved"); setOpen(false); load(); }
    else toast.error(res.error || "Failed");
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.ops.fieldActivities.remove(confirmDel.id);
    if (res.success) { toast.success("Deleted"); load(); } else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Activities"
        description="Track visits, check-ins, and on-site work across all locations."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Log Activity</Button>}
      />

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search activity, client, location…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter || "__all__"} onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All activity types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All activity types</SelectItem>
            {ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState title="No field activities yet" description="Log your first visit or check-in." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Log Activity</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{r.activity_type}</Badge>
                    {r.department && <span className="text-xs text-muted-foreground">· {r.department}</span>}
                  </div>
                  <div className="font-semibold text-sm text-foreground mt-1">{r.station_name || r.client_name || r.location || "—"}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />{r.location || "No address"} · {new Date(r.activity_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">By {r.user_name || "—"}</div>
                  {r.activities && <p className="text-xs text-foreground mt-2 line-clamp-2">{r.activities}</p>}
                  {r.issues && <p className="text-xs text-rose-600 mt-1"><span className="font-semibold">Issues:</span> {r.issues}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  {(isPriv || r.user_id === user?.id) && <Button variant="ghost" size="icon" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Field Activity" : "Log Field Activity"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} /></div>
              <div>
                <Label>Activity Type</Label>
                <Select value={form.activity_type} onValueChange={(v) => setForm({ ...form, activity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Department</Label>
                <Select value={form.department || "__none__"} onValueChange={(v) => setForm({ ...form, department: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Client / Contact</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Address or place" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Latitude</Label><Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
              <div><Label>Longitude</Label><Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={captureGPS}><Locate className="h-4 w-4 mr-1" /> Use my current location</Button>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check-in</Label><Input type="datetime-local" value={form.check_in_at} onChange={(e) => setForm({ ...form, check_in_at: e.target.value })} /></div>
              <div><Label>Check-out</Label><Input type="datetime-local" value={form.check_out_at} onChange={(e) => setForm({ ...form, check_out_at: e.target.value })} /></div>
            </div>
            <div><Label>Activities Performed</Label><Textarea rows={2} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} /></div>
            <div><Label>Findings</Label><Textarea rows={2} value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} /></div>
            <div><Label>Issues</Label><Textarea rows={2} value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} /></div>
            <div><Label>Recommendations</Label><Textarea rows={2} value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete activity?" description="This cannot be undone." onConfirm={remove} confirmLabel="Delete" variant="destructive" />
    </div>
  );
};

export default FieldActivitiesPage;