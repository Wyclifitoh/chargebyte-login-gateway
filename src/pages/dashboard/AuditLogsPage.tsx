import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, FilterBar, DetailRow, EmptyState } from "@/components/shared";
import { mockAuditLogs, AuditLog } from "@/data/extendedMockData";
import { Eye } from "lucide-react";

const AuditLogsPage = () => {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [viewing, setViewing] = useState<AuditLog | null>(null);

  const actions = [...new Set(mockAuditLogs.map((l) => l.action))];
  const tables = [...new Set(mockAuditLogs.map((l) => l.table_name))];

  const filtered = mockAuditLogs.filter((l) => {
    const matchSearch = l.user_name.toLowerCase().includes(search.toLowerCase()) || l.record_id.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    const matchTable = filterTable === "all" || l.table_name === filterTable;
    return matchSearch && matchAction && matchTable;
  });

  const actionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "active";
      case "UPDATE": return "pending";
      case "DELETE": return "cancelled";
      default: return "active";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Track all system changes and user actions" />

      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by user or record...">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Table" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterBar>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date/Time</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Table</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Record ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User Agent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{l.date}</td>
                  <td className="px-4 py-3 text-foreground">{l.user_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={actionColor(l.action)} /></td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{l.table_name}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{l.record_id}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{l.ip_address}</td>
                  <td className="px-4 py-3 text-foreground text-xs truncate max-w-[150px]">{l.user_agent}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(l)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8}><EmptyState title="No logs found" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Audit Log Details</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-1">
              <DetailRow label="Date" value={viewing.date} />
              <DetailRow label="User" value={`${viewing.user_name} (${viewing.user_id})`} />
              <DetailRow label="Action" value={<StatusBadge status={actionColor(viewing.action)} />} />
              <DetailRow label="Table" value={viewing.table_name} />
              <DetailRow label="Record" value={viewing.record_id} />
              <DetailRow label="IP" value={viewing.ip_address} />
              <DetailRow label="User Agent" value={viewing.user_agent} />
              {viewing.old_values && (
                <div className="pt-2">
                  <p className="text-muted-foreground font-medium mb-2 text-sm">Old Values</p>
                  <pre className="bg-destructive/5 border border-destructive/10 rounded-lg p-3 text-xs text-foreground overflow-auto max-h-[200px]">{JSON.stringify(viewing.old_values, null, 2)}</pre>
                </div>
              )}
              {viewing.new_values && (
                <div className="pt-2">
                  <p className="text-muted-foreground font-medium mb-2 text-sm">New Values</p>
                  <pre className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs text-foreground overflow-auto max-h-[200px]">{JSON.stringify(viewing.new_values, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AuditLogsPage;
