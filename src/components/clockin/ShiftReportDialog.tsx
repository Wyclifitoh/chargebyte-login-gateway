import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/services/api";
import { formatDateTime } from "@/lib/format";

interface ShiftSummary {
  report_date: string;
  station_id: string | null;
  location: string | null;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  rentals_auto: number;
  returns_auto: number;
  pending_auto: number;
  is_clocked_out: boolean;
  existing_report: Record<string, unknown> | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
  agentName: string;
}

const FIELD_DEFS = [
  { key: "issues_observed", label: "Issues observed", placeholder: "Machine errors, complaints, anything unusual…" },
  { key: "customer_feedback", label: "Customer feedback", placeholder: "What did customers say today?" },
  { key: "competitor_activity", label: "Competitor activity", placeholder: "New machines nearby? Promos?" },
  { key: "marketing_activities", label: "Marketing activities", placeholder: "Posters, flyers, demos done at the station." },
  { key: "suggestions", label: "Suggestions", placeholder: "Ideas to improve operations at this location." },
  { key: "notes", label: "General comments", placeholder: "Anything else worth noting." },
] as const;

type FieldKey = typeof FIELD_DEFS[number]["key"];
type FormState = Record<FieldKey, string> & { machine_cleanliness: string };

const emptyForm = (): FormState => ({
  machine_cleanliness: "",
  issues_observed: "",
  customer_feedback: "",
  competitor_activity: "",
  marketing_activities: "",
  suggestions: "",
  notes: "",
});

export const ShiftReportDialog = ({ open, onOpenChange, onSubmitted, agentName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.clockin.shiftSummary()
      .then((r) => {
        if (r.success && r.data) {
          const s = r.data as ShiftSummary;
          setSummary(s);
          if (s.existing_report) {
            const e = s.existing_report as Partial<Record<FieldKey | "machine_cleanliness", string>>;
            setForm({
              machine_cleanliness: e.machine_cleanliness ?? "",
              issues_observed: e.issues_observed ?? "",
              customer_feedback: e.customer_feedback ?? "",
              competitor_activity: e.competitor_activity ?? "",
              marketing_activities: e.marketing_activities ?? "",
              suggestions: e.suggestions ?? "",
              notes: e.notes ?? "",
            });
          } else {
            setForm(emptyForm());
          }
        } else {
          toast.error(r.error || "Could not load shift summary");
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  const submit = async () => {
    if (!summary) return;
    if (!summary.location) {
      toast.error("No clock-in found for today — cannot submit shift report.");
      return;
    }
    setSubmitting(true);
    const payload = {
      report_date: summary.report_date,
      station_id: summary.station_id,
      location: summary.location,
      time_in: summary.time_in,
      time_out: summary.time_out,
      // auto-computed (server will recompute too as source of truth)
      rentals: summary.rentals_auto,
      returns: summary.returns_auto,
      pending_returns: summary.pending_auto,
      // agent observations
      machine_cleanliness: form.machine_cleanliness || null,
      issues_observed: form.issues_observed || null,
      customer_feedback: form.customer_feedback || null,
      competitor_activity: form.competitor_activity || null,
      marketing_activities: form.marketing_activities || null,
      suggestions: form.suggestions || null,
      notes: form.notes || null,
    };
    const res = await api.clockin.reports.upsert(payload);
    setSubmitting(false);
    if (res.success) {
      toast.success("Shift report submitted", { description: "Thanks for keeping operations informed." });
      onSubmitted?.();
      onOpenChange(false);
    } else {
      toast.error(res.error || "Failed to submit report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Shift Report
          </DialogTitle>
          <DialogDescription>
            Operational metrics are calculated automatically. Please add your on-the-ground observations.
          </DialogDescription>
        </DialogHeader>

        {loading || !summary ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading shift summary…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Auto-computed snapshot */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Auto-captured from your shift
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <Stat label="Agent" value={agentName} />
                <Stat label="Date" value={summary.report_date} />
                <Stat label="Location" value={summary.location || "—"} />
                <Stat label="Clock In" value={summary.time_in ? formatDateTime(summary.time_in) : "—"} />
                <Stat label="Clock Out" value={summary.time_out ? formatDateTime(summary.time_out) : "Still on shift"} />
                <Stat label="Hours Worked" value={`${summary.hours_worked} h`} />
                <Stat label="Rentals" value={summary.rentals_auto} highlight />
                <Stat label="Returns" value={summary.returns_auto} highlight />
                <Stat label="Pending Returns" value={summary.pending_auto} highlight />
              </div>
            </div>

            {/* Agent observations */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Machine cleanliness</label>
                <Select
                  value={form.machine_cleanliness}
                  onValueChange={(v) => setForm((f) => ({ ...f, machine_cleanliness: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rate the machine condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor — needs attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {FIELD_DEFS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1.5 block">{f.label}</label>
                  <Textarea
                    rows={2}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Later
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {summary.existing_report ? "Update Report" : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`font-medium ${highlight ? "text-primary text-base" : ""}`}>{value}</p>
  </div>
);

export default ShiftReportDialog;
