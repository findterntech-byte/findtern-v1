import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Building2,
  Briefcase,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Filter,
  EyeOff,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type AdminReportsAnalyticsResponse = {
  platformMetrics: {
    totalUsers: number;
    activeUsers: number;
    totalCompanies: number;
    activeProjects: number;
    completedInternships: number;
    pendingApplications: number;
    totalRevenue: number;
    monthlyGrowth: number;
  };
  hiredInterns?: {
    fullTime: Array<{
      internId: string;
      internName: string;
      companyId: string | null;
      companyName: string | null;
      hiredAt: string;
      status: string;
    }>;
    internship: Array<{
      internId: string;
      internName: string;
      companyId: string | null;
      companyName: string | null;
      hiredAt: string;
      status: string;
    }>;
  };
  derivedMetrics?: {
    avgAppsPerUser: number;
    placementRate: number;
    projectsPerCompany: number;
    hiresPerCompany: number;
    successRate: number;
    avgHireTimeDays: number | null;
    interviewRate: number;
    profileCompletionRate: number;
    applicationSuccessRate: number;
    newCompanies: number;
    newProjects: number;
    fullTimeProposalCount?: number;
    internshipProposalCount?: number;
  };
  monthlyTrendsData: Array<{ month: string; users: number; companies: number; internships: number; revenue: number }>;
  weeklyActivityData: Array<{ day: string; signups: number; applications: number; interviews: number }>;
  performanceTrendsData?: Array<{ month: string; successRate: number; interviewRate: number; applicationSuccessRate: number }>;
  conversionAnalytics?: {
    signupCount: number;
    paidCount: number;
    interviewCount: number;
    hireCount: number;
    signupToPaid: number;
    paidToInterview: number;
    interviewToHire: number;
  };
  highestPayingSkillsData?: Array<{ skill: string; avgPay: number; postings: number }>;
  regionWiseDemandData?: Array<{ region: string; demand: number }>;
  employerBehaviorAnalytics?: {
    avgHireTimeDays: number | null;
    dropOffRate: number;
    dropOffEmployers: number;
    activeEmployers: number;
    repeatEmployers: number;
  };
  conversionFunnelData: Array<{ stage: string; value: number; percentage: number }>;
  industryDistributionData: Array<{ name: string; value: number; color: string }>;
  skillDemandData: Array<{ skill: string; demand: number }>;
  topCompanies: Array<{ name: string; projects: number; hires: number; rating: number; status: string }>;
  topInterns: Array<{ name: string; applications: number; interviews: number; offers: number; status: string }>;
  geographicData: Array<{ city: string; users: number; percentage: number }>;
  applicationStatusData: Array<{ name: string; value: number; color: string }>;
};

type AdminReportsTransactionsRow = {
  id: string;
  date: string;
  source: "candidate" | "company";
  category: "receivable" | "payable";
  amountMajor: number;
  dueAmountMajor?: number;
  currency: string;
  status: string;
  description: string;
  candidateId: string | null;
  candidateName: string | null;
  companyId: string | null;
  companyName: string | null;
  referenceId: string | null;
  createdAt: string;
  raw: any;
};

type AdminReportsTransactionsResponse = {
  receivables: AdminReportsTransactionsRow[];
  payables: AdminReportsTransactionsRow[];
  totals?: {
    receivables?: Record<string, { count: number; amount: number }>;
    payables?: Record<string, { count: number; amount: number }>;
  };
};

// Chart Configs
const trendsConfig: ChartConfig = {
  users: { label: "Interns", color: "hsl(152, 61%, 40%)" },
  companies: { label: "Companies", color: "hsl(217, 91%, 60%)" },
  internships: { label: "Internships", color: "hsl(43, 96%, 56%)" },
};

const weeklyConfig: ChartConfig = {
  signups: { label: "Signups", color: "hsl(152, 61%, 40%)" },
  proposals: { label: "Proposals", color: "hsl(217, 91%, 60%)" },
  interviews: { label: "Interviews", color: "hsl(262, 83%, 58%)" },
};

const revenueConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(152, 61%, 40%)" },
};

