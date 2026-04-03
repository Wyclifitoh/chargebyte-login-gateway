import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { mockNotifications, Notification } from "@/data/extendedMockData";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Bell, Check, X, AlertTriangle, Info, AlertCircle } from "lucide-react";

const severityIcon = (s: string) => {
  switch (s) {
    case "critical": return <AlertCircle className="h-5 w-5 text-destructive" />;
    case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default: return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [search, setSearch] = useState("");

  const roleFiltered = notifications.filter((n) => user && n.roles.includes(user.role));
  const filtered = roleFiltered.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || n.type === filterType;
    const matchSeverity = filterSeverity === "all" || n.severity === filterSeverity;
    const matchRead = filterRead === "all" || (filterRead === "read" ? n.read : !n.read);
    return matchSearch && matchType && matchSeverity && matchRead;
  });

  const types = [...new Set(roleFiltered.map((n) => n.type))];

  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const markUnread = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: false } : n));
  const dismiss = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const unreadCount = roleFiltered.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
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
      </div>

      <div className="space-y-3">
        {filtered.map((n) => (
          <Card key={n.id} className={`${!n.read ? "border-l-4 border-l-primary" : ""}`}>
            <CardContent className="flex items-start gap-4 py-4 px-4">
              <div className="mt-0.5">{severityIcon(n.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-sm font-medium text-foreground ${!n.read ? "font-bold" : ""}`}>{n.title}</p>
                  <StatusBadge status={n.severity === "critical" ? "cancelled" : n.severity === "warning" ? "pending" : "scheduled"} />
                </div>
                <p className="text-sm text-muted-foreground">{n.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">{n.time}</span>
                  {n.related_entity && <span className="text-xs font-mono text-muted-foreground">#{n.related_entity}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {!n.read ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markRead(n.id)} title="Mark read"><Check className="h-3.5 w-3.5" /></Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markUnread(n.id)} title="Mark unread"><Bell className="h-3.5 w-3.5" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => dismiss(n.id)} title="Dismiss"><X className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No notifications</CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
