import { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, MapPinned, Users, Calendar as CalendarIcon, Clock } from "lucide-react";
import { PageHeader, LoadingState } from "@/components/shared";
import { api } from "@/services/api";

type Stats = {
  submitted_today: number; pending_users: number; active_field: number;
  open_tasks: number; completed_today: number; issues_today: number;
};
type RecentUpdate = { id: string; department: string; update_date: string; status: string; work_summary: string | null; user_name: string | null };
type DeptRow = { department: string; updates: number };
type UpcomingEvent = { id: string; title: string; event_type: string; start_at: string; department: string | null };
type DashData = { stats: Stats; recent_updates: RecentUpdate[]; by_department: DeptRow[]; upcoming_events: UpcomingEvent[] };

const OperationsDashboardPage = () => {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await api.ops.dashboard();
      if (r.success) setData(r.data as DashData);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;
  const s = data?.stats;

  const cards = [
    { label: "Updates Submitted Today", value: s?.submitted_today ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Pending Employees", value: s?.pending_users ?? 0, icon: Users, color: "text-amber-600" },
    { label: "Active Field Visits", value: s?.active_field ?? 0, icon: MapPinned, color: "text-blue-600" },
    { label: "Open Tasks", value: s?.open_tasks ?? 0, icon: Activity, color: "text-indigo-600" },
    { label: "Completed Today", value: s?.completed_today ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Issues Reported", value: s?.issues_today ?? 0, icon: AlertTriangle, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Dashboard"
        description="Real-time visibility into what every department is doing today."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{c.value}</div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Recent Daily Updates</h2>
          </div>
          {!data?.recent_updates.length ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recent_updates.map((u) => (
                <div key={u.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(u.user_name || "?").charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{u.user_name || "Unknown"}</span>
                      <span className="text-xs text-muted-foreground">· {u.department || "—"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        u.status === "submitted" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}>{u.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{u.work_summary || "No summary"}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(u.update_date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold text-foreground mb-3">Department Activity (7d)</h2>
            {!data?.by_department.length ? (
              <p className="text-sm text-muted-foreground">No activity.</p>
            ) : (
              <ul className="space-y-2">
                {data.by_department.map((d) => (
                  <li key={d.department} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{d.department || "—"}</span>
                    <span className="font-semibold text-primary">{d.updates}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">Upcoming</h2>
            </div>
            {!data?.upcoming_events.length ? (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcoming_events.map((e) => (
                  <li key={e.id} className="text-sm">
                    <div className="font-medium text-foreground truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(e.start_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboardPage;