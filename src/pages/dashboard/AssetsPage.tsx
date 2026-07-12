import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Download, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Asset, AssetCategory, AssetStatus, AssetSummary, AssignableStaff } from "@/types/dashboard";

const CATEGORIES: { key: AssetCategory; label: string; icon: string; color: string; bg: string }[] = [
  { key: "electronics", label: "Electronics", icon: "💻", color: "#2563EB", bg: "#DBEAFE" },
  { key: "branded", label: "Branded Items", icon: "🎽", color: "#D97706", bg: "#FEF3C7" },
  { key: "tools", label: "Tools & Equipment", icon: "🛠️", color: "#7C3AED", bg: "#EDE9FE" },
  { key: "vehicles", label: "Vehicles", icon: "🛵", color: "#DB2777", bg: "#FCE7F3" },
  { key: "furniture", label: "Office & Furniture", icon: "🪑", color: "#0891B2", bg: "#CFFAFE" },
  { key: "other", label: "Other", icon: "📦", color: "#64748B", bg: "#F1F5F9" },
];

const STATUSES: { key: AssetStatus; label: string; color: string; bg: string }[] = [
  { key: "in_use", label: "In Use", color: "#10B981", bg: "#D1FAE5" },
  { key: "in_storage", label: "In Storage", color: "#0891B2", bg: "#CFFAFE" },
  { key: "repair", label: "Under Repair", color: "#D97706", bg: "#FEF3C7" },
  { key: "lost", label: "Lost / Damaged", color: "#DC2626", bg: "#FEE2E2" },
  { key: "retired", label: "Retired", color: "#64748B", bg: "#F1F5F9" },
];

const catInfo = (k?: string) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[5];
const statusInfo = (k?: string) => STATUSES.find((s) => s.key === k) || STATUSES[0];

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}
const fmtKES = (n: number | string) => `KES ${(Number(n) || 0).toLocaleString()}`;

type FormState = {
  name: string;
  category: AssetCategory;
  serial: string;
  asset_tag: string;
  status: AssetStatus;
  assigned_user_id: string; // "" = unassigned; "__free__" flag not used; free-text goes to assigned_to_name
  assigned_to_name: string;
  location: string;
  value_kes: string;
  condition: string;
  date_assigned: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  category: "electronics",
  serial: "",
  asset_tag: "",
  status: "in_use",
  assigned_user_id: "",
  assigned_to_name: "",
  location: "",
  value_kes: "",
  condition: "",
  date_assigned: new Date().toISOString().slice(0, 10),
  notes: "",
};

