import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, FilterBar, EmptyState, DetailRow, TableSkeleton, FallbackBanner } from "@/components/shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mockExtendedStations, ExtendedStation } from "@/data/extendedMockData";
import { useStations } from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import type { Station } from "@/types/dashboard";
import { Plus, Eye, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

const stationSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  address: z.string().trim().min(1, "Required").max(200),
  county_name: z.string().trim().min(1, "Required").max(50),
  host_partner: z.string().trim().min(1, "Required").max(100),
  revenue_share_percent: z.coerce.number().min(0).max(100),
  open_hours: z.string().trim().min(1, "Required").max(50),
});

type StationFormValues = z.infer<typeof stationSchema>;

const StationsTab = () => {
  const stationsQ = useStations();
  const [stations, setStations] = useState<ExtendedStation[]>(mockExtendedStations);
  const [search, setSearch] = useState("");
  const [filterCounty, setFilterCounty] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExtendedStation | null>(null);
  const [viewing, setViewing] = useState<ExtendedStation | null>(null);

  useEffect(() => {
    if (stationsQ.isLoading || stationsQ.isFallback) return;
    const mapped: ExtendedStation[] = (stationsQ.data as Station[]).map((s) => ({
      id: s.id,
      name: s.name,
      address: s.address,
      county_name: s.county_name,
      latitude: s.latitude,
      longitude: s.longitude,
      host_partner: s.host_partner_id ?? "—",
      revenue_share_percent: s.revenue_share_percent,
      open_hours: s.open_hours,
      is_active: s.is_active,
      machines_count: s.machines_count ?? 0,
      features: s.features ?? [],
      image_url: s.image_url,
      created_at: s.created_at,
    }));
    setStations(mapped);
  }, [stationsQ.data, stationsQ.isLoading, stationsQ.isFallback]);

  const form = useForm<StationFormValues>({ resolver: zodResolver(stationSchema), defaultValues: { name: "", address: "", county_name: "", host_partner: "", revenue_share_percent: 10, open_hours: "" } });

  const counties = [...new Set(stations.map((s) => s.county_name))];
  const filtered = stations.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase());
    const matchCounty = filterCounty === "all" || s.county_name === filterCounty;
    return matchSearch && matchCounty;
  });

  const openCreate = () => { setEditing(null); form.reset({ name: "", address: "", county_name: "", host_partner: "", revenue_share_percent: 10, open_hours: "" }); setDialogOpen(true); };
  const openEdit = (s: ExtendedStation) => { setEditing(s); form.reset({ name: s.name, address: s.address, county_name: s.county_name, host_partner: s.host_partner, revenue_share_percent: s.revenue_share_percent, open_hours: s.open_hours }); setDialogOpen(true); };

  const onSubmit = async (data: StationFormValues) => {
    try {
      const payload = {
        name: data.name,
        address: data.address,
        county_name: data.county_name,
        host_partner_id: data.host_partner || null,
        revenue_share_percent: data.revenue_share_percent,
        open_hours: data.open_hours,
      };
      const res = editing ? await api.stations.update(editing.id, payload) : await api.stations.create(payload);
      if (!res.success) throw new Error(res.error || "Failed");
      toast.success(editing ? "Station updated" : "Station created");
      setDialogOpen(false);
      stationsQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const toggleActive = async (s: ExtendedStation) => {
    const res = await api.stations.update(s.id, { is_active: !s.is_active });
    if (res.success) { toast.success("Station status toggled"); stationsQ.refetch(); }
    else toast.error(res.error || "Failed");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this station?")) return;
    const res = await api.stations.delete(id);
    if (res.success) { toast.success("Station deleted"); stationsQ.refetch(); }
    else toast.error(res.error || "Failed");
  };

  return (
    <div className="space-y-4">
      {stationsQ.isFallback && !stationsQ.isLoading && <FallbackBanner onRetry={stationsQ.refetch} />}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search stations...">
          <Select value={filterCounty} onValueChange={setFilterCounty}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="County" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {counties.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterBar>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Add Station</Button>
      </div>

      {stationsQ.isLoading ? <TableSkeleton rows={6} columns={9} /> : (

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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(s)}><Power className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9}><EmptyState title="No stations found" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      )}

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

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{viewing?.name}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-1">
              <DetailRow label="Address" value={viewing.address} />
              <DetailRow label="County" value={viewing.county_name} />
              <DetailRow label="Host Partner" value={viewing.host_partner} />
              <DetailRow label="Revenue Share" value={`${viewing.revenue_share_percent}%`} />
              <DetailRow label="Open Hours" value={viewing.open_hours} />
              <DetailRow label="Machines" value={String(viewing.machines_count)} />
              <DetailRow label="Status" value={<StatusBadge status={viewing.is_active ? "active" : "inactive"} />} />
              <DetailRow label="Features" value={viewing.features.join(", ") || "None"} />
              <DetailRow label="Coordinates" value={`${viewing.latitude}, ${viewing.longitude}`} />
              <DetailRow label="Created" value={viewing.created_at} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
const StationsPage = () => (
  <div className="space-y-6">
    <PageHeader title="Stations" description="Manage charging locations. Machines are managed under Assets → Machines." />
    <StationsTab />
  </div>
);

export default StationsPage;
