import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Download,
  Receipt,
  Wallet,
  TrendingUp,
  Calendar,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DEFAULT_USD_TO_INR_RATE } from "@/lib/currency";

type PayoutRow = {
  id: string;
  internId: string;
  internName: string;
  employerId: string | null;
  employerName: string;
  source: string | null;
  proposalId: string | null;
  amount: number;
  amountMinor: number;
  currency: string;
  status: string;
  method: string;
  referenceId: string | null;
  scheduledFor: string | null;
  paidAt: string | null;
  createdAt: string;
};

type EmployerDueRow = {
  proposalId: string;
  employerId: string;
  employerName: string;
  projectName: string;
  startDate: string | null;
  totalMonths: number;
  internPaidMonths: number;
  internRemainingMonths: number;
  currency: string;
  monthlyAmountMinor: number;
  totalAmountMinor: number;
  internMonthlyAmountMinor: number;
  internTotalMinor: number;
  internPaidMinor: number;
  internDueMinor: number;
  upcomingPaymentDate: string | null;
  proposalStatus: string;
  internshipStatus: string;
  internId: string;
  internName: string;
};

export default function AdminPayoutsPage() {
  const [tab, setTab] = useState<"dues" | "payouts">("dues");
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [loadingDues, setLoadingDues] = useState(false);
  const [payoutItems, setPayoutItems] = useState<PayoutRow[]>([]);
  const [dueItems, setDueItems] = useState<EmployerDueRow[]>([]);
  const [payoutTotals, setPayoutTotals] = useState<any>({});
  const [dueTotals, setDueTotals] = useState<any>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [payoutSearch, setPayoutSearch] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("all");
  const [payoutCurrency, setPayoutCurrency] = useState("all");

  const [dueSearch, setDueSearch] = useState("");
  const [dueStatus, setDueStatus] = useState("all");

  useEffect(() => {
    void (async () => { await fetchDues(); })();
  }, []);

  useEffect(() => {
    void (async () => { await fetchPayouts(); })();
  }, []);

  const fetchPayouts = async () => {
    setLoadingPayouts(true);
    try {
      const params = new URLSearchParams();
      if (payoutStatus !== "all") params.set("status", payoutStatus);
      if (payoutCurrency !== "all") params.set("currency", payoutCurrency);
      if (payoutSearch) params.set("q", payoutSearch);
      const res = await apiRequest("GET", `/api/admin/all-payouts?${params.toString()}`);
      const json = await res.json().catch(() => null);
      setPayoutItems(json?.items ?? []);
      setPayoutTotals(json?.totals ?? {});
    } catch {
      setPayoutItems([]);
      setPayoutTotals({});
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchDues = async () => {
    setLoadingDues(true);
    try {
      const params = new URLSearchParams();
      if (dueStatus !== "all") params.set("status", dueStatus);
      if (dueSearch) params.set("q", dueSearch);
      const res = await apiRequest("GET", `/api/admin/all-employer-dues?${params.toString()}`);
      const json = await res.json().catch(() => null);
      setDueItems(json?.items ?? []);
      setDueTotals(json?.totals ?? {});
    } catch {
      setDueItems([]);
      setDueTotals({});
    } finally {
      setLoadingDues(false);
    }
  };

  const loadData = async () => {
    if (tab === "payouts") await fetchPayouts();
    else await fetchDues();
  };

  const handleTabChange = async (newTab: "dues" | "payouts") => {
    setTab(newTab);
    if (newTab === "payouts" && payoutItems.length === 0) await fetchPayouts();
    else if (newTab === "dues" && dueItems.length === 0) await fetchDues();
  };

  const formatMoney = (minor: number, currency: string) => {
    const cur = String(currency || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(minor) ? minor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major);
  };

  const formatMoneyINR = (minor: number, currency: string) => {
    const cur = String(currency || "INR").toUpperCase();
    const inrMinor = cur === "USD" ? minor * DEFAULT_USD_TO_INR_RATE : minor;
    const major = Number.isFinite(inrMinor) ? inrMinor / 100 : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(major);
  };

  const formatDate = (v: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const statusBadge = (status: string) => {
    switch (String(status ?? "").toLowerCase()) {
      case "paid":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayouts = useMemo(() => {
    const q = payoutSearch.trim().toLowerCase();
    return payoutItems.filter((p) => {
      if (q) {
        const hay = `${p.internName} ${p.employerName} ${p.referenceId ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (payoutStatus !== "all" && p.status !== payoutStatus) return false;
      if (payoutCurrency !== "all" && p.currency !== payoutCurrency) return false;
      return true;
    });
  }, [payoutItems, payoutSearch, payoutStatus, payoutCurrency]);

  const filteredDues = useMemo(() => {
    const q = dueSearch.trim().toLowerCase();
    return dueItems.filter((d) => {
      if (q) {
        const hay = `${d.internName} ${d.employerName} ${d.projectName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dueStatus === "has-upcoming") {
        if (!(d.internDueMinor > 0)) return false;
      } else if (dueStatus === "completed") {
        if (d.internRemainingMonths > 0) return false;
      } else if (dueStatus === "active") {
        if (d.internRemainingMonths <= 0) return false;
      }
      return true;
    });
  }, [dueItems, dueSearch, dueStatus]);

  const exportCSV = (type: "payouts" | "dues") => {
    if (type === "payouts") {
      const headers = ["Intern", "Employer", "Source", "Amount", "Currency", "Status", "Method", "Reference", "Scheduled For", "Paid At", "Created At"];
      const rows = filteredPayouts.map((p) => [
        p.internName,
        p.employerName,
        p.source ?? "-",
        p.amount.toFixed(2),
        p.currency,
        p.status,
        p.method,
        p.referenceId ?? "-",
        p.scheduledFor ? formatDate(p.scheduledFor) : "-",
        p.paidAt ? formatDate(p.paidAt) : "-",
        formatDate(p.createdAt),
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map((row) =>
        row.map((cell) =>
          typeof cell === "string" && (cell.includes(",") || cell.includes('"'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(",")
      ).join("\n");
      const link = document.createElement("a");
      link.href = encodeURI(csv);
      link.download = `payouts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ["Intern", "Employer", "Project", "Start Date", "Total Months", "Paid Months", "Remaining Months", "Currency", "Monthly Amount", "Total Amount", "Paid Amount", "Due Amount", "Upcoming Payment Date"];
      const rows = filteredDues.map((d) => [
        d.internName,
        d.employerName,
        d.projectName,
        d.startDate ? formatDate(d.startDate) : "-",
        d.totalMonths,
        d.internPaidMonths,
        d.internRemainingMonths,
        d.currency,
        (d.internMonthlyAmountMinor / 100).toFixed(2),
        (d.internTotalMinor / 100).toFixed(2),
        (d.internPaidMinor / 100).toFixed(2),
        (d.internDueMinor / 100).toFixed(2),
        d.upcomingPaymentDate ? formatDate(d.upcomingPaymentDate) : "-",
      ]);
      const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].map((row) =>
        row.map((cell) =>
          typeof cell === "string" && (cell.includes(",") || cell.includes('"'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(",")
      ).join("\n");
      const link = document.createElement("a");
      link.href = encodeURI(csv);
      link.download = `employer-dues-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <AdminLayout title="Payouts & Dues" description="Track intern payouts and employer payment dues">
      <div className="flex flex-col gap-6">
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold">Payments Overview</h2>
                <p className="text-xs text-muted-foreground">
                  {tab === "dues" ? `${dueTotals?.total ?? 0} records found` : `${payoutTotals?.total ?? 0} records found`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadData()}
                className="gap-2 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(tab)}
                disabled={tab === "dues" ? filteredDues.length === 0 : filteredPayouts.length === 0}
                className="gap-2 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="flex gap-4 p-5 border-b bg-muted/20">
            <button
              onClick={() => void handleTabChange("dues")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "dues"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              <Receipt className="h-4 w-4" />
              Employer Dues
            </button>
            <button
              onClick={() => void handleTabChange("payouts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "payouts"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Intern Payouts
            </button>
          </div>

          {tab === "payouts" && (
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <p className="text-xs text-muted-foreground uppercase">Paid</p>
                  <p className="text-xl font-bold text-emerald-600">₹{(payoutTotals?.paidAmount ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{payoutTotals?.paidCount ?? 0} transactions</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                  <p className="text-xs text-muted-foreground uppercase">Pending</p>
                  <p className="text-xl font-bold text-amber-600">₹{(payoutTotals?.pendingAmount ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{payoutTotals?.pendingCount ?? 0} transactions</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <p className="text-xs text-muted-foreground uppercase">Total INR</p>
                  <p className="text-xl font-bold">₹{((payoutTotals?.paidAmount ?? 0) + (payoutTotals?.pendingAmount ?? 0)).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">All currencies</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                  <p className="text-xs text-muted-foreground uppercase">Total Records</p>
                  <p className="text-xl font-bold">{payoutTotals?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">All statuses</p>
                </Card>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search intern, employer..."
                    value={payoutSearch}
                    onChange={(e) => setPayoutSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void fetchPayouts(); }}
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={payoutStatus} onValueChange={(v) => setPayoutStatus(v)}>
                  <SelectTrigger className="w-[130px] h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={payoutCurrency} onValueChange={(v) => setPayoutCurrency(v)}>
                  <SelectTrigger className="w-[110px] h-10">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => void fetchPayouts()} className="h-10">
                  Apply
                </Button>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Intern</TableHead>
                      <TableHead className="text-xs font-semibold">Employer</TableHead>
                      <TableHead className="text-xs font-semibold">Source</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">INR Value</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Method</TableHead>
                      <TableHead className="text-xs font-semibold">Reference</TableHead>
                      <TableHead className="text-xs font-semibold">Paid At</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayouts ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-sm text-muted-foreground">
                          No payouts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayouts.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/20">
                          <TableCell className="text-sm font-medium">{p.internName}</TableCell>
                          <TableCell className="text-sm">{p.employerName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.source ?? "-"}</TableCell>
                          <TableCell className="text-sm font-semibold">{formatMoney(p.amountMinor, p.currency)}</TableCell>
                          <TableCell className="text-sm font-semibold text-primary">{formatMoneyINR(p.amountMinor, p.currency)}</TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs capitalize">{p.method}</TableCell>
                          <TableCell className="text-xs font-mono">{p.referenceId ?? "-"}</TableCell>
                          <TableCell className="text-xs">{p.paidAt ? formatDate(p.paidAt) : "-"}</TableCell>
                          <TableCell className="text-xs">{formatDate(p.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {tab === "dues" && (
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <p className="text-xs text-muted-foreground uppercase">Active Dues</p>
                  <p className="text-xl font-bold">{dueTotals?.active ?? 0}</p>
                  <p className="text-xs text-muted-foreground">interns with pending</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <p className="text-xs text-muted-foreground uppercase">Completed</p>
                  <p className="text-xl font-bold">{dueTotals?.completed ?? 0}</p>
                  <p className="text-xs text-muted-foreground">fully paid</p>
                </Card>
                <Card className="p-4 border-l-4 border-l-purple-500">
                  <p className="text-xs text-muted-foreground uppercase">Total Due</p>
                  <p className="text-xl font-bold text-amber-600">₹{(dueTotals?.totalDue ?? 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">outstanding amount</p>
                </Card>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search intern, employer, project..."
                    value={dueSearch}
                    onChange={(e) => setDueSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void fetchDues(); }}
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={dueStatus} onValueChange={(v) => setDueStatus(v)}>
                  <SelectTrigger className="w-[150px] h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="has-upcoming">Has Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => void fetchDues()} className="h-10">
                  Apply
                </Button>
              </div>

              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-semibold">Intern</TableHead>
                      <TableHead className="text-xs font-semibold">Employer</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Project</TableHead>
                      <TableHead className="text-xs font-semibold">Start Date</TableHead>
                      <TableHead className="text-xs font-semibold">Months (Paid/Total)</TableHead>
                      <TableHead className="text-xs font-semibold">Currency</TableHead>
                      <TableHead className="text-xs font-semibold">Monthly</TableHead>
                      <TableHead className="text-xs font-semibold">Total</TableHead>
                      <TableHead className="text-xs font-semibold">Paid</TableHead>
                      <TableHead className="text-xs font-semibold">Due</TableHead>
                      <TableHead className="text-xs font-semibold">Next Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDues ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ) : filteredDues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-sm text-muted-foreground">
                          No employer dues found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDues.map((d) => (
                        <TableRow key={`${d.internId}-${d.proposalId}`} className="hover:bg-muted/20">
                          <TableCell className="text-sm font-medium">{d.internName}</TableCell>
                          <TableCell className="text-sm">{d.employerName}</TableCell>
                          <TableCell className="text-sm hidden lg:table-cell">{d.projectName}</TableCell>
                          <TableCell className="text-xs">{d.startDate ? formatDate(d.startDate) : "-"}</TableCell>
                          <TableCell className="text-sm">
                            <span className="font-semibold text-primary">{d.internPaidMonths}</span>
                            <span className="text-muted-foreground"> / {d.totalMonths}</span>
                            {d.internRemainingMonths === 0 && (
                              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Done</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium">{d.currency}</TableCell>
                          <TableCell className="text-sm font-semibold">{formatMoneyINR(d.internMonthlyAmountMinor, d.currency)}</TableCell>
                          <TableCell className="text-sm">{formatMoneyINR(d.internTotalMinor, d.currency)}</TableCell>
                          <TableCell className="text-sm text-emerald-600 font-medium">{formatMoneyINR(d.internPaidMinor, d.currency)}</TableCell>
                          <TableCell className={`text-sm font-semibold ${d.internDueMinor > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {d.internDueMinor > 0 ? formatMoneyINR(d.internDueMinor, d.currency) : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d.upcomingPaymentDate ? (
                              <span className={d.internRemainingMonths <= 0 ? "text-muted-foreground line-through" : "text-primary font-medium"}>
                                {formatDate(d.upcomingPaymentDate)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
