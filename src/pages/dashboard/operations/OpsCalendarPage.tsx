import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";

type EventType = "field_visit" | "meeting" | "deadline" | "dept_activity" | "maintenance" | "company_event";
interface Ev {
  id: string; title: string; description?: string | null; event_type: EventType;
  start_at: string; end_at?: string | null; all_day: number;
  department?: string | null; created_by_name?: string | null;
}

const TYPE_COLORS: Record<EventType, string> = {
  field_visit: "bg-blue-100 text-blue-700",
  meeting: "bg-purple-100 text-purple-700",
  deadline: "bg-rose-100 text-rose-700",
  dept_activity: "bg-indigo-100 text-indigo-700",
  maintenance: "bg-amber-100 text-amber-700",
  company_event: "bg-emerald-100 text-emerald-700",
};
const TYPE_LABELS: Record<EventType, string> = {
  field_visit: "Field Visit", meeting: "Meeting", deadline: "Deadline",
  dept_activity: "Dept Activity", maintenance: "Maintenance", company_event: "Company Event",
};

type ViewMode = "month" | "week" | "day";

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(d.getDate() - d.getDay()); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(d.getDate() + n); return x; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const emptyForm = {
  title: "", description: "", event_type: "meeting" as EventType,
  start_at: new Date().toISOString().slice(0, 16), end_at: "", all_day: false, department: "",
};

const OpsCalendarPage = () => {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [departments, setDepartments] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [e, d] = await Promise.all([api.ops.events.list(), api.ops.departments()]);
    if (e.success) setEvents(e.data as Ev[]);
    if (d.success) setDepartments(d.data as string[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cells = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") { const s = startOfWeek(cursor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfMonth(cursor);
    const cells: Date[] = [];
    let d = start;
    while (d <= end || cells.length % 7 !== 0) { cells.push(d); d = addDays(d, 1); }
    return cells;
  }, [cursor, view]);

  const eventsForDay = (d: Date) => events.filter((e) => sameDay(new Date(e.start_at), d));

  const nav = (dir: number) => {
    const c = new Date(cursor);
    if (view === "month") c.setMonth(c.getMonth() + dir);
    else if (view === "week") c.setDate(c.getDate() + 7 * dir);
    else c.setDate(c.getDate() + dir);
    setCursor(c);
  };

  const openCreate = (d?: Date) => {
    setEditing(null);
    setForm({ ...emptyForm, start_at: (d || new Date()).toISOString().slice(0, 16) });
    setOpen(true);
  };
  const openEdit = (e: Ev) => {
    setEditing(e);
    setForm({
      title: e.title, description: e.description || "", event_type: e.event_type,
      start_at: e.start_at.slice(0, 16), end_at: e.end_at ? e.end_at.slice(0, 16) : "",
      all_day: !!e.all_day, department: e.department || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const payload = { ...form, department: form.department || null, end_at: form.end_at || null };
    const res = editing ? await api.ops.events.update(editing.id, payload) : await api.ops.events.create(payload);
    if (res.success) { toast.success("Saved"); setOpen(false); load(); } else toast.error(res.error || "Failed");
  };

  const remove = async () => {
    if (!editing) return;
    const res = await api.ops.events.remove(editing.id);
    if (res.success) { toast.success("Deleted"); setOpen(false); load(); } else toast.error(res.error || "Failed");
  };

  const label = view === "day" ? cursor.toDateString()
    : view === "week" ? `Week of ${startOfWeek(cursor).toLocaleDateString()}`
    : cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <PageHeader title="Operations Calendar"
        description="Planned visits, meetings, deadlines, and events."
        actions={<Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-1" /> New Event</Button>} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => nav(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Today</Button>
          <Button size="icon" variant="outline" onClick={() => nav(1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold ml-2">{label}</span>
        </div>
        <div className="flex gap-1">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState /> : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {view === "month" && (
            <>
              <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-xs font-semibold text-muted-foreground p-2 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((d, i) => {
                  const evs = eventsForDay(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  return (
                    <div key={i} className={`min-h-[100px] border-b border-r border-border p-1 ${inMonth ? "" : "bg-muted/20"}`}>
                      <button onClick={() => openCreate(d)} className={`text-xs font-medium mb-1 ${sameDay(d, new Date()) ? "text-primary" : inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                        {d.getDate()}
                      </button>
                      <div className="space-y-1">
                        {evs.slice(0, 3).map((e) => (
                          <button key={e.id} onClick={() => openEdit(e)}
                            className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate ${TYPE_COLORS[e.event_type]}`}>
                            {e.title}
                          </button>
                        ))}
                        {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {(view === "week" || view === "day") && (
            <div className={`grid ${view === "week" ? "grid-cols-7" : "grid-cols-1"}`}>
              {cells.map((d, i) => {
                const evs = eventsForDay(d);
                return (
                  <div key={i} className="border-r border-b border-border p-3 min-h-[300px]">
                    <div className="text-xs font-semibold text-foreground mb-2">
                      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="space-y-1">
                      {evs.length === 0 && <p className="text-xs text-muted-foreground">No events</p>}
                      {evs.map((e) => (
                        <button key={e.id} onClick={() => openEdit(e)}
                          className={`w-full text-left text-xs px-2 py-1 rounded ${TYPE_COLORS[e.event_type]}`}>
                          <div className="font-semibold truncate">{e.title}</div>
                          <div className="text-[10px] opacity-80">{new Date(e.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as EventType[]).map((k) => (
          <Badge key={k} className={`text-[10px] ${TYPE_COLORS[k]}`}>{TYPE_LABELS[k]}</Badge>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Event" : "New Event"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v as EventType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(TYPE_LABELS) as EventType[]).map((k) => <SelectItem key={k} value={k}>{TYPE_LABELS[k]}</SelectItem>)}</SelectContent>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
              <div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            {editing && <Button variant="outline" className="text-destructive mr-auto" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpsCalendarPage;