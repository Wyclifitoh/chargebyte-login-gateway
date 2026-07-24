import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Cpu,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ErrorState, LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { formatKsh } from "@/lib/format";
import { api } from "@/services/api";
import { useMachines, useUsers } from "@/hooks/useDashboardData";

const STATUSES = [
  "planning",
  "not_contacted",
  "contacted",
  "follow_up",
  "proposal_sent",
  "negotiating",
  "confirmed",
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
  "lost",
];

interface EventMachine {
  id: string;
  machine_id: string;
  machine_name?: string;
  model?: string;
  machine_status?: string;
  assignment_date: string;
  return_date?: string | null;
  status: string;
  deployment_notes?: string | null;
}

interface EventStaff {
  id: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  staff_type?: string;
  role?: string;
  daily_rate?: number;
  working_days?: number;
}

interface EventActivity {
  id: string;
  actor_name?: string;
  action: string;
  details?: string;
  created_at: string;
}

interface EventPerformance {
  total_rentals: number;
  total_revenue: number;
  per_machine?: Array<{ machine_id: string; machine_name?: string; rentals_count: number; revenue: number }>;
  per_day?: Array<{ day: string; rentals_count: number; revenue: number }>;
}

interface EventDetail {
  id: string;
  event_code: string;
  name: string;
  type: string;
  category: string;
  status: string;
  location: string;
  venue_name?: string;
  organizer_name: string;
  contact_person: string;
  contact_phone: string;
  contact_email?: string;
  start_date: string;
  end_date: string;
  expected_attendees?: number;
  contacted?: number;
  first_contacted_at?: string | null;
  last_contacted_at?: string | null;
  email_sent?: number;
  email_sent_at?: string | null;
  proposal_sent?: number;
  proposal_sent_at?: string | null;
  follow_up_count?: number;
  next_follow_up_date?: string | null;
  outcome?: string | null;
  notes?: string | null;
  machines: EventMachine[];
  staff: EventStaff[];
  activity: EventActivity[];
  performance: EventPerformance;
}

const EventProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const machinesQ = useMachines();
  const usersQ = useUsers();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const [machineOpen, setMachineOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ staff_id: "", staff_type: "sales_agent", role: "", daily_rate: 0, working_days: 1 });
  const [machineForm, setMachineForm] = useState({ machine_id: "", assignment_date: new Date().toISOString().slice(0, 10), deployment_notes: "" });
  const [commForm, setCommForm] = useState({ channel: "contact", note: "" });

  const load = async () => {
    if (!id) return;
    setError(null);
    const res = await api.events.getById(id);
    if (res.success) setEvent(res.data as EventDetail);
    else setError(res.error || "Failed to load event");
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const activeMachineIds = useMemo(
    () => new Set((event?.machines || []).filter((m) => m.status !== "returned" && !m.return_date).map((m) => m.machine_id)),
    [event],
  );

  const assignableUsers = usersQ.data.filter((u) => ["super_admin", "admin", "staff"].includes(u.role));

  const updateStatus = async (status: string) => {
    if (!id) return;
    const res = await api.events.update(id, { status });
    if (res.success) { toast.success("Status updated"); load(); }
    else toast.error(res.error || "Failed");
  };

  const logCommunication = async () => {
    if (!id) return;
    const res = await api.events.logCommunication(id, commForm);
    if (res.success) {
      toast.success("Communication logged");
      setCommOpen(false);
      setCommForm({ channel: "contact", note: "" });
      load();
    } else toast.error(res.error || "Failed");
  };

  const assignStaff = async () => {
    if (!id || !staffForm.staff_id) return;
    const res = await api.events.assignStaff(id, staffForm);
    if (res.success) {
      toast.success("Staff assigned");
      setStaffOpen(false);
      setStaffForm({ staff_id: "", staff_type: "sales_agent", role: "", daily_rate: 0, working_days: 1 });
      load();
    } else toast.error(res.error || "Failed");
  };

  const removeStaff = async (staffRowId: string) => {
    if (!id) return;
    const res = await api.events.removeStaff(id, staffRowId);
    if (res.success) { toast.success("Staff removed"); load(); }
    else toast.error(res.error || "Failed");
  };

  const deployMachine = async () => {
    if (!id || !machineForm.machine_id) return;
    const res = await api.events.deployMachine(id, machineForm);
    if (res.success) {
      toast.success("Machine deployed");
      setMachineOpen(false);
      setMachineForm({ machine_id: "", assignment_date: new Date().toISOString().slice(0, 10), deployment_notes: "" });
      load();
    } else toast.error(res.error || "Failed");
  };

  const returnMachine = async (deploymentId: string) => {
    if (!id) return;
    const res = await api.events.returnMachine(id, deploymentId);
    if (res.success) { toast.success("Machine returned"); load(); }
    else toast.error(res.error || "Failed");
  };

  if (!id) return null;
  if (error) return <ErrorState title="Couldn't load event" message={error} onRetry={load} />;
  if (!event) return <LoadingState />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/events")}>
        <ArrowLeft className="h-4 w-4 mr-1" />Back to events
      </Button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader title={event.name} description={`${event.organizer_name} · ${event.venue_name || event.location}`} />
        <div className="flex items-center gap-2">
          <StatusBadge status={event.status} />
          <Select value={event.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((status) => <SelectItem key={status} value={status}>{status.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Rentals" value={event.performance?.total_rentals || 0} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Revenue" value={formatKsh(Number(event.performance?.total_revenue || 0))} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Machines" value={event.machines.length} icon={<Cpu className="h-5 w-5" />} />
        <MetricCard title="Staff" value={event.staff.length} icon={<Users className="h-5 w-5" />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communication"><Mail className="h-3.5 w-3.5 mr-1" />Communication</TabsTrigger>
          <TabsTrigger value="staff"><Users className="h-3.5 w-3.5 mr-1" />Staff</TabsTrigger>
          <TabsTrigger value="machines"><Cpu className="h-3.5 w-3.5 mr-1" />Machines</TabsTrigger>
          <TabsTrigger value="performance"><TrendingUp className="h-3.5 w-3.5 mr-1" />Performance</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="h-3.5 w-3.5 mr-1" />Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4" />Event Details</h3>
            <p className="text-sm"><span className="text-muted-foreground">Code:</span> {event.event_code}</p>
            <p className="text-sm"><span className="text-muted-foreground">Dates:</span> {event.start_date} → {event.end_date}</p>
            <p className="text-sm"><span className="text-muted-foreground">Venue:</span> {event.venue_name || event.location}</p>
            <p className="text-sm"><span className="text-muted-foreground">Expected attendees:</span> {event.expected_attendees || 0}</p>
            <p className="text-sm"><span className="text-muted-foreground">Outcome:</span> {event.outcome || "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4" />Organizer Contact</h3>
            <p className="text-sm"><span className="text-muted-foreground">Organizer:</span> {event.organizer_name}</p>
            <p className="text-sm"><span className="text-muted-foreground">Contact:</span> {event.contact_person}</p>
            <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {event.contact_phone}</p>
            <p className="text-sm"><span className="text-muted-foreground">Email:</span> {event.contact_email || "—"}</p>
            <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {event.notes || "—"}</p>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setCommOpen(true)}><Plus className="h-4 w-4 mr-1" />Log communication</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Contacted</p><p className="font-semibold">{event.contacted ? "Yes" : "No"}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Email sent</p><p className="font-semibold">{event.email_sent ? "Yes" : "No"}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Proposal sent</p><p className="font-semibold">{event.proposal_sent ? "Yes" : "No"}</p></div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Follow-ups</p><p className="font-semibold">{event.follow_up_count || 0}</p></div>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setStaffOpen(true)}><Plus className="h-4 w-4 mr-1" />Assign staff</Button></div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="px-4 py-3 text-left text-muted-foreground font-medium">Name</th><th className="px-4 py-3 text-left text-muted-foreground font-medium">Role</th><th className="px-4 py-3 text-left text-muted-foreground font-medium">Rate</th><th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th></tr></thead>
              <tbody>
                {event.staff.length === 0 && <tr><td colSpan={4} className="p-4 text-sm text-muted-foreground">No staff assigned.</td></tr>}
                {event.staff.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><div>{s.staff_name || s.staff_id}</div><div className="text-xs text-muted-foreground">{s.staff_email || "—"}</div></td><td className="px-4 py-3">{s.role || s.staff_type || "—"}</td><td className="px-4 py-3">{formatKsh(Number(s.daily_rate || 0))}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => removeStaff(s.id)}>Remove</Button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="machines" className="space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setMachineOpen(true)}><Plus className="h-4 w-4 mr-1" />Deploy machine</Button></div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="px-4 py-3 text-left text-muted-foreground font-medium">Machine</th><th className="px-4 py-3 text-left text-muted-foreground font-medium">Deployed</th><th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th><th className="px-4 py-3 text-left text-muted-foreground font-medium">Notes</th><th className="px-4 py-3 text-right text-muted-foreground font-medium">Actions</th></tr></thead>
              <tbody>
                {event.machines.length === 0 && <tr><td colSpan={5} className="p-4 text-sm text-muted-foreground">No machines deployed.</td></tr>}
                {event.machines.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0"><td className="px-4 py-3"><div>{m.machine_name || m.machine_id}</div><div className="text-xs text-muted-foreground">{m.model || "—"}</div></td><td className="px-4 py-3">{m.assignment_date}</td><td className="px-4 py-3"><StatusBadge status={m.status} /></td><td className="px-4 py-3 text-xs text-muted-foreground">{m.deployment_notes || "—"}</td><td className="px-4 py-3 text-right">{m.status !== "returned" && <Button size="sm" variant="outline" onClick={() => returnMachine(m.id)}><RefreshCw className="h-3.5 w-3.5 mr-1" />Return</Button>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <div className="p-3 text-xs font-medium text-muted-foreground uppercase">By machine</div>
            <table className="w-full text-sm"><tbody>{(event.performance?.per_machine || []).map((m) => <tr key={m.machine_id} className="border-t border-border"><td className="px-4 py-3">{m.machine_name || m.machine_id}</td><td className="px-4 py-3">{m.rentals_count} rentals</td><td className="px-4 py-3 text-right font-semibold">{formatKsh(Number(m.revenue || 0))}</td></tr>)}</tbody></table>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <div className="p-3 text-xs font-medium text-muted-foreground uppercase">By day</div>
            <table className="w-full text-sm"><tbody>{(event.performance?.per_day || []).map((d) => <tr key={d.day} className="border-t border-border"><td className="px-4 py-3">{d.day}</td><td className="px-4 py-3">{d.rentals_count} rentals</td><td className="px-4 py-3 text-right font-semibold">{formatKsh(Number(d.revenue || 0))}</td></tr>)}</tbody></table>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {event.activity.length === 0 && <div className="p-4 text-sm text-muted-foreground">No activity recorded.</div>}
            {event.activity.map((a) => <div key={a.id} className="p-4"><p className="text-sm font-medium">{a.action.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{a.actor_name || "System"} · {new Date(a.created_at).toLocaleString()}</p></div>)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={commOpen} onOpenChange={setCommOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Log communication</DialogTitle></DialogHeader><div className="space-y-3"><Select value={commForm.channel} onValueChange={(v) => setCommForm({ ...commForm, channel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contact">Contacted</SelectItem><SelectItem value="email">Email sent</SelectItem><SelectItem value="follow_up">Follow-up</SelectItem><SelectItem value="proposal">Proposal sent</SelectItem></SelectContent></Select><Textarea placeholder="Notes" value={commForm.note} onChange={(e) => setCommForm({ ...commForm, note: e.target.value })} /><Button className="w-full" onClick={logCommunication}>Save</Button></div></DialogContent>
      </Dialog>

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Assign staff</DialogTitle></DialogHeader><div className="space-y-3"><Select value={staffForm.staff_id} onValueChange={(v) => setStaffForm({ ...staffForm, staff_id: v })}><SelectTrigger><SelectValue placeholder="Staff member" /></SelectTrigger><SelectContent>{assignableUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>)}</SelectContent></Select><Select value={staffForm.staff_type} onValueChange={(v) => setStaffForm({ ...staffForm, staff_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="technician">Technician</SelectItem><SelectItem value="sales_agent">Sales agent</SelectItem><SelectItem value="trainer">Trainer</SelectItem></SelectContent></Select><Input placeholder="Role" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} /><Input type="number" placeholder="Daily rate" value={staffForm.daily_rate} onChange={(e) => setStaffForm({ ...staffForm, daily_rate: Number(e.target.value) })} /><Input type="number" placeholder="Working days" value={staffForm.working_days} onChange={(e) => setStaffForm({ ...staffForm, working_days: Number(e.target.value) })} /><Button className="w-full" onClick={assignStaff} disabled={!staffForm.staff_id}>Assign</Button></div></DialogContent>
      </Dialog>

      <Dialog open={machineOpen} onOpenChange={setMachineOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Deploy machine</DialogTitle></DialogHeader><div className="space-y-3"><Select value={machineForm.machine_id} onValueChange={(v) => setMachineForm({ ...machineForm, machine_id: v })}><SelectTrigger><SelectValue placeholder="Machine" /></SelectTrigger><SelectContent>{machinesQ.data.filter((m) => !activeMachineIds.has(m.id)).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.station_name ? ` · ${m.station_name}` : ""}</SelectItem>)}</SelectContent></Select><Input type="date" value={machineForm.assignment_date} onChange={(e) => setMachineForm({ ...machineForm, assignment_date: e.target.value })} /><Textarea placeholder="Notes" value={machineForm.deployment_notes} onChange={(e) => setMachineForm({ ...machineForm, deployment_notes: e.target.value })} /><Button className="w-full" onClick={deployMachine} disabled={!machineForm.machine_id}><Cpu className="h-4 w-4 mr-1" />Deploy</Button></div></DialogContent>
      </Dialog>
    </div>
  );
};

export default EventProfilePage;