import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, FilterBar, DetailRow, EmptyState, TableSkeleton, FallbackBanner } from "@/components/shared";
import { mockMpesaTransactions, mockMpesaCallbacks, MpesaTransaction, MpesaCallback } from "@/data/extendedMockData";
import { useTransactions, useMpesaCallbacks } from "@/hooks/useDashboardData";
import type { Transaction } from "@/types/dashboard";
import { formatKsh, formatDateTime } from "@/lib/format";
import { Eye, CreditCard, ArrowLeftRight, Download } from "lucide-react";

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TransactionsTab = () => {
  const txQ = useTransactions();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewing, setViewing] = useState<MpesaTransaction | null>(null);
  const [rows, setRows] = useState<MpesaTransaction[]>(mockMpesaTransactions);

  useEffect(() => {
    if (txQ.isLoading || txQ.isFallback) return;
    const mapped: MpesaTransaction[] = (txQ.data as Transaction[]).map((t) => ({
      id: t.id,
      date: formatDateTime(t.created_at),
      transaction_type: (t.transaction_type === "topup" ? "deposit" : t.transaction_type) as MpesaTransaction["transaction_type"],
      amount: t.amount,
      currency: t.currency || "KES",
      mpesa_receipt: t.mpesa_receipt ?? "",
      phone_number: t.phone_number,
      checkout_request_id: t.checkout_request_id ?? "",
      rental_id: t.rental_id ?? "",
      status: t.status,
    }));
    setRows(mapped);
  }, [txQ.data, txQ.isLoading, txQ.isFallback]);

  const filtered = rows.filter((t) => {
    const matchSearch = t.phone_number.includes(search) || t.mpesa_receipt.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.transaction_type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="space-y-4">
      {txQ.isFallback && !txQ.isLoading && <FallbackBanner onRetry={txQ.refetch} />}
      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by phone or receipt...">
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
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={filtered.length === 0}
          onClick={() => {
            const headers = ["Date", "Type", "Amount (Ksh)", "Currency", "M-Pesa Receipt", "Phone", "Checkout ID", "Rental ID", "Status"];
            const rowsOut = filtered.map((t) => [
              t.date,
              t.transaction_type,
              t.amount,
              t.currency,
              t.mpesa_receipt,
              t.phone_number,
              t.checkout_request_id,
              t.rental_id,
              t.status,
            ]);
            downloadCsv(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, headers, rowsOut);
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </FilterBar>

      {txQ.isLoading ? <TableSkeleton rows={6} columns={10} /> : (
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
                  <td className="px-4 py-3 text-foreground font-medium">{formatKsh(t.amount)}</td>
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
              {filtered.length === 0 && <tr><td colSpan={10}><EmptyState title="No transactions found" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>Transaction Details</SheetTitle></SheetHeader>
          {viewing && (
            <div className="mt-6 space-y-1">
              <DetailRow label="ID" value={viewing.id} />
              <DetailRow label="Date" value={viewing.date} />
              <DetailRow label="Type" value={<span className="capitalize">{viewing.transaction_type.replace("_", " ")}</span>} />
              <DetailRow label="Amount" value={formatKsh(viewing.amount)} />
              <DetailRow label="M-Pesa Receipt" value={viewing.mpesa_receipt || "N/A"} />
              <DetailRow label="Phone" value={viewing.phone_number} />
              <DetailRow label="Checkout ID" value={viewing.checkout_request_id} />
              <DetailRow label="Rental ID" value={viewing.rental_id} />
              <DetailRow label="Status" value={<StatusBadge status={viewing.status} />} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

interface RawCallback {
  id?: string | number;
  created_at?: string;
  transaction_date?: string;
  merchant_request_id?: string;
  checkout_request_id?: string;
  amount?: number | null;
  mpesa_receipt_number?: string | null;
  phone_number?: string;
  result_code?: number;
  result_desc?: string;
  processed?: boolean;
  callback_data?: Record<string, unknown>;
}

const CallbacksTab = () => {
  const cbQ = useMpesaCallbacks();
  const [search, setSearch] = useState("");
  const [filterProcessed, setFilterProcessed] = useState("all");
  const [viewing, setViewing] = useState<MpesaCallback | null>(null);
  const [rows, setRows] = useState<MpesaCallback[]>(mockMpesaCallbacks);

  useEffect(() => {
    if (cbQ.isLoading || cbQ.isFallback) return;
    const mapped: MpesaCallback[] = (cbQ.data as RawCallback[]).map((c) => ({
      id: String(c.id ?? ""),
      date: formatDateTime(c.created_at ?? c.transaction_date ?? ""),
      transaction_id: "",
      merchant_request_id: c.merchant_request_id ?? "",
      checkout_request_id: c.checkout_request_id ?? "",
      amount: Number(c.amount ?? 0),
      mpesa_receipt_number: c.mpesa_receipt_number ?? "",
      phone_number: c.phone_number ?? "",
      result_code: Number(c.result_code ?? 0),
      result_desc: c.result_desc ?? "",
      processed: Boolean(c.processed),
      callback_data: c.callback_data ?? {},
    }));
    setRows(mapped);
  }, [cbQ.data, cbQ.isLoading, cbQ.isFallback]);

  const filtered = rows.filter((c) => {
    const matchSearch = c.phone_number.includes(search) || c.checkout_request_id.toLowerCase().includes(search.toLowerCase());
    const matchProcessed = filterProcessed === "all" || (filterProcessed === "yes" ? c.processed : !c.processed);
    return matchSearch && matchProcessed;
  });

  return (
    <div className="space-y-4">
      {cbQ.isFallback && !cbQ.isLoading && <FallbackBanner onRetry={cbQ.refetch} />}
      <FilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search callbacks...">
        <Select value={filterProcessed} onValueChange={setFilterProcessed}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Processed" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Processed</SelectItem>
            <SelectItem value="no">Unprocessed</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {cbQ.isLoading ? <TableSkeleton rows={6} columns={9} /> : (
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
                  <td className="px-4 py-3 text-foreground">{formatKsh(c.amount)}</td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs">{c.mpesa_receipt_number || "—"}</td>
                  <td className="px-4 py-3 text-foreground">{c.phone_number}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.result_code === 0 ? "completed" : "failed"} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.processed ? "active" : "pending"} /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewing(c)}><Eye className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9}><EmptyState title="No callbacks found" /></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      <Sheet open={!!viewing} onOpenChange={() => setViewing(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Callback Details</SheetTitle></SheetHeader>
          {viewing && (() => {
            // M-Pesa callback fields that we map onto the transaction record.
            const mappedKeys = new Set([
              "MerchantRequestID",
              "CheckoutRequestID",
              "ResultCode",
              "ResultDesc",
              "Amount",
              "MpesaReceiptNumber",
              "TransactionDate",
              "PhoneNumber",
            ]);
            const raw = (viewing.callback_data ?? {}) as Record<string, unknown>;
            const rawEntries = Object.entries(raw);
            return (
              <div className="mt-6 space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium mb-2">Mapped Transaction Fields</p>
                <DetailRow label="Date" value={viewing.date} />
                <DetailRow label="Merchant Req ID" value={viewing.merchant_request_id} />
                <DetailRow label="Checkout Req ID" value={viewing.checkout_request_id} />
                <DetailRow label="Amount" value={formatKsh(viewing.amount)} />
                <DetailRow label="Receipt" value={viewing.mpesa_receipt_number || "N/A"} />
                <DetailRow label="Phone" value={viewing.phone_number} />
                <DetailRow label="Result Code" value={String(viewing.result_code)} />
                <DetailRow label="Result Desc" value={viewing.result_desc} />
                <DetailRow label="Processed" value={<StatusBadge status={viewing.processed ? "active" : "pending"} />} />

                <div className="pt-6">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium mb-2">Raw callback_data fields</p>
                  {rawEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No raw callback payload available.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {rawEntries.map(([k, v]) => {
                        const isMapped = mappedKeys.has(k);
                        return (
                          <div
                            key={k}
                            className={`flex items-start justify-between gap-3 rounded-md px-3 py-1.5 text-xs font-mono border ${
                              isMapped
                                ? "border-primary/30 bg-primary/5"
                                : "border-border/50 bg-muted/30"
                            }`}
                          >
                            <span className="text-foreground font-medium shrink-0">
                              {k}
                              {isMapped && (
                                <span className="ml-1.5 inline-block rounded-sm bg-primary/15 text-primary px-1 py-px text-[10px] font-sans font-semibold uppercase tracking-wide">
                                  mapped
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground text-right break-all">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium mb-2">Pretty JSON</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs text-foreground overflow-auto max-h-[300px]">
{JSON.stringify(raw, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const TransactionsPage = () => (
  <div className="space-y-6">
    <PageHeader title="M-Pesa Transactions" description="Monitor all M-Pesa transactions and callbacks" />
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
