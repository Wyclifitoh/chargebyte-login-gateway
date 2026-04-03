import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StatusBadge from "@/components/StatusBadge";
import { mockMpesaTransactions, mockMpesaCallbacks, MpesaTransaction, MpesaCallback } from "@/data/extendedMockData";
import { Search, Eye, CreditCard, ArrowLeftRight } from "lucide-react";

const TransactionsTab = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewing, setViewing] = useState<MpesaTransaction | null>(null);

  const filtered = mockMpesaTransactions.filter((t) => {
    const matchSearch = t.phone_number.includes(search) || t.mpesa_receipt.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.transaction_type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by phone or receipt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="rental_charge">Rental Charge</SelectItem>
            <SelectItem value="refund">Refund</SelectItem>
            <SelectItem value="penalty">Penalty</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Currency</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">M-Pesa Receipt</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Checkout ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rental</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground">{t.date}</td>
                  <td className="px-4 py-3 text-foreground capitalize">{t.transaction_type.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground">{t.currency}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{t.mpesa_receipt || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{t.phone_number}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-[160px]">{t.checkout_request_id}</td>
                  <td className="px-4 py-3 text-foreground">{t.rental_id}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(t)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Transaction Details</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-4 text-sm">
              <div><span className="text-muted-foreground">ID:</span> <span className="text-foreground ml-2">{viewing.id}</span></div>
              <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground ml-2">{viewing.date}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground ml-2 capitalize">{viewing.transaction_type.replace("_", " ")}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="text-foreground ml-2">{viewing.currency} {viewing.amount.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">M-Pesa Receipt:</span> <span className="text-foreground ml-2 font-mono">{viewing.mpesa_receipt || "N/A"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-2">{viewing.phone_number}</span></div>
              <div><span className="text-muted-foreground">Checkout ID:</span> <span className="text-foreground ml-2 font-mono text-xs break-all">{viewing.checkout_request_id}</span></div>
              <div><span className="text-muted-foreground">Rental ID:</span> <span className="text-foreground ml-2">{viewing.rental_id}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="ml-2"><StatusBadge status={viewing.status} /></span></div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const CallbacksTab = () => {
  const [search, setSearch] = useState("");
  const [filterProcessed, setFilterProcessed] = useState("all");
  const [viewing, setViewing] = useState<MpesaCallback | null>(null);

  const filtered = mockMpesaCallbacks.filter((c) => {
    const matchSearch = c.phone_number.includes(search) || c.checkout_request_id.toLowerCase().includes(search.toLowerCase());
    const matchProcessed = filterProcessed === "all" || (filterProcessed === "yes" ? c.processed : !c.processed);
    return matchSearch && matchProcessed;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search callbacks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterProcessed} onValueChange={setFilterProcessed}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Processed" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Processed</SelectItem>
            <SelectItem value="no">Unprocessed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Merchant Req ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Checkout Req ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Result</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processed</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-foreground">{c.date}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{c.merchant_request_id}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs truncate max-w-[160px]">{c.checkout_request_id}</td>
                  <td className="px-4 py-3 text-foreground">{c.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{c.mpesa_receipt_number || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{c.phone_number}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.result_code === 0 ? "completed" : "failed"} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.processed ? "active" : "pending"} /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(c)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No callbacks found</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Callback Details</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-4 text-sm">
              <div><span className="text-muted-foreground">Date:</span> <span className="text-foreground ml-2">{viewing.date}</span></div>
              <div><span className="text-muted-foreground">Merchant Req ID:</span> <span className="text-foreground ml-2 font-mono">{viewing.merchant_request_id}</span></div>
              <div><span className="text-muted-foreground">Checkout Req ID:</span> <span className="text-foreground ml-2 font-mono text-xs break-all">{viewing.checkout_request_id}</span></div>
              <div><span className="text-muted-foreground">Amount:</span> <span className="text-foreground ml-2">KES {viewing.amount.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Receipt:</span> <span className="text-foreground ml-2 font-mono">{viewing.mpesa_receipt_number || "N/A"}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground ml-2">{viewing.phone_number}</span></div>
              <div><span className="text-muted-foreground">Result Code:</span> <span className="text-foreground ml-2">{viewing.result_code}</span></div>
              <div><span className="text-muted-foreground">Result Desc:</span> <span className="text-foreground ml-2">{viewing.result_desc}</span></div>
              <div><span className="text-muted-foreground">Processed:</span> <span className="ml-2"><StatusBadge status={viewing.processed ? "active" : "pending"} /></span></div>
              <div className="pt-4">
                <p className="text-muted-foreground font-medium mb-2">Callback Data (JSON)</p>
                <pre className="bg-muted rounded-lg p-3 text-xs text-foreground overflow-auto max-h-[300px]">{JSON.stringify(viewing.callback_data, null, 2)}</pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const TransactionsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-foreground">M-Pesa Transactions</h1>
    <Tabs defaultValue="transactions" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-xs">
        <TabsTrigger value="transactions"><CreditCard className="h-4 w-4 mr-1" />Transactions</TabsTrigger>
        <TabsTrigger value="callbacks"><ArrowLeftRight className="h-4 w-4 mr-1" />Callbacks</TabsTrigger>
      </TabsList>
      <TabsContent value="transactions" className="mt-4"><TransactionsTab /></TabsContent>
      <TabsContent value="callbacks" className="mt-4"><CallbacksTab /></TabsContent>
    </Tabs>
  </div>
);

export default TransactionsPage;
