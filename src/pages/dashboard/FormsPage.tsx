import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockStations, mockMachines } from "@/data/mockData";
import { UserPlus, FileText, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/chargebyte-logo.png";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Valid email is required").max(255),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  source: z.string().min(1, "Source is required"),
  station: z.string().min(1, "Station is required"),
  notes: z.string().max(500).optional(),
});

const reportSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(["daily", "weekly", "monthly"]),
  station: z.string().min(1, "Station is required"),
  summary: z.string().trim().min(1, "Summary is required").max(2000),
});

const activitySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(["maintenance", "meeting", "installation", "inspection"]),
  station: z.string().min(1, "Station is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().trim().min(1, "Description is required").max(1000),
});

type LeadFormValues = z.infer<typeof leadSchema>;
type ReportFormValues = z.infer<typeof reportSchema>;
type ActivityFormValues = z.infer<typeof activitySchema>;

const FormCard = ({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) => (
  <div className="grid md:grid-cols-[320px_1fr] gap-6">
    <Card className="flex flex-col items-center justify-center p-6 bg-card border-border">
      <img src={logo} alt="ChargeByte" className="h-10 w-10 mb-4" />
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-foreground text-center">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mt-1">{description}</p>
    </Card>
    <Card className="border-border">
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  </div>
);

const LeadForm = () => {
  const form = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema), defaultValues: { name: "", email: "", phone: "", source: "", station: "", notes: "" } });
  const onSubmit = (data: LeadFormValues) => {
    toast.success("Lead added successfully!", { description: `${data.name} added as a new lead.` });
    form.reset();
  };
  return (
    <FormCard icon={UserPlus} title="Add Lead / Customer" description="Add a new lead or customer to the system with their contact details and source.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+1-555-0100" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem><FormLabel>Source</FormLabel><FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Campaign">Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="station" render={({ field }) => (
            <FormItem><FormLabel>Station</FormLabel><FormControl>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>
                  {mockStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem><FormLabel>Notes (optional)</FormLabel><FormControl><Textarea placeholder="Additional notes..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" className="w-full sm:w-auto">Add Lead</Button>
        </form>
      </Form>
    </FormCard>
  );
};

const ReportForm = () => {
  const form = useForm<ReportFormValues>({ resolver: zodResolver(reportSchema), defaultValues: { title: "", type: "daily", station: "", summary: "" } });
  const onSubmit = (data: ReportFormValues) => {
    toast.success("Report submitted!", { description: `"${data.title}" has been submitted.` });
    form.reset();
  };
  return (
    <FormCard icon={FileText} title="Submit Report" description="Submit daily, weekly, or monthly reports for your assigned stations.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Report Title</FormLabel><FormControl><Input placeholder="Daily Station Check - Downtown" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Report Type</FormLabel><FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="station" render={({ field }) => (
              <FormItem><FormLabel>Station</FormLabel><FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Stations">All Stations</SelectItem>
                    {mockStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="summary" render={({ field }) => (
            <FormItem><FormLabel>Summary</FormLabel><FormControl><Textarea placeholder="Describe findings, issues, and recommendations..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" className="w-full sm:w-auto">Submit Report</Button>
        </form>
      </Form>
    </FormCard>
  );
};

const ActivityForm = () => {
  const form = useForm<ActivityFormValues>({ resolver: zodResolver(activitySchema), defaultValues: { title: "", type: "maintenance", station: "", date: "", description: "" } });
  const onSubmit = (data: ActivityFormValues) => {
    toast.success("Activity planned!", { description: `"${data.title}" scheduled for ${data.date}.` });
    form.reset();
  };
  return (
    <FormCard icon={CalendarDays} title="Plan Activity" description="Schedule maintenance, inspections, installations, or meetings at stations.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Activity Title</FormLabel><FormControl><Input placeholder="Inspect CB-012 at Airport" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel><FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="station" render={({ field }) => (
              <FormItem><FormLabel>Station</FormLabel><FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                  <SelectContent>
                    {mockStations.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem><FormLabel>Scheduled Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe the activity details..." {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" className="w-full sm:w-auto">Plan Activity</Button>
        </form>
      </Form>
    </FormCard>
  );
};

const FormsPage = () => (
  <div className="space-y-6">
    <PageHeader title="Forms & Actions" description="Add leads, submit reports, and plan activities" />
    <Tabs defaultValue="leads" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="leads">Add Lead</TabsTrigger>
        <TabsTrigger value="reports">Report</TabsTrigger>
        <TabsTrigger value="activities">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="leads" className="mt-6"><LeadForm /></TabsContent>
      <TabsContent value="reports" className="mt-6"><ReportForm /></TabsContent>
      <TabsContent value="activities" className="mt-6"><ActivityForm /></TabsContent>
    </Tabs>
  </div>
);

export default FormsPage;