const AssetsPage = () => {
  const { user } = useAuth();
  const canDelete = user?.role === "super_admin";

  const [assets, setAssets] = useState<Asset[]>([]);
  const [staff, setStaff] = useState<AssignableStaff[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<AssetCategory | null>(null);
  const [activeStatus, setActiveStatus] = useState<AssetStatus | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Asset | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, s, st] = await Promise.all([
      api.assets.getAll(),
      api.assets.summary(),
      api.assets.assignableStaff(),
    ]);
    if (a.success) setAssets((a.data as Asset[]) || []);
    if (s.success) setSummary(s.data as AssetSummary);
    if (st.success) setStaff((st.data as AssignableStaff[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (activeCat && a.category !== activeCat) return false;
      if (activeStatus && a.status !== activeStatus) return false;
      if (search) {
        const hay = `${a.name} ${a.serial || ""} ${a.asset_tag || ""} ${a.assigned_user_name || a.assigned_to_name || ""} ${a.location || ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [assets, search, activeCat, activeStatus]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({
      name: a.name,
      category: a.category,
      serial: a.serial || "",
      asset_tag: a.asset_tag || "",
      status: a.status,
      assigned_user_id: a.assigned_user_id || "",
      assigned_to_name: a.assigned_to_name || "",
      location: a.location || "",
      value_kes: String(a.value_kes ?? ""),
      condition: a.condition || "",
      date_assigned: a.date_assigned ? String(a.date_assigned).slice(0, 10) : "",
      notes: a.notes || "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Asset name is required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        serial: form.serial.trim() || null,
        asset_tag: form.asset_tag.trim() || null,
        status: form.status,
        assigned_user_id: form.assigned_user_id || null,
        assigned_to_name: form.assigned_user_id
          ? (staff.find((s) => s.id === form.assigned_user_id)?.name || null)
          : (form.assigned_to_name.trim() || null),
        location: form.location.trim() || null,
        value_kes: Number(form.value_kes) || 0,
        condition: form.condition.trim() || null,
        date_assigned: form.date_assigned || null,
        notes: form.notes.trim() || null,
      };
      const res = editing
        ? await api.assets.update(editing.id, payload)
        : await api.assets.create(payload);
      if (!res.success) throw new Error(res.error || "Save failed");
      toast.success(editing ? "Asset updated" : "Asset added");
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSubmitting(false); }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const res = await api.assets.remove(confirmDelete.id);
    if (res.success) { toast.success("Asset removed"); await load(); }
    else toast.error(res.error || "Delete failed");
    setConfirmDelete(null);
  };

  const exportCSV = () => {
    const headers = ["Name", "Category", "Asset Tag", "Serial", "Assigned To", "Location", "Status", "Date Assigned", "Value (KES)", "Condition", "Notes"];
    const rows = filtered.map((a) => [
      a.name,
      catInfo(a.category).label,
      a.asset_tag || "",
      a.serial || "",
      a.assigned_user_name || a.assigned_to_name || "Unassigned",
      a.location || "",
      statusInfo(a.status).label,
      a.date_assigned || "",
      a.value_kes,
      a.condition || "",
      a.notes || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chargebyte-assets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset & Inventory Tracker"
        description="Track ChargeByte electronics, tools, branded items, vehicles and more."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Asset
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total Assets", value: summary.total },
            { label: "In Use", value: summary.in_use },
            { label: "In Storage", value: summary.in_storage },
            { label: "Repair / Lost", value: summary.issues },
            {
              label: "Total Value",
              value:
                Number(summary.total_value) >= 1_000_000
                  ? `${(Number(summary.total_value) / 1_000_000).toFixed(1)}M`
                  : `${(Number(summary.total_value) / 1000).toFixed(0)}K`,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card p-4">
              <div className="text-2xl font-bold text-foreground">{s.value ?? 0}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, serial, tag, person or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat(null)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeCat === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >All categories</button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveCat(activeCat === c.key ? null : c.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                activeCat === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >{c.icon} {c.label}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveStatus(null)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeStatus === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >All statuses</button>
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStatus(activeStatus === s.key ? null : s.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                activeStatus === s.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6 text-muted-foreground" />}
          title={assets.length === 0 ? "No assets tracked yet" : "No matching assets"}
          description={
            assets.length === 0
              ? "Start tracking your company's electronics, tools, and branded items."
              : "Try a different search or clear your filters."
          }
          action={assets.length === 0 ? <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add First Asset</Button> : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const cat = catInfo(a.category);
            const st = statusInfo(a.status);
            const displayAssignee = a.assigned_user_name || a.assigned_to_name || "Unassigned";
            return (
              <button
                key={a.id}
                onClick={() => openEdit(a)}
                className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: cat.bg }}
                  >{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {cat.label}{a.serial ? ` · ${a.serial}` : ""}{a.asset_tag ? ` · ${a.asset_tag}` : ""}
                    </div>
                  </div>
                  <Badge
                    className="text-[10px] font-bold flex-shrink-0"
                    style={{ background: st.bg, color: st.color, border: "none" }}
                  >{st.label}</Badge>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {initials(displayAssignee)}
                    </div>
                    <span className="font-medium text-foreground truncate">{displayAssignee}</span>
                  </div>
                  <div className="text-muted-foreground truncate ml-2">
                    📍 {a.station_name || a.location || "—"}
                  </div>
                </div>

                {Number(a.value_kes) > 0 && (
                  <div className="text-right mt-2 text-xs font-bold text-primary">{fmtKES(a.value_kes)}</div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Asset Name *</Label>
              <Input
                placeholder="e.g. IoT Charging Station Unit #021"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.key })}
                    className={`border rounded-lg py-2 text-xs font-medium transition-colors ${
                      form.category === c.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="text-lg">{c.icon}</div>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Serial Number</Label>
                <Input
                  placeholder="e.g. CB-IOT-021"
                  value={form.serial}
                  onChange={(e) => setForm({ ...form, serial: e.target.value })}
                />
              </div>
              <div>
                <Label>Asset Tag</Label>
                <Input
                  placeholder="Internal tag"
                  value={form.asset_tag}
                  onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assigned To (ChargeByte Staff)</Label>
                <Select
                  value={form.assigned_user_id || "__unassigned__"}
                  onValueChange={(v) => setForm({ ...form, assigned_user_id: v === "__unassigned__" ? "" : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned / external</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — {s.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Or free-text holder</Label>
                <Input
                  placeholder="e.g. HR / Ops Store"
                  value={form.assigned_to_name}
                  onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })}
                  disabled={!!form.assigned_user_id}
                />
              </div>
            </div>

            <div>
              <Label>Location / Site</Label>
              <Input
                placeholder="e.g. Westlands - Total Petrol Station"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Value (KES)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.value_kes}
                  onChange={(e) => setForm({ ...form, value_kes: e.target.value })}
                />
              </div>
              <div>
                <Label>Date Assigned</Label>
                <Input
                  type="date"
                  value={form.date_assigned}
                  onChange={(e) => setForm({ ...form, date_assigned: e.target.value })}
                />
              </div>
              <div>
                <Label>Condition</Label>
                <Input
                  placeholder="Good, New, Needs repair"
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STATUSES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setForm({ ...form, status: s.key })}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                    style={
                      form.status === s.key
                        ? { background: s.color, color: "#fff", borderColor: s.color }
                        : { background: s.bg, color: s.color, borderColor: "transparent" }
                    }
                  >{s.label}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Any extra detail worth tracking…"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {editing && canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => { setDialogOpen(false); setConfirmDelete(editing); }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Saving…" : editing ? "Save Changes" : "Add Asset"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Remove asset?"
        description={confirmDelete ? `Remove "${confirmDelete.name}" from inventory? This can't be undone.` : ""}
        confirmLabel="Remove"
        onConfirm={remove}
        variant="destructive"
      />
    </div>
  );
};

export default AssetsPage;