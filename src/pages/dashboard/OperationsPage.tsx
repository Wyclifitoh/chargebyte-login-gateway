import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, EmptyState, TableSkeleton } from "@/components/shared";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/StatusBadge";
import {
  useOpsLeads, useOpsReports, useOpsDailyPlans, useStations, useUsers,
} from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import { Users, FileText, ListTodo, Plus, Search } from "lucide-react";
import { toast } from "sonner";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Valid email").or(z.literal("")).optional(),
  phone: z.string().trim().min(1, "Required").max(20),
  source: z.string().min(1, "Required"),
  station_id: z.string().optional(),
  assigned_to: z.string().min(1, "Staff member is required"),
  follow_up_date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const reportSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200),
  type: z.enum(["daily", "weekly", "monthly"]),
  station_id: z.string().optional(),
  summary: z.string().trim().min(1, "Required").max(2000),
  activities_completed: z.string().max(1000).optional(),
  challenges: z.string().max(1000).optional(),
  next_steps: z.string().max(1000).optional(),
  status: z.enum(["draft", "submitted"]).default("submitted"),
});

const planSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200),
  priority: z.enum(["high", "medium", "low"]),
  deadline: z.string().min(1, "Required"),
});

type LeadFormValues = z.infer<typeof leadSchema>;
type ReportFormValues = z.infer<typeof reportSchema>;
type PlanFormValues = z.infer<typeof planSchema>;

