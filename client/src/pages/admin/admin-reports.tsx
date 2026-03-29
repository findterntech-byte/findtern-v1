import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Download, TrendingUp, Users, Building2, Briefcase, FileText, ArrowUpRight,
  ArrowDownRight, Target, Clock, CheckCircle2, XCircle, Calendar, Filter, EyeOff,
  Loader2, AlertCircle, DollarSign, MapPin, Zap, ChevronRight
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ResponsiveContainer, BarChart, LineChart, Line, XAxis, YAxis, Bar, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

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
    fullTime: Array<{ internId: string; internName: string; companyId: string | null; companyName: string | null; hiredAt: string; status: string }>;
    internship: Array<{ internId: string; internName: string; companyId: string | null; companyName: string | null; hiredAt: string; status: string }>;
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
    signupCount: number; paidCount: number; interviewCount: number; hireCount: number;
    signupToPaid: number; paidToInterview: number; interviewToHire: number;
  };
  highestPayingSkillsData?: Array<{ skill: string; avgPay: number; postings: number }>;
  regionWiseDemandData?: Array<{ region: string; demand: number }>;
  employerBehaviorAnalytics?: {
    avgHireTimeDays: number | null; dropOffRate: number; dropOffEmployers: number;
    activeEmployers: number; repeatEmployers: number;
  };
  conversionFunnelData: Array<{ stage: string; value: number; percentage: number }>;
  industryDistributionData: Array<{ name: string; value: number; color: string }>;
  skillDemandData: Array<{ skill: string; demand: number }>;
  topCompanies: Array<{ name: string; projects: number; hires: number; internshipHires?: number; fullTimeHires?: number; totalHires?: number; rating: number; status: string }>;
  topInterns: Array<{ name: string; applications: number; interviews: number; offers: number; status: string }>;
  geographicData: Array<{ city: string; users: number; percentage: number }>;
  applicationStatusData: Array<{ name: string; value: number; color: string }>;
};

type AdminReportsTransactionsResponse = {
  receivables: any[];
  payables: any[];
  totals?: { receivables?: Record<string, { count: number; amount: number }>; payables?: Record<string, { count: number; amount: number }> };
};

const trendsConfig: ChartConfig = {
  users: { label: "Interns", color: "hsl(152, 61%, 40%)" },
  companies: { label: "Companies", color: "hsl(217, 91%, 60%)" },
  internships: { label: "Internships", color: "hsl(43, 96%, 56%)" },
};

const skillConfig: ChartConfig = { demand: { label: "Demand %", color: "hsl(152, 61%, 40%)" } };

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  variant?: "default" | "success" | "warning" | "purple";
}