const performanceConfig: ChartConfig = {
  successRate: { label: "Success", color: "hsl(152, 61%, 40%)" },
  interviewRate: { label: "Interview", color: "hsl(262, 83%, 58%)" },
  applicationSuccessRate: { label: "App Success", color: "hsl(217, 91%, 60%)" },
};

const skillConfig: ChartConfig = {
  demand: { label: "Demand %", color: "hsl(152, 61%, 40%)" },
};

const conversionAnalyticsConfig: ChartConfig = {
  signupToPaid: { label: "Signup → Paid", color: "hsl(152, 61%, 40%)" },
  paidToInterview: { label: "Paid → Interview", color: "hsl(262, 83%, 58%)" },
  interviewToHire: { label: "Interview → Hire", color: "hsl(217, 91%, 60%)" },
};

const highestPayingConfig: ChartConfig = {
  avgPay: { label: "Avg Pay", color: "hsl(43, 96%, 56%)" },
};

const regionDemandConfig: ChartConfig = {
  demand: { label: "Demand", color: "hsl(152, 61%, 40%)" },
};

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState("last-18-months");
  const [activeTab, setActiveTab] = useState("overview");
  const [currencyFilter, setCurrencyFilter] = useState<"INR" | "USD">("INR");

  const [receivablesFilter, setReceivablesFilter] = useState<"candidate" | "company" | "both">("both");
  const payablesFilter: "candidate" = "candidate";

  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const queryString = useMemo(() => {
    const qs = new URLSearchParams({ range: dateRange });
    qs.set("currency", currencyFilter);
    if (dateRange === "custom") {
      if (customFrom) qs.set("from", customFrom);
      if (customTo) qs.set("to", customTo);
    }
    return `?${qs.toString()}`;
  }, [currencyFilter, customFrom, customTo, dateRange]);

  const transactionsQueryString = useMemo(() => {
    const qs = new URLSearchParams({
      receivablesFilter,
      payablesFilter,
    });

    if (dateRange === "custom") {
      if (customFrom) qs.set("from", customFrom);
      if (customTo) qs.set("to", customTo);
    }

    return `?${qs.toString()}`;
  }, [customFrom, customTo, dateRange, payablesFilter, receivablesFilter]);

  const { data, isLoading, error } = useQuery<AdminReportsAnalyticsResponse>({
    queryKey: ["/api/admin/reports/analytics", queryString],
  });

  const {
    data: txData,
    isLoading: isTxLoading,
    error: txError,
  } = useQuery<AdminReportsTransactionsResponse>({
    queryKey: ["/api/admin/reports/transactions", transactionsQueryString],
    enabled: activeTab === "transactions",
  });

  const platformMetrics = data?.platformMetrics ?? {
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeProjects: 0,
    completedInternships: 0,
    pendingApplications: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
  };

  const monthlyTrendsData = data?.monthlyTrendsData ?? [];
  const weeklyActivityData = data?.weeklyActivityData ?? [];
  const conversionFunnelData = data?.conversionFunnelData ?? [];
  const industryDistributionData = data?.industryDistributionData ?? [];
  const skillDemandData = data?.skillDemandData ?? [];
  const conversionAnalytics = data?.conversionAnalytics ?? null;
  const highestPayingSkillsData = data?.highestPayingSkillsData ?? [];
  const regionWiseDemandData = data?.regionWiseDemandData ?? [];
  const employerBehaviorAnalytics = data?.employerBehaviorAnalytics ?? null;
  const topCompanies = data?.topCompanies ?? [];
  const topInterns = data?.topInterns ?? [];
  const hiredFullTime = data?.hiredInterns?.fullTime ?? [];
  const hiredInternship = data?.hiredInterns?.internship ?? [];
  const performanceTrendsData = data?.performanceTrendsData ?? [];
  const geographicData = data?.geographicData ?? [];
  const applicationStatusData = data?.applicationStatusData ?? [];

  const derived = data?.derivedMetrics ?? {
    avgAppsPerUser: 0,
    placementRate: 0,
    projectsPerCompany: 0,
    hiresPerCompany: 0,
    successRate: 0,
    avgHireTimeDays: null,
    interviewRate: 0,
    profileCompletionRate: 0,
    applicationSuccessRate: 0,
    newCompanies: 0,
    newProjects: 0,
    fullTimeProposalCount: 0,
    internshipProposalCount: 0,
  };

  const activeInternRate = useMemo(() => {
    const total = Number(platformMetrics.totalUsers ?? 0);
    const active = Number(platformMetrics.activeUsers ?? 0);
    if (!Number.isFinite(total) || total <= 0) return 0;
    if (!Number.isFinite(active) || active <= 0) return 0;
    return Math.max(0, Math.min(100, Number(((active / total) * 100).toFixed(1))));
  }, [platformMetrics.activeUsers, platformMetrics.totalUsers]);

  const weeklyActivityChartData = useMemo(() => {
    return weeklyActivityData.map((d) => ({
      ...d,
      proposals: (d as any).proposals ?? (d as any).applications ?? 0,
    }));
  }, [weeklyActivityData]);

  const formatCurrency = (amount: number) => {
    const currency = currencyFilter;
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyFlexible = (amount: number, currency: string) => {
    const curr = String(currency ?? "INR").toUpperCase();
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: curr,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${curr} ${amount}`;
    }
  };

  const exportPayload = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      exportedAt: new Date().toISOString(),
      range: dateRange,
      from: dateRange === "custom" ? customFrom || null : null,
      to: dateRange === "custom" ? customTo || null : null,
    };
  }, [customFrom, customTo, data, dateRange]);

  const exportFileName = useMemo(() => {
    if (dateRange !== "custom") return `findtern-analytics-${dateRange}.json`;
    const from = customFrom || "from";
    const to = customTo || "to";
    return `findtern-analytics-custom-${from}_to_${to}.json`;
  }, [customFrom, customTo, dateRange]);

  return (
    <AdminLayout
      title="Analytics & Reports"
      description="Comprehensive analytics dashboard for platform performance insights."
    >
      <div className="space-y-6">
        {error ? (
          <Card className="p-4">
            <div className="text-sm text-red-600">Failed to load analytics.</div>
            <div className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Please try again."}
            </div>
          </Card>
        ) : null}

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="last-18-months">Last 18 months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* <Select value={currencyFilter} onValueChange={(v) => setCurrencyFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select> */}

            {dateRange === "custom" && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">From</span>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 w-full sm:w-[150px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">To</span>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 w-full sm:w-[150px]"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
         
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-[#0E6049] hover:bg-[#0b4b3a]"
              disabled={isLoading || !exportPayload}
              onClick={() => {
                if (!exportPayload) return;
                const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = exportFileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              <span className="hidden xs:inline">Export</span>
              <span className="xs:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <Card className="p-3 sm:p-4 md:p-6 cursor-pointer" onClick={() => setActiveTab("users")}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Interns</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">{platformMetrics.totalUsers.toLocaleString()}</p>
               
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6 cursor-pointer" onClick={() => setActiveTab("companies")}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Companies</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">{platformMetrics.totalCompanies}</p>
                <p className="text-[10px] sm:text-xs text-emerald-500 flex items-center mt-0.5 sm:mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {isLoading ? "Loading..." : `+${derived.newCompanies} new`}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 md:p-6 cursor-pointer" onClick={() => setActiveTab("companies")}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Projects</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">{platformMetrics.activeProjects}</p>
                <p className="text-[10px] sm:text-xs text-emerald-500 flex items-center mt-0.5 sm:mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {isLoading ? "Loading..." : `+${derived.newProjects} new`}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          {/* <Card className="p-3 sm:p-4 md:p-6 cursor-pointer" onClick={() => setActiveTab("transactions")}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Revenue</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold mt-0.5 sm:mt-1">{formatCurrency(platformMetrics.totalRevenue)}</p>
                <p className="text-[10px] sm:text-xs text-emerald-500 flex items-center mt-0.5 sm:mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {isLoading ? "Loading..." : "Updated"}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-yellow-600" />
              </div>
            </div>
          </Card> */}
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="bg-muted/50 w-max sm:w-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm px-2.5 sm:px-3">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm px-2.5 sm:px-3">Interns</TabsTrigger>
              <TabsTrigger value="companies" className="text-xs sm:text-sm px-2.5 sm:px-3">Companies</TabsTrigger>
              <TabsTrigger value="performance" className="text-xs sm:text-sm px-2.5 sm:px-3">Performance</TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs sm:text-sm px-2.5 sm:px-3">Transactions</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Growth Trends */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-1">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Platform Growth Trends</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Interns, Companies & Internships</p>
                  </div>
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-[#0E6049]" />
                </div>
                <div className="">
                  <ChartContainer config={trendsConfig}>
                    <ResponsiveContainer>
                      <LineChart data={monthlyTrendsData}>
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="companies" stroke="var(--color-companies)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="internships" stroke="var(--color-internships)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </Card>

          
            </div>

            {/* Weekly Activity & Conversion Funnel */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Weekly Activity</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Proposals & Interviews</p>
                  </div>
                </div>
                <div className="">
                  <ChartContainer config={weeklyConfig}>
                    <ResponsiveContainer>
                      <BarChart data={weeklyActivityChartData}>
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="proposals" radius={[4, 4, 0, 0]} fill="var(--color-proposals)" />
                        <Bar dataKey="interviews" radius={[4, 4, 0, 0]} fill="var(--color-interviews)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Top Skills in Demand</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Most requested skills</p>
                  </div>
                </div>
                <div className="">
                  <ChartContainer config={skillConfig}>
                    <ResponsiveContainer>
                      <BarChart data={skillDemandData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="skill" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="demand" radius={[0, 4, 4, 0]} fill="var(--color-demand)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </Card>
{/* <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Industry Distribution</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Projects by inferred industry</p>
                  </div>
                </div>
                <div className="h-40 sm:h-52 md:h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={industryDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {industryDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-2">
                  {industryDistributionData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </Card> */}
          
            </div>

            {/* Industry & Skills */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              

              
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Conversion Analytics</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Signup → Paid, Paid → Interview, Interview → Hire</p>
                  </div>
                </div>
                <div className="h-60 sm:h-72">
                  <ChartContainer config={conversionAnalyticsConfig}>
                    <ResponsiveContainer>
                      <BarChart
                        margin={{ top: 20, right: 12, left: 12, bottom: 20 }}
                        data={
                          conversionAnalytics
                            ? [
                                { stage: "Signup → Paid", value: conversionAnalytics.signupToPaid, color: "var(--color-signupToPaid)", count: conversionAnalytics.signupCount },
                                { stage: "Paid → Interview", value: conversionAnalytics.paidToInterview, color: "var(--color-paidToInterview)", count: conversionAnalytics.paidCount },
                                { stage: "Interview → Hire", value: conversionAnalytics.interviewToHire, color: "var(--color-interviewToHire)", count: conversionAnalytics.interviewCount },
                              ]
                            : []
                        }
                      >
                        <XAxis 
                          dataKey="stage" 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={10}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 10 }}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <p className="text-xs font-medium">{data.stage}</p>
                                <p className="text-[10px] text-muted-foreground">Conversion: {data.value}%</p>
                                <p className="text-[10px] text-muted-foreground">Volume: {data.count.toLocaleString()}</p>
                              </div>
                            );
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[4, 4, 0, 0]} 
                          strokeWidth={2}
                        >
                          {
                            conversionAnalytics ? [
                              { stage: "Signup → Paid", value: conversionAnalytics.signupToPaid, color: "var(--color-signupToPaid)" },
                              { stage: "Paid → Interview", value: conversionAnalytics.paidToInterview, color: "var(--color-paidToInterview)" },
                              { stage: "Interview → Hire", value: conversionAnalytics.interviewToHire, color: "var(--color-interviewToHire)" },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            )) : null
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>

                {conversionAnalytics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Signups</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics.signupCount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Paid</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics.paidCount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Interviews</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics.interviewCount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Hires</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics.hireCount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Employer Behavior Analysis</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Average hiring time, drop-off, repeat employers</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Average Hiring Time</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold">
                      {employerBehaviorAnalytics?.avgHireTimeDays == null ? "-" : `${employerBehaviorAnalytics.avgHireTimeDays}d`}
                    </p>
                  </div>
                  {/* <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Drop-off Rate</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold">
                      {employerBehaviorAnalytics ? `${employerBehaviorAnalytics.dropOffRate}%` : "-"}
                    </p>
                    {employerBehaviorAnalytics ? (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        {employerBehaviorAnalytics.dropOffEmployers}/{employerBehaviorAnalytics.activeEmployers}
                      </p>
                    ) : null}
                  </div> */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Repeat Employers</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold">
                      {employerBehaviorAnalytics ? employerBehaviorAnalytics.repeatEmployers.toLocaleString() : "-"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Currency</p>
                    <p className="text-sm sm:text-base md:text-lg font-bold">{currencyFilter}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Highest Paying Skills</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Avg monthly amount by skill</p>
                  </div>
                </div>
                <div className="h-64 sm:h-72 md:h-80">
                  <ChartContainer config={highestPayingConfig}>
                    <ResponsiveContainer>
                      <BarChart
                        data={highestPayingSkillsData}
                        layout="vertical"
                        margin={{ left: 10, right: 10 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="skill"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={80}
                          tick={{ fontSize: 10 }}
                        />
                        <ChartTooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload || payload.length === 0) return null;
                            const p: any = payload[0]?.payload ?? {};
                            const v = Number(p?.avgPay ?? 0) || 0;
                            const postings = Number(p?.postings ?? 0) || 0;
                            const skill = String(p?.skill ?? label ?? "");
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="text-xs font-medium">{skill}</div>
                                <div className="text-[10px] text-muted-foreground">Avg Pay: {formatCurrency(v)}</div>
                                <div className="text-[10px] text-muted-foreground">Postings: {postings}</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="avgPay" radius={[0, 4, 4, 0]} fill="var(--color-avgPay)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Region Wise Demand</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Projects by location</p>
                  </div>
                </div>
                <div className="h-64 sm:h-72 md:h-80">
                  <ChartContainer config={regionDemandConfig}>
                    <ResponsiveContainer>
                      <BarChart data={regionWiseDemandData} margin={{ bottom: 20 }}>
                        <XAxis 
                          dataKey="region" 
                          tickLine={false} 
                          axisLine={false} 
                          tickMargin={10} 
                          tick={{ fontSize: 10 }} 
                          interval="auto"
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="demand" radius={[4, 4, 0, 0]} fill="var(--color-demand)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* InternsAnalytics Tab */}
          <TabsContent value="users" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              {/* <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Interns</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2 text-emerald-600">{platformMetrics.totalUsers}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{activeInternRate}% active</p>
                </div>
              </Card> */}
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Avg. Proposals/Intern</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2 text-primary">{derived.avgAppsPerUser}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                    Proposals: {Number(derived.internshipProposalCount ?? 0).toLocaleString()} | Full-time: {Number(derived.fullTimeProposalCount ?? 0).toLocaleString()}
                  </p>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Placement</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2 text-purple-600">{derived.placementRate}%</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">&nbsp;</p>
                </div>
              </Card>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Full-time Hired</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Accepted / hired (full-time)</p>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Intern</TableHead>
                        <TableHead className="text-xs">Company</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Hired At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hiredFullTime.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-xs text-muted-foreground py-6 text-center">
                            No full-time hires found.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {hiredFullTime.map((r) => (
                        <TableRow key={`ft-${r.internId}-${r.hiredAt}`}>
                          <TableCell className="text-xs sm:text-sm py-2 max-w-[180px] truncate">{r.internName}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 max-w-[180px] truncate">{r.companyName ?? "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2">
                            <Badge className="bg-emerald-100 text-emerald-800">{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 whitespace-nowrap">
                            {new Date(r.hiredAt).toISOString().slice(0, 10)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Internship Hired</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Accepted / hired (internship)</p>
                  </div>
                </div>
                <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Intern</TableHead>
                        <TableHead className="text-xs">Company</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Hired At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hiredInternship.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-xs text-muted-foreground py-6 text-center">
                            No internship hires found.
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {hiredInternship.map((r) => (
                        <TableRow key={`intern-${r.internId}-${r.hiredAt}`}>
                          <TableCell className="text-xs sm:text-sm py-2 max-w-[180px] truncate">{r.internName}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 max-w-[180px] truncate">{r.companyName ?? "-"}</TableCell>
                          <TableCell className="text-xs sm:text-sm py-2">
                            <Badge className="bg-emerald-100 text-emerald-800">{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm py-2 whitespace-nowrap">
                            {new Date(r.hiredAt).toISOString().slice(0, 10)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>

            {/* Geographic Distribution */}
            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Geographic Distribution</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Interns by city</p>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">City</TableHead>
                      <TableHead className="text-xs">Interns</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Progress</TableHead>
                      <TableHead className="text-xs">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geographicData.map((item) => (
                      <TableRow key={item.city}>
                        <TableCell className="font-medium text-xs sm:text-sm py-2">{item.city}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">{item.users.toLocaleString()}</TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <div className="w-16 sm:w-20 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-emerald-500 text-xs flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-0.5" />
                            {item.percentage}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Top Interns */}
            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Top Performing Interns</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Based on proposals and offers</p>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Proposals</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Interviews</TableHead>
                      <TableHead className="text-xs">Offers</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topInterns.map((intern) => (
                      <TableRow key={intern.name}>
                        <TableCell className="font-medium text-xs sm:text-sm py-2 max-w-[100px] truncate">{intern.name}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">{intern.applications}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{intern.interviews}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">{intern.offers}</TableCell>
                        <TableCell className="py-2">
                          <Badge
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 ${
                              intern.status === "placed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {intern.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Company Analytics Tab */}
          <TabsContent value="companies" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Companies</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2">{platformMetrics.totalCompanies}</p>
                  <p className="text-[9px] sm:text-xs text-emerald-500 mt-0.5 sm:mt-1">+{derived.newCompanies}</p>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Projects</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2 text-primary">{platformMetrics.activeProjects}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">&nbsp;</p>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Total Hires</p>
                  <p className="text-lg sm:text-xl md:text-3xl font-bold mt-1 sm:mt-2 text-purple-600">{platformMetrics.completedInternships}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">&nbsp;</p>
                </div>
              </Card>
            </div>

            {/* Top Companies */}
            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Top Performing Companies</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Based on projects and hires</p>
                </div>
              </div>
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Company</TableHead>
                      <TableHead className="text-xs">Proj.</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Hires</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCompanies.map((company) => (
                      <TableRow key={company.name}>
                        <TableCell className="font-medium text-xs sm:text-sm py-2 max-w-[100px] truncate">{company.name}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">{company.projects}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 hidden sm:table-cell">{company.hires}</TableCell>
                     
                        <TableCell className="py-2">
                          <Badge
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 ${
                              company.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {company.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Application Status Distribution */}
            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Application Status Distribution</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Current Proposals by status</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
                {applicationStatusData.map((item) => (
                  <div key={item.name} className="text-center p-2 sm:p-3 md:p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center">
                    <div
                      className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1 sm:mb-2"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      {item.name === "Applied" && <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Under Review" && <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Interviewed" && <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Hired (Internship)" && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Hired (Full-time)" && <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Rejected" && <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                      {item.name === "Withdrawn" && <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" style={{ color: item.color }} />}
                    </div>
                    <p className="text-sm sm:text-base md:text-xl font-bold leading-none">{item.value}</p>
                    <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 truncate w-full px-1">{item.name}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Success</p>
                    <p className="text-sm sm:text-base md:text-xl font-bold">{derived.successRate}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Hire Time</p>
                    <p className="text-sm sm:text-base md:text-xl font-bold">
                      {derived.avgHireTimeDays == null ? "-" : `${derived.avgHireTimeDays}d`}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Interview</p>
                    <p className="text-sm sm:text-base md:text-xl font-bold">{Math.max(0, Math.min(100, derived.interviewRate))}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">App Success</p>
                    <p className="text-sm sm:text-base md:text-xl font-bold">{derived.applicationSuccessRate}%</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Funnel & Conversion</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Signup to hire journey</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  {(conversionFunnelData ?? []).map((row) => (
                    <div key={row.stage} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate">{row.stage}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{Number(row.value ?? 0).toLocaleString()} interns</p>
                        </div>
                        <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">{Math.max(0, Math.min(100, Number(row.percentage ?? 0)))}%</div>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${Math.max(0, Math.min(100, Number(row.percentage ?? 0)))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(conversionFunnelData ?? []).length === 0 ? (
                    <div className="rounded-md border p-3 text-xs text-muted-foreground">No funnel data available.</div>
                  ) : null}
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs sm:text-sm font-semibold">Step conversions</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Signup → Paid</span>
                      <span className="font-semibold">{conversionAnalytics ? `${conversionAnalytics.signupToPaid}%` : "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Paid → Interview</span>
                      <span className="font-semibold">{conversionAnalytics ? `${conversionAnalytics.paidToInterview}%` : "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Interview → Hire</span>
                      <span className="font-semibold">{conversionAnalytics ? `${conversionAnalytics.interviewToHire}%` : "-"}</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Signups</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics ? Number(conversionAnalytics.signupCount ?? 0).toLocaleString() : "-"}</p>
                    </div>
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Hires</p>
                      <p className="text-sm sm:text-base font-bold">{conversionAnalytics ? Number(conversionAnalytics.hireCount ?? 0).toLocaleString() : "-"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 sm:space-y-6">
            {txError ? (
              <Card className="p-4">
                <div className="text-sm text-red-600">Failed to load transactions report.</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {txError instanceof Error ? txError.message : "Please try again."}
                </div>
              </Card>
            ) : null}

            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Receivables</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Employer monthly billing + candidates unpaid activation</p>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={receivablesFilter} onValueChange={(v) => setReceivablesFilter(v as any)}>
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="candidate">Candidate only</SelectItem>
                      <SelectItem value="company">Company only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Source</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Candidate</TableHead>
                      <TableHead className="text-xs">Company</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-right">Due Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(txData?.receivables ?? []).length === 0 && !isTxLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-xs text-muted-foreground py-6 text-center">
                          No receivables found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {(txData?.receivables ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs sm:text-sm py-2 whitespace-nowrap">{r.date}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">
                          <Badge className={r.source === "company" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}>
                            {r.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 max-w-[260px] truncate">{r.description}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 max-w-[160px] truncate">{r.candidateName ?? "-"}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 max-w-[160px] truncate">{r.companyName ?? "-"}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 text-right whitespace-nowrap">
                          {formatCurrencyFlexible(r.amountMajor, r.currency)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 text-right whitespace-nowrap font-medium text-[#0E6049]">
                          {formatCurrencyFlexible(r.dueAmountMajor ?? 0, r.currency)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">
                          <Badge
                            className={
                              String(r.status).toLowerCase() === "paid" || String(r.status).toLowerCase() === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : String(r.status).toLowerCase() === "upcoming"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0E6049]">Payables</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Candidate payouts</p>
                </div>
              </div>

              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Candidate</TableHead>
                      <TableHead className="text-xs">Reference</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(txData?.payables ?? []).length === 0 && !isTxLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-xs text-muted-foreground py-6 text-center">
                          No payables found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {(txData?.payables ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs sm:text-sm py-2 whitespace-nowrap">{r.date}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 max-w-[220px] truncate">{r.candidateName ?? "-"}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 max-w-[220px] truncate">{r.referenceId ?? "-"}</TableCell>
                        <TableCell className="text-xs sm:text-sm py-2 text-right whitespace-nowrap">
                          {formatCurrencyFlexible(r.amountMajor, r.currency)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm py-2">
                          <Badge
                            className={
                              String(r.status).toLowerCase() === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : String(r.status).toLowerCase() === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
