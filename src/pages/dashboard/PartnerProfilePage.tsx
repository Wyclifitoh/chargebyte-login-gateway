import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  User,
  CreditCard,
  FileText,
  ClipboardList,
  Activity as ActivityIcon,
  Wallet,
  Cpu,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ErrorState, LoadingState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { api } from "@/services/api";
import { formatKsh } from "@/lib/format";
import { useMachines } from "@/hooks/useDashboardData";

interface ProfileData {
  partner: Record<string, unknown> & {
    user_id: string;
    partner_id: string;
    name: string;
    email: string;
    phone?: string;
    partner_code?: string;
    tier?: string;
    status?: string;
    agreement_type?: string;
    revenue_share_percent?: number;
    fixed_amount?: number;
    disbursement_frequency?: string;
    disbursement_day?: number;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
    business_reg_no?: string;
    physical_address?: string;
    city?: string;
    county?: string;
  };
  contacts: Array<{
    id: string;
    full_name: string;
    phone?: string;
    email?: string;
    position?: string;
    is_primary?: number;
  }>;
  payment_accounts: Array<{
    id: string;
    method: string;
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    branch?: string;
    mpesa_number?: string;
    paybill?: string;
    till_number?: string;
    is_default?: number;
  }>;
  station_assignments?: Array<{
    id: string;
    station_id: string;
    station_name?: string;
    assigned_at: string;
    unassigned_at?: string | null;
  }>;
  machines: Array<{
    deployment_id: string;
    id: string;
    machine_id: string;
    name: string;
    model: string;
    status: string;
    station_id?: string | null;
    station_name?: string;
    deployed_at: string;
    undeployed_at?: string | null;
    deployment_status?: string;
    note?: string | null;
  }>;
  disbursements: Array<{
    id: string;
    station_name?: string;
    period_start: string;
    period_end: string;
    gross_revenue: number;
    amount_payable: number;
    status: string;
    paid_at?: string | null;
    reference_number?: string;
    payment_method?: string;
  }>;
  activity: Array<{
    id: string;
    action: string;
    entity?: string;
    actor_name?: string;
    created_at: string;
    details_json?: string;
  }>;
  revenue_month: number;
  rentals_month: number;
}

const PartnerProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const machinesQ = useMachines();

  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    position: "",
    is_primary: false,
  });
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    method: "mpesa",
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
    mpesa_number: "",
    paybill: "",
    till_number: "",
    is_default: true,
  });
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployForm, setDeployForm] = useState({
    machine_id: "",
    deployed_at: new Date().toISOString().slice(0, 16),
    note: "",
  });
  const [rentals, setRentals] = useState<Array<{
    id: string;
    rental_code: string;
    station_name?: string;
    machine_name?: string;
    total_amount: number;
    status: string;
    created_at: string;
  }> | null>(null);

  const load = async () => {
    if (!id) return;
    setError(null);
    const res = await api.partners.getById(id);
    if (res.success) setData(res.data as ProfileData);
    else setError(res.error || "Failed to load");
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [id]);

  const loadRentals = async () => {
    if (!id) return;
    const res = await api.partners.getRentals(id);
    if (res.success) setRentals(res.data as NonNullable<typeof rentals>);
  };

  if (!id) return null;
  if (error) return <ErrorState title="Couldn't load partner" message={error} onRetry={load} />;
  if (!data) return <LoadingState />;

  const p = data.partner;
  const activeDeployments = data.machines.filter((m) => !m.undeployed_at);
  const deploymentHistory = data.machines.filter((m) => m.undeployed_at);
  const deployedMachineIds = new Set(activeDeployments.map((m) => m.machine_id));

  const addContact = async () => {
    const res = await api.partners.addContact(id, contactForm);
    if (res.success) {
      toast.success("Contact added");
      setContactOpen(false);
      load();
      setContactForm({ full_name: "", phone: "", email: "", position: "", is_primary: false });
    } else toast.error(res.error || "Failed");
  };
  const removeContact = async (cid: string) => {
    const res = await api.partners.removeContact(id, cid);
    if (res.success) {
      toast.success("Removed");
      load();
    } else toast.error(res.error || "Failed");
  };
  const addPay = async () => {
    const res = await api.partners.addPaymentAccount(id, payForm);
    if (res.success) {
      toast.success("Account added");
      setPayOpen(false);
      load();
    } else toast.error(res.error || "Failed");
  };
  const removePay = async (aid: string) => {
    const res = await api.partners.removePaymentAccount(id, aid);
    if (res.success) {
      toast.success("Removed");
      load();
    } else toast.error(res.error || "Failed");
  };
  const deployMachine = async () => {
    if (!deployForm.machine_id) return;
    const res = await api.partners.deployMachine(id, deployForm);
    if (res.success) {
      toast.success("Machine deployed");
      setDeployOpen(false);
      setDeployForm({
        machine_id: "",
        deployed_at: new Date().toISOString().slice(0, 16),
        note: "",
      });
      load();
      if (rentals !== null) loadRentals();
    } else toast.error(res.error || "Failed");
  };
  const undeployMachine = async (deploymentId: string) => {
    const res = await api.partners.undeployMachine(id, { deployment_id: deploymentId });
    if (res.success) {
      toast.success("Machine undeployed");
      load();
      if (rentals !== null) loadRentals();
    } else toast.error(res.error || "Failed");
  };
  const genDisbursement = async (machineId: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const res = await api.partners.generateDisbursement({
      partner_user_id: id,
      machine_id: machineId,
      period_start: fmt(start),
      period_end: fmt(end),
    });
    if (res.success) {
      toast.success("Voucher generated");
      load();
    } else toast.error(res.error || "Failed");
  };
  const markPaid = async (disbId: string) => {
    const ref = prompt("Reference number (M-Pesa code / bank ref)?") || "";
    const res = await api.partners.updateDisbursement(disbId, {
      status: "paid",
      reference_number: ref,
      payment_method: "manual",
    });
    if (res.success) {
      toast.success("Marked paid");
      load();
    } else toast.error(res.error || "Failed");
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/partners")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to partners
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{p.name}</h1>
              <p className="text-sm text-muted-foreground font-mono">{p.partner_code}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={p.status || "active"} />
          <span className="text-xs text-muted-foreground">
            {p.agreement_type === "fixed_rent"
              ? `Fixed ${formatKsh(Number(p.fixed_amount || 0))}`
              : `${Number(p.revenue_share_percent ?? 0)}% share`}
            {" · "}
            {p.disbursement_frequency} · day {p.disbursement_day}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue (this month)</p>
          <p className="text-xl font-bold">{formatKsh(Number(data.revenue_month))}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Rentals (this month)</p>
          <p className="text-xl font-bold">{data.rentals_month}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active Deployments</p>
          <p className="text-xl font-bold">{activeDeployments.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Deployments</p>
          <p className="text-xl font-bold">{data.machines.length}</p>
        </div>
      </div>

      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === "rentals" && rentals === null) loadRentals();
        }}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <User className="h-3.5 w-3.5 mr-1" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="machines">
            <Cpu className="h-3.5 w-3.5 mr-1" />
            Machines
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Payment Info
          </TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="disbursements">
            <Wallet className="h-3.5 w-3.5 mr-1" />
            Disbursements
          </TabsTrigger>
          <TabsTrigger value="activity">
            <ActivityIcon className="h-3.5 w-3.5 mr-1" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Reg No:</span> {p.business_reg_no || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {p.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {p.phone || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Address:</span>{" "}
                  {p.physical_address || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">City/County:</span>{" "}
                  {[p.city, p.county].filter(Boolean).join(", ") || "—"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Agreement
              </h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {p.agreement_type === "fixed_rent" ? "Fixed amount" : "Revenue share"}
                </p>
                {p.agreement_type === "fixed_rent" ? (
                  <p>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    {formatKsh(Number(p.fixed_amount || 0))}
                  </p>
                ) : (
                  <p>
                    <span className="text-muted-foreground">Share:</span>{" "}
                    {Number(p.revenue_share_percent ?? 0)}%
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">Frequency:</span>{" "}
                  {p.disbursement_frequency}
                </p>
                <p>
                  <span className="text-muted-foreground">Disbursement day:</span>{" "}
                  {p.disbursement_day}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setContactOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add contact
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {data.contacts.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No contacts yet.</div>
            )}
            {data.contacts.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {c.full_name}{" "}
                    {c.is_primary ? (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.position || "—"} · {c.phone || "—"} · {c.email || "—"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeContact(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="machines">
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setDeployOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Deploy machine
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Machine</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Model</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">
                    Deployed
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">
                    Machine status
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Note</th>
                  <th className="px-4 py-3 text-right text-muted-foreground font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeDeployments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm text-muted-foreground">
                      No active machine deployments. Deploy a machine to start counting rentals for
                      this partner.
                    </td>
                  </tr>
                )}
                {activeDeployments.map((m) => (
                  <tr key={m.deployment_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{m.name}</td>
                    <td className="px-4 py-3">{m.model}</td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(m.deployed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.note || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => genDisbursement(m.machine_id)}
                        >
                          Generate voucher
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => undeployMachine(m.deployment_id)}
                        >
                          <PowerOff className="h-3.5 w-3.5 mr-1" />
                          Undeploy
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {deploymentHistory.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-x-auto mt-3">
              <div className="p-3 text-xs font-medium text-muted-foreground uppercase">
                Deployment history
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {deploymentHistory.map((m) => (
                    <tr key={m.deployment_id} className="border-t border-border">
                      <td className="px-4 py-3">{m.name}</td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(m.deployed_at).toLocaleDateString()} →{" "}
                        {m.undeployed_at
                          ? new Date(m.undeployed_at).toLocaleDateString()
                          : "present"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status="undeployed" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payment" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPayOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add account
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {data.payment_accounts.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No payment accounts yet.</div>
            )}
            {data.payment_accounts.map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">
                    {a.method}{" "}
                    {a.is_default ? (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-1">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.method === "bank" &&
                      `${a.bank_name || ""} · ${a.account_name || ""} · ${a.account_number || ""} · ${a.branch || ""}`}
                    {a.method === "mpesa" && a.mpesa_number}
                    {a.method === "paybill" && `${a.paybill} · ${a.account_number || ""}`}
                    {a.method === "till" && a.till_number}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removePay(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rentals">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Code</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Station</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Machine</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rentals === null && (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {rentals?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm text-muted-foreground">
                      No rentals inside deployment windows yet.
                    </td>
                  </tr>
                )}
                {rentals?.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{r.rental_code}</td>
                    <td className="px-4 py-3">{r.station_name}</td>
                    <td className="px-4 py-3">{r.machine_name || "—"}</td>
                    <td className="px-4 py-3">{formatKsh(Number(r.total_amount))}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="disbursements">
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Period</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Station</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">
                    Gross Rev
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Payable</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-muted-foreground font-medium">Ref</th>
                  <th className="px-4 py-3 text-right text-muted-foreground font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.disbursements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-sm text-muted-foreground">
                      No disbursements generated.
                    </td>
                  </tr>
                )}
                {data.disbursements.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-xs">
                      {d.period_start} → {d.period_end}
                    </td>
                    <td className="px-4 py-3">{d.station_name || "—"}</td>
                    <td className="px-4 py-3">{formatKsh(Number(d.gross_revenue))}</td>
                    <td className="px-4 py-3 font-semibold">
                      {formatKsh(Number(d.amount_payable))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{d.reference_number || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {d.status !== "paid" && d.status !== "cancelled" && (
                        <Button size="sm" variant="outline" onClick={() => markPaid(d.id)}>
                          Mark paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {data.activity.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No activity recorded.</div>
            )}
            {data.activity.map((a) => (
              <div key={a.id} className="p-3 flex items-start gap-3">
                <ClipboardList className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{a.action}</span>{" "}
                    {a.entity ? <span className="text-muted-foreground">on {a.entity}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.actor_name || "System"} · {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Full name"
              value={contactForm.full_name}
              onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })}
            />
            <Input
              placeholder="Position"
              value={contactForm.position}
              onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
            />
            <Input
              placeholder="Phone"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={contactForm.is_primary}
                onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
              />
              Set as primary contact
            </label>
            <Button className="w-full" onClick={addContact} disabled={!contactForm.full_name}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add payment account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={payForm.method}
              onValueChange={(v) => setPayForm({ ...payForm, method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="paybill">Paybill</SelectItem>
                <SelectItem value="till">Till</SelectItem>
              </SelectContent>
            </Select>
            {payForm.method === "bank" && (
              <>
                <Input
                  placeholder="Bank name"
                  value={payForm.bank_name}
                  onChange={(e) => setPayForm({ ...payForm, bank_name: e.target.value })}
                />
                <Input
                  placeholder="Account name"
                  value={payForm.account_name}
                  onChange={(e) => setPayForm({ ...payForm, account_name: e.target.value })}
                />
                <Input
                  placeholder="Account number"
                  value={payForm.account_number}
                  onChange={(e) => setPayForm({ ...payForm, account_number: e.target.value })}
                />
                <Input
                  placeholder="Branch"
                  value={payForm.branch}
                  onChange={(e) => setPayForm({ ...payForm, branch: e.target.value })}
                />
              </>
            )}
            {payForm.method === "mpesa" && (
              <Input
                placeholder="M-Pesa number"
                value={payForm.mpesa_number}
                onChange={(e) => setPayForm({ ...payForm, mpesa_number: e.target.value })}
              />
            )}
            {payForm.method === "paybill" && (
              <>
                <Input
                  placeholder="Paybill"
                  value={payForm.paybill}
                  onChange={(e) => setPayForm({ ...payForm, paybill: e.target.value })}
                />
                <Input
                  placeholder="Account number"
                  value={payForm.account_number}
                  onChange={(e) => setPayForm({ ...payForm, account_number: e.target.value })}
                />
              </>
            )}
            {payForm.method === "till" && (
              <Input
                placeholder="Till number"
                value={payForm.till_number}
                onChange={(e) => setPayForm({ ...payForm, till_number: e.target.value })}
              />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={payForm.is_default}
                onChange={(e) => setPayForm({ ...payForm, is_default: e.target.checked })}
              />
              Set as default
            </label>
            <Button className="w-full" onClick={addPay}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deploy machine */}
      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deploy machine</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              value={deployForm.machine_id}
              onValueChange={(v) => setDeployForm({ ...deployForm, machine_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Machine" />
              </SelectTrigger>
              <SelectContent>
                {machinesQ.data
                  .filter((m) => !deployedMachineIds.has(m.id))
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.station_name ? ` · ${m.station_name}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Deployment starts</label>
              <Input
                type="datetime-local"
                value={deployForm.deployed_at}
                onChange={(e) => setDeployForm({ ...deployForm, deployed_at: e.target.value })}
              />
            </div>
            <Input
              placeholder="Note (optional)"
              value={deployForm.note}
              onChange={(e) => setDeployForm({ ...deployForm, note: e.target.value })}
            />
            <Button className="w-full" onClick={deployMachine} disabled={!deployForm.machine_id}>
              <Cpu className="h-4 w-4 mr-1" />
              Deploy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerProfilePage;
