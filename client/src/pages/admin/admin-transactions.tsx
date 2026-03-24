import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  CreditCard,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Area, AreaChart } from "recharts";

type Transaction = {
  id: string;
  date: string;
  time: string;
  type: "credit" | "debit";
  amount: number;
  currency: string;
  description: string;
  internName: string;
  companyName: string;
  status: string;
  paymentMethod: string;
  referenceId: string;
  source: "employer" | "intern";
  createdAt: string;
};

type AdminTransactionsResponse = {
  items: Transaction[];
  totals: Record<string, { revenue: number; pending: number; count: number }>;
  charts: {
    monthlyRevenueData: Array<{ month: string; revenue: number; transactions: number }>;
    dailyTransactionData: Array<{ day: string; amount: number }>;
  };
};

const revenueConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(152, 61%, 40%)",
  },
  transactions: {
    label: "Transactions",
    color: "hsl(217, 91%, 60%)",
  },
};

const dailyConfig: ChartConfig = {
  amount: {
    label: "Amount",
    color: "hsl(43, 96%, 56%)",
  },
};

export default function AdminTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("INR");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const downloadCsv = (rows: Transaction[], fileName: string) => {
    const esc = (value: unknown) => {
      const s = String(value ?? "");
      if (/[\n\r\t,\"]/g.test(s)) {
        return `"${s.replace(/\"/g, '""')}"`;
      }
      return s;
    };

    const header = [
      "id",
      "date",
      "time",
      "description",
      "companyName",
      "internName",
      "type",
      "amount",
      "currency",
      "status",
      "paymentMethod",
      "referenceId",
      "source",
      "createdAt",
    ];

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          esc(r.id),
          esc(r.date),
          esc(r.time),
          esc(r.description),
          esc(r.companyName),
          esc(r.internName),
          esc(r.type),
          esc(r.amount),
          esc(r.currency),
          esc(r.status),
          esc(r.paymentMethod),
          esc(r.referenceId),
          esc(r.source),
          esc(r.createdAt),
        ].join(","),
      );
    }

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const { data, isLoading, error } = useQuery<AdminTransactionsResponse>({
    queryKey: [
      "/api/admin/transactions",
      `?currency=${encodeURIComponent(currencyFilter)}&status=${encodeURIComponent(statusFilter)}&source=${encodeURIComponent(sourceFilter)}&q=${encodeURIComponent(searchQuery)}&from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
    ],
  });

  const transactions = data?.items ?? [];
  const monthlyRevenueData = data?.charts?.monthlyRevenueData ?? [];
  const dailyTransactionData = data?.charts?.dailyTransactionData ?? [];

  const currencyForTotals = currencyFilter === "all" ? "INR" : currencyFilter.toUpperCase();
  const totals = data?.totals ?? {};
  const totalsRow = totals[currencyForTotals] ?? { revenue: 0, pending: 0, count: 0 };

  const totalRevenue = totalsRow.revenue;
  const pendingAmount = totalsRow.pending;
  const totalTransactions = totalsRow.count;

  // (Optional) Debit/expenses not reliably present in current DB schema; keep computed from returned items.
  const totalExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === "debit" && t.status === "completed" && (currencyFilter === "all" || t.currency === currencyForTotals))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, currencyFilter, currencyForTotals]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      return matchesType;
    });
  }, [transactions, typeFilter]);

  const formatCurrency = (amount: number, currency: string) => {
    const c = String(currency ?? "INR").toUpperCase();
    return new Intl.NumberFormat(c === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5";
    switch (status) {
      case "completed":
        return <Badge className={`${baseClass} bg-emerald-100 text-emerald-800 hover:bg-emerald-100`}>Completed</Badge>;
      case "pending":
        return <Badge className={`${baseClass} bg-yellow-100 text-yellow-800 hover:bg-yellow-100`}>Pending</Badge>;
      case "failed":
        return <Badge className={`${baseClass} bg-red-100 text-red-800 hover:bg-red-100`}>Failed</Badge>;
      default:
        return <Badge variant="secondary" className={baseClass}>{status}</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Transactions"
      description="View and manage all platform transactions and payments."
    >
      <div className="space-y-4 sm:space-y-6">
        {error ? (
          <Card className="p-4">
            <div className="text-sm text-red-600">Failed to load transactions.</div>
            <div className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Please try again."}
            </div>
          </Card>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Revenue</p>
                <p className="text-sm sm:text-lg md:text-2xl font-bold mt-0.5 sm:mt-1 text-emerald-600">{formatCurrency(totalRevenue, currencyForTotals)}</p>
                <p className="text-[9px] sm:text-xs text-emerald-500 flex items-center mt-0.5 sm:mt-1">
                  <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                  {isLoading ? "Loading..." : "Updated"}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Expenses</p>
                <p className="text-sm sm:text-lg md:text-2xl font-bold mt-0.5 sm:mt-1 text-red-600">{formatCurrency(totalExpenses, currencyForTotals)}</p>
                <p className="text-[9px] sm:text-xs text-red-500 flex items-center mt-0.5 sm:mt-1">
                  <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                  {isLoading ? "Loading..." : "Updated"}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Pending</p>
                <p className="text-sm sm:text-lg md:text-2xl font-bold mt-0.5 sm:mt-1 text-yellow-600">{formatCurrency(pendingAmount, currencyForTotals)}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">Awaiting</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Transactions</p>
                <p className="text-sm sm:text-lg md:text-2xl font-bold mt-0.5 sm:mt-1">{totalTransactions}</p>
                <p className="text-[9px] sm:text-xs text-emerald-500 flex items-center mt-0.5 sm:mt-1">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                  {isLoading ? "Loading..." : "Updated"}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Last 6 months</p>
              </div>
            </div>
            <div className="">
              <ChartContainer config={revenueConfig}>
                <ResponsiveContainer>
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152, 61%, 40%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152, 61%, 40%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${currencyForTotals} ${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Daily Volume</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">This week</p>
              </div>
            </div>
            <div className="h-40 sm:h-52 md:h-64">
              <ChartContainer config={dailyConfig}>
                <ResponsiveContainer>
                  <BarChart data={dailyTransactionData}>
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${currencyForTotals} ${Math.round(v / 1000)}k`}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} fill="var(--color-amount)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="p-3 sm:p-4 md:p-6 border-b">
            <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-4">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">All Transactions</h2>
              <Button
                size="sm"
                className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                disabled={filteredTransactions.length === 0}
                onClick={() => {
                  const datePart = new Date().toISOString().slice(0, 10);
                  const currencyPart = (currencyFilter || "all").toLowerCase();
                  const statusPart = (statusFilter || "all").toLowerCase();
                  const sourcePart = (sourceFilter || "all").toLowerCase();
                  const typePart = (typeFilter || "all").toLowerCase();
                  const name = `findtern-transactions-${datePart}-${currencyPart}-${sourcePart}-${statusPart}-${typePart}.csv`;
                  downloadCsv(filteredTransactions, name);
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Export</span>
              </Button>
            </div>
          </div>
          <div className="p-3 sm:p-4 md:p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm h-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">From</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 w-[120px] sm:w-[140px] text-xs sm:text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 w-[120px] sm:w-[140px] text-xs sm:text-sm"
                  />
                </div>
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-muted-foreground"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-[105px] sm:w-[120px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] sm:w-[130px] h-9 text-xs sm:text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto -mx-3 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs whitespace-nowrap">S.No</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">ID</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-xs whitespace-nowrap hidden sm:table-cell">Description</TableHead>
                    <TableHead className="text-xs whitespace-nowrap hidden md:table-cell">Company</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-xs py-2">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs py-2">{transaction.id}</TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p className="text-xs sm:text-sm">{transaction.date}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                            {new Date(transaction.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell max-w-[150px]">
                        <p className="text-xs sm:text-sm font-medium truncate">{transaction.description}</p>
                        {transaction.internName !== "-" && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{transaction.internName}</p>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs sm:text-sm hidden md:table-cell">{transaction.companyName}</TableCell>
                      <TableCell className="py-2">
                        <span
                          className={`font-semibold text-xs sm:text-sm whitespace-nowrap ${
                            transaction.type === "credit" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {transaction.type === "credit" ? "+" : "-"}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="text-right py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download Receipt
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this transaction.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reference ID</p>
                  <p className="font-mono text-sm">{selectedTransaction.referenceId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">{selectedTransaction.date}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm">{selectedTransaction.time}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <Badge variant={selectedTransaction.type === "credit" ? "default" : "destructive"}>
                    {selectedTransaction.type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedTransaction.description}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm">{selectedTransaction.companyName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Intern</p>
                  <p className="text-sm">{selectedTransaction.internName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment Method</p>
                  <p className="text-sm">{selectedTransaction.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p
                    className={`text-lg font-bold ${
                      selectedTransaction.type === "credit" ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {selectedTransaction.type === "credit" ? "+" : "-"}
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
