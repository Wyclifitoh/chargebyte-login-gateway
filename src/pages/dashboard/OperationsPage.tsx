import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/StatusBadge";
import { mockStaffLeads, mockDailyPlans, StaffLead, DailyPlan } from "@/data/extendedMockData";
import { mockReports, mockActivities } from "@/data/mockData";
import { mockExtendedStations } from "@/data/extendedMockData";
import { Users, FileText, CalendarDays, ListTodo, Plus, Search, Eye } from "lucide-react";
import { toast } from "sonner";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().min(1, "Required").max(20),
  source: z.string().min(1, "Required"),
  station: z.string().min(1, "Required"),
  owner: z.string().trim().min(1, "Required").max(100),
  follow_up_date: z.string().min(1, "Required"),
  notes: z.string().max(500).optional(),
});

const reportSchema = z.object({
  title: z.string().trim().min(1, "Required").max(200),
  type: z.enum(["daily", "weekly", "monthly"]),
  station: z.string().min(1, "Required"),
  summary: z.string().trim().min(1, "Required").max(2000),
  activities_completed: z.string().max(1000).optional(),
  challenges: z.string().max(1000).optional(),
  next_steps: z.string().max(1000).optional(),
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
  const [leads, setLeads] = useState(mockStaffLeads);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema), defaultValues: { name: "", email: "", phone: "", source: "", station: "", owner: "", follow_up_date: "", notes: "" } });

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const onSubmit = (data: LeadFormValues) => {
    const newLead: StaffLead = { name: data.name, email: data.email, phone: data.phone, source: data.source, station: data.station, owner: data.owner, follow_up_date: data.follow_up_date, id: `SL${String(leads.length + 1).padStart(3, "0")}`, status: "new", notes: data.notes || "", created_at: new Date().toISOString().split("T")[0] };
    setLeads((prev) => [newLead, ...prev]);
    setDialogOpen(false);
    form.reset();
    toast.success("Lead added");
  };

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
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Lead</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Follow-up</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                  <td className="px-4 py-3 text-foreground">{l.email}</td>
                  <td className="px-4 py-3 text-foreground">{l.phone}</td>
                  <td className="px-4 py-3 text-foreground">{l.source}</td>
                  <td className="px-4 py-3 text-foreground">{l.station}</td>
                  <td className="px-4 py-3 text-foreground">{l.owner}</td>
                  <td className="px-4 py-3 text-foreground">{l.follow_up_date || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status === "new" ? "scheduled" : l.status === "contacted" ? "pending" : l.status === "interested" ? "active" : l.status === "converted" ? "completed" : "cancelled"} /></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No leads found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="source" render={({ field }) => (
                  <FormItem><FormLabel>Source</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="Walk-in">Walk-in</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Referral">Referral</SelectItem><SelectItem value="Campaign">Campaign</SelectItem></SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="station" render={({ field }) => (
                  <FormItem><FormLabel>Station</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mockExtendedStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="owner" render={({ field }) => (<FormItem><FormLabel>Lead Owner</FormLabel><FormControl><Input placeholder="Assigned to" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="follow_up_date" render={({ field }) => (<FormItem><FormLabel>Follow-up Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full">Add Lead</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ReportsTab = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<ReportFormValues>({ resolver: zodResolver(reportSchema), defaultValues: { title: "", type: "daily", station: "", summary: "", activities_completed: "", challenges: "", next_steps: "" } });

  const onSubmit = (data: ReportFormValues) => {
    toast.success("Report submitted!", { description: data.title });
    setDialogOpen(false);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Submit Report</Button>
      </div>

      <Card>
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
              {mockReports.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">{r.title}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{r.type}</td>
                  <td className="px-4 py-3 text-foreground">{r.station}</td>
                  <td className="px-4 py-3 text-foreground">{r.submittedBy}</td>
                  <td className="px-4 py-3 text-foreground">{r.date}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status === "reviewed" ? "completed" : r.status === "submitted" ? "active" : "pending"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Report</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Type</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="station" render={({ field }) => (
                  <FormItem><FormLabel>Station</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent><SelectItem value="All Stations">All Stations</SelectItem>{mockExtendedStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="summary" render={({ field }) => (<FormItem><FormLabel>Summary</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="activities_completed" render={({ field }) => (<FormItem><FormLabel>Activities Completed</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="challenges" render={({ field }) => (<FormItem><FormLabel>Challenges</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="next_steps" render={({ field }) => (<FormItem><FormLabel>Next Steps</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" className="w-full">Submit Report</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DailyPlansTab = () => {
  const [plans, setPlans] = useState(mockDailyPlans);
  const [dialogOpen, setDialogOpen] = useState(false);
  const form = useForm<PlanFormValues>({ resolver: zodResolver(planSchema), defaultValues: { title: "", priority: "medium", deadline: "" } });

  const onSubmit = (data: PlanFormValues) => {
    const newPlan: DailyPlan = { title: data.title, priority: data.priority, deadline: data.deadline, id: `DP${String(plans.length + 1).padStart(3, "0")}`, completed: false, created_at: new Date().toISOString().split("T")[0] };
    setPlans((prev) => [newPlan, ...prev]);
    setDialogOpen(false);
    form.reset();
    toast.success("Plan created");
  };

  const toggleComplete = (id: string) => {
    setPlans((prev) => prev.map((p) => p.id === id ? { ...p, completed: !p.completed } : p));
  };

  const priorityColor = (p: string) => p === "high" ? "cancelled" : p === "medium" ? "pending" : "active";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { form.reset(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Task</Button>
      </div>

      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id} className={`${p.completed ? "opacity-60" : ""}`}>
            <CardContent className="flex items-center gap-4 py-3 px-4">
              <Checkbox checked={p.completed} onCheckedChange={() => toggleComplete(p.id)} />
              <div className="flex-1">
                <p className={`text-sm font-medium text-foreground ${p.completed ? "line-through" : ""}`}>{p.title}</p>
                <p className="text-xs text-muted-foreground">Due: {p.deadline}</p>
              </div>
              <StatusBadge status={priorityColor(p.priority)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Daily Task</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Task</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Priority</FormLabel><FormControl>
                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="deadline" render={({ field }) => (<FormItem><FormLabel>Deadline</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
      <TabsList className="grid w-full grid-cols-4 max-w-lg">
        <TabsTrigger value="leads"><Users className="h-4 w-4 mr-1 hidden sm:inline" />Leads</TabsTrigger>
        <TabsTrigger value="reports"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Reports</TabsTrigger>
        <TabsTrigger value="plans"><ListTodo className="h-4 w-4 mr-1 hidden sm:inline" />Plans</TabsTrigger>
        <TabsTrigger value="activities"><CalendarDays className="h-4 w-4 mr-1 hidden sm:inline" />Activities</TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-4"><LeadsTab /></TabsContent>
      <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
      <TabsContent value="plans" className="mt-4"><DailyPlansTab /></TabsContent>
      <TabsContent value="activities" className="mt-4">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned To</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Station</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {mockActivities.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{a.title}</td>
                    <td className="px-4 py-3 text-foreground capitalize">{a.type}</td>
                    <td className="px-4 py-3 text-foreground">{a.assignedTo}</td>
                    <td className="px-4 py-3 text-foreground">{a.station}</td>
                    <td className="px-4 py-3 text-foreground">{a.date}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status === "in_progress" ? "active" : a.status === "completed" ? "completed" : a.status === "planned" ? "scheduled" : "cancelled"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export default OperationsPage;
