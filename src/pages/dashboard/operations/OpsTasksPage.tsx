import { useEffect, useMemo, useState } from "react";
import { Plus, Search, MessageSquare, Trash2 } from "lucide-react";
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

type Status = "pending" | "in_progress" | "completed" | "cancelled";
type Priority = "low" | "medium" | "high" | "critical";
interface Task {
  id: string; title: string; description?: string | null;
  assigned_by: string; assigned_to: string | null;
  assignee_name?: string | null; assigner_name?: string | null;
  department?: string | null; priority: Priority; due_date?: string | null;
  status: Status; completed_at?: string | null; created_at: string;
}
interface Comment { id: string; user_id: string; user_name?: string; comment: string; created_at: string; }
interface Staff { id: string; name: string; email: string; role: string; }

const STATUS_COLS: { key: Status; label: string; color: string }[] = [
  { key: "pending", label: "Pending", color: "bg-slate-100 text-slate-700" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  { key: "cancelled", label: "Cancelled", color: "bg-rose-100 text-rose-700" },
];
const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const emptyForm = {
  title: "", description: "", assigned_to: "", department: "",
  priority: "medium" as Priority, due_date: "", status: "pending" as Status,
};

const OpsTasksPage = () => {
  const { user } = useAuth();
  const isPriv = user?.role === "super_admin" || user?.role === "admin";
  const [rows, setRows] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDel, setConfirmDel] = useState<Task | null>(null);

  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const load = async () => {
    setLoading(true);
    const [d, s, dept] = await Promise.all([api.ops.tasks.list(), api.ops.staff(), api.ops.departments()]);
    if (d.success) setRows(d.data as Task[]);
    if (s.success) setStaff(s.data as Staff[]);
    if (dept.success) setDepartments(dept.data as string[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search && !`${r.title} ${r.description || ""} ${r.assignee_name || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, search]);

  const byStatus = (s: Status) => filtered.filter((r) => r.status === s);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (r: Task) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description || "",
      assigned_to: r.assigned_to || "", department: r.department || "",
      priority: r.priority, due_date: r.due_date ? r.due_date.slice(0, 10) : "",
      status: r.status,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null, department: form.department || null };
    const res = editing ? await api.ops.tasks.update(editing.id, payload) : await api.ops.tasks.create(payload);
    if (res.success) { toast.success("Saved"); setOpen(false); load(); } else toast.error(res.error || "Failed");
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.ops.tasks.remove(confirmDel.id);
    if (res.success) { toast.success("Deleted"); load(); } else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  const openDetail = async (r: Task) => {
    setDetailTask(r);
    const res = await api.ops.tasks.getById(r.id);
    if (res.success) setComments(((res.data as Task & { comments: Comment[] }).comments) || []);
  };

  const addComment = async () => {
    if (!detailTask || !newComment.trim()) return;
    const res = await api.ops.tasks.addComment(detailTask.id, newComment.trim());
    if (res.success) { setNewComment(""); openDetail(detailTask); } else toast.error(res.error || "Failed");
  };

  const quickStatus = async (task: Task, status: Status) => {
    const res = await api.ops.tasks.update(task.id, { status });
    if (res.success) load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Assign, track, and collaborate on operational tasks."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Task</Button>} />

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStatusFilter("")}
            className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusFilter === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All</button>
          {STATUS_COLS.map((s) => (
            <button key={s.key} onClick={() => setStatusFilter(statusFilter === s.key ? "" : s.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${statusFilter === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <EmptyState title="No tasks yet" description="Create a task and assign it to someone." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Task</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_COLS.map((col) => (
            <div key={col.key} className="space-y-2">
              <div className={`text-xs font-semibold uppercase px-2 py-1 rounded ${col.color}`}>{col.label} ({byStatus(col.key).length})</div>
              {byStatus(col.key).map((r) => {
                const overdue = r.due_date && r.status !== "completed" && r.status !== "cancelled" && new Date(r.due_date) < new Date();
                return (
                  <button key={r.id} onClick={() => openDetail(r)}
                    className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm text-foreground line-clamp-2 flex-1">{r.title}</div>
                      <Badge className={`text-[10px] shrink-0 ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</Badge>
                    </div>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>{r.assignee_name || "Unassigned"}</span>
                      {r.due_date && <span className={overdue ? "text-rose-600 font-semibold" : ""}>{new Date(r.due_date).toLocaleDateString()}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailTask} onOpenChange={(o) => !o && setDetailTask(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {detailTask && (
            <>
              <DialogHeader>
                <DialogTitle>{detailTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-[10px] ${PRIORITY_COLORS[detailTask.priority]}`}>{detailTask.priority}</Badge>
                  {detailTask.department && <Badge variant="outline" className="text-[10px]">{detailTask.department}</Badge>}
                  <Badge variant="outline" className="text-[10px]">Assigned to: {detailTask.assignee_name || "—"}</Badge>
                  <Badge variant="outline" className="text-[10px]">By: {detailTask.assigner_name || "—"}</Badge>
                </div>
                {detailTask.description && <p className="text-sm text-foreground whitespace-pre-wrap">{detailTask.description}</p>}

                <div className="flex flex-wrap gap-2">
                  {STATUS_COLS.filter((s) => s.key !== detailTask.status).map((s) => (
                    <Button key={s.key} size="sm" variant="outline" onClick={() => quickStatus(detailTask, s.key)}>Mark {s.label}</Button>
                  ))}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Comments</h3>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                    {comments.map((c) => (
                      <div key={c.id} className="text-xs bg-muted/40 p-2 rounded">
                        <div className="font-semibold text-foreground">{c.user_name || "—"}</div>
                        <div className="text-foreground whitespace-pre-wrap">{c.comment}</div>
                        <div className="text-muted-foreground text-[10px] mt-0.5">{new Date(c.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment…" />
                    <Button onClick={addComment} disabled={!newComment.trim()}>Post</Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => { openEdit(detailTask); setDetailTask(null); }}>Edit</Button>
                  {(isPriv || detailTask.assigned_by === user?.id) && (
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => { setConfirmDel(detailTask); setDetailTask(null); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign to</Label>
                <Select value={form.assigned_to || "__none__"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_COLS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete task?" description="This cannot be undone." onConfirm={remove} confirmLabel="Delete" variant="destructive" />
    </div>
  );
};

export default OpsTasksPage;