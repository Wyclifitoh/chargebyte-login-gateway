import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, AlertTriangle } from "lucide-react";
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

type Priority = "low" | "medium" | "high" | "critical";
interface DeptUpdate {
  id: string; user_id: string; user_name?: string; department: string;
  title: string; summary?: string | null; details?: string | null;
  priority: Priority; created_at: string;
}
const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const emptyForm = { department: "", title: "", summary: "", details: "", priority: "medium" as Priority };

const DepartmentUpdatesPage = () => {
  const { user } = useAuth();
  const isPriv = user?.role === "super_admin" || user?.role === "admin";
  const [rows, setRows] = useState<DeptUpdate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptUpdate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDel, setConfirmDel] = useState<DeptUpdate | null>(null);

  const load = async () => {
    setLoading(true);
    const [d, dept] = await Promise.all([api.ops.departmentUpdates.list(), api.ops.departments()]);
    if (d.success) setRows(d.data as DeptUpdate[]);
    if (dept.success) setDepartments(dept.data as string[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (deptFilter && r.department !== deptFilter) return false;
    if (search) {
      const hay = `${r.title} ${r.summary || ""} ${r.details || ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, deptFilter, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: DeptUpdate) => {
    setEditing(r);
    setForm({ department: r.department, title: r.title, summary: r.summary || "", details: r.details || "", priority: r.priority });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.department) { toast.error("Title and department required"); return; }
    const res = editing ? await api.ops.departmentUpdates.update(editing.id, form) : await api.ops.departmentUpdates.create(form);
    if (res.success) { toast.success("Saved"); setOpen(false); load(); }
    else toast.error(res.error || "Failed");
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.ops.departmentUpdates.remove(confirmDel.id);
    if (res.success) { toast.success("Deleted"); load(); } else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Department Updates"
        description="Cross-department operational updates in one place."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Post Update</Button>} />

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search updates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDeptFilter("")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${deptFilter === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All</button>
          {departments.map((d) => (
            <button key={d} onClick={() => setDeptFilter(deptFilter === d ? "" : d)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${deptFilter === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{d}</button>
          ))}
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState title="No department updates yet" description="Post an update to keep everyone in the loop." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Post Update</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{r.department}</Badge>
                    <Badge className={`text-[10px] ${PRIORITY_COLORS[r.priority]}`}>
                      {r.priority === "critical" && <AlertTriangle className="h-3 w-3 mr-0.5 inline" />}
                      {r.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mt-1">{r.title}</h3>
                  {r.summary && <p className="text-xs text-muted-foreground mt-1">{r.summary}</p>}
                  {r.details && <p className="text-xs text-foreground mt-2 line-clamp-3">{r.details}</p>}
                  <div className="text-[10px] text-muted-foreground mt-2">By {r.user_name || "—"} · {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {(isPriv || r.user_id === user?.id) && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDel(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Update" : "Post Department Update"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Department *</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger><SelectValue placeholder="Select department…" /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Summary</Label><Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One-line summary" /></div>
            <div><Label>Details</Label><Textarea rows={4} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete update?" description="This cannot be undone." onConfirm={remove} confirmLabel="Delete" variant="destructive" />
    </div>
  );
};

export default DepartmentUpdatesPage;