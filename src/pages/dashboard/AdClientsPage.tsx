import { useState } from "react";
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react";
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
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useAdClients, type AdClient } from "@/hooks/useDashboardData";
import { api } from "@/services/api";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  contact_email: z.string().trim().email("Valid email required"),
  contact_phone: z.string().trim().max(20).optional().or(z.literal("")),
  industry: z.string().trim().max(100).optional().or(z.literal("")),
  password: z.string().min(6, "Min 6 chars").optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

const AdClientsPage = () => {
  const { data: clients, isLoading, error, isFallback, refetch } = useAdClients();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdClient | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdClient | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contact_email: "", contact_phone: "", industry: "", password: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", contact_email: "", contact_phone: "", industry: "", password: "" });
    setDialogOpen(true);
  };
  const openEdit = (c: AdClient) => {
    setEditing(c);
    form.reset({
      name: c.name, contact_email: c.contact_email || "",
      contact_phone: c.contact_phone || "", industry: c.industry || "", password: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (v: FormValues) => {
    const payload: Record<string, unknown> = { ...v };
    if (!v.password) delete payload.password;
    const res = editing
      ? await api.adClients.update(editing.id, payload)
      : await api.adClients.create(payload);
    if (res.success) { toast.success(editing ? "Updated" : "Created"); setDialogOpen(false); refetch(); }
    else toast.error(res.error || "Failed");
  };

  const onDelete = async () => {
    if (!confirmDel) return;
    const res = await api.adClients.delete(confirmDel.id);
    if (res.success) { toast.success("Deleted"); refetch(); }
    else toast.error(res.error || "Failed");
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Advertising Clients" description="Brands and agencies running campaigns" />
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Client</Button>
      </div>

      {isFallback && <FallbackBanner onRetry={refetch} />}

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load clients" message={error} onRetry={refetch} />
      ) : clients.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState icon={<Briefcase className="h-6 w-6 text-muted-foreground" />}
            title="No advertising clients" description="Add your first ad client." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Industry</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-3 text-foreground">{c.contact_email || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{c.contact_phone || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{c.industry || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status || "active"} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="industry" render={({ field }) => (
                <FormItem><FormLabel>Industry</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{editing ? "New Login Password (optional)" : "Login Password (creates account)"}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full">{editing ? "Save" : "Create"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete client?" description={`Remove ${confirmDel?.name}?`}
        variant="destructive" confirmLabel="Delete" onConfirm={onDelete}
      />
    </div>
  );
};

export default AdClientsPage;
