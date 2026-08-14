import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, Pencil, AlertTriangle, Paperclip, Upload, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

type Priority = "low" | "medium" | "high" | "critical";
type EntryType = "update" | "report" | "meeting_minutes";

interface DeptUpdate {
  id: string; user_id: string; user_name?: string; department: string;
  entry_type: EntryType; title: string; summary?: string | null; details?: string | null;
  priority: Priority; meeting_date?: string | null; attendees?: string | null;
  file_url?: string | null; file_name?: string | null; created_at: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const ENTRY_TABS: { value: EntryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "update", label: "Updates" },
  { value: "report", label: "Reports" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
];
const ENTRY_LABELS: Record<EntryType, string> = {
  update: "Update", report: "Report", meeting_minutes: "Meeting Minutes",
};

const FILE_BASE = (import.meta.env.VITE_API_URL || "https://dash.chargebyte.io/api").replace(/\/api\/?$/, "");
const fileHref = (u: string) => (u.startsWith("http") ? u : `${FILE_BASE}${u}`);

const emptyForm = {
  department: "", entry_type: "update" as EntryType, title: "", summary: "", details: "",
  priority: "medium" as Priority, meeting_date: "", attendees: "",
  file_url: "" as string | null, file_name: "" as string | null,
};

const DepartmentUpdatesPage = () => {
  const { user } = useAuth();
  const isPriv = user?.role === "super_admin" || user?.role === "admin";
  const [rows, setRows] = useState<DeptUpdate[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [tab, setTab] = useState<EntryType | "all">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeptUpdate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
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
    const type = (r.entry_type || "update") as EntryType;
    if (tab !== "all" && type !== tab) return false;
    if (deptFilter && r.department !== deptFilter) return false;
    if (search) {
      const hay = `${r.title} ${r.summary || ""} ${r.details || ""} ${r.attendees || ""}`.toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    return true;
  }), [rows, deptFilter, search, tab]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, entry_type: tab === "all" ? "update" : tab });
    setOpen(true);
  };
  const openEdit = (r: DeptUpdate) => {
    setEditing(r);
    setForm({
      department: r.department, entry_type: (r.entry_type || "update") as EntryType,
      title: r.title, summary: r.summary || "", details: r.details || "", priority: r.priority,
      meeting_date: r.meeting_date ? String(r.meeting_date).slice(0, 10) : "",
      attendees: r.attendees || "", file_url: r.file_url || "", file_name: r.file_name || "",
    });
    setOpen(true);
  };

  const onPickFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    const res = await api.ops.uploadFile(file);
    setUploading(false);
    if (res.success) {
      setForm((f) => ({ ...f, file_url: res.data.file_url, file_name: res.data.file_name }));
      toast.success("File uploaded");
    } else toast.error(res.error || "Upload failed");
  };

  const submit = async () => {
    if (!form.title.trim() || !form.department) { toast.error("Title and department required"); return; }
    const payload = {
      ...form,
      meeting_date: form.entry_type === "meeting_minutes" ? form.meeting_date || null : null,
      attendees: form.entry_type === "meeting_minutes" ? form.attendees || null : null,
    };
    const res = editing
      ? await api.ops.departmentUpdates.update(editing.id, payload)
      : await api.ops.departmentUpdates.create(payload);
    if (res.success) { toast.success("Saved"); setOpen(false); load(); }
    else toast.error(res.error || "Failed");
  };

  const remove = async () => {
    if (!confirmDel) return;
    const res = await api.ops.departmentUpdates.remove(confirmDel.id);
    if (res.success) { toast.success("Deleted"); load(); } else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  const createLabel = tab === "report" ? "Add Report" : tab === "meeting_minutes" ? "Add Minutes" : "Post Update";

  return (
    <div className="space-y-6">
      <PageHeader title="Department Updates"
        description="Updates, reports and meeting minutes from every department."
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> {createLabel}</Button>} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as EntryType | "all")}>
        <TabsList>
          {ENTRY_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search entries…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
        <EmptyState title="Nothing here yet" description="Post an update, upload a report or file meeting minutes."
          action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> {createLabel}</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{r.department}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{ENTRY_LABELS[(r.entry_type || "update") as EntryType]}</Badge>
                    <Badge className={`text-[10px] ${PRIORITY_COLORS[r.priority]}`}>
                      {r.priority === "critical" && <AlertTriangle className="h-3 w-3 mr-0.5 inline" />}
                      {r.priority}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mt-1">{r.title}</h3>
                  {r.summary && <p className="text-xs text-muted-foreground mt-1">{r.summary}</p>}
                  {r.details && <p className="text-xs text-foreground mt-2 line-clamp-3">{r.details}</p>}
                  {r.meeting_date && (
                    <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Meeting {new Date(r.meeting_date).toLocaleDateString()}
                    </div>
                  )}
                  {r.attendees && (
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Users className="h-3 w-3" /> {r.attendees}
                    </div>
                  )}
                  {r.file_url && (
                    <a href={fileHref(r.file_url)} target="_blank" rel="noreferrer"
                      className="text-[11px] text-primary mt-2 inline-flex items-center gap-1 hover:underline">
                      <Paperclip className="h-3 w-3" /> {r.file_name || "Attachment"}
                    </a>
                  )}
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Entry" : "New Department Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Entry type *</Label>
              <Select value={form.entry_type} onValueChange={(v) => setForm({ ...form, entry_type: v as EntryType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="meeting_minutes">Meeting Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

            {form.entry_type === "meeting_minutes" && (
              <>
                <div><Label>Meeting date</Label><Input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
                <div><Label>Attendees</Label><Textarea rows={2} value={form.attendees} placeholder="Comma-separated names" onChange={(e) => setForm({ ...form, attendees: e.target.value })} /></div>
              </>
            )}

            <div>
              <Label>Attachment {form.entry_type !== "update" && <span className="text-muted-foreground">(PDF, Word, Excel, images — max 15MB)</span>}</Label>
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])} />
              <div className="flex items-center gap-2 mt-1">
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload file"}
                </Button>
                {form.file_url && (
                  <>
                    <a href={fileHref(form.file_url)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate max-w-[180px]">
                      {form.file_name || "Attachment"}
                    </a>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, file_url: "", file_name: "" })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>

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
            <Button onClick={submit} disabled={uploading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete entry?" description="This cannot be undone." onConfirm={remove} confirmLabel="Delete" variant="destructive" />
    </div>
  );
};

export default DepartmentUpdatesPage;
