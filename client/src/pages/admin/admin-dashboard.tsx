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
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

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
  const funnelData = dashboard?.funnelData ?? [];
  const funnelDataDisplay = useMemo(
    () =>
      (funnelData ?? []).map((row) => {
        const stage = String((row as any)?.stage ?? "").trim();
        if (stage.toLowerCase() === "interviewed") {
          return { ...row, stage: "AI Interviews Completed" };
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
      label: "AI Interviews",
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

  return (
    <AdminLayout
      title="Dashboard"
      description="Monitor key metrics across interns, companies, and projects."
    >
      <div className="py-2 space-y-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={() => setLocation("/admin/reports")}>Reports</Button>
        </div>
        {!dashboardLoading && !!dashboardError && (
          <Card className="p-6">
            <p className="text-sm text-red-600">{dashboardError}</p>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6 cursor-pointer" onClick={() => setLocation("/admin/interns")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Interns</p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardLoading ? "-" : stats.totalUsers}
                </p>
                {!dashboardLoading && stats.totalUsers !== totalSignups && totalSignups > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">of {totalSignups} signups</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            
          </Card>

          <Card className="p-6 cursor-pointer" onClick={() => setLocation("/admin/companies")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Companies</p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardLoading ? "-" : activeCompanies}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 cursor-pointer" onClick={() => setLocation("/admin/interns")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Employer Scheduled Interviews</p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardLoading ? "-" : stats.pendingApplications}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 cursor-pointer" onClick={() => setLocation("/admin/interns")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Interviews Completed</p>
                <p className="text-2xl font-bold mt-1">
                  {dashboardLoading ? "-" : stats.completedInterviews}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Selected interns</p>
              <p className="text-xs text-muted-foreground">{selectedInternsFiltered.length} total</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportHiredCsv(selectedInternsFiltered, "selected-interns.csv")}
              >
                Export
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={selectedInternsQ}
              onChange={(e) => setSelectedInternsQ(e.target.value)}
              placeholder="Filter by intern / company / project / email"
              className="h-10 sm:max-w-[360px]"
            />
            <Select
              value={String(hiredPageSize)}
              onValueChange={(v) => setHiredPageSize(Math.max(1, Math.floor(Number(v) || 10)))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[140px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intern</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Offer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedInternsPaged.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No selected interns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedInternsPaged.items.map((row: any) => (
                    <TableRow key={row.proposalId}>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{row.internName}</div>
                        <div className="text-xs text-muted-foreground">{row.internEmail}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{row.companyName}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.projectName}</TableCell>
                      <TableCell className="whitespace-nowrap">{String(row.status ?? "-")}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{normalizeOfferSummary(row) || "-"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/admin/interns/${encodeURIComponent(row.internId)}`)}
                          >
                            View intern
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setLocation(`/admin/companies/${encodeURIComponent(row.employerId)}`)}
                            style={{ backgroundColor: "#0E6049" }}
                          >
                            View company
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {selectedInternsPaged.page} of {selectedInternsPaged.pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInternsPage((p) => Math.max(1, p - 1))}
                disabled={selectedInternsPaged.page <= 1}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInternsPage((p) => Math.min(selectedInternsPaged.pageCount, p + 1))}
                disabled={selectedInternsPaged.page >= selectedInternsPaged.pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        </Card> */}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full-time hired interns</p>
                <p className="text-xs text-muted-foreground">{hiredFullTimeFiltered.length} total</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportHiredCsv(hiredFullTimeFiltered, "full-time-hired-interns.csv")}
                >
                  Export
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={hiredFullTimeQ}
                onChange={(e) => setHiredFullTimeQ(e.target.value)}
                placeholder="Filter by intern / company / project / email"
                className="h-10 sm:max-w-[360px]"
              />
              <Select
                value={String(hiredPageSize)}
                onValueChange={(v) => setHiredPageSize(Math.max(1, Math.floor(Number(v) || 10)))}
              >
                <SelectTrigger className="h-10 w-full sm:w-[140px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intern</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Offer</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hiredFullTimePaged.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No full-time hires found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hiredFullTimePaged.items.map((row) => {
                      const offerText = normalizeOfferSummary(row);
                      return (
                        <TableRow key={row.proposalId}>
                          <TableCell className="whitespace-nowrap">
                            <div className="font-medium">{row.internName}</div>
                            <div className="text-xs text-muted-foreground">{row.internEmail}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.companyName}</TableCell>
                          <TableCell className="whitespace-nowrap">{row.projectName}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {offerText || "-"}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/admin/interns/${encodeURIComponent(row.internId)}`)}
                              >
                                View intern
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setLocation(`/admin/companies/${encodeURIComponent(row.employerId)}`)}
                                style={{ backgroundColor: "#0E6049" }}
                              >
                                View company
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {hiredFullTimePaged.page} of {hiredFullTimePaged.pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiredFullTimePage((p) => Math.max(1, p - 1))}
                  disabled={hiredFullTimePaged.page <= 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiredFullTimePage((p) => Math.min(hiredFullTimePaged.pageCount, p + 1))}
                  disabled={hiredFullTimePaged.page >= hiredFullTimePaged.pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Internship hired interns</p>
                <p className="text-xs text-muted-foreground">{hiredInternshipFiltered.length} total</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportHiredCsv(hiredInternshipFiltered, "internship-hired-interns.csv")}
                >
                  Export
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={hiredInternshipQ}
                onChange={(e) => setHiredInternshipQ(e.target.value)}
                placeholder="Filter by intern / company / project / email"
                className="h-10 sm:max-w-[360px]"
              />
              <Select
                value={String(hiredPageSize)}
                onValueChange={(v) => setHiredPageSize(Math.max(1, Math.floor(Number(v) || 10)))}
              >
                <SelectTrigger className="h-10 w-full sm:w-[140px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intern</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Offer</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hiredInternshipPaged.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        No internship hires found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hiredInternshipPaged.items.map((row) => {
                      const offerText = normalizeOfferSummary(row);
                      return (
                        <TableRow key={row.proposalId}>
                          <TableCell className="whitespace-nowrap">
                            <div className="font-medium">{row.internName}</div>
                            <div className="text-xs text-muted-foreground">{row.internEmail}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.companyName}</TableCell>
                          <TableCell className="whitespace-nowrap">{row.projectName}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {offerText || "-"}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setLocation(`/admin/interns/${encodeURIComponent(row.internId)}`)}
                              >
                                View intern
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => setLocation(`/admin/companies/${encodeURIComponent(row.employerId)}`)}
                                style={{ backgroundColor: "#0E6049" }}
                              >
                                View company
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {hiredInternshipPaged.page} of {hiredInternshipPaged.pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiredInternshipPage((p) => Math.max(1, p - 1))}
                  disabled={hiredInternshipPaged.page <= 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiredInternshipPage((p) => Math.min(hiredInternshipPaged.pageCount, p + 1))}
                  disabled={hiredInternshipPaged.page >= hiredInternshipPaged.pageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-6 cursor-pointer" onClick={() => setLocation("/admin/projects")}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projects Offering Full-Time</p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading ? "-" : String(metrics?.projects?.fullTimeOfferCount ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {metricsLoading ? "-" : String(metrics?.projects?.total ?? 0)} total projects
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Hiring Duration</p>
                <p className="text-2xl font-bold mt-1">
                  {metricsLoading
                    ? "-"
                    : metrics?.hiring?.overallAverageDays == null
                      ? "-"
                      : `${metrics.hiring.overallAverageDays} days`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">From proposal sent to accepted</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </Card>
        </div>

        {!metricsLoading && !!metricsError && (
          <Card className="p-6">
            <p className="text-sm text-red-600">{metricsError}</p>
          </Card>
        )}

       

        {/* Analytics row */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1.3fr)]">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Proposals vs AI Interviews
                </p>
                <p className="text-xs text-muted-foreground">
                  Last 6 months
                </p>
              </div>
            </div>
            <div className="h-64 sm:h-72">
              <ChartContainer config={trendConfig}>
                <ResponsiveContainer>
                  <LineChart data={applicationsTrendData} margin={{ left: 10, right: 10 }}>
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `${v}`}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="var(--color-applications)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="interviews"
                      stroke="var(--color-interviews)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Intern Conversion Funnel
                </p>
                <p className="text-xs text-muted-foreground">
                  From signup to selection (Unique interns)
                </p>
              </div>
            </div>
            <div className="mt-4 h-64 sm:h-72">
              <ChartContainer config={funnelConfig}>
                <ResponsiveContainer>
                  <BarChart data={funnelDataDisplay} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="stage"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={100}
                      tick={{ fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      fill="var(--color-value)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </Card>
        </div>

        {/* Users Management */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Intern Management</h2>
              <Button
                style={{ backgroundColor: '#0E6049' }}
                onClick={() => setLocation("/admin/interns")}
              >
                View All
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search interns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterProfile} onValueChange={(v) => setFilterProfile(v as any)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Profile status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value="complete">Profile Complete</SelectItem>
                  <SelectItem value="incomplete">Profile Incomplete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLive} onValueChange={(v) => setFilterLive(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Live status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All (Live/Hidden)</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterOnboardingStatus} onValueChange={(v) => setFilterOnboardingStatus(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Onboarding status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All onboarding</SelectItem>
                  <SelectItem value="onboarded">Onboarded</SelectItem>
                  <SelectItem value="not_onboarded">Not onboarded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!dashboardLoading && filterProfile === "all" && (incompleteProfiles > 0 || totalSignups > stats.totalUsers) && (
              <p className="mb-3 text-xs text-muted-foreground">
                Total signups: {totalSignups}. Profile incomplete: {incompleteProfiles}.
              </p>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SR No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Live/Hidden</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>My Proposals</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, idx) => (
                  <TableRow key={user.id}>
                    <TableCell>{internFrom + idx}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.phoneNumber ? `${user.countryCode || "+91"} ${user.phoneNumber}` : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{String((user as any)?.createdAt ?? user.joined ?? "-")}</TableCell>
                    <TableCell className="whitespace-nowrap">{String((user as any)?.onboardingStatus ?? "-")}</TableCell>
                    <TableCell className="whitespace-nowrap">{String((user as any)?.liveStatus ?? "-")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "secondary"}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.applications}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedIntern(user);
                            setInternDialogOpen(true);
                          }}
                        >
                          View
                        </Button> */}
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!user.id) return;
                            setLocation(`/admin/interns/${encodeURIComponent(user.id)}`);
                          }}
                          style={{ backgroundColor: "#0E6049" }}
                        >
                          view
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog
              open={internDialogOpen}
              onOpenChange={(open) => {
                setInternDialogOpen(open);
                if (!open) setSelectedIntern(null);
              }}
            >
              <DialogContent className="max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Intern details</DialogTitle>
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
                    Copy
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {internFrom}-{internTo} of {internsTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInternPage((p) => Math.max(1, p - 1))}
                  disabled={dashboardLoading || internsPage <= 1}
                >
                  Prev
                </Button>
                <p className="text-xs text-muted-foreground">
                  Page {internsPage} of {internPageCount}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInternPage((p) => Math.min(internPageCount, p + 1))}
                  disabled={dashboardLoading || internsPage >= internPageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Internships Management */}
        <Card>
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Project Management</h2>
              <Button
                style={{ backgroundColor: '#0E6049' }}
                onClick={() => setLocation("/admin/projects")}
              >
                View All
              </Button>
            </div>
          </div>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projects</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Proposals</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {internships.map((internship) => (
                  <TableRow key={internship.id}>
                    <TableCell className="font-medium">{internship.title}</TableCell>
                    <TableCell>{internship.company}</TableCell>
                    <TableCell>
                      <Badge
                        variant={internship.status === "active" ? "default" : "secondary"}
                      >
                        {internship.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{internship.applications}</TableCell>
                    <TableCell>{internship.posted}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProject(internship);
                          setProjectDialogOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Dialog
              open={projectDialogOpen}
              onOpenChange={(open) => {
                setProjectDialogOpen(open);
                if (!open) setSelectedProject(null);
              }}
            >
              <DialogContent className="max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Project details</DialogTitle>
                </DialogHeader>
                <div className="w-full rounded-md border bg-muted/10 p-4">
                  {selectedProject ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Project</p>
                        <p className="text-sm font-medium">
                          {String((selectedProject as any)?.title ?? "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="text-sm font-medium">
                          {String((selectedProject as any)?.company ?? "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium">
                          {String((selectedProject as any)?.status ?? "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Proposals</p>
                        <p className="text-sm font-medium">
                          {String((selectedProject as any)?.applications ?? "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Posted</p>
                        <p className="text-sm font-medium">
                          {String((selectedProject as any)?.posted ?? "-")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Project ID</p>
                        <p className="text-xs font-mono break-all">
                          {String((selectedProject as any)?.id ?? "-")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
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
                    Copy
                  </Button>
                  <Button
                    onClick={() => setLocation("/admin/projects")}
                    style={{ backgroundColor: "#0E6049" }}
                  >
                    View all projects
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {projectFrom}-{projectTo} of {projectsTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectPage((p) => Math.max(1, p - 1))}
                  disabled={dashboardLoading || projectsPage <= 1}
                >
                  Prev
                </Button>
                <p className="text-xs text-muted-foreground">
                  Page {projectsPage} of {projectPageCount}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProjectPage((p) => Math.min(projectPageCount, p + 1))}
                  disabled={dashboardLoading || projectsPage >= projectPageCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