function StatCard({ title, value, subtitle, icon, className, variant = "default" }: StatCardProps) {
  const variants = {
    default: "bg-gradient-to-br from-slate-50 to-white border-slate-200",
    success: "bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200",
    purple: "bg-gradient-to-br from-purple-50 to-purple-100/30 border-purple-200",
  };
  const iconVariants = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
  };
  return (
    <Card className={cn("p-5 relative overflow-hidden border", variants[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>{icon}</div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "active" || s === "placed" || s === "hired") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">Active</Badge>;
  }
  if (s === "inactive" || s === "rejected") {
    return <Badge className="bg-red-100 text-red-700 border-red-200 font-medium">Inactive</Badge>;
  }
  return <Badge variant="outline" className="font-medium">{status}</Badge>;
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-3">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sublabel }: { icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string | number; sublabel?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState("last-18-months");
  const [activeTab, setActiveTab] = useState("overview");
  const [currencyFilter] = useState<"INR" | "USD">("INR");
  const [receivablesFilter, setReceivablesFilter] = useState<"candidate" | "company" | "both">("both");
  const payablesFilter: "candidate" = "candidate";
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [hiredFilter, setHiredFilter] = useState<"all" | "fulltime" | "internship">("all");
  const [hiredSearch, setHiredSearch] = useState("");
  const [hiredDateFrom, setHiredDateFrom] = useState("");
  const [hiredDateTo, setHiredDateTo] = useState("");
  const [hiredPage, setHiredPage] = useState(1);
  const hiredPerPage = 10;
  
  const [companyFilter, setCompanyFilter] = useState<"all" | "active" | "inactive">("all");
  const [companySearch, setCompanySearch] = useState("");
  const [conversionTab, setConversionTab] = useState<"interns" | "employers">("interns");

  const queryString = useMemo(() => {
    const qs = new URLSearchParams({ range: dateRange });
    qs.set("currency", currencyFilter);
    if (dateRange === "custom") { if (customFrom) qs.set("from", customFrom); if (customTo) qs.set("to", customTo); }
    return `?${qs.toString()}`;
  }, [currencyFilter, customFrom, customTo, dateRange]);

  const transactionsQueryString = useMemo(() => {
    const qs = new URLSearchParams({ receivablesFilter, payablesFilter });
    if (dateRange === "custom") { if (customFrom) qs.set("from", customFrom); if (customTo) qs.set("to", customTo); }
    return `?${qs.toString()}`;
  }, [customFrom, customTo, dateRange, payablesFilter, receivablesFilter]);

  const { data, isLoading, error } = useQuery<AdminReportsAnalyticsResponse>({ queryKey: ["/api/admin/reports/analytics", queryString] });
  const { data: txData, isLoading: isTxLoading, error: txError } = useQuery<AdminReportsTransactionsResponse>({ queryKey: ["/api/admin/reports/transactions", transactionsQueryString], enabled: activeTab === "transactions" });

  const platformMetrics = data?.platformMetrics ?? { totalUsers: 0, activeUsers: 0, totalCompanies: 0, activeProjects: 0, completedInternships: 0, pendingApplications: 0, totalRevenue: 0, monthlyGrowth: 0 };
  const monthlyTrendsData = data?.monthlyTrendsData ?? [];
  const weeklyActivityData = data?.weeklyActivityData ?? [];
  const conversionFunnelData = data?.conversionFunnelData ?? [];
  const skillDemandData = data?.skillDemandData ?? [];
  const conversionAnalytics = data?.conversionAnalytics ?? null;
  const highestPayingSkillsData = data?.highestPayingSkillsData ?? [];
  const regionWiseDemandData = data?.regionWiseDemandData ?? [];
  const employerBehaviorAnalytics = data?.employerBehaviorAnalytics ?? null;
  const topCompanies = data?.topCompanies ?? [];
  
  const filteredCompanies = useMemo(() => {
    let companies = [...topCompanies];
    
    if (companyFilter !== "all") {
      companies = companies.filter(c => c.status === companyFilter);
    }
    
    if (companySearch.trim()) {
      const search = companySearch.toLowerCase();
      companies = companies.filter(c => c.name?.toLowerCase().includes(search));
    }
    
    return companies;
  }, [topCompanies, companyFilter, companySearch]);
  const topInterns = data?.topInterns ?? [];
  const hiredFullTime = data?.hiredInterns?.fullTime ?? [];
  const hiredInternship = data?.hiredInterns?.internship ?? [];
  
  const filteredHires = useMemo(() => {
    let hires: typeof hiredFullTime = [];
    
    if (hiredFilter === "all") {
      hires = [...hiredFullTime, ...hiredInternship];
    } else if (hiredFilter === "fulltime") {
      hires = hiredFullTime;
    } else {
      hires = hiredInternship;
    }
    
    hires = hires.sort((a, b) => 
      new Date(b.hiredAt).getTime() - new Date(a.hiredAt).getTime()
    );
    
    if (hiredSearch.trim()) {
      const search = hiredSearch.toLowerCase();
      hires = hires.filter(h => 
        h.internName?.toLowerCase().includes(search) ||
        h.companyName?.toLowerCase().includes(search)
      );
    }
    
    if (hiredDateFrom) {
      const fromDate = new Date(hiredDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      hires = hires.filter(h => new Date(h.hiredAt) >= fromDate);
    }
    
    if (hiredDateTo) {
      const toDate = new Date(hiredDateTo);
      toDate.setHours(23, 59, 59, 999);
      hires = hires.filter(h => new Date(h.hiredAt) <= toDate);
    }
    
    return hires;
  }, [hiredFullTime, hiredInternship, hiredFilter, hiredSearch, hiredDateFrom, hiredDateTo]);
  
  const hiredTotalPages = Math.ceil(filteredHires.length / hiredPerPage);
  const paginatedHires = filteredHires.slice((hiredPage - 1) * hiredPerPage, hiredPage * hiredPerPage);
  const geographicData = data?.geographicData ?? [];
  const applicationStatusData = data?.applicationStatusData ?? [];
  const derived = data?.derivedMetrics ?? { avgAppsPerUser: 0, placementRate: 0, projectsPerCompany: 0, hiresPerCompany: 0, successRate: 0, avgHireTimeDays: null, interviewRate: 0, profileCompletionRate: 0, applicationSuccessRate: 0, newCompanies: 0, newProjects: 0, fullTimeProposalCount: 0, internshipProposalCount: 0 };

  const weeklyActivityChartData = useMemo(() => weeklyActivityData.map((d) => ({ ...d, proposals: (d as any).proposals ?? (d as any).applications ?? 0 })), [weeklyActivityData]);

  const formatCurrency = (amount: number) => {
    const locale = currencyFilter === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, { style: "currency", currency: currencyFilter, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const exportPayload = useMemo(() => {
    if (!data) return null;
    return { ...data, exportedAt: new Date().toISOString(), range: dateRange, from: dateRange === "custom" ? customFrom || null : null, to: dateRange === "custom" ? customTo || null : null };
  }, [customFrom, customTo, data, dateRange]);

  const exportFileName = useMemo(() => {
    if (dateRange !== "custom") return `findtern-analytics-${dateRange}.json`;
    return `findtern-analytics-custom-${customFrom || "from"}_to_${customTo || "to"}.json`;
  }, [customFrom, customTo, dateRange]);

  return (
    <AdminLayout title="Analytics & Reports" description="Comprehensive analytics dashboard for platform performance insights.">
      <div className="space-y-6">
        {error && (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100"><AlertCircle className="h-5 w-5 text-red-600" /></div>
              <div><h3 className="font-semibold text-red-800">Failed to load analytics</h3><p className="text-sm text-red-600/80">{error instanceof Error ? error.message : "Please try again."}</p></div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Platform performance & insights</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-10 w-[180px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="last-18-months">Last 18 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-10 w-[150px]" />
                <span className="text-muted-foreground">to</span>
                <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-10 w-[150px]" />
              </div>
            )}
            <Button disabled={isLoading || !exportPayload} onClick={() => {
              if (!exportPayload) return;
              const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = exportFileName;
              document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            }} className="h-10 bg-[#0E6049] hover:bg-[#0b4b3a]">
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Interns" value={platformMetrics.totalUsers.toLocaleString()} icon={<Users className="h-5 w-5" />} subtitle={`${platformMetrics.activeUsers.toLocaleString()} active`} />
          <StatCard title="Companies" value={platformMetrics.totalCompanies} icon={<Building2 className="h-5 w-5" />} variant="success" subtitle={`+${derived.newCompanies} new`} />
          <StatCard title="Active Projects" value={platformMetrics.activeProjects} icon={<Briefcase className="h-5 w-5" />} variant="purple" subtitle={`+${derived.newProjects} new`} />
          <StatCard title="Completed Hires" value={platformMetrics.completedInternships} icon={<CheckCircle2 className="h-5 w-5" />} subtitle="Total placements" />
        </div>

        {/* Main Tabs */}
        <Card className="border shadow-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b bg-muted/30 px-6">
              <TabsList className="bg-transparent gap-1 h-auto p-0 -mb-px">
                {["overview", "interns", "companies", "performance", "transactions"].map((tab) => (
                  <TabsTrigger key={tab} value={tab} className={cn("capitalize px-4 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none transition-all", activeTab === tab && "border-primary")}>
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-semibold">Platform Growth Trends</h3><p className="text-xs text-muted-foreground">Monthly overview</p></div>
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div className="h-[280px]">
                      <ChartContainer config={trendsConfig}>
                        <ResponsiveContainer>
                          <LineChart data={monthlyTrendsData}>
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
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

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-semibold">Top Skills in Demand</h3><p className="text-xs text-muted-foreground">Most requested</p></div>
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="h-[280px]">
                      <ChartContainer config={skillConfig}>
                        <ResponsiveContainer>
                          <BarChart data={skillDemandData} layout="vertical" margin={{ left: 80, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="skill" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="demand" radius={[0, 4, 4, 0]} fill="var(--color-demand)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-1">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-semibold">Conversion Analytics</h3><p className="text-xs text-muted-foreground">Funnel conversion rates</p></div>
                      <div className="flex gap-1">
                        <Button
                          variant={conversionTab === "interns" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setConversionTab("interns")}
                          className="text-xs"
                        >
                          Interns
                        </Button>
                        <Button
                          variant={conversionTab === "employers" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setConversionTab("employers")}
                          className="text-xs"
                        >
                          Employers
                        </Button>
                      </div>
                    </div>
                    {conversionTab === "interns" ? (
                      conversionAnalytics ? (
                        <div className="space-y-4">
                          {[
                            { label: "Signup → Paid", value: conversionAnalytics.signupToPaid, count: conversionAnalytics.signupCount, color: "bg-emerald-500" },
                            { label: "Paid → Interview", value: conversionAnalytics.paidToInterview, count: conversionAnalytics.paidCount, color: "bg-blue-500" },
                            { label: "Interview → Hire", value: conversionAnalytics.interviewToHire, count: conversionAnalytics.interviewCount, color: "bg-purple-500" },
                          ].map((item) => (
                            <div key={item.label} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-muted-foreground">{item.count.toLocaleString()} ({item.value}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.value}%` }} />
                              </div>
                            </div>
                          ))}
                          <div className="grid grid-cols-4 gap-3 pt-4 border-t">
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{conversionAnalytics.signupCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Signups</p></div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{conversionAnalytics.paidCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Paid</p></div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{conversionAnalytics.interviewCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Interviews</p></div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{conversionAnalytics.hireCount.toLocaleString()}</p><p className="text-xs text-muted-foreground">Hires</p></div>
                          </div>
                        </div>
                      ) : <EmptyState icon={Target} title="No data" description="Conversion data will appear here" />
                    ) : (
                      employerBehaviorAnalytics ? (
                        <div className="space-y-4">
                          {[
                            { label: "Posted Projects → Received Proposals", value: employerBehaviorAnalytics.dropOffRate > 0 ? Math.round((1 - employerBehaviorAnalytics.dropOffRate / 100) * 100) : 100, count: platformMetrics.activeProjects, color: "bg-emerald-500" },
                            { label: "Proposals → Interviews", value: 0, count: 0, color: "bg-blue-500" },
                            { label: "Interviews → Hires", value: 0, count: 0, color: "bg-purple-500" },
                          ].map((item) => (
                            <div key={item.label} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-muted-foreground">{item.count.toLocaleString()} ({item.value}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${item.value}%` }} />
                              </div>
                            </div>
                          ))}
                          <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{platformMetrics.activeProjects}</p><p className="text-xs text-muted-foreground">Active Projects</p></div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{employerBehaviorAnalytics.activeEmployers}</p><p className="text-xs text-muted-foreground">Active Employers</p></div>
                            <div className="text-center p-3 bg-muted/50 rounded-lg"><p className="text-lg font-bold">{employerBehaviorAnalytics.repeatEmployers}</p><p className="text-xs text-muted-foreground">Repeat Employers</p></div>
                          </div>
                        </div>
                      ) : <EmptyState icon={Target} title="No data" description="Employer conversion data will appear here" />
                    )}
                  </Card>

                
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-semibold">Highest Paying Skills</h3><p className="text-xs text-muted-foreground">By avg monthly pay</p></div>
                      <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="h-[250px]">
                      <ChartContainer config={{ avgPay: { label: "Avg Pay", color: "hsl(43, 96%, 56%)" } }}>
                        <ResponsiveContainer>
                          <BarChart data={highestPayingSkillsData} layout="vertical" margin={{ left: 80 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="skill" type="category" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0]?.payload ?? {};
                              return <div className="rounded-lg border bg-background p-2 shadow-sm"><p className="text-xs font-medium">{String(p?.skill ?? label)}</p><p className="text-xs text-muted-foreground">Avg: {formatCurrency(p?.avgPay ?? 0)}</p></div>;
                            }} />
                            <Bar dataKey="avgPay" radius={[0, 4, 4, 0]} fill="var(--color-avgPay)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div><h3 className="font-semibold">Region Demand</h3><p className="text-xs text-muted-foreground">By location</p></div>
                      <MapPin className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="h-[250px]">
                      <ChartContainer config={skillConfig}>
                        <ResponsiveContainer>
                          <BarChart data={regionWiseDemandData} margin={{ bottom: 40 }}>
                            <XAxis dataKey="region" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="demand" radius={[4, 4, 0, 0]} fill="var(--color-demand)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Interns Tab */}
              <TabsContent value="interns" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard icon={Users} iconBg="bg-primary/10" iconColor="text-primary" label="Total Interns" value={platformMetrics.totalUsers.toLocaleString()} sublabel={`${platformMetrics.activeUsers.toLocaleString()} active`} />
                  <MetricCard icon={Briefcase} iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Avg Proposals/Intern" value={derived.avgAppsPerUser} sublabel={`${derived.internshipProposalCount} internship | ${derived.fullTimeProposalCount} full-time`} />
                  <MetricCard icon={Target} iconBg="bg-purple-100" iconColor="text-purple-600" label="Internship Hired" value={hiredInternship.length} />
                  <MetricCard icon={CheckCircle2} iconBg="bg-amber-100" iconColor="text-amber-600" label="Full-time Hired" value={hiredFullTime.length} />
                </div>

<Card className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold">Hired Interns</h3>
                      <p className="text-xs text-muted-foreground">All placements ({filteredHires.length} total)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search intern or company..."
                          value={hiredSearch}
                          onChange={(e) => { setHiredSearch(e.target.value); setHiredPage(1); }}
                          className="h-9 w-[200px] pl-3"
                        />
                      </div>
                      <Input
                        type="date"
                        value={hiredDateFrom}
                        onChange={(e) => { setHiredDateFrom(e.target.value); setHiredPage(1); }}
                        className="h-9 w-[140px]"
                        placeholder="From Date"
                      />
                      <Input
                        type="date"
                        value={hiredDateTo}
                        onChange={(e) => { setHiredDateTo(e.target.value); setHiredPage(1); }}
                        className="h-9 w-[140px]"
                        placeholder="To Date"
                      />
                      <Select value={hiredFilter} onValueChange={(v) => { setHiredFilter(v as any); setHiredPage(1); }}>
                        <SelectTrigger className="h-9 w-[160px]">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Hires</SelectItem>
                          <SelectItem value="fulltime"> Full-time Hired</SelectItem>
                          <SelectItem value="internship">Internship Hired</SelectItem>
                        </SelectContent>
                      </Select>
                      {(hiredSearch || hiredDateFrom || hiredDateTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setHiredSearch(""); setHiredDateFrom(""); setHiredDateTo(""); setHiredPage(1); }}
                        >
Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  {filteredHires.length === 0 && !isLoading ? (
                    <EmptyState icon={Users} title="No hires" description="Hires will appear here" />
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Intern</TableHead>
                            <TableHead className="text-xs">Company</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedHires.map((r, idx) => {
                            const isFullTime = hiredFullTime.some(ft => ft.internId === r.internId && ft.hiredAt === r.hiredAt);
                            return (
                              <TableRow key={`${r.internId}-${r.hiredAt}-${idx}`} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-medium">{r.internName}</TableCell>
                                <TableCell className="text-sm">{r.companyName ?? "—"}</TableCell>
                                <TableCell>
                                  <Badge className={isFullTime ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}>
                                    {isFullTime ? "Full-time" : "Internship"}
                                  </Badge>
                                </TableCell>
                                <TableCell><Badge className="bg-emerald-100 text-emerald-700">{r.status}</Badge></TableCell>
                                <TableCell className="text-sm text-muted-foreground">{new Date(r.hiredAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {hiredTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            Showing {(hiredPage - 1) * hiredPerPage + 1} to {Math.min(hiredPage * hiredPerPage, filteredHires.length)} of {filteredHires.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHiredPage(p => Math.max(1, p - 1))}
                              disabled={hiredPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm">Page {hiredPage} of {hiredTotalPages}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHiredPage(p => Math.min(hiredTotalPages, p + 1))}
                              disabled={hiredPage === hiredTotalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold">Geographic Distribution</h3><p className="text-xs text-muted-foreground">Interns by city</p></div>
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40"><TableHead className="text-xs">City</TableHead><TableHead className="text-xs">Interns</TableHead><TableHead className="text-xs hidden md:table-cell">Progress</TableHead><TableHead className="text-xs">%</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {geographicData.map((item) => (
                        <TableRow key={item.city} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm">{item.city}</TableCell>
                          <TableCell className="text-sm">{item.users.toLocaleString()}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.percentage}%` }} /></div>
                          </TableCell>
                          <TableCell><span className="text-emerald-600 font-medium text-sm flex items-center"><ArrowUpRight className="h-3 w-3 mr-0.5" />{item.percentage}%</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* Companies Tab */}
              <TabsContent value="companies" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard icon={Building2} iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Total Companies" value={platformMetrics.totalCompanies} sublabel={`+${derived.newCompanies} new`} />
                  <MetricCard icon={Briefcase} iconBg="bg-primary/10" iconColor="text-primary" label="Active Projects" value={platformMetrics.activeProjects} sublabel={`${derived.projectsPerCompany} per company`} />
                  <MetricCard icon={CheckCircle2} iconBg="bg-purple-100" iconColor="text-purple-600" label="Completed Hires" value={platformMetrics.completedInternships} sublabel={`${derived.hiresPerCompany} per company`} />
                </div>

                <Card className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold">Top Performing Companies</h3>
                      <p className="text-xs text-muted-foreground">By projects and hires ({filteredCompanies.length} companies)</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="text"
                        placeholder="Search company..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="h-9 w-[180px]"
                      />
                      <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="h-9 w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40"><TableHead className="text-xs">Company</TableHead><TableHead className="text-xs">Projects</TableHead><TableHead className="text-xs">Internship Hires</TableHead><TableHead className="text-xs">Full-time Hires</TableHead><TableHead className="text-xs">Total Hires</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredCompanies.map((company) => (
                        <TableRow key={company.name} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm">{company.name}</TableCell>
                          <TableCell className="text-sm">{company.projects}</TableCell>
                          <TableCell className="text-sm">{(company as any).internshipHires ?? 0}</TableCell>
                          <TableCell className="text-sm">{(company as any).fullTimeHires ?? 0}</TableCell>
                          <TableCell className="text-sm font-medium">{(company as any).totalHires ?? company.hires}</TableCell>
                          <TableCell><StatusBadge status={company.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold">Application Status</h3><p className="text-xs text-muted-foreground">Current proposal distribution</p></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {applicationStatusData.map((item) => (
                      <div key={item.name} className="text-center p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${item.color}20` }}>
                          {(item.name === "Sent" || item.name === "Applied" || item.name === "Draft") && <FileText className="h-5 w-5" style={{ color: item.color }} />}
                          {item.name === "Under Review" && <Clock className="h-5 w-5" style={{ color: item.color }} />}
                          {item.name === "Interviewed" && <Users className="h-5 w-5" style={{ color: item.color }} />}
                          {(item.name === "Hired (Internship)" || item.name === "Hired (Full-time)") && <CheckCircle2 className="h-5 w-5" style={{ color: item.color }} />}
                          {item.name === "Rejected" && <XCircle className="h-5 w-5" style={{ color: item.color }} />}
                          {item.name === "Withdrawn" && <EyeOff className="h-5 w-5" style={{ color: item.color }} />}
                        </div>
                        <p className="text-xl font-bold">{item.value}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard icon={CheckCircle2} iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Success Rate" value={`${derived.successRate}%`} />
                  <MetricCard icon={Clock} iconBg="bg-primary/10" iconColor="text-primary" label="Avg Hire Time" value={derived.avgHireTimeDays != null ? `${derived.avgHireTimeDays}d` : "—"} />
                  <MetricCard icon={Target} iconBg="bg-purple-100" iconColor="text-purple-600" label="Interview Rate" value={`${Math.max(0, Math.min(100, derived.interviewRate))}%`} />
                  <MetricCard icon={TrendingUp} iconBg="bg-amber-100" iconColor="text-amber-600" label="App Success" value={`${derived.applicationSuccessRate}%`} />
                </div>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold">Conversion Funnel</h3><p className="text-xs text-muted-foreground">Signup to hire journey</p></div>
                  </div>
                  <div className="space-y-4">
                    {conversionFunnelData.map((row, idx) => (
                      <div key={row.stage} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">{idx + 1}</div>
                            <span className="font-medium">{row.stage}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{row.value.toLocaleString()} interns</span>
                            <Badge variant="outline">{Math.max(0, Math.min(100, row.percentage))}%</Badge>
                          </div>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden ml-10">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${row.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                    {conversionFunnelData.length === 0 && <EmptyState icon={Target} title="No funnel data" description="Funnel data will appear here" />}
                  </div>
                </Card>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="space-y-6">
                {txError && (
                  <Card className="p-4 border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 text-red-700"><AlertCircle className="h-4 w-4" /><span className="text-sm font-medium">Failed to load transactions</span></div>
                  </Card>
                )}

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold">Receivables</h3><p className="text-xs text-muted-foreground">Employer billing & candidate activation</p></div>
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={receivablesFilter} onValueChange={(v) => setReceivablesFilter(v as any)}>
                        <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="both">Both</SelectItem><SelectItem value="candidate">Candidate</SelectItem><SelectItem value="company">Company</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40"><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Source</TableHead><TableHead className="text-xs">Description</TableHead><TableHead className="text-xs">Candidate</TableHead><TableHead className="text-xs">Company</TableHead><TableHead className="text-xs text-right">Amount</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(txData?.receivables ?? []).length === 0 && !isTxLoading ? (
                        <TableRow><TableCell colSpan={7}><EmptyState icon={DollarSign} title="No receivables" description="Receivables will appear here" /></TableCell></TableRow>
                      ) : (txData?.receivables ?? []).map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-sm whitespace-nowrap">{r.date}</TableCell>
                          <TableCell><Badge className={r.source === "company" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}>{r.source}</Badge></TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{r.description}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">{r.candidateName ?? "—"}</TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">{r.companyName ?? "—"}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: r.currency || "INR", minimumFractionDigits: 0 }).format(r.amountMajor)}</TableCell>
                          <TableCell><Badge className={r.status?.toLowerCase() === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>{r.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-semibold">Payables</h3><p className="text-xs text-muted-foreground">Candidate payouts</p></div>
                  </div>
                  <Table>
                    <TableHeader><TableRow className="bg-muted/40"><TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Candidate</TableHead><TableHead className="text-xs">Reference</TableHead><TableHead className="text-xs text-right">Amount</TableHead><TableHead className="text-xs">Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(txData?.payables ?? []).length === 0 && !isTxLoading ? (
                        <TableRow><TableCell colSpan={5}><EmptyState icon={DollarSign} title="No payables" description="Payables will appear here" /></TableCell></TableRow>
                      ) : (txData?.payables ?? []).map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-sm whitespace-nowrap">{r.date}</TableCell>
                          <TableCell className="text-sm max-w-[180px] truncate">{r.candidateName ?? "—"}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate">{r.referenceId ?? "—"}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{new Intl.NumberFormat("en-IN", { style: "currency", currency: r.currency || "INR", minimumFractionDigits: 0 }).format(r.amountMajor)}</TableCell>
                          <TableCell><Badge className={r.status?.toLowerCase() === "paid" ? "bg-emerald-100 text-emerald-700" : r.status?.toLowerCase() === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>{r.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Loading analytics...</p></div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
