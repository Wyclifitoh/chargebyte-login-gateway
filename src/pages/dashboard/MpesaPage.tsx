import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import { PageHeader, FilterBar, TableSkeleton, EmptyState, FallbackBanner, PinDialog } from "@/components/shared";
import { useMpesaIncoming, useMpesaOutgoing, useMpesaBalance } from "@/hooks/useDashboardData";
import { api } from "@/services/api";
import { formatKsh, formatDateTime } from "@/lib/format";
import { ArrowDownToLine, ArrowUpFromLine, Wallet, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

// ---------- Incoming ----------
const IncomingTab = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const q = useMpesaIncoming({ search, status: status === "all" ? undefined : status, page: 1, limit: 100 });

  return (
    <div className="space-y-4">
      {q.isFallback && !q.isLoading && <FallbackBanner onRetry={q.refetch} />}
      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by phone or receipt...">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
      {q.isLoading ? <TableSkeleton rows={6} columns={6} /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3 capitalize">{r.transaction_type.replace("_", " ")}</td>
                    <td className="px-4 py-3">{r.phone_number}</td>
                    <td className="px-4 py-3 font-medium">{formatKsh(r.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.mpesa_receipt || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {q.data.length === 0 && <tr><td colSpan={6}><EmptyState title="No incoming payments" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ---------- Outgoing ----------
const OutgoingTab = () => {
  const [search, setSearch] = useState("");
  const [paymentType, setPaymentType] = useState("all");
  const q = useMpesaOutgoing({
    search, payment_type: paymentType === "all" ? undefined : paymentType, page: 1, limit: 100,
  });

  // ---- Send-money dialogs ----
  const [b2cOpen, setB2cOpen] = useState(false);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [stkOpen, setStkOpen] = useState(false);

  // shared form state
  const [phone, setPhone] = useState("");
  const [partyB, setPartyB] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"b2c" | "b2b" | "stk" | null>(null);

  const resetForm = () => { setPhone(""); setPartyB(""); setAmount(""); setRemarks(""); setAccountRef(""); };

  const triggerPin = (action: "b2c" | "b2b" | "stk") => {
    setPendingAction(action);
    setPinOpen(true);
  };

  const handleConfirm = async (pin: string) => {
    if (pendingAction === "b2c") {
      const res = await api.mpesa.b2c({ phone_number: phone, amount: Number(amount), remarks, pin });
      if (!res.success) throw new Error(res.error || "B2C failed");
      toast.success("B2C payment queued");
      setB2cOpen(false); resetForm(); q.refetch();
    } else if (pendingAction === "b2b") {
      const res = await api.mpesa.b2b({ party_b: partyB, amount: Number(amount), remarks, account_ref: accountRef, pin });
      if (!res.success) throw new Error(res.error || "B2B failed");
      toast.success("B2B payment queued");
      setB2bOpen(false); resetForm(); q.refetch();
    } else if (pendingAction === "stk") {
      const res = await api.mpesa.stkPush({ phone_number: phone, amount: Number(amount), account_ref: accountRef, description: remarks, pin });
      if (!res.success) throw new Error(res.error || "STK push failed");
      toast.success("STK push sent");
      setStkOpen(false); resetForm();
    }
  };

  return (
    <div className="space-y-4">
      {q.isFallback && !q.isLoading && <FallbackBanner onRetry={q.refetch} />}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by recipient or receipt...">
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="B2C">B2C</SelectItem>
              <SelectItem value="B2B">B2B</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStkOpen(true)}><Send className="h-4 w-4 mr-1" />STK Push</Button>
          <Button size="sm" variant="outline" onClick={() => setB2cOpen(true)}><Send className="h-4 w-4 mr-1" />B2C</Button>
          <Button size="sm" onClick={() => setB2bOpen(true)}><Send className="h-4 w-4 mr-1" />B2B</Button>
        </div>
      </div>

      {q.isLoading ? <TableSkeleton rows={6} columns={7} /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remarks</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Initiated By</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">{r.payment_type}</span></td>
                    <td className="px-4 py-3">{r.party_b}</td>
                    <td className="px-4 py-3 font-medium">{formatKsh(r.amount)}</td>
                    <td className="px-4 py-3 truncate max-w-[200px]">{r.remarks}</td>
                    <td className="px-4 py-3">{r.initiated_by_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {q.data.length === 0 && <tr><td colSpan={7}><EmptyState title="No outgoing payments yet" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* B2C dialog */}
      <Dialog open={b2cOpen} onOpenChange={setB2cOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send B2C Payment</DialogTitle>
            <DialogDescription>Pay an individual customer's M-Pesa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Phone (07… or 2547…)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" /></div>
            <div><Label>Amount (KES)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Remarks</Label><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reason for payment" /></div>
            <Button className="w-full" disabled={!phone || !amount || !remarks} onClick={() => triggerPin("b2c")}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* B2B dialog */}
      <Dialog open={b2bOpen} onOpenChange={setB2bOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send B2B Payment</DialogTitle>
            <DialogDescription>Pay another paybill / till.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Recipient (Paybill / Till)</Label><Input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="e.g. 247247" /></div>
            <div><Label>Account Reference</Label><Input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} placeholder="Account number" /></div>
            <div><Label>Amount (KES)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Remarks</Label><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
            <Button className="w-full" disabled={!partyB || !amount || !remarks} onClick={() => triggerPin("b2b")}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STK Push dialog */}
      <Dialog open={stkOpen} onOpenChange={setStkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>STK Push (Charge a Customer)</DialogTitle>
            <DialogDescription>Initiate a Lipa-na-Mpesa prompt on a customer's phone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" /></div>
            <div><Label>Amount (KES)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label>Account Reference</Label><Input value={accountRef} onChange={(e) => setAccountRef(e.target.value)} /></div>
            <div><Label>Description</Label><Input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></div>
            <Button className="w-full" disabled={!phone || !amount} onClick={() => triggerPin("stk")}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>

      <PinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        title="Authorize payment"
        description="Enter your 4-digit transaction PIN to confirm."
        onConfirm={handleConfirm}
      />
    </div>
  );
};

// ---------- Balance ----------
const BalanceTab = () => {
  const q = useMpesaBalance();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.mpesa.refreshBalance();
      if (res.success) toast.success("Balance refresh requested. Result will arrive via callback shortly.");
      else toast.error(res.error || "Failed to query balance");
      setTimeout(() => q.refetch(), 4000);
    } finally { setRefreshing(false); }
  };

  return (
    <div className="space-y-4">
      {q.isFallback && !q.isLoading && <FallbackBanner onRetry={q.refetch} />}
      <div className="flex justify-end">
        <Button onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Querying…" : "Refresh balance"}
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          title="Working Account"
          value={q.data ? `${q.data.currency} ${formatKsh(q.data.balance)}` : "—"}
          icon={<Wallet className="h-5 w-5" />}
        />
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Last updated</p>
          <p className="text-lg font-semibold mt-1">{q.data?.fetched_at ? formatDateTime(q.data.fetched_at) : "Never"}</p>
          <p className="text-xs text-muted-foreground mt-2">Shortcode: {q.data?.shortcode || "—"}</p>
        </Card>
      </div>
    </div>
  );
};

const MpesaPage = () => (
  <div className="space-y-6">
    <PageHeader title="M-Pesa Operations" description="Incoming, outgoing payments and account balance" />
    <Tabs defaultValue="incoming" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="incoming"><ArrowDownToLine className="h-4 w-4 mr-1" />Incoming</TabsTrigger>
        <TabsTrigger value="outgoing"><ArrowUpFromLine className="h-4 w-4 mr-1" />Outgoing</TabsTrigger>
        <TabsTrigger value="balance"><Wallet className="h-4 w-4 mr-1" />Balance</TabsTrigger>
      </TabsList>
      <TabsContent value="incoming" className="mt-4"><IncomingTab /></TabsContent>
      <TabsContent value="outgoing" className="mt-4"><OutgoingTab /></TabsContent>
      <TabsContent value="balance" className="mt-4"><BalanceTab /></TabsContent>
    </Tabs>
  </div>
);

export default MpesaPage;