const LeadsTab = () => {
  const { user } = useAuth();
  const isStaff = user?.role === "staff";
  const stationsQ = useStations();
  const usersQ = useUsers();
  const leadsQ = useOpsLeads();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "", email: "", phone: "", source: "", station_id: "",
      assigned_to: isStaff ? user?.id || "" : "", follow_up_date: "", notes: "",
    },
  });

  const filtered = leadsQ.data.filter((l) => {
    const m = `${l.name} ${l.email || ""}`.toLowerCase().includes(search.toLowerCase());
    const s = filterStatus === "all" || l.status === filterStatus;
    return m && s;
  });

  const onSubmit = async (data: LeadFormValues) => {
    const payload = {
      name: data.name, email: data.email || null, phone: data.phone,
      source: data.source, station_id: data.station_id || null,
      notes: data.notes || null,
    };
    const res = await api.operations.createLead(payload);
    if (res.success) {
      toast.success("Lead added");
      setDialogOpen(false);
      form.reset({ name: "", email: "", phone: "", source: "", station_id: "",
        assigned_to: isStaff ? user?.id || "" : "", follow_up_date: "", notes: "" });
      leadsQ.refetch();
    } else toast.error(res.error || "Failed");
  };

  const staffUsers = (usersQ.data as Array<{ id: string; name: string; role: string }>)
    .filter((u) => ["staff", "admin", "super_admin"].includes(u.role));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Lead</Button>
      </div>

      <Card>
        {leadsQ.isLoading ? <TableSkeleton rows={5} columns={6} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                    <td className="px-4 py-3 text-foreground">{l.email || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{l.phone || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{l.source || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{l.station_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6}><EmptyState title="No leads" description="Add a new lead to get started." /></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>Source</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Campaign">Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="station_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Station <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {stationsQ.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
                <FormField control={form.control} name="assigned_to" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isStaff}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {staffUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isStaff && <p className="text-xs text-muted-foreground">Auto-assigned to you</p>}
                    <FormMessage />
                  </FormItem>)} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full">Add Lead</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ReportsTab = () => {
  const { user } = useAuth();
  const reportsQ = useOpsReports();
  const stationsQ = useStations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { title: "", type: "daily", station_id: "", summary: "",
      activities_completed: "", challenges: "", next_steps: "", status: "submitted" },
  });

  const onSubmit = async (data: ReportFormValues) => {
    const payload = {
      title: data.title, type: data.type, station_id: data.station_id || null,
      summary: data.summary, activities_completed: data.activities_completed || null,
      challenges: data.challenges || null, next_steps: data.next_steps || null,
      status: data.status,
    };
    const res = await api.operations.createReport(payload);
    if (res.success) {
      toast.success("Report submitted!", { description: data.title });
      setDialogOpen(false); form.reset(); reportsQ.refetch();
    } else toast.error(res.error || "Failed");
  };

  // staff sees their own reports; managers/super_admins see all
  const visible = user?.role === "staff"
    ? reportsQ.data.filter((r) => r.submitted_by_name === user.name)
    : reportsQ.data;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Submit Report</Button>
      </div>

      <Card>
        {reportsQ.isLoading ? <TableSkeleton rows={5} columns={6} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted By</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                    <td className="px-4 py-3 text-foreground capitalize">{r.type}</td>
                    <td className="px-4 py-3 text-foreground">{r.station_name || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{r.submitted_by_name || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{(r.created_at || "").slice(0, 10)}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={6}><EmptyState title="No reports yet" description="Submit your first report." /></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Report</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
                <FormField control={form.control} name="station_id" render={({ field }) => (
                  <FormItem><FormLabel>Station (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {stationsQ.data.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
              </div>
              <FormField control={form.control} name="summary" render={({ field }) => (
                <FormItem><FormLabel>Summary</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="activities_completed" render={({ field }) => (
                <FormItem><FormLabel>Activities Completed</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="challenges" render={({ field }) => (
                <FormItem><FormLabel>Challenges</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="next_steps" render={({ field }) => (
                <FormItem><FormLabel>Next Steps</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full">Submit Report</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DailyPlansTab = () => {
  const plansQ = useOpsDailyPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { title: "", priority: "medium", deadline: "" },
  });

  const onSubmit = async (data: PlanFormValues) => {
    const res = await api.operations.createDailyPlan(data);
    if (res.success) {
      toast.success("Plan created");
      setDialogOpen(false); form.reset(); plansQ.refetch();
    } else toast.error(res.error || "Failed");
  };

  const toggleComplete = async (id: string) => {
    const res = await api.operations.toggleDailyPlan(id);
    if (res.success) plansQ.refetch();
    else toast.error(res.error || "Failed");
  };

  const priorityColor = (p: string) =>
    p === "high" ? "cancelled" : p === "medium" ? "pending" : "active";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Task</Button>
      </div>

      <div className="space-y-2">
        {plansQ.isLoading ? <TableSkeleton rows={4} columns={3} /> : plansQ.data.map((p) => (
          <Card key={p.id} className={p.is_completed ? "opacity-60" : ""}>
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <Checkbox checked={!!p.is_completed} onCheckedChange={() => toggleComplete(p.id)} />
              <div className="flex-1">
                <p className={`text-sm font-medium text-foreground ${p.is_completed ? "line-through" : ""}`}>{p.title}</p>
                <p className="text-xs text-muted-foreground">Due: {p.deadline || "—"}</p>
              </div>
              <StatusBadge status={priorityColor(p.priority)} />
            </CardContent>
          </Card>
        ))}
        {!plansQ.isLoading && plansQ.data.length === 0 && (
          <EmptyState title="No tasks" description="Create your first daily task." />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Daily Task</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Task</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)} />
                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem><FormLabel>Deadline</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <Button type="submit" className="w-full">Add Task</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OperationsPage = () => (
  <div className="space-y-6">
    <PageHeader title="Staff Operations" description="Manage leads, reports, and daily tasks" />
    <Tabs defaultValue="leads" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1 hidden sm:inline" />Leads</TabsTrigger>
        <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Reports</TabsTrigger>
        <TabsTrigger value="plans"><ListTodo className="h-4 w-4 mr-1 hidden sm:inline" />Plans</TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-4"><LeadsTab /></TabsContent>
      <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
      <TabsContent value="plans" className="mt-4"><DailyPlansTab /></TabsContent>
    </Tabs>
  </div>
);

export default OperationsPage;
