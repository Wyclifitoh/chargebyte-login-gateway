import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { RefreshCw, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, TableSkeleton, EmptyState, ErrorState, DetailRow } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMachines, useStations } from "@/hooks/useDashboardData";
import { formatDate } from "@/lib/format";
import { api } from "@/services/api";
import type { Station } from "@/types/dashboard";

type MachineRow = {
  id: string;
  name?: string;
  station_id?: string;
  station_name?: string;
  model?: string;
  qr_code?: string;
  status?: string;
  total_slots?: number;
  available_slots?: number;
  empty_slots?: number | null;
  busy_slots?: number | null;
  is_online?: number | boolean | null;
  is_active?: number | boolean;
  signal_strength?: number | null;
  deployed_at?: string | null;
  created_at?: string | null;
  last_synced_at?: string | null;
  manufacturer_cabinet_id?: string | null;
};

const machineSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  model: z.string().trim().min(1, "Required").max(50),
  qr_code: z.string().trim().min(1, "Required").max(50),
  station_id: z.string().optional(),
  total_slots: z.coerce.number().min(1).max(50),
});
type MachineFormValues = z.infer<typeof machineSchema>;

const emptyMachine: MachineFormValues = {
  name: "",
  model: "",
  qr_code: "",
  station_id: "",
  total_slots: 8,
};

const MachinesPage = () => {
  const { data: machines, isLoading, error, isFallback, refetch } = useMachines();
  const stationsQ = useStations();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MachineRow | null>(null);
  const [viewing, setViewing] = useState<MachineRow | null>(null);

  const rows = machines as unknown as MachineRow[];
  const stationOptions = useMemo(
    () => ((stationsQ.data as Station[]) || []).map((s) => ({ id: s.id, name: s.name })),
    [stationsQ.data],
  );
  const stationNameFor = (m: MachineRow) =>
    m.station_name || stationOptions.find((s) => s.id === m.station_id)?.name || "—";

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(machineSchema),
    defaultValues: emptyMachine,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyMachine);
    setDialogOpen(true);
  };

  const openEdit = (m: MachineRow) => {
    setEditing(m);
    form.reset({
      name: m.name ?? "",
      model: m.model ?? "",
      qr_code: m.qr_code ?? "",
      station_id: m.station_id ?? "",
      total_slots: m.total_slots ?? 8,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: MachineFormValues) => {
    try {
      if (!editing && !data.station_id) {
        form.setError("station_id", { message: "Required" });
        return;
      }

      const payload = editing
        ? {
            name: data.name,
            model: data.model,
            qr_code: data.qr_code,
            total_slots: data.total_slots,
            station_id: data.station_id,
          }
        : data;

      const res = editing
        ? await api.machines.update(editing.id, payload)
        : await api.machines.create(payload);
      
      if (!res.success) throw new Error(res.error || "Failed");
      
      toast.success(editing ? "Machine updated" : "Machine created");
      setDialogOpen(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const removeMachine = async (id: string) => {
    if (!confirm("Delete this machine?")) return;
    const res = await api.machines.delete(id);
    if (res.success) {
      toast.success("Machine deleted");
      refetch();
    } else toast.error(res.error || "Failed");
  };

  const runSync = async (id: string) => {
    setSyncing(id);
    try {
      const res = await api.machines.sync(id);
      if (res.success) {
        toast.success("Cabinet synced");
        refetch();
      } else {
        toast.error(res.error || "Sync failed");
      }
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machines"
        description="Every cabinet mapped to its location, with live manufacturer telemetry."
      />

      {isFallback && !isLoading && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          Showing demo data — backend unreachable.
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add Machine
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load machines" message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            title="No machines registered"
            description="Add your first charging machine to get started."
          />
        </div>
      ) : (
        <DataTable
          data={rows}
          searchKey="name"
          searchPlaceholder="Search machines..."
          columns={[
            {
              key: "model",
              label: "Device ID",
              render: (v, row: MachineRow) => (
                <div>
                  <div className="font-mono text-xs">{v ? String(v) : "—"}</div>
                  <div className="text-xs text-muted-foreground">{row.name || "Unnamed"}</div>
                </div>
              ),
            },
            {
              key: "station_name",
              label: "Location",
              render: (_v, row: MachineRow) => stationNameFor(row),
            },
            {
              key: "status",
              label: "Status",
              render: (v, row: MachineRow) => (
                <StatusBadge status={row.is_online ? "online" : String(v || "offline")} />
              ),
            },
            {
              key: "empty_slots",
              label: "Slots (free/busy/total)",
              render: (_v, row: MachineRow) =>
                `${row.empty_slots ?? "—"} / ${row.busy_slots ?? "—"} / ${row.total_slots ?? "—"}`,
            },
            {
              key: "deployed_at",
              label: "Date of Deployment",
              render: (v, row: MachineRow) => {
                const d = v || row.created_at;
                return <span>{d ? formatDate(String(d)) : "—"}</span>;
              },
            },
            {
              key: "id",
              label: "Sync",
              render: (_v, row: MachineRow) => (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!row.model || syncing === row.id}
                    onClick={() => runSync(row.id)}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1 ${syncing === row.id ? "animate-spin" : ""}`}
                    />
                    Sync
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(row)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeMachine(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Machine" : "Add New Machine"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Machine Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Charger Alpha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device ID / Model</FormLabel>
                      <FormControl>
                        <Input placeholder="DTN03050" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="qr_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Code</FormLabel>
                      <FormControl>
                        <Input placeholder="QR-CB001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="station_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stationOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_slots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Slots</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full">
                {editing ? "Update Machine" : "Create Machine"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{viewing?.name || "Machine"}</SheetTitle>
          </SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-1">
              <DetailRow label="Device ID" value={viewing.model || "—"} />
              <DetailRow label="Cabinet ID" value={viewing.manufacturer_cabinet_id || "—"} />
              <DetailRow label="Location" value={stationNameFor(viewing)} />
              <DetailRow label="QR Code" value={viewing.qr_code || "—"} />
              <DetailRow
                label="Status"
                value={<StatusBadge status={viewing.is_online ? "online" : String(viewing.status || "offline")} />}
              />
              <DetailRow label="Signal" value={viewing.signal_strength == null ? "—" : String(viewing.signal_strength)} />
              <DetailRow
                label="Slots"
                value={`${viewing.empty_slots ?? "—"} free / ${viewing.busy_slots ?? "—"} busy / ${viewing.total_slots ?? "—"}`}
              />
              <DetailRow
                label="Deployed"
                value={viewing.deployed_at ? formatDate(String(viewing.deployed_at)) : "—"}
              />
              <DetailRow
                label="Last sync"
                value={viewing.last_synced_at ? formatDate(String(viewing.last_synced_at)) : "—"}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MachinesPage;