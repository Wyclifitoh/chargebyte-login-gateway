import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, FilterBar, EmptyState, FallbackBanner, TableSkeleton } from "@/components/shared";
import { useNotifications } from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import { formatDateTime } from "@/lib/format";
import { Bell, Check, X, AlertTriangle, Info, AlertCircle } from "lucide-react";

interface NotifRow {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info";
  type: string;
  read: boolean;
  created_at: string;
}

const severityIcon = (s: string) => {
  switch (s) {
    case "critical": return <AlertCircle className="h-5 w-5 text-destructive" />;
    case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default: return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const NotificationsPage = () => {
  const notifQ = useNotifications();
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (notifQ.isLoading) return;
    const raw = notifQ.data as unknown as Array<Record<string, unknown>>;
    const mapped: NotifRow[] = (raw || []).map((n) => ({
      id: String(n.id),
      title: String(n.title || "Notification"),
      message: String(n.message || ""),
      severity: (n.severity as NotifRow["severity"]) ||
        (n.priority === "high" ? "critical" : n.priority === "medium" ? "warning" : "info"),
      type: String(n.type || "system"),
      read: Boolean(n.is_read ?? n.resolved),
      created_at: String(n.created_at || ""),
    }));
    setNotifications(mapped);
  }, [notifQ.data, notifQ.isLoading]);

  const filtered = useMemo(() => notifications.filter((n) => {
    const q = search.toLowerCase();
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    const matchType = filterType === "all" || n.type === filterType;
    const matchSeverity = filterSeverity === "all" || n.severity === filterSeverity;
    const matchRead = filterRead === "all" || (filterRead === "read" ? n.read : !n.read);
    return matchSearch && matchType && matchSeverity && matchRead;
  }), [notifications, search, filterType, filterSeverity, filterRead]);

  const types = useMemo(() => [...new Set(notifications.map((n) => n.type))], [notifications]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n));
    const res = await api.notifications.markRead(id);
    if (!res.success) toast.error("Failed to mark read");
  };
  const dismiss = async (id: string) => {
    setNotifications((p) => p.filter((n) => n.id !== id));
    const res = await api.notifications.dismiss(id);
    if (!res.success) toast.error("Failed to dismiss");
  };
  const markAllRead = async () => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })));
    const res = await api.notifications.markAllRead();
    if (res.success) toast.success("All notifications marked as read");
    else toast.error("Failed");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="System alerts and updates"
        badge={unreadCount > 0 ? (
          <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
        ) : undefined}
        actions={unreadCount > 0 ? <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button> : undefined}
      />

      {notifQ.isFallback && !notifQ.isLoading && <FallbackBanner onRetry={notifQ.refetch} />}

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search notifications...">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRead} onValueChange={setFilterRead}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <div className="space-y-2">
        {notifQ.isLoading && <TableSkeleton rows={4} columns={1} showHeader={false} />}
        {!notifQ.isLoading && filtered.map((n) => (
          <Card key={n.id} className={!n.read ? "border-l-4 border-l-primary" : ""}>
            <CardContent className="flex items-start gap-4 py-3 px-4">
              <div className="mt-0.5">{severityIcon(n.severity)}</div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm text-foreground ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{n.type.replace(/_/g, " ")}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!n.read && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead(n.id)} title="Mark read">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => dismiss(n.id)} title="Dismiss">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!notifQ.isLoading && filtered.length === 0 && (
          <Card>
            <EmptyState
              icon={<Bell className="h-6 w-6 text-muted-foreground" />}
              title="No notifications"
              description="You're all caught up!"
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
