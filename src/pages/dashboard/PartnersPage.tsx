import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreVertical, Building2, TrendingUp, Clock, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PageHeader, TableSkeleton, EmptyState, ErrorState, FallbackBanner, ConfirmDialog,
} from "@/components/shared";
import MetricCard from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useStations } from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import { formatKsh } from "@/lib/format";

interface PartnerRow {
  id: string;
  partner_id: string;
  name: string;
  email: string;
  phone?: string;
  is_active?: number | boolean;
  partner_code?: string;
  status?: string;
  agreement_type?: string;
  revenue_share_percent?: number;
  fixed_amount?: number;
  disbursement_frequency?: string;
  disbursement_day?: number;
  city?: string;
  county?: string;
  stations_count?: number;
  pending_amount?: number;
  paid_total?: number;
}

interface AdminSummary {
  total_partners: number;
  active_partners: number;
  pending_disbursements: number;
  paid_this_month: number;
  revenue_shared_month: number;
  unassigned_stations: number;
}

const createSchema = z.object({
  // company
  name: z.string().trim().min(1, "Required"),
  business_reg_no: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Valid email required"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  physical_address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  county: z.string().trim().optional().or(z.literal("")),
  // contact
  contact_person: z.string().trim().min(1, "Required"),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  contact_position: z.string().trim().optional().or(z.literal("")),
  // payment
  pay_method: z.enum(["bank", "mpesa", "paybill", "till"]),
  bank_name: z.string().optional().or(z.literal("")),
  account_name: z.string().optional().or(z.literal("")),
  account_number: z.string().optional().or(z.literal("")),
  branch: z.string().optional().or(z.literal("")),
  mpesa_number: z.string().optional().or(z.literal("")),
  paybill: z.string().optional().or(z.literal("")),
  till_number: z.string().optional().or(z.literal("")),
  // agreement
  agreement_type: z.enum(["revenue_share", "fixed"]),
  revenue_share_percent: z.coerce.number().min(0).max(100).optional(),
  fixed_amount: z.coerce.number().min(0).optional(),
  disbursement_frequency: z.enum(["monthly", "quarterly", "yearly"]),
  disbursement_day: z.coerce.number().min(1).max(28),
  // station
  station_id: z.string().optional().or(z.literal("")),
  // login
  password: z.string().optional().or(z.literal("")),
});
type CreateValues = z.infer<typeof createSchema>;

const PartnersPage = () => {
  const navigate = useNavigate();
  const stationsQ = useStations();
  const [partners, setPartners] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<PartnerRow | null>(null);
  const [assignStationId, setAssignStationId] = useState("");
  const [suspending, setSuspending] = useState<PartnerRow | null>(null);
  const [resetting, setResetting] = useState<PartnerRow | null>(null);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "", business_reg_no: "", email: "", phone: "",
      physical_address: "", city: "", county: "",
      contact_person: "", contact_phone: "", contact_email: "", contact_position: "",
      pay_method: "mpesa", agreement_type: "revenue_share",
      revenue_share_percent: 10, fixed_amount: 0,
      disbursement_frequency: "monthly", disbursement_day: 5,
      station_id: "", password: "",
    },
  });

  const load = async () => {
    setError(null);
    const [p, s] = await Promise.all([api.partners.list({ q, status: statusFilter === "all" ? undefined : statusFilter }), api.partners.summary()]);
    if (p.success) setPartners((p.data as PartnerRow[]) || []); else setError(p.error || "Failed to load");
    if (s.success) setSummary(s.data as AdminSummary);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, statusFilter]);

  const onCreate = async (data: CreateValues) => {
    const payload = {
      name: data.name, business_reg_no: data.business_reg_no || undefined,
      email: data.email, phone: data.phone || undefined,
      physical_address: data.physical_address || undefined,
      city: data.city || undefined, county: data.county || undefined,
      contact_person: data.contact_person, contact_phone: data.contact_phone || undefined,
      contact_email: data.contact_email || undefined, contact_position: data.contact_position || undefined,
      payment_account: {
        method: data.pay_method,
        bank_name: data.bank_name, account_name: data.account_name, account_number: data.account_number,
        branch: data.branch, mpesa_number: data.mpesa_number,
        paybill: data.paybill, till_number: data.till_number,
      },
      agreement_type: data.agreement_type,
      revenue_share_percent: data.revenue_share_percent,
      fixed_amount: data.fixed_amount,
      disbursement_frequency: data.disbursement_frequency,
      disbursement_day: data.disbursement_day,
      station_id: data.station_id || undefined,
      password: data.password || undefined,
    };
    const res = await api.partners.create(payload);
    if (res.success) {
      const d = res.data as { temp_password?: string };
      setTempPassword(d.temp_password || null);
      toast.success("Partner created");
      load();
      setStep(0);
      form.reset();
    } else toast.error(res.error || "Failed to create");
  };

  const onAssign = async () => {
    if (!assignFor || !assignStationId) return;
    const res = await api.partners.assignStation(assignFor.id, { station_id: assignStationId });
    if (res.success) { toast.success("Station assigned"); load(); setAssignFor(null); setAssignStationId(""); }
    else toast.error(res.error || "Failed");
  };
  const onSuspend = async () => {
    if (!suspending) return;
    const res = await api.partners.suspend(suspending.id, !suspending.is_active);
    if (res.success) { toast.success(suspending.is_active ? "Suspended" : "Reactivated"); load(); }
    else toast.error(res.error || "Failed");
    setSuspending(null);
  };
  const onReset = async () => {
    if (!resetting) return;
    const res = await api.partners.resetPassword(resetting.id);
    if (res.success) {
      const d = res.data as { temp_password?: string };
      toast.success("Password reset");
      setTempPassword(d.temp_password || null);
    } else toast.error(res.error || "Failed");
    setResetting(null);
  };

  const rows = partners || [];
  const stepLabels = ["Company", "Contact", "Payment", "Agreement", "Station"];
  const payMethod = form.watch("pay_method");
  const agreementType = form.watch("agreement_type");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Location Partners" description="Manage business/property partners hosting ChargeByte stations" />
        <Button onClick={() => { form.reset(); setStep(0); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Add Location Partner
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Total Partners" value={summary?.total_partners ?? 0} icon={<Building2 className="h-5 w-5" />} />
        <MetricCard title="Active" value={summary?.active_partners ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} />
        <MetricCard title="Pending Payouts" value={summary?.pending_disbursements ?? 0} icon={<Clock className="h-5 w-5" />} />
        <MetricCard title="Paid This Month" value={formatKsh(Number(summary?.paid_this_month || 0))} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Revenue Shared" value={formatKsh(Number(summary?.revenue_shared_month || 0))} icon={<TrendingUp className="h-5 w-5" />} />
        <MetricCard title="Unassigned Stations" value={summary?.unassigned_stations ?? 0} icon={<MapPin className="h-5 w-5" />} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, code…" className="pl-9"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!partners ? (
        <TableSkeleton rows={6} columns={8} />
      ) : error ? (
        <ErrorState title="Couldn't load partners" message={error} onRetry={load} />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState icon={<Building2 className="h-6 w-6 text-muted-foreground" />}
            title="No location partners yet"
            description="Add your first partner to start assigning stations and generating disbursements." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Partner</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Agreement</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Frequency</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stations</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pending</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/dashboard/partners/${p.id}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{p.partner_code || "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {p.agreement_type === "fixed_rent"
                      ? `Fixed ${formatKsh(Number(p.fixed_amount || 0))}`
                      : `${Number(p.revenue_share_percent ?? 0)}% share`}
                  </td>
                  <td className="px-4 py-3 text-foreground capitalize">
                    {p.disbursement_frequency || "monthly"} · day {p.disbursement_day || 5}
                  </td>
                  <td className="px-4 py-3 text-foreground">{p.stations_count ?? 0}</td>
                  <td className="px-4 py-3 text-foreground">{formatKsh(Number(p.pending_amount || 0))}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.is_active ? (p.status || "active") : "suspended"} /></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/dashboard/partners/${p.id}`)}>View partner</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setAssignFor(p); setAssignStationId(""); }}>Assign station</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setResetting(p)}>Reset password</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSuspending(p)}>
                          {p.is_active ? "Suspend" : "Reactivate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog — stepper */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setTempPassword(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Location Partner</DialogTitle>
            <DialogDescription>Complete each step to onboard a new partner.</DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium mb-1">Partner login created</p>
                <p className="text-xs text-muted-foreground mb-3">Share these credentials with the partner. This is the only time this password is shown.</p>
                <div className="font-mono text-sm bg-background rounded px-3 py-2 border">{tempPassword}</div>
              </div>
              <Button className="w-full" onClick={() => { setCreateOpen(false); setTempPassword(null); }}>Done</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {stepLabels.map((l, i) => (
                  <div key={l} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <span className="font-medium">{i + 1}</span> {l}
                  </div>
                ))}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
                  {step === 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="col-span-2"><FormLabel>Business Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="business_reg_no" render={({ field }) => (
                        <FormItem><FormLabel>Registration No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Business Email*</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Business Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="physical_address" render={({ field }) => (
                        <FormItem><FormLabel>Physical Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="county" render={({ field }) => (
                        <FormItem><FormLabel>County</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  {step === 1 && (
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="contact_person" render={({ field }) => (
                        <FormItem><FormLabel>Full Name*</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="contact_position" render={({ field }) => (
                        <FormItem><FormLabel>Position/Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="contact_phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="contact_email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-3">
                      <FormField control={form.control} name="pay_method" render={({ field }) => (
                        <FormItem><FormLabel>Preferred Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                              <SelectItem value="mpesa">M-Pesa</SelectItem>
                              <SelectItem value="paybill">Paybill</SelectItem>
                              <SelectItem value="till">Till Number</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      {payMethod === "bank" && (
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="bank_name" render={({ field }) => (
                            <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name="branch" render={({ field }) => (
                            <FormItem><FormLabel>Branch</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name="account_name" render={({ field }) => (
                            <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name="account_number" render={({ field }) => (
                            <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                      )}
                      {payMethod === "mpesa" && (
                        <FormField control={form.control} name="mpesa_number" render={({ field }) => (
                          <FormItem><FormLabel>M-Pesa Number</FormLabel><FormControl><Input {...field} placeholder="2547XXXXXXXX" /></FormControl></FormItem>)} />
                      )}
                      {payMethod === "paybill" && (
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={form.control} name="paybill" render={({ field }) => (
                            <FormItem><FormLabel>Paybill</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                          <FormField control={form.control} name="account_number" render={({ field }) => (
                            <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                      )}
                      {payMethod === "till" && (
                        <FormField control={form.control} name="till_number" render={({ field }) => (
                          <FormItem><FormLabel>Till Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-3">
                      <FormField control={form.control} name="agreement_type" render={({ field }) => (
                        <FormItem><FormLabel>Agreement Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="revenue_share">Revenue Share</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      {agreementType === "revenue_share" ? (
                        <FormField control={form.control} name="revenue_share_percent" render={({ field }) => (
                          <FormItem><FormLabel>Revenue Share %</FormLabel>
                            <FormControl><Input type="number" min={0} max={100} step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      ) : (
                        <FormField control={form.control} name="fixed_amount" render={({ field }) => (
                          <FormItem><FormLabel>Fixed Amount (KES)</FormLabel>
                            <FormControl><Input type="number" min={0} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="disbursement_frequency" render={({ field }) => (
                          <FormItem><FormLabel>Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="quarterly">Quarterly</SelectItem>
                                <SelectItem value="yearly">Yearly</SelectItem>
                              </SelectContent>
                            </Select><FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="disbursement_day" render={({ field }) => (
                          <FormItem><FormLabel>Disbursement Day (1–28)</FormLabel>
                            <FormControl><Input type="number" min={1} max={28} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-3">
                      <FormField control={form.control} name="station_id" render={({ field }) => (
                        <FormItem><FormLabel>Assign Station (optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="No station yet" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {stationsQ.data.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Login Password (leave blank to auto-generate)</FormLabel>
                          <FormControl><Input type="text" {...field} placeholder="Auto-generate" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button type="button" variant="outline"
                      onClick={() => step === 0 ? setCreateOpen(false) : setStep(step - 1)}>
                      {step === 0 ? "Cancel" : "Back"}
                    </Button>
                    {step < stepLabels.length - 1 ? (
                      <Button type="button" onClick={async () => {
                        const fields: Record<number, (keyof CreateValues)[]> = {
                          0: ["name", "email"],
                          1: ["contact_person"],
                          2: ["pay_method"],
                          3: ["agreement_type", "disbursement_frequency", "disbursement_day"],
                        };
                        const ok = await form.trigger(fields[step]);
                        if (ok) setStep(step + 1);
                      }}>Next</Button>
                    ) : (
                      <Button type="submit">Create Partner</Button>
                    )}
                  </div>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign station dialog */}
      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign station to {assignFor?.name}</DialogTitle></DialogHeader>
          <Select value={assignStationId} onValueChange={setAssignStationId}>
            <SelectTrigger><SelectValue placeholder="Pick a station" /></SelectTrigger>
            <SelectContent>
              {stationsQ.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="w-full mt-2" onClick={onAssign} disabled={!assignStationId}>Assign</Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!suspending}
        onOpenChange={(o) => !o && setSuspending(null)}
        title={suspending?.is_active ? "Suspend partner?" : "Reactivate partner?"}
        description={suspending?.is_active
          ? `${suspending?.name} will lose login access until reactivated.`
          : `${suspending?.name} will regain access.`}
        confirmLabel={suspending?.is_active ? "Suspend" : "Reactivate"}
        variant={suspending?.is_active ? "destructive" : "default"}
        onConfirm={onSuspend}
      />
      <ConfirmDialog
        open={!!resetting}
        onOpenChange={(o) => !o && setResetting(null)}
        title="Reset password?"
        description={`Generate a new temporary password for ${resetting?.name}.`}
        confirmLabel="Reset"
        onConfirm={onReset}
      />

      {/* Reset password result */}
      <Dialog open={!!tempPassword && !createOpen} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New password generated</DialogTitle></DialogHeader>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground mb-2">Share with the partner. This is shown once.</p>
            <div className="font-mono text-sm bg-background rounded px-3 py-2 border">{tempPassword}</div>
          </div>
          <Button className="w-full" onClick={() => setTempPassword(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnersPage;