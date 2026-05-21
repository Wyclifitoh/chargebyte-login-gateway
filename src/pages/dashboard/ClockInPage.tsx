import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut, ShieldCheck, ShieldAlert, Plus, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { ClockEvent, ClockWhitelist, Station } from "@/types/dashboard";

const REFRESH_MS = 7000;

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }); }
  catch { return iso; }
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

// --------- Staff/Agent self-clock UI ---------
const SelfClock = () => {
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await api.clockin.myEvents();
    if (res.success) setEvents((res.data as ClockEvent[]) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    api.stations.getAll().then((r) => { if (r.success) setStations((r.data as Station[]) || []); });
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const last = events.find((e) => e.status === "approved");
  const isClockedIn = last?.event_type === "clock_in";

  const submit = async (event_type: "clock_in" | "clock_out") => {
    if (event_type === "clock_in" && !stationId) { toast.error("Pick your location first"); return; }
    setBusy(true);
    try {
      const pos = await getPosition();
      const station = stations.find((s) => s.id === stationId);
      const res = await api.clockin.clock({
        event_type,
        latitude: pos?.coords.latitude,
        longitude: pos?.coords.longitude,
        accuracy: pos?.coords.accuracy,
        station_id: stationId || undefined,
        location_name: station?.name,
      });
      if (res.success) toast.success(event_type === "clock_in" ? "Clocked in" : "Clocked out");
      else toast.error(res.error || "Rejected — outside allowed area");
      load();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center text-center">
        <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-3 ${isClockedIn ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
          <Clock className="h-10 w-10" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">You are currently</p>
        <p className="text-2xl font-bold mb-4">{isClockedIn ? "Clocked In" : "Clocked Out"}</p>
        {last && (
          <p className="text-xs text-muted-foreground mb-4">
            Last: {last.event_type.replace("_", " ")} at {fmtTime(last.event_time)}
            {last.whitelist_name ? ` · ${last.whitelist_name}` : ""}
          </p>
        )}

        <div className="w-full max-w-sm mb-4">
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Location
          </label>
          <Select value={stationId} onValueChange={setStationId} disabled={isClockedIn}>
            <SelectTrigger><SelectValue placeholder="Choose station / location" /></SelectTrigger>
            <SelectContent>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => submit("clock_in")} disabled={busy || isClockedIn}>
            <LogIn className="h-4 w-4 mr-2" /> Clock In
          </Button>
          <Button variant="outline" onClick={() => submit("clock_out")} disabled={busy || !isClockedIn}>
            <LogOut className="h-4 w-4 mr-2" /> Clock Out
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4 max-w-md">
          You can only clock in from whitelisted networks / geo-fenced areas, and within allowed hours (04:00–24:00 EAT).
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-medium">Your recent activity</div>
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} columns={4} /></div>
        ) : events.length === 0 ? (
          <EmptyState icon={<Clock className="h-6 w-6 text-muted-foreground" />} title="No activity yet" description="Your clock events will appear here." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Location</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2 capitalize">{e.event_type.replace("_", " ")}</td>
                  <td className="px-4 py-2 text-muted-foreground">{fmtTime(e.event_time)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{(e as ClockEvent & { location_name?: string }).location_name || "—"}</td>
                  <td className="px-4 py-2">
                    {e.status === "approved" ? (
                      <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" />Approved</Badge>
                    ) : (
                      <Badge variant="destructive" title={e.reject_reason || ""}>
                        <ShieldAlert className="h-3 w-3 mr-1" />Rejected
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --------- Admin views ---------
type SummaryShape = {
  clocked_in: (ClockEvent & { location_name?: string })[];
  today: { total_events: number; clock_ins: number; clock_outs: number; rejected: number };
};

const AdminView = () => {
  const { user } = useAuth();
  const canDeleteWhitelist = user?.role === "super_admin";
  const [tab, setTab] = useState("live");
  const [summary, setSummary] = useState<SummaryShape | null>(null);
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [whitelist, setWhitelist] = useState<ClockWhitelist[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [wlOpen, setWlOpen] = useState(false);
  const [wlForm, setWlForm] = useState({ name: "", type: "ip" as "ip" | "cidr" | "geo", ip_cidr: "", latitude: "", longitude: "", radius_meters: "150", notes: "" });
  const [confirmDel, setConfirmDel] = useState<ClockWhitelist | null>(null);

  const loadLive = async () => {
    const [s, e] = await Promise.all([api.clockin.summary(), api.clockin.events({ limit: 100 })]);
    if (s.success) setSummary(s.data as SummaryShape);
    if (e.success) setEvents((e.data as ClockEvent[]) || []);
    setLoadingEvents(false);
  };
  const loadWhitelist = async () => {
    const w = await api.clockin.whitelist.list();
    if (w.success) setWhitelist((w.data as ClockWhitelist[]) || []);
  };

  useEffect(() => {
    loadLive();
    loadWhitelist();
    const t = setInterval(loadLive, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  const addWhitelist = async () => {
    if (!wlForm.name.trim()) { toast.error("Name required"); return; }
    const payload: Record<string, unknown> = { name: wlForm.name, type: wlForm.type, notes: wlForm.notes };
    if (wlForm.type === "geo") {
      payload.latitude = parseFloat(wlForm.latitude);
      payload.longitude = parseFloat(wlForm.longitude);
      payload.radius_meters = parseInt(wlForm.radius_meters, 10) || 150;
    } else {
      payload.ip_cidr = wlForm.ip_cidr;
    }
    const res = await api.clockin.whitelist.create(payload);
    if (res.success) {
      toast.success("Added"); setWlOpen(false);
      setWlForm({ name: "", type: "ip", ip_cidr: "", latitude: "", longitude: "", radius_meters: "150", notes: "" });
      loadWhitelist();
    } else toast.error(res.error || "Failed");
  };

  const removeWl = async () => {
    if (!confirmDel) return;
    const res = await api.clockin.whitelist.remove(confirmDel.id);
    if (res.success) { toast.success("Removed"); loadWhitelist(); } else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Currently In <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1" /></p>
          <p className="text-2xl font-bold">{summary?.clocked_in.length ?? "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Today Clock-ins</p>
          <p className="text-2xl font-bold">{Number(summary?.today?.clock_ins ?? 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Today Clock-outs</p>
          <p className="text-2xl font-bold">{Number(summary?.today?.clock_outs ?? 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Rejected Today</p>
          <p className="text-2xl font-bold text-destructive">{Number(summary?.today?.rejected ?? 0)}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="live">Currently Clocked In</TabsTrigger>
          <TabsTrigger value="events">Activity Log</TabsTrigger>
          <TabsTrigger value="whitelist">Allowed Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {(summary?.clocked_in.length ?? 0) === 0 ? (
            <EmptyState icon={<Clock className="h-6 w-6 text-muted-foreground" />} title="No one is clocked in" description="Approved clock-ins will appear here. Auto-refreshing." />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Member</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Location</th>
                    <th className="text-left px-4 py-2">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {summary!.clocked_in.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{r.member_name || r.user_name}</td>
                      <td className="px-4 py-2 capitalize text-muted-foreground">{r.member_category || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.location_name || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtTime(r.event_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {loadingEvents ? (
            <TableSkeleton rows={8} columns={5} />
          ) : events.length === 0 ? (
            <EmptyState icon={<Clock className="h-6 w-6 text-muted-foreground" />} title="No events" description="No clock activity yet." />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Member</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Time</th>
                    <th className="text-left px-4 py-2">Location</th>
                    <th className="text-left px-4 py-2">IP</th>
                    <th className="text-left px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{e.member_name || e.user_name || e.user_email}</td>
                      <td className="px-4 py-2 capitalize">{e.event_type.replace("_", " ")}</td>
                      <td className="px-4 py-2 text-muted-foreground">{fmtTime(e.event_time)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{(e as ClockEvent & { location_name?: string }).location_name || e.whitelist_name || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{e.ip_address || "—"}</td>
                      <td className="px-4 py-2">
                        {e.status === "approved" ? (
                          <Badge variant="default"><ShieldCheck className="h-3 w-3 mr-1" />Approved</Badge>
                        ) : (
                          <Badge variant="destructive" title={e.reject_reason || ""}>
                            <ShieldAlert className="h-3 w-3 mr-1" />Rejected
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="whitelist" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setWlOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Allowed Area</Button>
          </div>
          {whitelist.length === 0 ? (
            <EmptyState icon={<MapPin className="h-6 w-6 text-muted-foreground" />} title="No whitelist yet" description="Add allowed IPs/CIDRs or geo-fences to enable clock-in." />
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Value</th>
                    <th className="text-left px-4 py-2">Status</th>
                    {canDeleteWhitelist && <th className="px-4 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{w.name}</td>
                      <td className="px-4 py-2 uppercase text-xs">{w.type}</td>
                      <td className="px-4 py-2 text-muted-foreground font-mono text-xs">
                        {w.type === "geo" ? `${w.latitude}, ${w.longitude} (±${w.radius_meters}m)` : w.ip_cidr}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={w.is_active ? "default" : "secondary"}>{w.is_active ? "Active" : "Disabled"}</Badge>
                      </td>
                      {canDeleteWhitelist && (
                        <td className="px-4 py-2 text-right">
                          <Button size="icon" variant="ghost" onClick={() => setConfirmDel(w)}>
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
        </TabsContent>
      </Tabs>

      <Dialog open={wlOpen} onOpenChange={setWlOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Allowed Area</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name (e.g. Office WiFi)" value={wlForm.name} onChange={(e) => setWlForm({ ...wlForm, name: e.target.value })} />
            <Select value={wlForm.type} onValueChange={(v) => setWlForm({ ...wlForm, type: v as "ip" | "cidr" | "geo" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ip">Single IP</SelectItem>
                <SelectItem value="cidr">CIDR range</SelectItem>
                <SelectItem value="geo">Geo-fence (lat/lng + radius)</SelectItem>
              </SelectContent>
            </Select>
            {wlForm.type === "geo" ? (
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Latitude" value={wlForm.latitude} onChange={(e) => setWlForm({ ...wlForm, latitude: e.target.value })} />
                <Input placeholder="Longitude" value={wlForm.longitude} onChange={(e) => setWlForm({ ...wlForm, longitude: e.target.value })} />
                <Input placeholder="Radius (m)" value={wlForm.radius_meters} onChange={(e) => setWlForm({ ...wlForm, radius_meters: e.target.value })} />
              </div>
            ) : (
              <Input
                placeholder={wlForm.type === "cidr" ? "e.g. 41.90.0.0/16" : "e.g. 41.90.12.34"}
                value={wlForm.ip_cidr}
                onChange={(e) => setWlForm({ ...wlForm, ip_cidr: e.target.value })}
              />
            )}
            <Input placeholder="Notes (optional)" value={wlForm.notes} onChange={(e) => setWlForm({ ...wlForm, notes: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWlOpen(false)}>Cancel</Button>
              <Button onClick={addWhitelist}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Remove this allowed area?"
        description={`Members will no longer be able to clock in from "${confirmDel?.name}".`}
        onConfirm={removeWl}
      />
    </div>
  );
};

const ClockInPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader title="Clock In / Out" description={isAdmin ? "Monitor live attendance and manage allowed areas" : "Clock in or out for your shift"} />
      {isAdmin ? <AdminView /> : <SelfClock />}
    </div>
  );
};

export default ClockInPage;
