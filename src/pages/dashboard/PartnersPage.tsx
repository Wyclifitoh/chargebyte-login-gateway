import { useState } from "react";
import { Plus, Trash2, Pencil, Link2, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  PageHeader, TableSkeleton, EmptyState, ErrorState, FallbackBanner, ConfirmDialog,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { usePartners, useStations, useMachines } from "@/hooks/useDashboardData";
import { api } from "@/services/api";

const partnerSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Min 6 chars"),
  role: z.enum(["location_partner", "funding_partner"]),
  partner_type: z.string().optional(),
  tier: z.string().optional(),
  revenue_share_percent: z.coerce.number().min(0).max(100).optional(),
});
type PartnerFormValues = z.infer<typeof partnerSchema>;

interface PartnerRow {
  id: string;
  partner_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  partner_code?: string;
  partner_type?: string;
  tier?: string;
  revenue_share_percent?: number;
  stations_count?: number;
  machines_count?: number;
  is_active?: number | boolean;
}

const PartnersPage = () => {
  const partnersQ = usePartners();
  const stationsQ = useStations();
  const machinesQ = useMachines();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PartnerRow | null>(null);
  const [assignFor, setAssignFor] = useState<PartnerRow | null>(null);
  const [stationToAssign, setStationToAssign] = useState("");
  const [machineToAssign, setMachineToAssign] = useState("");
  const [revShare, setRevShare] = useState("");

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "",
      role: "location_partner", partner_type: "location", tier: "standard", revenue_share_percent: 0 },
  });

  const partners = partnersQ.data as unknown as PartnerRow[];

  const onCreate = async (data: PartnerFormValues) => {
    const res = await api.partners.create(data);
    if (res.success) {
      toast.success("Partner created");
      setCreateOpen(false); form.reset(); partnersQ.refetch();
    } else toast.error(res.error || "Failed");
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    const res = await api.users.delete(confirmDelete.id);
    if (res.success) { toast.success("Partner removed"); partnersQ.refetch(); }
    else toast.error(res.error || "Failed");
    setConfirmDelete(null);
  };

  const assignStation = async () => {
    if (!assignFor || !stationToAssign) return;
    const res = await api.partners.assignStation({
      user_id: assignFor.id,
      station_id: stationToAssign,
      revenue_share_percent: revShare ? Number(revShare) : undefined,
    });
    if (res.success) { toast.success("Station assigned"); setStationToAssign(""); setRevShare(""); partnersQ.refetch(); stationsQ.refetch(); }
    else toast.error(res.error || "Failed");
  };

  const assignMachine = async () => {
    if (!assignFor?.partner_id || !machineToAssign) return;
    const res = await api.partners.assignMachine({
      partner_id: assignFor.partner_id, machine_id: machineToAssign,
    });
    if (res.success) { toast.success("Machine assigned"); setMachineToAssign(""); partnersQ.refetch(); }
    else toast.error(res.error || "Failed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Partners" description="Manage location & funding partners" />
        <Button onClick={() => { form.reset(); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Partner
        </Button>
      </div>

      {partnersQ.isFallback && <FallbackBanner onRetry={partnersQ.refetch} />}

      {partnersQ.isLoading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : partnersQ.error && !partnersQ.isFallback ? (
        <ErrorState title="Couldn't load partners" message={partnersQ.error} onRetry={partnersQ.refetch} />
      ) : partners.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
            title="No partners yet" description="Create a partner login to assign stations & machines." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tier</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rev %</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stations</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Machines</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}<div className="text-xs text-muted-foreground">{p.email}</div></td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{p.partner_code || "—"}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{(p.role || "").replace("_", " ")}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{p.tier || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{p.revenue_share_percent ?? 0}%</td>
                  <td className="px-4 py-3 text-foreground">{p.stations_count ?? 0}</td>
                  <td className="px-4 py-3 text-foreground">{p.machines_count ?? 0}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.is_active ? "active" : "cancelled"} /></td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setAssignFor(p)}>
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Partner</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Login Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="role" render={({ field }) => (
                  <FormItem><FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="location_partner">Location Partner</SelectItem>
                        <SelectItem value="funding_partner">Funding Partner</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tier" render={({ field }) => (
                  <FormItem><FormLabel>Tier</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="revenue_share_percent" render={({ field }) => (
                <FormItem><FormLabel>Revenue Share %</FormLabel>
                  <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full">Create Partner</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to {assignFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5">Assign Station (host)</label>
              <div className="flex gap-2">
                <Select value={stationToAssign} onValueChange={setStationToAssign}>
                  <SelectTrigger><SelectValue placeholder="Pick station" /></SelectTrigger>
                  <SelectContent>
                    {stationsQ.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Input className="mt-2" type="number" placeholder="Revenue share % (optional)"
                value={revShare} onChange={(e) => setRevShare(e.target.value)} />
              <Button size="sm" className="mt-2 w-full" onClick={assignStation} disabled={!stationToAssign}>Assign Station</Button>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Assign Machine</label>
              <Select value={machineToAssign} onValueChange={setMachineToAssign}>
                <SelectTrigger><SelectValue placeholder="Pick machine" /></SelectTrigger>
                <SelectContent>
                  {machinesQ.data.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} {m.station_name ? `· ${m.station_name}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="mt-2 w-full" onClick={assignMachine}
                disabled={!machineToAssign || !assignFor?.partner_id}>
                Assign Machine
              </Button>
              {!assignFor?.partner_id && (
                <p className="text-xs text-muted-foreground mt-1">Partner record missing — cannot assign machines.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Remove partner?"
        description={`This will delete the login for ${confirmDelete?.name}.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onDelete}
      />
    </div>
  );
};

export default PartnersPage;
