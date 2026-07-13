import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
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

interface DailyUpdate {
  id: string; user_id: string; user_name?: string | null; department?: string | null;
  position?: string | null; update_date: string; work_summary?: string | null;
  tasks_completed?: string | null; challenges?: string | null;
  assistance_required?: string | null; tomorrow_plan?: string | null;
  status: "draft" | "submitted"; created_at: string;
}

const emptyForm = {
  update_date: new Date().toISOString().slice(0, 10),
  department: "", position: "", work_summary: "", tasks_completed: "",
  challenges: "", assistance_required: "", tomorrow_plan: "", status: "draft" as "draft" | "submitted",
};

const DailyUpdatesPage = () => {
  const { user } = useAuth();
  const isPriv = user?.role === "super_admin" || user?.role === "admin";
  const [rows, setRows] = useState<DailyUpdate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailyUpdate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<DailyUpdate | null>(null);

  const load = async () => {
    setLoading(true);
    const [d, dept] = await Promise.all([api.ops.dailyUpdates.list(), api.ops.departments()]);
    if (d.success) setRows(d.data as DailyUpdate[]);
    if (dept.success) setDepartments(dept.data as string[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const hay = `${r.work_summary || ""} ${r.tasks_completed || ""} ${r.user_name || ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, deptFilter, statusFilter, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: DailyUpdate) => {
    setEditing(r);
    setForm({
      update_date: r.update_date.slice(0, 10),
      department: r.department || "", position: r.position || "",
      work_summary: r.work_summary || "", tasks_completed: r.tasks_completed || "",
      challenges: r.challenges || "", assistance_required: r.assistance_required || "",
      tomorrow_plan: r.tomorrow_plan || "", status: r.status,
    });
    setOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    const res = editing ? await api.ops.dailyUpdates.update(editing.id, form) : await api.ops.dailyUpdates.create(form);
    setSubmitting(false);
    if (res.success) { toast.success(editing ? "Update saved" : "Update submitted"); setOpen(false); load(); }
    else toast.error(res.error || "Save failed");
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.ops.dailyUpdates.remove(confirmDel.id);
    if (res.success) { toast.success("Deleted"); load(); } else toast.error(res.error || "Delete failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Updates"
        description={isPriv ? "All employee daily updates across departments." : "Submit and manage your daily operational updates."}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Update</Button>}
      />

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search summaries, tasks, employee…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={deptFilter || "__all__"} onValueChange={(v) => setDeptFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Any status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Any status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState title="No daily updates yet" description="Share what you're working on to keep the team aligned." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Update</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{r.user_name || "You"}</span>
                    {r.department && <Badge variant="outline" className="text-[10px]">{r.department}</Badge>}
                    <Badge className={`text-[10px] ${r.status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.update_date).toLocaleDateString()}</span>
                  </div>
                  {r.work_summary && <p className="text-sm text-foreground mt-2">{r.work_summary}</p>}
                  <div className="grid gap-2 mt-2 md:grid-cols-2 text-xs">
                    {r.tasks_completed && <div><span className="font-semibold text-foreground">Completed:</span> <span className="text-muted-foreground">{r.tasks_completed}</span></div>}
                    {r.challenges && <div><span className="font-semibold text-foreground">Blockers:</span> <span className="text-muted-foreground">{r.challenges}</span></div>}
                    {r.tomorrow_plan && <div><span className="font-semibold text-foreground">Tomorrow:</span> <span className="text-muted-foreground">{r.tomorrow_plan}</span></div>}
                    {r.assistance_required && <div><span className="font-semibold text-foreground">Needs help:</span> <span className="text-muted-foreground">{r.assistance_required}</span></div>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
          <DialogHeader><DialogTitle>{editing ? "Edit Daily Update" : "Submit Daily Update"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.update_date} onChange={(e) => setForm({ ...form, update_date: e.target.value })} /></div>
              <div>
                <Label>Department</Label>
                <Select value={form.department || "__none__"} onValueChange={(v) => setForm({ ...form, department: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Position / Role</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Field Agent" /></div>
            <div><Label>Work Summary</Label><Textarea rows={2} value={form.work_summary} onChange={(e) => setForm({ ...form, work_summary: e.target.value })} placeholder="What did you focus on today?" /></div>
            <div><Label>Tasks Completed</Label><Textarea rows={2} value={form.tasks_completed} onChange={(e) => setForm({ ...form, tasks_completed: e.target.value })} /></div>
            <div><Label>Challenges / Blockers</Label><Textarea rows={2} value={form.challenges} onChange={(e) => setForm({ ...form, challenges: e.target.value })} /></div>
            <div><Label>Assistance Required</Label><Textarea rows={2} value={form.assistance_required} onChange={(e) => setForm({ ...form, assistance_required: e.target.value })} /></div>
            <div><Label>Tomorrow's Plan</Label><Textarea rows={2} value={form.tomorrow_plan} onChange={(e) => setForm({ ...form, tomorrow_plan: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "draft" | "submitted" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Save as draft</SelectItem>
                  <SelectItem value="submitted">Submit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : editing ? "Save" : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete daily update?" description="This cannot be undone." onConfirm={remove} confirmLabel="Delete" variant="destructive"
      />
    </div>
  );
};

export default DailyUpdatesPage;