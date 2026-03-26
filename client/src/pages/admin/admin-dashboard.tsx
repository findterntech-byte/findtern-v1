import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  CheckCircle2,
  Clock,
  Download,
  Calendar,
  Building2,
  ExternalLink,
  ChevronRight,
  ViewIcon,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, AreaChart, Tooltip, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AnimatedEmptyStateCard } from "../not-found";

type AdminMetrics = {
  projects: {
    total: number;
    fullTimeOfferCount: number;
  };
  hiring: {
    overallAverageDays: number | null;
    employers: Array<{
      employerId: string;
      companyName: string;
      acceptedCount: number;
      averageDays: number | null;
    }>;
  };
};

type AdminDashboardResponse = {
  stats: {
    totalUsers: number;
    activeInternships: number;
    activeCompanies?: number;
    pendingApplications: number;
    completedInterviews: number;
    totalSignups?: number;
    incompleteProfiles?: number;
    proposalStatusCounts?: Record<string, number>;
  };
  users: {
    items: Array<{
      id: string;
      name: string;
      email: string;
      phoneNumber?: string;
      countryCode?: string;
      status: string;
      role: string;
      joined: string;
      applications: number;
      createdAt?: string;
      onboardingStatus?: string;
      liveStatus?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
  internships: {
    items: Array<{
      id: string;
      title: string;
      company: string;
      status: string;
      applications: number;
      posted: string;
    }>;
    total: number;
    page: number;
    limit: number;
  };
  trendData: Array<{ month: string; applications: number; interviews: number }>;
  funnelData: Array<{ stage: string; value: number }>;
  hiredFullTimeInterns?: Array<{
    proposalId: string;
    internId: string;
    internName: string;
    internEmail: string;
    internPhone: string;
    employerId: string;
    companyName: string;
    projectId: string;
    projectName: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    currency: string;
    offerDetails: Record<string, any>;
    fullTimeOffer: boolean;
  }>;
  hiredInternshipInterns?: Array<{
    proposalId: string;
    internId: string;
    internName: string;
    internEmail: string;
    internPhone: string;
    employerId: string;
    companyName: string;
    projectId: string;
    projectName: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    currency: string;
    offerDetails: Record<string, any>;
    fullTimeOffer: boolean;
  }>;
  selectedInterns?: Array<{
    proposalId: string;
    internId: string;
    internName: string;
    internEmail: string;
    internPhone: string;
    employerId: string;
    companyName: string;
    projectId: string;
    projectName: string;
    status: string;
    createdAt: string | null;
    updatedAt: string | null;
    currency: string;
    offerDetails: Record<string, any>;
    fullTimeOffer: boolean;
  }>;
};


export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProfile, setFilterProfile] = useState<"all" | "complete" | "incomplete">("all");
  const [filterLive, setFilterLive] = useState<"all" | "live" | "hidden">("all");
  const [filterOnboardingStatus, setFilterOnboardingStatus] = useState<"all" | "onboarded" | "not_onboarded">("all");

  const [hiredFullTimeQ, setHiredFullTimeQ] = useState("");
  const [hiredFullTimePage, setHiredFullTimePage] = useState(1);
  const [hiredInternshipQ, setHiredInternshipQ] = useState("");
  const [hiredInternshipPage, setHiredInternshipPage] = useState(1);
  const [selectedInternsQ, setSelectedInternsQ] = useState("");
  const [selectedInternsPage, setSelectedInternsPage] = useState(1);
  const [hiredPageSize, setHiredPageSize] = useState<number>(10);

  const [internDialogOpen, setInternDialogOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState<any | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const [internPage, setInternPage] = useState<number>(1);
  const [internLimit] = useState<number>(5);
  const [projectPage, setProjectPage] = useState<number>(1);
  const [projectLimit] = useState<number>(5);

  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);

  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  useEffect(() => {
    setInternPage(1);
  }, [searchQuery, filterStatus, filterProfile, filterLive, filterOnboardingStatus]);

  useEffect(() => {
    const load = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError(null);

        const qs = new URLSearchParams({
          internPage: String(internPage),
          internLimit: String(internLimit),
          internQ: searchQuery,
          internStatus: filterStatus,
          internProfile: filterProfile,
          internLive: filterLive,
          internOnboardingStatus: filterOnboardingStatus,
          projectPage: String(projectPage),
          projectLimit: String(projectLimit),
        });

        const dashRes = await apiRequest("GET", `/api/admin/dashboard?${qs.toString()}`);
        const dashJson = (await dashRes.json()) as AdminDashboardResponse;
        setDashboard(dashJson);

        setMetricsLoading(true);
        setMetricsError(null);
        const res = await apiRequest("GET", "/api/admin/metrics");
        const json = (await res.json()) as AdminMetrics;
        setMetrics(json);
      } catch (e) {
        console.error("Failed to load admin dashboard", e);
        setDashboardError("Failed to load dashboard");
        setDashboard(null);
        setMetricsError("Failed to load metrics");
        setMetrics(null);
      } finally {
        setDashboardLoading(false);
        setMetricsLoading(false);
      }
    };

    void load();
  }, [filterLive, filterOnboardingStatus, filterProfile, filterStatus, internLimit, internPage, projectLimit, projectPage, searchQuery]);

  const stats = dashboard?.stats ?? {
    totalUsers: 0,
    activeInternships: 0,
    activeCompanies: 0,
    pendingApplications: 0,
    completedInterviews: 0,
  };

  const activeCompanies = Number((dashboard?.stats as any)?.activeCompanies ?? 0);

  const users = dashboard?.users?.items ?? [];
  const internsTotal = dashboard?.users?.total ?? 0;
  const internsPage = dashboard?.users?.page ?? internPage;
  const internsLimit = dashboard?.users?.limit ?? internLimit;

  const incompleteProfiles = Number((dashboard?.stats as any)?.incompleteProfiles ?? 0);
  const totalSignups = Number((dashboard?.stats as any)?.totalSignups ?? 0);
  const proposalStatusCounts = (dashboard?.stats as any)?.proposalStatusCounts ?? {};
  const totalProposalsCount = Object.values(proposalStatusCounts).reduce((sum: number, v: any) => sum + Number(v || 0), 0);

  const internships = dashboard?.internships?.items ?? [];
  const projectsTotal = dashboard?.internships?.total ?? 0;
  const projectsPage = dashboard?.internships?.page ?? projectPage;
  const projectsLimit = dashboard?.internships?.limit ?? projectLimit;

  const internPageCount = Math.max(1, Math.ceil(internsTotal / Math.max(1, internsLimit)));
  const internFrom = internsTotal === 0 ? 0 : (internsPage - 1) * internsLimit + 1;
  const internTo = Math.min(internsTotal, (internsPage - 1) * internsLimit + users.length);

  const projectPageCount = Math.max(1, Math.ceil(projectsTotal / Math.max(1, projectsLimit)));
  const projectFrom = projectsTotal === 0 ? 0 : (projectsPage - 1) * projectsLimit + 1;
  const projectTo = Math.min(projectsTotal, (projectsPage - 1) * projectsLimit + internships.length);

  const applicationsTrendData = dashboard?.trendData ?? [];
  const totalAIInterviews = applicationsTrendData.reduce((sum: number, d: any) => sum + (d?.interviews ?? 0), 0);
  const totalProposals = applicationsTrendData.reduce((sum: number, d: any) => sum + (d?.applications ?? 0), 0);
  const funnelData = dashboard?.funnelData ?? [];
  const funnelDataDisplay = useMemo(
    () =>
      (funnelData ?? []).map((row) => {
        const stage = String((row as any)?.stage ?? "").trim();
        if (stage.toLowerCase() === "interviewed") {
          return { ...row, stage: "All Interviews Completed" };
        }
        if (stage.toLowerCase() === "selected") {
          return { ...row, stage: "Internship Selected" };
        }
        return row;
      }),
    [funnelData],
  );
  const trendConfig: ChartConfig = {
    applications: {
      label: "Proposals",
      color: "hsl(152, 61%, 40%)",
    },
    interviews: {
      label: "All Interviews",
      color: "hsl(215, 16%, 47%)",
    },
  };

  const funnelConfig: ChartConfig = {
    value: {
      label: "Intern",
      color: "hsl(43, 96%, 56%)",
    },
  };

  const hiredFullTime = dashboard?.hiredFullTimeInterns ?? [];
  const hiredInternship = dashboard?.hiredInternshipInterns ?? [];
  const selectedInterns = dashboard?.selectedInterns ?? [];

  const normalizeOfferSummary = (row: any) => {
    const offer = row?.offerDetails ?? {};
    const monthly = offer?.monthlyAmount ?? offer?.monthly_amount ?? null;
    const duration = offer?.duration ?? offer?.internshipDuration ?? null;
    const startDate = offer?.startDate ?? offer?.start_date ?? null;
    const parts = [
      monthly != null ? `${monthly} ${String(row?.currency ?? "INR")}` : null,
      duration ? String(duration) : null,
      startDate ? `Start: ${String(startDate)}` : null,
    ].filter(Boolean);
    return parts.join(" | ") || "-";
  };

  const filterHired = (rows: any[], q: string) => {
    const needle = String(q ?? "").trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r: any) => {
      const hay = [
        r?.internName,
        r?.internEmail,
        r?.companyName,
        r?.projectName,
        r?.proposalId,
      ]
        .map((x) => String(x ?? "").trim().toLowerCase())
        .filter(Boolean)
        .join(" ");
      return hay.includes(needle);
    });
  };

  const paginate = (rows: any[], page: number, pageSize: number) => {
    const p = Math.max(1, Math.floor(Number(page) || 1));
    const s = Math.max(1, Math.floor(Number(pageSize) || 10));
    const total = rows.length;
    const pageCount = Math.max(1, Math.ceil(total / s));
    const safePage = Math.min(p, pageCount);
    const start = (safePage - 1) * s;
    const items = rows.slice(start, start + s);
    return { items, total, pageCount, page: safePage };
  };

  const hiredFullTimeFiltered = useMemo(
    () => filterHired(hiredFullTime, hiredFullTimeQ),
    [hiredFullTime, hiredFullTimeQ],
  );
  const hiredInternshipFiltered = useMemo(
    () => filterHired(hiredInternship, hiredInternshipQ),
    [hiredInternship, hiredInternshipQ],
  );

  const hiredFullTimePaged = useMemo(
    () => paginate(hiredFullTimeFiltered, hiredFullTimePage, hiredPageSize),
    [hiredFullTimeFiltered, hiredFullTimePage, hiredPageSize],
  );
  const hiredInternshipPaged = useMemo(
    () => paginate(hiredInternshipFiltered, hiredInternshipPage, hiredPageSize),
    [hiredInternshipFiltered, hiredInternshipPage, hiredPageSize],
  );

  const selectedInternsFiltered = useMemo(
    () => filterHired(selectedInterns, selectedInternsQ),
    [selectedInterns, selectedInternsQ],
  );

  const selectedInternsPaged = useMemo(
    () => paginate(selectedInternsFiltered, selectedInternsPage, hiredPageSize),
    [selectedInternsFiltered, selectedInternsPage, hiredPageSize],
  );

  useEffect(() => {
    setHiredFullTimePage(1);
  }, [hiredFullTimeQ, hiredPageSize]);

  useEffect(() => {
    setHiredInternshipPage(1);
  }, [hiredInternshipQ, hiredPageSize]);

  useEffect(() => {
    setSelectedInternsPage(1);
  }, [selectedInternsQ, hiredPageSize]);

  const exportHiredCsv = (rows: any[], filename: string) => {
    const safe = Array.isArray(rows) ? rows : [];
    const header = [
      "Intern Name",
      "Intern Email",
      "Intern Phone",
      "Company",
      "Project",
      "Status",
      "Created At",
      "Updated At",
      "Currency",
      "Monthly Amount",
      "Duration",
      "Start Date",
      "Offer Summary",
      "Full Time Offer",
      "Proposal ID",
      "Intern ID",
      "Company ID",
      "Project ID",
    ];

    const escape = (v: any) => {
      const s = String(v ?? "");
      return `"${s.replaceAll('"', '""')}"`;
    };

    const lines = [header.map(escape).join(",")];
    for (const r of safe) {
      const offer = (r as any)?.offerDetails ?? {};
      const monthly = offer?.monthlyAmount ?? offer?.monthly_amount ?? "";
      const duration = offer?.duration ?? offer?.internshipDuration ?? "";
      const startDate = offer?.startDate ?? offer?.start_date ?? "";
      const offerSummary = normalizeOfferSummary(r);

      const row = {
        "Intern Name": (r as any)?.internName ?? "",
        "Intern Email": (r as any)?.internEmail ?? "",
        "Intern Phone": (r as any)?.internPhone ?? "",
        Company: (r as any)?.companyName ?? "",
        Project: (r as any)?.projectName ?? "",
        Status: (r as any)?.status ?? "",
        "Created At": (r as any)?.createdAt ?? "",
        "Updated At": (r as any)?.updatedAt ?? "",
        Currency: (r as any)?.currency ?? "",
        "Monthly Amount": monthly,
        Duration: duration,
        "Start Date": startDate,
        "Offer Summary": offerSummary,
        "Full Time Offer": Boolean((r as any)?.fullTimeOffer),
        "Proposal ID": (r as any)?.proposalId ?? "",
        "Intern ID": (r as any)?.internId ?? "",
        "Company ID": (r as any)?.employerId ?? "",
        "Project ID": (r as any)?.projectId ?? "",
      };

      lines.push(header.map((k) => escape((row as any)[k])).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const StatCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    onClick,
    color,
    trend,
  }: {
    title: string;
    value: string | number;
    subValue?: string;
    icon: any;
    onClick: () => void;
    color: "blue" | "green" | "orange" | "purple" | "rose" | "emerald";
    trend?: { value: string; positive: boolean };
  }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800",
      green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-800",
      orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-800",
      purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800",
      rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-100 dark:border-rose-800",
      emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    };

    const iconClasses = {
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-300",
      green: "bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300",
      orange: "bg-orange-100 text-orange-700 dark:bg-orange-800/40 dark:text-orange-300",
      purple: "bg-purple-100 text-purple-700 dark:bg-purple-800/40 dark:text-purple-300",
      rose: "bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-300",
      emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300",
    };

    return (
      <Card
        className={cn(
          "relative overflow-hidden border p-5 transition-all duration-200 hover:shadow-lg group cursor-pointer",
          "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r",
          color === "blue" && "before:from-blue-500 before:to-blue-600",
          color === "green" && "before:from-green-500 before:to-green-600",
          color === "orange" && "before:from-orange-500 before:to-orange-600",
          color === "purple" && "before:from-purple-500 before:to-purple-600",
          color === "rose" && "before:from-rose-500 before:to-rose-600",
          color === "emerald" && "before:from-emerald-500 before:to-emerald-600"
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {trend && (
                <span className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  trend.positive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {trend.positive ? <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> : <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />}
                  {trend.value}
                </span>
              )}
            </div>
            {subValue && <p className="text-[11px] text-muted-foreground font-medium">{subValue}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110", iconClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    );
  };

  const formatSafeDate = (dateStr: any) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return format(d, 'MMM dd, yyyy');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl">
          <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-xs font-medium">
                <span className="text-muted-foreground">{entry.name}:</span> {entry.value}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout
      title="Dashboard"
      description="Monitor key metrics across interns, companies, and projects."
    >
      <div className="py-4 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Overview Statistics</h2>
            <p className="text-sm text-muted-foreground">Detailed performance metrics of the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setLocation("/admin/reports")}>
              <ViewIcon className="h-4 w-4" />
             View Reports
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90" onClick={() => setLocation("/admin/proposal-tracker")}>
              <Calendar className="h-4 w-4" />
              Activity Tracker
            </Button>
          </div>
        </div>

        {!dashboardLoading && !!dashboardError && (
          <Card className="p-6 border-red-100 bg-red-50 dark:bg-red-950/10">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              {dashboardError}
            </p>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Interns"
            value={dashboardLoading ? "..." : stats.totalUsers}
            subValue={!dashboardLoading && totalSignups > 0 ? `Total signups: ${totalSignups}` : undefined}
            icon={Users}
            color="blue"
            onClick={() => setLocation("/admin/interns")}
          />

          <StatCard
            title="Total Companies"
            value={dashboardLoading ? "..." : activeCompanies}
            subValue="Setup completed"
            icon={Building2}
            color="emerald"
            onClick={() => setLocation("/admin/companies")}
          />

          <StatCard
            title="Scheduled Interviews"
            value={dashboardLoading ? "..." : stats.pendingApplications}
            subValue="Employer scheduled"
            icon={Clock}
            color="orange"
            onClick={() => setLocation("/admin/interns")}
          />

          <StatCard
            title="All Interviews"
            value={dashboardLoading ? "..." : totalAIInterviews}
            icon={CheckCircle2}
            color="purple"
            onClick={() => setLocation("/admin/interns")}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <StatCard
            title="Potential Full Time Opportunities"
            value={metricsLoading ? "..." : metrics?.projects?.fullTimeOfferCount ?? 0}
            subValue={`of ${metricsLoading ? "..." : metrics?.projects?.total ?? 0} total projects`}
            icon={Briefcase}
            color="green"
            onClick={() => setLocation("/admin/projects")}
          />

          <StatCard
            title="Avg Hiring Speed"
            value={metricsLoading ? "..." : metrics?.hiring?.overallAverageDays == null ? "-" : `${metrics.hiring.overallAverageDays} days`}
            subValue="Proposal to acceptance"
            icon={TrendingUp}
            color="rose"
            onClick={() => {}}
          />
        </div>

        {/* Analytics row */}
        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="p-6 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Activity Trends</h3>
                <p className="text-2xl font-bold tracking-tight mt-1">Proposals vs All Interviews</p>
              </div>
              <Badge variant="outline" className="px-2 py-1 text-[10px] font-bold">LAST 6 MONTHS</Badge>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={applicationsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    name="Proposals"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorApps)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="interviews" 
                    name="All Interviews"
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorInts)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Proposals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">All Interviews</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-sm border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Proposal Pipeline</h3>
                <p className="text-2xl font-bold tracking-tight mt-1">Status Distribution</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">{totalProposalsCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Sent", value: proposalStatusCounts["sent"] || 0, color: "#06b6d4" },
                      { name: "Accepted", value: proposalStatusCounts["accepted"] || 0, color: "#10b981" },
                      { name: "Hired", value: proposalStatusCounts["hired"] || 0, color: "#14b8a6" },
                      { name: "Expired", value: proposalStatusCounts["expired"] || 0, color: "#f59e0b" },
                      { name: "Rejected", value: proposalStatusCounts["rejected"] || 0, color: "#f43f5e" },
                      { name: "Withdrawn", value: proposalStatusCounts["withdrawn"] || 0, color: "#f97316" },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[
                      { name: "Sent", value: proposalStatusCounts["sent"] || 0, color: "#06b6d4" },
                      { name: "Accepted", value: proposalStatusCounts["accepted"] || 0, color: "#10b981" },
                      { name: "Hired", value: proposalStatusCounts["hired"] || 0, color: "#14b8a6" },
                      { name: "Expired", value: proposalStatusCounts["expired"] || 0, color: "#f59e0b" },
                      { name: "Rejected", value: proposalStatusCounts["rejected"] || 0, color: "#f43f5e" },
                      { name: "Withdrawn", value: proposalStatusCounts["withdrawn"] || 0, color: "#f97316" },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Sent</p>
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{proposalStatusCounts["sent"] || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Accepted</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{proposalStatusCounts["accepted"] || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Hired</p>
                  <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{proposalStatusCounts["hired"] || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Expired</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{proposalStatusCounts["expired"] || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Rejected</p>
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{proposalStatusCounts["rejected"] || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">Withdrawn</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">{proposalStatusCounts["withdrawn"] || 0}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>



        {/* Hired Interns Sections */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Placement Success</h3>
                <p className="text-lg font-bold mt-1">Full-time Hires</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs font-bold"
                onClick={() => exportHiredCsv(hiredFullTimeFiltered, "full-time-hired-interns.csv")}
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={hiredFullTimeQ}
                    onChange={(e) => setHiredFullTimeQ(e.target.value)}
                    placeholder="Search by intern, company..."
                    className="h-9 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={String(hiredPageSize)}
                  onValueChange={(v) => setHiredPageSize(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Intern</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Company</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredFullTimePaged.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      hiredFullTimePaged.items.map((row) => (
                        <TableRow key={row.proposalId} className="group">
                          <TableCell className="py-3">
                            <div className="font-bold text-xs">{row.internName}</div>
                            <div className="text-[10px] text-muted-foreground">{row.projectName}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs font-medium">{row.companyName}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {row.currency} {row.offerDetails?.monthlyAmount || row.offerDetails?.monthly_amount || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                              onClick={() => setLocation(`/admin/interns/${encodeURIComponent(row.internId)}`)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">
                  Page {hiredFullTimePaged.page} / {hiredFullTimePaged.pageCount}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setHiredFullTimePage(p => Math.max(1, p - 1))}
                    disabled={hiredFullTimePaged.page <= 1}
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setHiredFullTimePage(p => Math.min(hiredFullTimePaged.pageCount, p + 1))}
                    disabled={hiredFullTimePaged.page >= hiredFullTimePaged.pageCount}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Internship Program</h3>
                <p className="text-lg font-bold mt-1">Internship Hires</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 text-xs font-bold"
                onClick={() => exportHiredCsv(hiredInternshipFiltered, "internship-hired-interns.csv")}
              >
                <Download className="h-3 w-3" />
                CSV
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={hiredInternshipQ}
                    onChange={(e) => setHiredInternshipQ(e.target.value)}
                    placeholder="Search by intern, company..."
                    className="h-9 pl-8 text-xs"
                  />
                </div>
                <Select
                  value={String(hiredPageSize)}
                  onValueChange={(v) => setHiredPageSize(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[80px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Intern</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase">Company</TableHead>
                      <TableHead className="h-9 text-[10px] font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredInternshipPaged.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      hiredInternshipPaged.items.map((row) => (
                        <TableRow key={row.proposalId} className="group">
                          <TableCell className="py-3">
                            <div className="font-bold text-xs">{row.internName}</div>
                            <div className="text-[10px] text-muted-foreground">{row.projectName}</div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="text-xs font-medium">{row.companyName}</div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                              {row.offerDetails?.duration || row.offerDetails?.internshipDuration || "-"} Months
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
                              onClick={() => setLocation(`/admin/interns/${encodeURIComponent(row.internId)}`)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">
                  Page {hiredInternshipPaged.page} / {hiredInternshipPaged.pageCount}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setHiredInternshipPage(p => Math.max(1, p - 1))}
                    disabled={hiredInternshipPaged.page <= 1}
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setHiredInternshipPage(p => Math.min(hiredInternshipPaged.pageCount, p + 1))}
                    disabled={hiredInternshipPaged.page >= hiredInternshipPaged.pageCount}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Users Management */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Intern Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage all registered interns and their application status</p>
            </div>
            <Button
              className="h-9 bg-[#0E6049] hover:bg-[#0E6049]/90 font-bold"
              onClick={() => setLocation("/admin/interns")}
            >
              Full Directory
            </Button>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 shadow-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] h-10 shadow-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterProfile} onValueChange={(v) => setFilterProfile(v as any)}>
                  <SelectTrigger className="w-[160px] h-10 shadow-sm">
                    <SelectValue placeholder="Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profiles</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterLive} onValueChange={(v) => setFilterLive(v as any)}>
                  <SelectTrigger className="w-[140px] h-10 shadow-sm">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Live/Hidden)</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterOnboardingStatus} onValueChange={(v) => setFilterOnboardingStatus(v as any)}>
                  <SelectTrigger className="w-[160px] h-10 shadow-sm">
                    <SelectValue placeholder="Onboarding" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All onboarding</SelectItem>
                    <SelectItem value="onboarded">Onboarded</SelectItem>
                    <SelectItem value="not_onboarded">Not onboarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!dashboardLoading && filterProfile === "all" && (incompleteProfiles > 0 || totalSignups > stats.totalUsers) && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  Attention: {incompleteProfiles} interns have incomplete profiles out of {totalSignups} total signups.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="font-bold uppercase text-[10px]">Intern</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Contact Info</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Activity</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                        No interns found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{user.name}</span>
                            <span className="text-[11px] text-muted-foreground">Joined: {formatSafeDate((user as any)?.createdAt || user.joined)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium">{user.email}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {user.phoneNumber ? `${user.countryCode || "+91"} ${user.phoneNumber}` : "No phone"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">{user.applications}</span>
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">Proposals</span>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800" />
                            
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge
                              className={cn(
                                "w-fit text-[10px] font-bold px-2 py-0.5 uppercase",
                                user.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              )}
                            >
                              {user.status}
                            </Badge>
                            <span className={cn(
                              "text-[10px] font-bold uppercase",
                              (user as any)?.liveStatus === 'live' ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                            )}>
                              • {(user as any)?.liveStatus || 'hidden'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className="h-8 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 gap-2 font-bold text-[11px]"
                            onClick={() => setLocation(`/admin/interns/${encodeURIComponent(user.id)}`)}
                          >
                            View Profile
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                Showing {internFrom}-{internTo} <span className="mx-1 text-slate-300">/</span> {internsTotal} Total Interns
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-bold text-[11px]"
                  onClick={() => setInternPage((p) => Math.max(1, p - 1))}
                  disabled={dashboardLoading || internsPage <= 1}
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center h-8 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold">
                  {internsPage} / {internPageCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-bold text-[11px]"
                  onClick={() => setInternPage((p) => Math.min(internPageCount, p + 1))}
                  disabled={dashboardLoading || internsPage >= internPageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Project Management */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Project Management</h2>
              <p className="text-sm text-muted-foreground mt-1">Monitor active projects and internship opportunities</p>
            </div>
            <Button
              className="h-9 bg-[#0E6049] hover:bg-[#0E6049]/90 font-bold"
              onClick={() => setLocation("/admin/projects")}
            >
              All Projects
            </Button>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead className="font-bold uppercase text-[10px]">Project Details</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Employer</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Stats</TableHead>
                    <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internships.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                        No projects available
                      </TableCell>
                    </TableRow>
                  ) : (
                    internships.map((internship) => (
                      <TableRow key={internship.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{internship.title}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">Posted: {internship.posted}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Building2 className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span className="text-xs font-medium">{internship.company}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{internship.applications}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Proposals Received</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 uppercase",
                              internship.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}
                          >
                            {internship.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 font-bold text-[11px] gap-2 border-slate-200 hover:bg-slate-50"
                            onClick={() => {
                              setSelectedProject(internship);
                              setProjectDialogOpen(true);
                            }}
                          >
                            Quick View
                            <Search className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                Showing {projectFrom}-{projectTo} <span className="mx-1 text-slate-300">/</span> {projectsTotal} Projects
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-bold text-[11px]"
                  onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                  disabled={dashboardLoading || projectsPage <= 1}
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center h-8 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-bold">
                  {projectsPage} / {projectPageCount}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 font-bold text-[11px]"
                  onClick={() => setProjectPage((p) => Math.min(projectPageCount, p + 1))}
                  disabled={dashboardLoading || projectsPage >= projectPageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Dialogs */}
        <Dialog
          open={internDialogOpen}
          onOpenChange={(open) => {
            setInternDialogOpen(open);
            if (!open) setSelectedIntern(null);
          }}
        >
          <DialogContent className="max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Intern Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] w-full rounded-md border bg-muted/10 p-3">
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                {selectedIntern ? JSON.stringify(selectedIntern, null, 2) : "-"}
              </pre>
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!selectedIntern) return;
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(selectedIntern, null, 2));
                  } catch {
                    // ignore
                  }
                }}
                disabled={!selectedIntern}
              >
                Copy Data
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={projectDialogOpen}
          onOpenChange={(open) => {
            setProjectDialogOpen(open);
            if (!open) setSelectedProject(null);
          }}
        >
          <DialogContent className="max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Project Quick View</DialogTitle>
            </DialogHeader>
            <div className="w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 shadow-sm">
              {selectedProject ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project Title</p>
                    <p className="text-sm font-bold">{selectedProject.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company Name</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <p className="text-sm font-medium">{selectedProject.company}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Status</p>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase text-[10px]">
                      {selectedProject.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Proposals</p>
                    <p className="text-sm font-bold">{selectedProject.applications}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Posted</p>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{selectedProject.posted}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unique ID</p>
                    <p className="text-[10px] font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700 break-all">
                      {selectedProject.id}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No project data selected</div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="font-bold text-xs"
                onClick={async () => {
                  if (!selectedProject) return;
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(selectedProject, null, 2));
                  } catch {
                    // ignore
                  }
                }}
                disabled={!selectedProject}
              >
                Copy Raw Data
              </Button>
              <Button
                className="bg-[#0E6049] hover:bg-[#0E6049]/90 font-bold text-xs"
                onClick={() => setLocation("/admin/projects")}
              >
                Go to Project Manager
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
