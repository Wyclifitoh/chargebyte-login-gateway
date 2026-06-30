import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  SupportTicket, SupportPriority, SupportStatus, SupportCategory,
} from "@/types/dashboard";
import { formatDateTime } from "@/lib/format";
import { PageHeader, SectionCard, FilterBar, EmptyState, LoadingState, ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, Flag, Plus, RefreshCw, Send } from "lucide-react";

const STATUSES: SupportStatus[] = ["open", "assigned", "in_progress", "escalated", "resolved", "closed"];
const PRIORITIES: SupportPriority[] = ["low", "medium", "high", "critical"];
const CATEGORIES: SupportCategory[] = ["rental", "refund", "machine", "payment", "account", "other"];

const PRIORITY_BADGE: Record<SupportPriority, string> = {
  critical: "bg-red-100 text-red-700 border border-red-200",
  high:     "bg-orange-100 text-orange-700 border border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low:      "bg-muted text-muted-foreground border border-border",
};

const STATUS_BADGE: Record<SupportStatus, string> = {
  open:        "bg-blue-100 text-blue-700",
  assigned:    "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  escalated:   "bg-fuchsia-100 text-fuchsia-700",
  resolved:    "bg-green-100 text-green-700",
  closed:      "bg-muted text-muted-foreground",
};

function isOverdue(t: SupportTicket): boolean {
  if (!t.sla_due_at || t.status === "resolved" || t.status === "closed") return false;
  return new Date(t.sla_due_at).getTime() < Date.now();
}

