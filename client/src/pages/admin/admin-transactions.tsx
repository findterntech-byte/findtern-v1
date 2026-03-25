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
  X,
  FileText,
  Receipt,
  Wallet,
  Banknote,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  employerId?: string;
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

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendType,
  gradient,
  iconBg,
  iconColor
}: { 
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  gradient: string;
  iconBg: string;
  iconColor: string;
}) => (
  <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
    <div className={`absolute inset-0 ${gradient} opacity-5`} />
    <div className="relative p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trendType === "up" ? "text-emerald-600" : trendType === "down" ? "text-red-600" : "text-muted-foreground"
            }`}>
              {trendType === "up" && <ArrowUpRight className="h-3 w-3" />}
              {trendType === "down" && <ArrowDownRight className="h-3 w-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  </Card>
);

const ChartCard = ({ 
  title, 
  subtitle, 
  children, 
  icon: Icon,
  iconBg = "bg-emerald-100",
  iconColor = "text-emerald-600"
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode;
  icon?: React.ElementType;
  iconBg?: string;
  iconColor?: string;
}) => (
  <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
    <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-muted/20 to-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg ${iconBg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </Card>
);

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
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs px-2.5 py-1 font-medium shadow-sm">Completed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-2.5 py-1 font-medium shadow-sm">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-2.5 py-1 font-medium shadow-sm">Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-2.5 py-1 font-medium shadow-sm">{status}</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Transactions"
      description="View and manage all platform transactions and payments."
    >
      <div className="space-y-5 sm:space-y-6">
        {error ? (
          <Card className="p-6 border-red-200 bg-red-50/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Failed to load transactions</p>
                <p className="text-xs text-red-600/80 mt-0.5">
                  {error instanceof Error ? error.message : "Please try again."}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Transactions</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage all platform payments and financial records
            </p>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] hover:opacity-90 shadow-md"
            disabled={filteredTransactions.length === 0 || isLoading}
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
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={IndianRupee}
            label="Total Revenue"
            value={isLoading ? "..." : formatCurrency(totalRevenue, currencyForTotals)}
            trend={isLoading ? "..." : "All time"}
            trendType="up"
            gradient="bg-emerald-500"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <StatCard
            icon={CreditCard}
            label="Total Expenses"
            value={isLoading ? "..." : formatCurrency(totalExpenses, currencyForTotals)}
            trend={isLoading ? "..." : "Payouts"}
            trendType="down"
            gradient="bg-red-500"
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            icon={RefreshCw}
            label="Pending Amount"
            value={isLoading ? "..." : formatCurrency(pendingAmount, currencyForTotals)}
            trend={isLoading ? "..." : "Awaiting"}
            trendType="neutral"
            gradient="bg-yellow-500"
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          <StatCard
            icon={Wallet}
            label="Total Transactions"
            value={isLoading ? "..." : totalTransactions.toLocaleString()}
            trend={isLoading ? "..." : "All records"}
            trendType="up"
            gradient="bg-primary"
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
          <ChartCard
            title="Revenue Overview"
            subtitle="Monthly revenue trend"
            icon={TrendingUp}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          >
            <div className="h-[200px] sm:h-[240px] md:h-[280px] lg:h-[300px] w-full">
              {monthlyRevenueData.length > 0 ? (
                <ChartContainer config={revenueConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradientNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(152, 61%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(152, 61%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="month" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8} 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(v) => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={50}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          className="bg-background border-2 shadow-lg rounded-xl" 
                        />} 
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(152, 61%, 40%)"
                        strokeWidth={2}
                        fill="url(#revenueGradientNew)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No revenue data available
                </div>
              )}
            </div>
          </ChartCard>

          <ChartCard
            title="Daily Transaction Volume"
            subtitle="This week's activity"
            icon={Calendar}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          >
            <div className="h-[200px] sm:h-[240px] md:h-[280px] lg:h-[300px] w-full">
              {dailyTransactionData.length > 0 ? (
                <ChartContainer config={dailyConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTransactionData} barCategoryGap="25%" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="day" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8} 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(v) => v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={50}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent 
                          className="bg-background border-2 shadow-lg rounded-xl" 
                        />} 
                      />
                      <Bar 
                        dataKey="amount" 
                        radius={[4, 4, 0, 0]} 
                        fill="hsl(43, 96%, 56%)"
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No transaction data available
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Transactions Table */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-muted/10 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold">All Transactions</h2>
                  <p className="text-xs text-muted-foreground">
                    {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm h-10"
                />
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">From</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8 w-[130px] text-xs border-0 bg-transparent p-0 focus:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground font-medium">To</span>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8 w-[130px] text-xs border-0 bg-transparent p-0 focus:ring-0"
                  />
                </div>
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-[100px] h-10 text-xs">
                    <Banknote className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[110px] h-10 text-xs">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[110px] h-10 text-xs">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[100px] h-10 text-xs">
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
            {filteredTransactions.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold">#</TableHead>
                      <TableHead className="text-xs font-semibold">Transaction ID</TableHead>
                      <TableHead className="text-xs font-semibold">Date & Time</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Description</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Company</TableHead>
                      <TableHead className="text-xs font-semibold">Amount</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction, index) => (
                      <TableRow key={transaction.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs py-3 font-medium text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md">
                            {transaction.id.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div>
                            <p className="text-xs sm:text-sm font-medium">{transaction.date}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(transaction.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 hidden lg:table-cell max-w-[180px]">
                          <p className="text-xs font-medium truncate">{transaction.description}</p>
                          {transaction.internName !== "-" && (
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {transaction.internName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs hidden md:table-cell">
                          <span className="truncate block max-w-[120px]">{transaction.companyName}</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className={`flex items-center gap-1.5 ${transaction.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                            {transaction.type === "credit" ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            <span className="font-semibold text-xs sm:text-sm">
                              {transaction.type === "credit" ? "+" : "-"}
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setSelectedTransaction(transaction)} className="cursor-pointer">
                                <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer">
                                <Download className="h-4 w-4 mr-2 text-muted-foreground" />
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
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-medium text-muted-foreground">No transactions found</h3>
                <p className="text-xs text-muted-foreground/70 mt-1 max-w-[260px]">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] p-6 pb-16">
            <DialogHeader className="text-white">
              <DialogTitle className="text-lg">Transaction Details</DialogTitle>
              <DialogDescription className="text-white/80">
                View complete information about this transaction
              </DialogDescription>
            </DialogHeader>
          </div>
          {selectedTransaction && (
            <ScrollArea className="max-h-[60vh]">
              <div className="p-6 -mt-8 space-y-5">
                <div className="bg-background rounded-xl border shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className={`text-2xl font-bold ${
                        selectedTransaction.type === "credit" ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {selectedTransaction.type === "credit" ? "+" : "-"}
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      selectedTransaction.status === "completed" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : selectedTransaction.status === "pending"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Transaction ID</p>
                    <p className="font-mono text-xs bg-muted/50 px-2 py-1.5 rounded-lg">{selectedTransaction.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Reference ID</p>
                    <p className="font-mono text-xs bg-muted/50 px-2 py-1.5 rounded-lg truncate">{selectedTransaction.referenceId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Date</p>
                    <p className="text-sm font-medium">{selectedTransaction.date}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Time</p>
                    <p className="text-sm font-medium">{selectedTransaction.time}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Type</p>
                    <Badge 
                      variant={selectedTransaction.type === "credit" ? "default" : "destructive"}
                      className={`text-xs ${selectedTransaction.type === "credit" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}`}
                    >
                      {selectedTransaction.type === "credit" ? "Credit" : "Debit"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Source</p>
                    <p className="text-sm font-medium capitalize">{selectedTransaction.source}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Description</p>
                    <p className="text-sm">{selectedTransaction.description}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Company</p>
                    <p className="text-sm font-medium">{selectedTransaction.companyName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Intern</p>
                    <p className="text-sm font-medium">{selectedTransaction.internName}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Payment Method</p>
                    <p className="text-sm font-medium">{selectedTransaction.paymentMethod}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-11"
                    onClick={() => {
                      if (selectedTransaction.source === "employer" && selectedTransaction.employerId) {
                        window.open(`/api/employer/${selectedTransaction.employerId}/orders/${selectedTransaction.id}/invoice`, "_blank");
                      } else {
                        const blob = new Blob([JSON.stringify(selectedTransaction, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `receipt-${selectedTransaction.id}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Receipt
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
