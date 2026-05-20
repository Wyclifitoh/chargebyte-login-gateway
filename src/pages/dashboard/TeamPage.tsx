import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
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
import type { TeamMember, TeamCategory } from "@/types/dashboard";

const CATEGORY_LABEL: Record<TeamCategory, string> = {
  core: "Core Team",
  agent: "Agents",
  consultant: "Consultants",
};

const emptyForm = { full_name: "", email: "", phone: "", category: "agent" as TeamCategory, title: "" };

const TeamPage = () => {
  const { user } = useAuth();
  const canEdit = user?.role === "super_admin" || user?.role === "admin";
  const canDelete = user?.role === "super_admin";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TeamCategory>("core");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TeamMember | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.team.list();
    if (res.success) setMembers((res.data as TeamMember[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, category: tab }); setDialogOpen(true); };
  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      email: m.email || "",
      phone: m.phone || "",
      category: m.category,
      title: m.title || "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = editing
        ? await api.team.update(editing.id, form)
        : await api.team.create(form);
      if (!res.success) throw new Error(res.error || "Failed");
      toast.success(editing ? "Team member updated" : "Team member added");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const res = await api.team.remove(confirmDelete.id);
    if (res.success) { toast.success("Removed"); load(); }
    else toast.error(res.error || "Failed");
    setConfirmDelete(null);
  };

  const filtered = members.filter((m) => m.category === tab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Directory"
        description="Manage core team, agents, and consultants"
        actions={canEdit ? (
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Member</Button>
        ) : undefined}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as TeamCategory)}>
        <TabsList>
          {(["core", "agent", "consultant"] as TeamCategory[]).map((c) => (
            <TabsTrigger key={c} value={c}>
              {CATEGORY_LABEL[c]} ({members.filter((m) => m.category === c).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(["core", "agent", "consultant"] as TeamCategory[]).map((c) => (
          <TabsContent key={c} value={c} className="mt-4">
            {loading ? (
              <TableSkeleton rows={6} columns={4} />
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6 text-muted-foreground" />} title="No members" description={`No ${CATEGORY_LABEL[c]} yet`} />
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Title</th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">Phone</th>
                      <th className="text-left px-4 py-2">Status</th>
                      {canEdit && <th className="text-right px-4 py-2">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-2 font-medium">{m.full_name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.title || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.email || "—"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{m.phone || "—"}</td>
                        <td className="px-4 py-2">
                          <Badge variant={m.is_active ? "default" : "secondary"}>
                            {m.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        {canEdit && (
                          <td className="px-4 py-2 text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(m)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TeamCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="core">Core Team</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Remove team member?"
        description={`This will remove ${confirmDelete?.full_name}. This action cannot be undone.`}
        onConfirm={remove}
      />
    </div>
  );
};

export default TeamPage;