const Pill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${className}`}>
    {children}
  </span>
);

const SupportPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [priorityF, setPriorityF] = useState<string>("all");
  const [categoryF, setCategoryF] = useState<string>("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<SupportTicket | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (statusF !== "all") params.status = statusF;
    if (priorityF !== "all") params.priority = priorityF;
    if (categoryF !== "all") params.category = categoryF;
    const res = await api.support.list(params);
    if (res.success) setTickets((res.data as SupportTicket[]) || []);
    else setError(res.error || "Failed to load tickets");
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusF, priorityF, categoryF]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, escalated: 0, overdue: 0, resolved_today: 0 };
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    tickets.forEach((t) => {
      if (t.status === "open" || t.status === "assigned") c.open += 1;
      if (t.status === "in_progress") c.in_progress += 1;
      if (t.status === "escalated") c.escalated += 1;
      if (isOverdue(t)) c.overdue += 1;
      if (t.status === "resolved" && t.resolved_at && new Date(t.resolved_at).getTime() >= startOfToday.getTime()) {
        c.resolved_today += 1;
      }
    });
    return c;
  }, [tickets]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Center"
        description="Customer tickets, SLA tracking, and field escalations."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Ticket
            </Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Open" value={counts.open} />
        <KpiCard label="In progress" value={counts.in_progress} tone="amber" />
        <KpiCard label="Escalated" value={counts.escalated} tone="fuchsia" />
        <KpiCard label="Overdue (SLA)" value={counts.overdue} tone="red" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard label="Resolved today" value={counts.resolved_today} tone="green" />
      </div>

      <SectionCard>
        <FilterBar>
          <Input
            placeholder="Search ticket #, subject, customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            className="max-w-sm"
          />
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityF} onValueChange={setPriorityF}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryF} onValueChange={setCategoryF}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterBar>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : tickets.length === 0 ? (
          <EmptyState title="No tickets" description="Create the first ticket to start tracking customer issues." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Ticket</th>
                  <th className="py-2 pr-3">Subject</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Priority</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Assigned</th>
                  <th className="py-2 pr-3">SLA</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setDetail(t)}
                    className="border-b border-border hover:bg-muted/40 cursor-pointer"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">{t.ticket_no}</td>
                    <td className="py-2 pr-3 max-w-[280px]">
                      <div className="truncate font-medium text-foreground">{t.subject}</div>
                      <div className="text-xs text-muted-foreground capitalize">{t.category}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div>{t.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.customer_phone || ""}</div>
                    </td>
                    <td className="py-2 pr-3"><Pill className={PRIORITY_BADGE[t.priority]}>{t.priority}</Pill></td>
                    <td className="py-2 pr-3"><Pill className={STATUS_BADGE[t.status]}>{t.status.replace("_", " ")}</Pill></td>
                    <td className="py-2 pr-3">{t.assigned_to_name || <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="py-2 pr-3">
                      {t.sla_due_at ? (
                        <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(t) ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          <Clock className="h-3 w-3" />
                          {formatDateTime(t.sla_due_at)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => { setCreateOpen(false); void load(); }}
      />

      <TicketDetailDialog
        ticket={detail}
        isAdmin={isAdmin}
        onOpenChange={(o) => !o && setDetail(null)}
        onChanged={() => { void load(); }}
      />
    </div>
  );
};

const KpiCard = ({ label, value, tone, icon }: { label: string; value: number; tone?: "amber" | "red" | "green" | "fuchsia"; icon?: React.ReactNode }) => {
  const toneCls = tone === "red" ? "text-red-600"
    : tone === "amber" ? "text-amber-600"
    : tone === "green" ? "text-green-600"
    : tone === "fuchsia" ? "text-fuchsia-600"
    : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
};

// ---------------- Create ----------------
const CreateTicketDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: "", description: "",
    category: "other" as SupportCategory, priority: "medium" as SupportPriority,
    customer_name: "", customer_phone: "", customer_email: "",
    rental_id: "", machine_id: "", station_id: "",
  });

  const reset = () => setForm({ subject: "", description: "", category: "other", priority: "medium", customer_name: "", customer_phone: "", customer_email: "", rental_id: "", machine_id: "", station_id: "" });

  const submit = async () => {
    if (!form.subject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const res = await api.support.create({
      ...form,
      rental_id: form.rental_id || null,
      machine_id: form.machine_id || null,
      station_id: form.station_id || null,
    });
    setSubmitting(false);
    if (res.success) {
      toast({ title: "Ticket created" });
      reset();
      onCreated();
    } else {
      toast({ title: "Failed", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New support ticket</DialogTitle>
          <DialogDescription>Log a customer issue. Critical & high tickets shorten the SLA window.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary of the issue" />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as SupportCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as SupportPriority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Customer name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
          <div><Label>Customer phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} placeholder="2547xxxxxxxx" /></div>
          <div className="md:col-span-2"><Label>Customer email</Label><Input value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
          <div><Label>Rental ID (optional)</Label><Input value={form.rental_id} onChange={(e) => setForm({ ...form, rental_id: e.target.value })} /></div>
          <div><Label>Station ID (optional)</Label><Input value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })} /></div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened? Steps already taken?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}><Plus className="h-4 w-4 mr-2" />{submitting ? "Creating…" : "Create ticket"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------- Detail ----------------
const TicketDetailDialog = ({
  ticket, isAdmin, onOpenChange, onChanged,
}: {
  ticket: SupportTicket | null; isAdmin: boolean;
  onOpenChange: (o: boolean) => void; onChanged: () => void;
}) => {
  const [full, setFull] = useState<SupportTicket | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ticket) { setFull(null); return; }
    setLoadingDetail(true);
    api.support.getById(ticket.id).then((r) => {
      if (r.success) setFull(r.data as SupportTicket);
      setLoadingDetail(false);
    });
  }, [ticket]);

  if (!ticket) return null;
  const t = full ?? ticket;

  const setStatus = async (status: SupportStatus) => {
    setBusy(true);
    const res = await api.support.update(t.id, { status });
    setBusy(false);
    if (res.success) { toast({ title: `Marked ${status.replace("_", " ")}` }); setFull(res.data as SupportTicket); onChanged(); }
    else toast({ title: "Update failed", description: res.error, variant: "destructive" });
  };

  const setPriority = async (priority: SupportPriority) => {
    setBusy(true);
    const res = await api.support.update(t.id, { priority });
    setBusy(false);
    if (res.success) { setFull(res.data as SupportTicket); onChanged(); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    const res = await api.support.addComment(t.id, { body: comment, is_internal: internal });
    setBusy(false);
    if (res.success) {
      setComment("");
      const refreshed = await api.support.getById(t.id);
      if (refreshed.success) setFull(refreshed.data as SupportTicket);
      onChanged();
    } else toast({ title: "Failed to comment", description: res.error, variant: "destructive" });
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="font-mono">{t.ticket_no}</DialogTitle>
            <Pill className={PRIORITY_BADGE[t.priority]}>{t.priority}</Pill>
            <Pill className={STATUS_BADGE[t.status]}>{t.status.replace("_", " ")}</Pill>
            {isOverdue(t) && <Pill className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1 inline" />SLA breached</Pill>}
          </div>
          <DialogDescription className="text-foreground font-medium text-base mt-1">{t.subject}</DialogDescription>
        </DialogHeader>

        {loadingDetail ? <LoadingState /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="Category" value={t.category} />
              <Field label="Customer" value={t.customer_name || "—"} />
              <Field label="Phone" value={t.customer_phone || "—"} />
              <Field label="Station" value={t.station_name || "—"} />
              <Field label="Assigned to" value={t.assigned_to_name || "Unassigned"} />
              <Field label="Created" value={formatDateTime(t.created_at)} />
              <Field label="SLA due" value={t.sla_due_at ? formatDateTime(t.sla_due_at) : "—"} />
              <Field label="Created by" value={t.created_by_name || "—"} />
              {t.resolved_at && <Field label="Resolved" value={formatDateTime(t.resolved_at)} />}
            </div>

            {t.description && (
              <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {t.description}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
              <Select value={t.status} onValueChange={(v) => setStatus(v as SupportStatus)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={t.priority} onValueChange={(v) => setPriority(v as SupportPriority)}>
                <SelectTrigger className="w-[140px]"><Flag className="h-3 w-3 mr-1 inline" /><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
              {isAdmin && t.status !== "escalated" && (
                <Button size="sm" variant="outline" onClick={() => setStatus("escalated")} disabled={busy}>Escalate</Button>
              )}
              {t.status !== "resolved" && t.status !== "closed" && (
                <Button size="sm" onClick={() => setStatus("resolved")} disabled={busy}>Mark resolved</Button>
              )}
            </div>

            {/* Comments */}
            <div className="mt-5">
              <h4 className="text-sm font-semibold mb-2">Activity</h4>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {(t.comments || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No comments yet.</p>
                )}
                {(t.comments || []).map((c) => (
                  <div key={c.id} className={`rounded-md border p-2 text-sm ${c.is_internal ? "border-amber-200 bg-amber-50" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium text-foreground">{c.author_name || "User"}</span>
                      <span>{formatDateTime(c.created_at)}{c.is_internal ? " · internal" : " · customer-visible"}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{c.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-2">
                <Textarea rows={3} placeholder="Add a comment or update…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    Internal note (not visible to customer)
                  </label>
                  <Button size="sm" onClick={addComment} disabled={busy || !comment.trim()}>
                    <Send className="h-3 w-3 mr-2" /> Post
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm capitalize">{value}</div>
  </div>
);

export default SupportPage;
