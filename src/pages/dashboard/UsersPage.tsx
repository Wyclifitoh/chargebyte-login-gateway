import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import StatusBadge from "@/components/StatusBadge";
import {
  PageHeader, TableSkeleton, EmptyState, ErrorState, FallbackBanner, ConfirmDialog,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useUsers } from "@/hooks/useDashboardData";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { ROLE_LABELS, type UserRole } from "@/types/dashboard";

const ROLES: UserRole[] = ["super_admin", "staff", "location_partner", "funding_partner", "ad_client"];

const userSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(["super_admin", "staff", "location_partner", "funding_partner", "ad_client"]),
  password: z.string().min(6, "Min 6 chars").optional().or(z.literal("")),
});
type UserFormValues = z.infer<typeof userSchema>;

interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_active?: number | boolean;
}

const UsersPage = () => {
  const { user: me } = useAuth();
  const isSuperAdmin = me?.role === "super_admin";
  const { data: users, isLoading, error, isFallback, refetch } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SystemUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", phone: "", role: "staff", password: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", email: "", phone: "", role: "staff", password: "" });
    setDialogOpen(true);
  };
  const openEdit = (u: SystemUser) => {
    setEditing(u);
    const role = (ROLES as string[]).includes(u.role) ? (u.role as UserFormValues["role"]) : "staff";
    form.reset({
      name: u.name, email: u.email, phone: u.phone || "",
      role, password: "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (!data.password) delete payload.password;
      const res = editing
        ? await api.users.update(editing.id, payload)
        : await api.users.create(payload);
      if (res.success) {
        toast.success(editing ? "User updated" : "User created");
        setDialogOpen(false);
        refetch();
      } else toast.error(res.error || "Failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await api.users.delete(confirmDelete.id);
      if (res.success) { toast.success("User deleted"); refetch(); }
      else toast.error(res.error || "Failed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setConfirmDelete(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="User Management" description="Manage system users and roles" />
        {isSuperAdmin && (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add User</Button>
        )}
      </div>

      {isFallback && <FallbackBanner onRetry={refetch} />}

      {isLoading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load users" message={error} onRetry={refetch} />
      ) : (users as SystemUser[]).length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState icon={<Users className="h-6 w-6 text-muted-foreground" />}
            title="No users yet" description="Invite team members to get started." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              {isSuperAdmin && <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>}
            </tr></thead>
            <tbody>
              {(users as SystemUser[]).map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.is_active ? "active" : "cancelled"} /></td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{editing ? "New Password (optional)" : "Password"}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving..." : editing ? "Save Changes" : "Create User"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Delete user?"
        description={`This will permanently remove ${confirmDelete?.name}.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={onDelete}
      />
    </div>
  );
};

export default UsersPage;
