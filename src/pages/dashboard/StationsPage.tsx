import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import { mockExtendedStations, mockExtendedMachines, ExtendedStation, ExtendedMachine } from "@/data/extendedMockData";
import { Search, Plus, Eye, Pencil, Power, Wrench, MapPin, Cpu } from "lucide-react";
import { toast } from "sonner";

const stationSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  address: z.string().trim().min(1, "Required").max(200),
  county_name: z.string().trim().min(1, "Required").max(50),
  host_partner: z.string().trim().min(1, "Required").max(100),
  revenue_share_percent: z.coerce.number().min(0).max(100),
  open_hours: z.string().trim().min(1, "Required").max(50),
});

const machineSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  model: z.string().trim().min(1, "Required").max(50),
  qr_code: z.string().trim().min(1, "Required").max(50),
  station_id: z.string().min(1, "Required"),
  total_slots: z.coerce.number().min(1).max(50),
});

type StationFormValues = z.infer<typeof stationSchema>;
type MachineFormValues = z.infer<typeof machineSchema>;

const StationsTab = () => {
  const [stations, setStations] = useState(mockExtendedStations);
  const [search, setSearch] = useState("");
  const [filterCounty, setFilterCounty] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExtendedStation | null>(null);
  const [viewing, setViewing] = useState<ExtendedStation | null>(null);

  const form = useForm<StationFormValues>({ resolver: zodResolver(stationSchema), defaultValues: { name: "", address: "", county_name: "", host_partner: "", revenue_share_percent: 10, open_hours: "" } });

  const counties = [...new Set(stations.map((s) => s.county_name))];

  const filtered = stations.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase());
    const matchCounty = filterCounty === "all" || s.county_name === filterCounty;
    return matchSearch && matchCounty;
  });

  const openCreate = () => { setEditing(null); form.reset({ name: "", address: "", county_name: "", host_partner: "", revenue_share_percent: 10, open_hours: "" }); setDialogOpen(true); };
  const openEdit = (s: ExtendedStation) => { setEditing(s); form.reset({ name: s.name, address: s.address, county_name: s.county_name, host_partner: s.host_partner, revenue_share_percent: s.revenue_share_percent, open_hours: s.open_hours }); setDialogOpen(true); };

  const onSubmit = (data: StationFormValues) => {
    if (editing) {
      setStations((prev) => prev.map((s) => s.id === editing.id ? { ...s, name: data.name, address: data.address, county_name: data.county_name, host_partner: data.host_partner, revenue_share_percent: data.revenue_share_percent, open_hours: data.open_hours } : s));
      toast.success("Station updated");
    } else {
      const newStation: ExtendedStation = { name: data.name, address: data.address, county_name: data.county_name, host_partner: data.host_partner, revenue_share_percent: data.revenue_share_percent, open_hours: data.open_hours, id: `S${String(stations.length + 1).padStart(3, "0")}`, latitude: 0, longitude: 0, is_active: true, machines_count: 0, features: [], image_url: "", created_at: new Date().toISOString().split("T")[0] };
      setStations((prev) => [...prev, newStation]);
      toast.success("Station created");
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => {
    setStations((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !s.is_active } : s));
    toast.success("Station status toggled");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search stations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterCounty} onValueChange={setFilterCounty}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="County" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Add Station</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Address</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">County</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Host Partner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Revenue %</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hours</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Machines</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3 text-foreground">{s.address}</td>
                  <td className="px-4 py-3 text-foreground">{s.county_name}</td>
                  <td className="px-4 py-3 text-foreground">{s.host_partner}</td>
                  <td className="px-4 py-3 text-foreground">{s.revenue_share_percent}%</td>
                  <td className="px-4 py-3 text-foreground">{s.open_hours}</td>
                  <td className="px-4 py-3 text-foreground">{s.machines_count}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.is_active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(s)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(s.id)}><Power className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No stations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Station Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Station" : "Add New Station"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Station Name</FormLabel><FormControl><Input placeholder="Downtown Hub" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="county_name" render={({ field }) => (<FormItem><FormLabel>County</FormLabel><FormControl><Input placeholder="Nairobi" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="host_partner" render={({ field }) => (<FormItem><FormLabel>Host Partner</FormLabel><FormControl><Input placeholder="Partner name" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="revenue_share_percent" render={({ field }) => (<FormItem><FormLabel>Revenue Share %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="open_hours" render={({ field }) => (<FormItem><FormLabel>Open Hours</FormLabel><FormControl><Input placeholder="06:00 - 22:00" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <Button type="submit" className="w-full">{editing ? "Update Station" : "Create Station"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Station Detail Sheet */}
      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{viewing?.name}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-4 text-sm">
              <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground ml-2">{viewing.address}</span></div>
              <div><span className="text-muted-foreground">County:</span> <span className="text-foreground ml-2">{viewing.county_name}</span></div>
              <div><span className="text-muted-foreground">Host Partner:</span> <span className="text-foreground ml-2">{viewing.host_partner}</span></div>
              <div><span className="text-muted-foreground">Revenue Share:</span> <span className="text-foreground ml-2">{viewing.revenue_share_percent}%</span></div>
              <div><span className="text-muted-foreground">Open Hours:</span> <span className="text-foreground ml-2">{viewing.open_hours}</span></div>
              <div><span className="text-muted-foreground">Machines:</span> <span className="text-foreground ml-2">{viewing.machines_count}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={viewing.is_active ? "active" : "inactive"} /></span></div>
              <div><span className="text-muted-foreground">Features:</span> <span className="text-foreground ml-2">{viewing.features.join(", ") || "None"}</span></div>
              <div><span className="text-muted-foreground">Coordinates:</span> <span className="text-foreground ml-2">{viewing.latitude}, {viewing.longitude}</span></div>
              <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground ml-2">{viewing.created_at}</span></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const MachinesTab = () => {
  const [machines, setMachines] = useState(mockExtendedMachines);
  const [search, setSearch] = useState("");
  const [filterStation, setFilterStation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExtendedMachine | null>(null);
  const [viewing, setViewing] = useState<ExtendedMachine | null>(null);

  const form = useForm<MachineFormValues>({ resolver: zodResolver(machineSchema), defaultValues: { name: "", model: "", qr_code: "", station_id: "", total_slots: 8 } });

  const stationNames = [...new Set(machines.map((m) => m.station))];

  const filtered = machines.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.qr_code.toLowerCase().includes(search.toLowerCase());
    const matchStation = filterStation === "all" || m.station === filterStation;
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    return matchSearch && matchStation && matchStatus;
  });

  const openCreate = () => { setEditing(null); form.reset({ name: "", model: "", qr_code: "", station_id: "", total_slots: 8 }); setDialogOpen(true); };
  const openEdit = (m: ExtendedMachine) => { setEditing(m); form.reset({ name: m.name, model: m.model, qr_code: m.qr_code, station_id: m.station_id, total_slots: m.total_slots }); setDialogOpen(true); };

  const onSubmit = (data: MachineFormValues) => {
    const station = mockExtendedStations.find((s) => s.id === data.station_id);
    if (editing) {
      setMachines((prev) => prev.map((m) => m.id === editing.id ? { ...m, name: data.name, model: data.model, qr_code: data.qr_code, station_id: data.station_id, total_slots: data.total_slots, station: station?.name || m.station } : m));
      toast.success("Machine updated");
    } else {
      const newMachine: ExtendedMachine = { name: data.name, model: data.model, qr_code: data.qr_code, station_id: data.station_id, total_slots: data.total_slots, id: `CB-${String(machines.length + 30).padStart(3, "0")}`, station: station?.name || "", available_slots: data.total_slots, status: "online", is_active: true, last_maintenance: new Date().toISOString().split("T")[0], created_at: new Date().toISOString().split("T")[0] };
      setMachines((prev) => [...prev, newMachine]);
      toast.success("Machine created");
    }
    setDialogOpen(false);
  };

  const toggleActive = (id: string) => { setMachines((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !m.is_active } : m)); toast.success("Machine status toggled"); };
  const setMaintenance = (id: string) => { setMachines((prev) => prev.map((m) => m.id === id ? { ...m, status: "maintenance" as const, last_maintenance: new Date().toISOString().split("T")[0] } : m)); toast.success("Machine set to maintenance"); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search machines..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterStation} onValueChange={setFilterStation}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Station" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {stationNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="faulty">Faulty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Add Machine</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">QR Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Slots</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Available</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Maintenance</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{m.qr_code}</td>
                  <td className="px-4 py-3 text-foreground">{m.model}</td>
                  <td className="px-4 py-3 text-foreground">{m.station}</td>
                  <td className="px-4 py-3 text-foreground">{m.total_slots}</td>
                  <td className="px-4 py-3 text-foreground">{m.available_slots}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  <td className="px-4 py-3 text-foreground">{m.last_maintenance}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.is_active ? "active" : "inactive"} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(m)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMaintenance(m.id)}><Wrench className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(m.id)}><Power className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No machines found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Machine" : "Add New Machine"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Machine Name</FormLabel><FormControl><Input placeholder="Charger Alpha" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="CB-X200" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="qr_code" render={({ field }) => (<FormItem><FormLabel>QR Code</FormLabel><FormControl><Input placeholder="QR-CB001" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="station_id" render={({ field }) => (
                  <FormItem><FormLabel>Station</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                      <SelectContent>
                        {mockExtendedStations.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="total_slots" render={({ field }) => (<FormItem><FormLabel>Total Slots</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <Button type="submit" className="w-full">{editing ? "Update Machine" : "Create Machine"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{viewing?.name}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-4 text-sm">
              <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground ml-2">{viewing.id}</span></div>
              <div><span className="text-muted-foreground">Model:</span> <span className="text-foreground ml-2">{viewing.model}</span></div>
              <div><span className="text-muted-foreground">QR Code:</span> <span className="text-foreground ml-2 font-mono">{viewing.qr_code}</span></div>
              <div><span className="text-muted-foreground">Station:</span> <span className="text-foreground ml-2">{viewing.station}</span></div>
              <div><span className="text-muted-foreground">Total Slots:</span> <span className="text-foreground ml-2">{viewing.total_slots}</span></div>
              <div><span className="text-muted-foreground">Available Slots:</span> <span className="text-foreground ml-2">{viewing.available_slots}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={viewing.status} /></span></div>
              <div><span className="text-muted-foreground">Active:</span> <span className="ml-2"><StatusBadge status={viewing.is_active ? "active" : "inactive"} /></span></div>
              <div><span className="text-muted-foreground">Last Maintenance:</span> <span className="text-foreground ml-2">{viewing.last_maintenance}</span></div>
              <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground ml-2">{viewing.created_at}</span></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const StationsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">Stations & Machines</h1>
    <Tabs defaultValue="stations" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-xs">
        <TabsTrigger value="stations"><MapPin className="h-4 w-4 mr-1" />Stations</TabsTrigger>
        <TabsTrigger value="machines"><Cpu className="h-4 w-4 mr-1" />Machines</TabsTrigger>
      </TabsList>
      <TabsContent value="stations" className="mt-4"><StationsTab /></TabsContent>
      <TabsContent value="machines" className="mt-4"><MachinesTab /></TabsContent>
    </Tabs>
  </div>
);

export default StationsPage;
