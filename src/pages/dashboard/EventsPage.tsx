import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, LoadingState, ErrorState, EmptyState } from "@/components/shared";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/services/api";

interface EventRow {
  id: string; event_code: string; name: string; type: string; status: string;
  location: string; venue_name?: string; organizer_name: string;
  contact_person: string; contact_phone: string; contact_email?: string;
  start_date: string; end_date: string;
  contacted?: number; email_sent?: number; proposal_sent?: number; follow_up_count?: number;
  machines_count?: number; staff_count?: number;
  outcome?: string; notes?: string;
}

const STATUSES = [
  "planning","not_contacted","contacted","follow_up","proposal_sent",
  "negotiating","confirmed","upcoming","ongoing","completed","cancelled","lost",
];

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "organizer_paid", location: "", venue_name: "",
    organizer_name: "", contact_person: "", contact_phone: "", contact_email: "",
    start_date: "", end_date: "", expected_attendees: 0, notes: "",
  });

  const load = async () => {
    setError(null);
    const [e, s] = await Promise.all([
      api.events.getAll(filter === "all" ? undefined : { status: filter }),
      api.events.summary(),
    ]);
    if (e.success) setEvents(e.data as EventRow[]); else setError(e.error || "Failed to load");
    if (s.success) setSummary(s.data as Record<string, number>);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const create = async () => {
    if (!form.name || !form.start_date || !form.end_date || !form.location || !form.organizer_name || !form.contact_person || !form.contact_phone) {
      toast.error("Fill required fields"); return;
    }
    const res = await api.events.create(form);
    if (res.success) { toast.success("Event created"); setOpen(false); load(); }
    else toast.error(res.error || "Failed");
  };

  const setStatus = async (id: string, status: string) => {
    const res = await api.events.update(id, { status });
    if (res.success) { toast.success("Status updated"); load(); } else toast.error(res.error || "Failed");
  };

  const logComm = async (id: string, channel: string) => {
    const res = await api.events.logCommunication(id, { channel });
    if (res.success) { toast.success("Logged"); load(); } else toast.error(res.error || "Failed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Events" description="Plan, track and deploy machines to events end-to-end" />
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New event</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total" value={summary?.total ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard title="Pipeline" value={summary?.pipeline ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard title="Active" value={summary?.active ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard title="Completed" value={summary?.completed ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard title="Cancelled" value={summary?.cancelled ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard title="Lost" value={summary?.lost ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
      </div>

      <div className="flex gap-3 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!events ? <LoadingState /> :
       error ? <ErrorState title="Couldn't load events" message={error} onRetry={load} /> :
       events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState icon={<CalendarDays className="h-6 w-6 text-muted-foreground" />}
            title="No events yet" description="Create your first event to start tracking communications and deployments." />
        </div>
       ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Organizer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dates</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contact</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comms</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Machines</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.venue_name || e.location}</div>
                  </td>
                  <td className="px-4 py-3">{e.organizer_name}</td>
                  <td className="px-4 py-3 text-xs">{e.start_date} → {e.end_date}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{e.contact_person}</div>
                    <div className="text-muted-foreground">{e.contact_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {e.contacted ? "✓ Contacted" : "—"}
                    {e.email_sent ? " · ✓ Email" : ""}
                    {e.proposal_sent ? " · ✓ Proposal" : ""}
                    {e.follow_up_count ? ` · ${e.follow_up_count} FU` : ""}
                  </td>
                  <td className="px-4 py-3">{e.machines_count ?? 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => logComm(e.id, "contacted")}>Contact</Button>
                      <Button size="sm" variant="ghost" onClick={() => logComm(e.id, "email")}>Email</Button>
                      <Button size="sm" variant="ghost" onClick={() => logComm(e.id, "proposal")}>Proposal</Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/events/${e.id}`)}>View</Button>
                      <Select value={e.status} onValueChange={(v) => setStatus(e.id, v)}>
                        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Input className="col-span-2" placeholder="Event name*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vendor_paid">Vendor paid</SelectItem>
                <SelectItem value="organizer_paid">Organizer paid</SelectItem>
                <SelectItem value="free_attendance">Free attendance</SelectItem>
                <SelectItem value="activation_campaign">Activation campaign</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Venue name" value={form.venue_name} onChange={(e) => setForm({ ...form, venue_name: e.target.value })} />
            <Input className="col-span-2" placeholder="Location*" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input placeholder="Organizer name*" value={form.organizer_name} onChange={(e) => setForm({ ...form, organizer_name: e.target.value })} />
            <Input placeholder="Contact person*" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            <Input placeholder="Contact phone*" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <Input placeholder="Contact email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            <div><label className="text-xs text-muted-foreground">Start date*</label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">End date*</label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            <Input className="col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button className="w-full mt-3" onClick={create}>Create</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventsPage;