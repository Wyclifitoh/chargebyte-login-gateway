import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, FilterBar, FallbackBanner, TableSkeleton, ConfirmDialog } from "@/components/shared";
import { Megaphone, Eye, MousePointerClick, DollarSign } from "lucide-react";
import { useCampaigns, useStations, useAdClients } from "@/hooks/useDashboardData";
import { formatKsh } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  client_id: z.string().optional(),
  start_date: z.string().min(1, "Required"),
  end_date: z.string().min(1, "Required"),
  spend: z.coerce.number().min(0).optional(),
  status: z.enum(["scheduled", "active", "paused", "completed"]),
});
type FormValues = z.infer<typeof schema>;

interface CampaignRow {
  id: string;
  name: string;
  client_id?: string;
  client_name?: string;
  start_date?: string;
  end_date?: string;
  locations?: string[] | null;
  impressions?: number;
  interactions?: number;
  ctr?: number;
  spend?: number;
  status: string;
}

const CampaignsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "super_admin" || user?.role === "admin";
  const campaignsQ = useCampaigns();
  const stationsQ = useStations();
  const clientsQ = useAdClients();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<CampaignRow | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", client_id: "", start_date: "", end_date: "", spend: 0, status: "scheduled" },
  });

  const data = campaignsQ.data as unknown as CampaignRow[];
  const filtered = useMemo(() => {
    let d = data;
    if (statusFilter !== "all") d = d.filter((c) => c.status === statusFilter);
    return d;
  }, [data, statusFilter]);

  const totalImpressions = filtered.reduce((s, c) => s + Number(c.impressions || 0), 0);
  const totalInteractions = filtered.reduce((s, c) => s + Number(c.interactions || 0), 0);
  const totalSpend = filtered.reduce((s, c) => s + Number(c.spend || 0), 0);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", client_id: "", start_date: "", end_date: "", spend: 0, status: "scheduled" });
    setDialogOpen(true);
  };
  const openEdit = (c: CampaignRow) => {
    setEditing(c);
    form.reset({
      name: c.name,
      client_id: c.client_id || "",
      start_date: c.start_date?.slice(0, 10) || "",
      end_date: c.end_date?.slice(0, 10) || "",
      spend: Number(c.spend || 0),
      status: (["scheduled", "active", "paused", "completed"].includes(c.status) ? c.status : "scheduled") as FormValues["status"],
    });
    setDialogOpen(true);
  };

  const onSubmit = async (v: FormValues) => {
    const payload: Record<string, unknown> = {
      name: v.name, client_id: v.client_id || null,
      start_date: v.start_date, end_date: v.end_date,
      spend: v.spend ?? 0, status: v.status,
    };
    if (v.client_id) {
      const c = clientsQ.data.find((x) => x.id === v.client_id);
      payload.client_name = c?.name;
    }
    const res = editing
      ? await api.campaigns.update(editing.id, payload)
      : await api.campaigns.create(payload);
    if (res.success) { toast.success(editing ? "Campaign updated" : "Campaign created"); setDialogOpen(false); campaignsQ.refetch(); }
    else toast.error(res.error || "Failed");
  };

  const onDelete = async () => {
    if (!confirmDel) return;
    const res = await api.campaigns.delete(confirmDel.id);
    if (res.success) { toast.success("Deleted"); campaignsQ.refetch(); }
    else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Campaigns" description="Manage and track advertising campaigns" />
        {isAdmin && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Campaign</Button>}
      </div>

      {(campaignsQ.isFallback || stationsQ.isFallback) && !campaignsQ.isLoading &&
        <FallbackBanner onRetry={() => { campaignsQ.refetch(); stationsQ.refetch(); }} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Campaigns" value={filtered.length} icon={<Megaphone className="h-5 w-5" />} />
        <MetricCard title="Impressions" value={totalImpressions.toLocaleString()} icon={<Eye className="h-5 w-5" />} />
        <MetricCard title="Interactions" value={totalInteractions.toLocaleString()} icon={<MousePointerClick className="h-5 w-5" />} />
        <MetricCard title="Total Spend" value={formatKsh(totalSpend)} icon={<DollarSign className="h-5 w-5" />} />
      </div>

      <FilterBar>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {campaignsQ.isLoading ? (
        <TableSkeleton rows={6} columns={9} />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Campaign</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">End</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Impressions</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">CTR</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Spend</th>
              {isAdmin && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-foreground">{c.client_name || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-foreground">{c.start_date?.slice(0, 10) || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{c.end_date?.slice(0, 10) || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{Number(c.impressions || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">{Number(c.ctr || 0).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-foreground">{formatKsh(c.spend)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No campaigns found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="client_id" render={({ field }) => (
                <FormItem><FormLabel>Advertising Client</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {clientsQ.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem><FormLabel>Start</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem><FormLabel>End</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="spend" render={({ field }) => (
                  <FormItem><FormLabel>Spend (Ksh)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" className="w-full">{editing ? "Save" : "Create"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete campaign?" description={`Remove ${confirmDel?.name}?`}
        variant="destructive" confirmLabel="Delete" onConfirm={onDelete}
      />
    </div>
  );
};

export default CampaignsPage;
