import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { DEFAULT_USD_TO_INR_RATE } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

type LoadedEmployer = {
  id: string;
  name: string;
  companyName: string;
  companyEmail: string;
  countryCode?: string | null;
  phoneNumber?: string | null;
  websiteUrl?: string | null;
  companySize?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  primaryContactName?: string | null;
  primaryContactRole?: string | null;
  escalationContactName?: string | null;
  escalationContactEmail?: string | null;
  escalationContactPhone?: string | null;
  escalationContactRole?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  ifscCode?: string | null;
  swiftCode?: string | null;
  gstNumber?: string | null;
  setupCompleted?: boolean | null;
  onboardingCompleted?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
};

export default function AdminCompanyDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/companies/:id");
  const companyId = params?.id;

  type TabKey = "projects" | "proposals" | "interviews" | "payments" | "upcomingPayments" | "hired";
  const [activeTab, setActiveTab] = useState<TabKey>("projects");
  const [tabSearch, setTabSearch] = useState<Record<TabKey, string>>({
    projects: "",
    proposals: "",
    interviews: "",
    payments: "",
    upcomingPayments: "",
    hired: "",
  });
  const [tabStatus, setTabStatus] = useState<Record<TabKey, string>>({
    projects: "",
    proposals: "",
    interviews: "",
    payments: "",
    upcomingPayments: "",
    hired: "",
  });
  const [tabPage, setTabPage] = useState<Record<TabKey, number>>({
    projects: 1,
    proposals: 1,
    interviews: 1,
    payments: 1,
    upcomingPayments: 1,
    hired: 1,
  });
  const [pageSize, setPageSize] = useState<5 | 10 | 25 | 50>(10);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedInterviewFeedback, setSelectedInterviewFeedback] = useState<string>("");

  const [projectsCreatedDate, setProjectsCreatedDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employer, setEmployer] = useState<LoadedEmployer | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [markingReceivedId, setMarkingReceivedId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!companyId) {
        setLoading(false);
        setEmployer(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [employerRes, projectsRes, proposalsRes, interviewsRes, ordersRes] = await Promise.all([
          apiRequest("GET", `/api/admin/employers/${companyId}`),
          apiRequest("GET", `/api/employer/${companyId}/projects`).catch(() => null as any),
          apiRequest("GET", `/api/employer/${companyId}/proposals`).catch(() => null as any),
          apiRequest("GET", `/api/employer/${companyId}/interviews`).catch(() => null as any),
          apiRequest("GET", `/api/admin/employers/${companyId}/orders?limit=200`).catch(() => null as any),
        ]);

        const employerJson = await employerRes.json();
        setEmployer((employerJson?.employer ?? null) as any);

        if (projectsRes) {
          const projectsJson = await projectsRes.json().catch(() => null);
          setProjects(Array.isArray(projectsJson?.projects) ? projectsJson.projects : []);
        } else {
          setProjects([]);
        }

        if (proposalsRes) {
          const proposalsJson = await proposalsRes.json().catch(() => null);
          setProposals(Array.isArray(proposalsJson?.proposals) ? proposalsJson.proposals : []);
        } else {
          setProposals([]);
        }

        if (interviewsRes) {
          const interviewsJson = await interviewsRes.json().catch(() => null);
          setInterviews(Array.isArray(interviewsJson?.interviews) ? interviewsJson.interviews : []);
        } else {
          setInterviews([]);
        }

        if (ordersRes) {
          const ordersJson = await ordersRes.json().catch(() => null);
          setOrders(Array.isArray(ordersJson?.orders) ? ordersJson.orders : []);
        } else {
          setOrders([]);
        }
      } catch (e) {
        console.error("Failed to load company details", e);
        setError("Failed to load company details");
        setEmployer(null);
        setProjects([]);
        setProposals([]);
        setInterviews([]);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [companyId]);

  const summary = useMemo(() => {
    const e = employer ?? ({} as any);

    const createdAtRaw = e.createdAt ?? null;
    const createdAt = createdAtRaw
      ? (() => {
          const d = new Date(createdAtRaw);
          return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
        })()
      : "-";

    const phone = [String(e.countryCode ?? ""), String(e.phoneNumber ?? "")]
      .filter(Boolean)
      .join(" ") || "-";

    const location = [e.city, e.state].filter(Boolean).join(", ") || "-";

    const activeInternships = (projects ?? []).reduce((acc, p: any) => {
      const status = String(p?.status ?? "active").trim().toLowerCase();
      return acc + (status === "active" ? 1 : 0);
    }, 0);

    const hiredResourcesCount = (() => {
      const ids = new Set(
        (proposals ?? [])
          .filter((p: any) => String(p?.status ?? "").trim().toLowerCase() === "hired")
          .map((p: any) => String(p?.internId ?? p?.intern_id ?? "").trim())
          .filter(Boolean),
      );
      return ids.size;
    })();

    const lastPaymentAt = (() => {
      let best: Date | null = null;
      for (const row of orders ?? []) {
        const raw = row?.paidAt ?? row?.createdAt ?? null;
        if (!raw) continue;
        const dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) continue;
        if (!best || dt.getTime() > best.getTime()) best = dt;
      }
      return best ? best.toISOString() : null;
    })();

    const earningsMinor = (orders ?? []).reduce((acc, o: any) => {
      const status = String(o?.status ?? "").trim().toLowerCase();
      if (status !== "paid") return acc;
      const minor = Number(o?.amountMinor ?? o?.amount_minor ?? o?.amount ?? 0);
      return acc + (Number.isFinite(minor) ? minor : 0);
    }, 0);

    const totalProposals = Array.isArray(proposals) ? proposals.length : 0;
    const conversionRate = totalProposals > 0 ? hiredResourcesCount / totalProposals : 0;

    return {
      companyName: String(e.companyName ?? e.name ?? "Company"),
      contactName: String(e.primaryContactName ?? e.name ?? "-"),
      contactRole: String(e.primaryContactRole ?? ""),
      email: String(e.companyEmail ?? "-"),
      phone,
      createdAt,
      location,
      websiteUrl: String(e.websiteUrl ?? ""),
      companySize: String(e.companySize ?? ""),
      country: String(e.country ?? ""),
      setupCompleted: !!e.setupCompleted,
      onboardingCompleted: !!e.onboardingCompleted,
      isActive: (e as any)?.isActive !== false,
      gstNumber: String(e.gstNumber ?? ""),
      activeInternships,
      hiredResourcesCount,
      lastPaymentAt,
      earningsMinor,
      totalProposals,
      conversionRate,
    };
  }, [employer, orders, projects, proposals]);

  const charts = useMemo(() => {
    const projectCounts = (projects ?? []).reduce(
      (acc, p: any) => {
        const raw = String(p?.status ?? "-").trim().toLowerCase() || "-";
        const key = raw === "active" ? "Active" : raw === "inactive" ? "Inactive" : "Other";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const paidStatuses = (orders ?? []).reduce(
      (acc, o: any) => {
        const raw = String(o?.status ?? "-").trim().toLowerCase() || "-";
        const key = raw === "paid" ? "Paid" : raw === "created" || raw === "pending" ? "Pending" : raw === "failed" ? "Failed" : "Other";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const projectSeries = [
      { key: "Active", value: Number(projectCounts.Active ?? 0), fill: "hsl(142 76% 36%)" },
      { key: "Inactive", value: Number(projectCounts.Inactive ?? 0), fill: "hsl(215 16% 47%)" },
      { key: "Other", value: Number(projectCounts.Other ?? 0), fill: "hsl(38 92% 50%)" },
    ].filter((x) => x.value > 0);

    const paymentSeries = [
      { key: "Paid", value: Number(paidStatuses.Paid ?? 0), fill: "hsl(142 76% 36%)" },
      { key: "Pending", value: Number(paidStatuses.Pending ?? 0), fill: "hsl(38 92% 50%)" },
      { key: "Failed", value: Number(paidStatuses.Failed ?? 0), fill: "hsl(0 72% 51%)" },
      { key: "Other", value: Number(paidStatuses.Other ?? 0), fill: "hsl(215 16% 47%)" },
    ].filter((x) => x.value > 0);

    const projectConfig = {
      Active: { label: "Active", color: "hsl(142 76% 36%)" },
      Inactive: { label: "Inactive", color: "hsl(215 16% 47%)" },
      Other: { label: "Other", color: "hsl(38 92% 50%)" },
    } as const;

    const paymentConfig = {
      Paid: { label: "Paid", color: "hsl(142 76% 36%)" },
      Pending: { label: "Pending", color: "hsl(38 92% 50%)" },
      Failed: { label: "Failed", color: "hsl(0 72% 51%)" },
      Other: { label: "Other", color: "hsl(215 16% 47%)" },
    } as const;

    return {
      projectSeries,
      paymentSeries,
      projectConfig,
      paymentConfig,
    };
  }, [orders, projects]);

  const tabData = useMemo(() => {
    const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const tokens = (q: string) => norm(q).split(/\s+/).filter(Boolean);
    const matches = (haystack: string, q: string) => {
      const t = tokens(q);
      if (t.length === 0) return true;
      const h = norm(haystack);
      return t.every((x) => h.includes(x));
    };

    const toDateKey = (raw: unknown) => {
      if (!raw) return "";
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    };

    const projectList = (projects ?? []).filter((p: any) => {
      const status = norm(p?.status ?? "-");
      const statusFilter = norm(tabStatus.projects);
      if (statusFilter && status !== statusFilter) return false;

      const createdKey = toDateKey(p?.createdAt ?? p?.created_at ?? null);
      const createdFilterKey = String(projectsCreatedDate ?? "").trim();
      if (createdFilterKey && createdKey !== createdFilterKey) return false;

      const skills = Array.isArray(p?.skills) ? p.skills.join(" ") : "";
      const hay = `${p?.projectName ?? p?.title ?? ""} ${skills} ${p?.city ?? ""} ${p?.timezone ?? ""} ${p?.locationType ?? p?.location_type ?? ""}`;
      return matches(hay, tabSearch.projects);
    });

    const proposalList = (proposals ?? []).filter((p: any) => {
      const status = norm(p?.status ?? "-");
      const statusFilter = norm(tabStatus.proposals);
      if (statusFilter && status !== statusFilter) return false;
      const hay = `${p?.internName ?? p?.candidateName ?? ""} ${p?.projectName ?? ""} ${p?.currency ?? ""}`;
      return matches(hay, tabSearch.proposals);
    });

    const interviewList = (interviews ?? []).filter((i: any) => {
      const status = norm(i?.status ?? "-");
      const statusFilter = norm(tabStatus.interviews);
      if (statusFilter && status !== statusFilter) return false;
      const hay = `${i?.internName ?? ""} ${i?.projectName ?? ""} ${i?.timezone ?? ""} ${i?.meetingLink ?? ""}`;
      return matches(hay, tabSearch.interviews);
    });

    const paymentList = (orders ?? []).filter((o: any) => {
      const status = norm(o?.status ?? "-");
      const statusFilter = norm(tabStatus.payments);
      if (statusFilter && status !== statusFilter) return false;
      const hay = `${o?.orderId ?? o?.order_id ?? ""} ${o?.currency ?? ""} ${o?.status ?? ""}`;
      return matches(hay, tabSearch.payments);
    });

    const upcomingPaymentsList = (orders ?? []).filter((o: any) => {
      const status = norm(o?.status ?? "-");
      if (status === "paid") return false;

      const statusFilter = norm(tabStatus.upcomingPayments);
      if (statusFilter && status !== statusFilter) return false;

      const hay = `${o?.internName ?? ""} ${o?.projectName ?? ""} ${o?.currency ?? ""} ${o?.orderId ?? o?.order_id ?? ""}`;
      return matches(hay, tabSearch.upcomingPayments);
    });

    const hiredList = (proposals ?? []).filter((p: any) => norm(p?.status ?? "") === "hired").filter((p: any) => {
      const hay = `${p?.internName ?? p?.candidateName ?? ""} ${p?.projectName ?? ""}`;
      return matches(hay, tabSearch.hired);
    });

    return {
      projectList,
      proposalList,
      interviewList,
      paymentList,
      upcomingPaymentsList,
      hiredList,
    };
  }, [orders, projects, proposals, interviews, tabSearch, tabStatus]);

  const pagination = useMemo(() => {
    const getList = (tab: TabKey) => {
      if (tab === "projects") return tabData.projectList;
      if (tab === "proposals") return tabData.proposalList;
      if (tab === "interviews") return tabData.interviewList;
      if (tab === "payments") return tabData.paymentList;
      if (tab === "upcomingPayments") return tabData.upcomingPaymentsList;
      return tabData.hiredList;
    };

    const list = getList(activeTab);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, tabPage[activeTab]), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);

    return {
      total,
      totalPages,
      safePage,
      startIndex,
      endIndex,
      list,
      pageList: list.slice(startIndex, endIndex),
    };
  }, [activeTab, pageSize, tabData, tabPage]);

  useEffect(() => {
    setTabPage((prev) => ({ ...prev, [activeTab]: 1 }));
  }, [activeTab, pageSize, tabSearch, tabStatus]);

  useEffect(() => {
    setTabPage((prev) => ({ ...prev, projects: 1 }));
  }, [projectsCreatedDate]);

  const formatDate = (raw: string | null) => {
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toISOString().slice(0, 10);
  };

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const formatMajorMoney = (amountMajor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMajor) ? amountMajor : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(major || 0);
  };

  const displayProposalStatus = (raw: unknown) => {
    const s = String(raw ?? "-")
      .trim()
      .toLowerCase();
    if (s === "expired") return "withdrawn";
    return s || "-";
  };

  const toDisplayUrl = (raw: string) => {
    const v = String(raw ?? "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const convertToInrIfUsd = (amountMajor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    if (cur !== "USD") return amountMajor;
    const rate = DEFAULT_USD_TO_INR_RATE;
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 100;
    return Math.round((Number.isFinite(amountMajor) ? amountMajor : 0) * safeRate);
  };

  const convertMinorToInrIfUsd = (amountMinor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    if (cur !== "USD") return amountMinor;
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    const inrMajor = convertToInrIfUsd(major, cur);
    return Math.round(inrMajor * 100);
  };

  const formatPercent = (v: number) => {
    const n = Number.isFinite(v) ? v : 0;
    return `${Math.round(n * 100)}%`;
  };

  const monthsFromDuration = (duration: unknown) => {
    switch (String(duration ?? "").trim().toLowerCase()) {
      case "2m":
        return 2;
      case "3m":
        return 3;
      case "6m":
        return 6;
      default:
        return 1;
    }
  };

  if (loading) {
    return (
      <AdminLayout
        title="Company"
        description="Complete record of a company's documents, projects, and interns."
      >
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading company details...</p>
        </Card>
      </AdminLayout>
    );
  }

  if (!companyId || !employer) {
    return (
      <AdminLayout
        title="Company"
        description="Complete record of a company's documents, projects, and interns."
      >
        <Card className="p-6 space-y-3">
          <p className="text-sm text-red-600">{error ?? "Company not found"}</p>
          <Button variant="outline" onClick={() => setLocation("/admin/companies")}>
            Back to Companies
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Company"
      description="Complete record of a company's documents, projects, and interns."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr),minmax(0,1.1fr)]">
        <Card className="p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold truncate">{summary.companyName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact: {summary.contactName}{summary.contactRole ? ` (${summary.contactRole})` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Created: {summary.createdAt}</p>
              </div>

              <div className="grid gap-3 text-sm md:min-w-[320px] md:grid-cols-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="break-words">{summary.email || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="break-words">{summary.phone || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="break-words">{summary.location || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Website</p>
                  <p className="break-words">{summary.websiteUrl || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Company size</p>
                  <p className="break-words">{summary.companySize || "-"}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Active Projects</p>
                <p className="mt-1 text-lg font-semibold">{summary.activeInternships}</p>
              </div>
              
              <div className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">Conversion rate</p>
                <p className="mt-1 text-lg font-semibold">{formatPercent(summary.conversionRate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {summary.hiredResourcesCount} hired / {summary.totalProposals} proposals
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!summary.isActive && (
                <Badge variant="outline" className="border-slate-400 bg-slate-50 text-slate-700">
                  Deactivated
                </Badge>
              )}
              <Badge variant="outline" className="border-emerald-500 bg-emerald-50 text-emerald-700">
                {summary.onboardingCompleted ? "Onboarding Completed" : "Onboarding Pending"}
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                Projects: {projects.length}
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                Active Projects: {summary.activeInternships}
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                Hired resources: {summary.hiredResourcesCount}
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                Last payment: {formatDate(summary.lastPaymentAt)}
              </Badge>
              <Badge
                variant="outline"
                className={
                  summary.setupCompleted
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-amber-400 bg-amber-50 text-amber-700"
                }
              >
                {summary.setupCompleted ? "Setup Completed" : "Setup Pending"}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Projects split</p>
          <p className="mt-1 text-xs text-muted-foreground">Active vs inactive projects</p>
          <div className="mt-4">
            <ChartContainer config={charts.projectConfig as any} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={charts.projectSeries}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {charts.projectSeries.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-medium text-muted-foreground">Payments split</p>
          <p className="mt-1 text-xs text-muted-foreground">Paid vs pending vs failed</p>
          <div className="mt-4">
            <ChartContainer config={charts.paymentConfig as any} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={charts.paymentSeries}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {charts.paymentSeries.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <Tabs
          defaultValue="projects"
          className="w-full"
          onValueChange={(v) => setActiveTab(v as TabKey)}
        >
          <TabsList className="mx-6 mt-4 flex w-fit flex-wrap bg-muted">
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="upcomingPayments">Upcoming payments</TabsTrigger>
            <TabsTrigger value="hired">Hired resources</TabsTrigger>
          </TabsList>

          <div className="mx-6 mt-4 flex flex-col gap-2 border-b pb-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-medium text-muted-foreground capitalize">{activeTab} list</div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:w-auto">
              <Input
                className="h-10 w-full sm:w-[320px]"
                placeholder={`Search ${activeTab}...`}
                value={tabSearch[activeTab]}
                onChange={(e) =>
                  setTabSearch((prev) => ({
                    ...prev,
                    [activeTab]: e.target.value,
                  }))
                }
              />

              {activeTab === "projects" && (
                <Input
                  type="date"
                  className="h-10 w-full sm:w-[170px]"
                  value={projectsCreatedDate}
                  onChange={(e) => setProjectsCreatedDate(e.target.value)}
                />
              )}

              {activeTab !== "hired" && activeTab !== "upcomingPayments" && (
                <Select
                  value={tabStatus[activeTab] || "__all__"}
                  onValueChange={(v) =>
                    setTabStatus((prev) => ({
                      ...prev,
                      [activeTab]: v === "__all__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All status</SelectItem>
                    {activeTab === "projects" && (
                      <>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="inactive">inactive</SelectItem>
                        <SelectItem value="draft">draft</SelectItem>
                      </>
                    )}
                    {activeTab === "proposals" && (
                      <>
                        <SelectItem value="sent">sent</SelectItem>
                        <SelectItem value="accepted">accepted</SelectItem>
                        <SelectItem value="rejected">rejected</SelectItem>
                        <SelectItem value="hired">hired</SelectItem>
                      </>
                    )}
                    {activeTab === "interviews" && (
                      <>
                        <SelectItem value="scheduled">scheduled</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="cancelled">cancelled</SelectItem>
                      </>
                    )}
                    {activeTab === "payments" && (
                      <>
                        <SelectItem value="paid">paid</SelectItem>
                        <SelectItem value="pending">pending</SelectItem>
                        <SelectItem value="created">created</SelectItem>
                        <SelectItem value="failed">failed</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}

              {activeTab === "upcomingPayments" && (
                <Select
                  value={tabStatus.upcomingPayments || "__all__"}
                  onValueChange={(v) =>
                    setTabStatus((prev) => ({
                      ...prev,
                      upcomingPayments: v === "__all__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All status</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="created">created</SelectItem>
                    <SelectItem value="failed">failed</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}>
                <SelectTrigger className="h-10 w-full sm:w-[140px]">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="25">25 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="projects" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[1100px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                  <TableHead>Project</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Location Type</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Full-Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pagination.total === 0 && activeTab === "projects" && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-sm text-muted-foreground">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
                {(activeTab === "projects" ? (pagination.pageList as any[]) : tabData.projectList).slice(0, activeTab === "projects" ? 999999 : 0).map((p: any, idx: number) => {
                  const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
                  const createdAt = createdAtRaw
                    ? (() => {
                        const d = new Date(createdAtRaw);
                        return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
                      })()
                    : "-";
                  const type = String(p?.locationType ?? p?.location_type ?? "-") || "-";
                  const fullTime = p?.fullTimeOffer ?? p?.full_time_offer;
                  const skills = Array.isArray(p?.skills) ? p.skills : [];
                  const pincode = String(p?.pincode ?? "-") || "-";
                  const city = String(p?.city ?? "-") || "-";
                  const timezone = String(p?.timezone ?? "-") || "-";
                  const scope = String(p?.scopeOfWork ?? p?.scope_of_work ?? "-") || "-";
                  const status = String(p?.status ?? "-") || "-";
                  return (
                    <TableRow
                      key={String(p?.id ?? p?.projectName ?? Math.random())}
                      className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                    >
                      <TableCell className="font-medium">{String(p?.projectName ?? p?.title ?? "-")}</TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="flex flex-wrap gap-1">
                          {skills.length === 0 ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            skills.slice(0, 6).map((s: any) => (
                              <Badge key={String(s)} variant="outline" className="text-[11px] rounded-full">
                                {String(s)}
                              </Badge>
                            ))
                          )}
                          {skills.length > 6 && (
                            <Badge variant="outline" className="text-[11px] rounded-full">
                              +{skills.length - 6}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {scope}
                        </Badge>
                      </TableCell>
                      <TableCell>{type}</TableCell>
                      <TableCell>{city || "-"}</TableCell>
                      <TableCell>{timezone || "-"}</TableCell>
                      <TableCell>{fullTime === true ? "Yes" : fullTime === false ? "No" : "-"}</TableCell>
                      <TableCell>
                        <Badge className={status === "active" ? "bg-[#0E6049]" : "bg-slate-500"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{createdAt}</TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="upcomingPayments" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[1200px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Project duration</TableHead>
                    <TableHead>Amount receivable</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Receivable date</TableHead>
                    <TableHead>Total receivable</TableHead>
                    <TableHead>Deal amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.total === 0 && activeTab === "upcomingPayments" && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-sm text-muted-foreground">
                        No upcoming payments found.
                      </TableCell>
                    </TableRow>
                  )}

                  {(activeTab === "upcomingPayments" ? (pagination.pageList as any[]) : tabData.upcomingPaymentsList)
                    .slice(0, activeTab === "upcomingPayments" ? 999999 : 0)
                    .map((o: any, idx: number) => {
                      const orderId = String(o?.orderId ?? o?.order_id ?? "").trim();
                      const candidateName = String(o?.internName ?? "-").trim() || "-";
                      const projectName = String(o?.projectName ?? "-").trim() || "-";
                      const cur = String(o?.currency ?? "INR").toUpperCase();
                      const status = String(o?.status ?? "").trim().toLowerCase();

                      const raw = (o as any)?.raw ?? {};
                      const order = raw?.order ?? (o as any)?.order ?? {};
                      const notes = order?.notes ?? {};

                      const items = Array.isArray(notes?.proposalIds)
                        ? (notes.proposalIds as any[])
                            .map((pid: any) => String(pid ?? "").trim())
                            .filter(Boolean)
                            .map((pid: string) => (proposals ?? []).find((p: any) => String(p?.id ?? "").trim() === pid))
                            .filter(Boolean)
                        : [];

                      const durations = items.map((p: any) => {
                        const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
                        return String(offer?.duration ?? "").trim();
                      }).filter(Boolean);
                      const durationLabel = durations.length === 1 ? durations[0] : durations.length > 1 ? "Multiple" : "-";

                      const monthly = items.reduce((sum: number, p: any) => {
                        const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
                        const v = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
                        return sum + (Number.isFinite(v) ? v : 0);
                      }, 0);

                      const total = items.reduce((sum: number, p: any) => {
                        const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
                        const v = Number(offer?.totalPrice ?? offer?.total_price ?? 0);
                        const duration = monthsFromDuration(offer?.duration);
                        const safeTotal = Number.isFinite(v) ? v : 0;
                        const safeMonthly = Number(offer?.monthlyAmount ?? 0);
                        const derived = Number.isFinite(safeMonthly) ? safeMonthly * duration : 0;
                        return sum + (safeTotal > 0 ? safeTotal : derived);
                      }, 0);

                      const monthlyInr = cur === "USD" ? convertToInrIfUsd(monthly, cur) : monthly;
                      const totalInr = cur === "USD" ? convertToInrIfUsd(total, cur) : total;

                      const amountMinor = Number(o?.amountMinor ?? o?.amount_minor ?? 0);
                      const amountMinorInr = cur === "USD" ? convertMinorToInrIfUsd(amountMinor, cur) : amountMinor;
                      const amountReceivable = amountMinorInr ? formatAmount(amountMinorInr, cur === "USD" ? "INR" : cur) : "-";
                      const createdAtRaw = o?.createdAt ?? o?.created_at ?? null;
                      const receivableDate = formatDate(createdAtRaw ? String(createdAtRaw) : null);

                      const receivedAt = (raw as any)?.receivedAt ?? null;
                      const isReceived = Boolean(receivedAt);

                      return (
                        <TableRow
                          key={String(o?.id ?? orderId ?? Math.random())}
                          className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                        >
                          <TableCell className="whitespace-nowrap font-medium">{candidateName}</TableCell>
                          <TableCell className="whitespace-nowrap">{projectName}</TableCell>
                          <TableCell className="whitespace-nowrap">{durationLabel || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{amountReceivable}</TableCell>
                          <TableCell className="whitespace-nowrap">{cur}</TableCell>
                          <TableCell className="whitespace-nowrap">{receivableDate}</TableCell>
                          <TableCell className="whitespace-nowrap">{total ? formatMajorMoney(totalInr, cur === "USD" ? "INR" : cur) : "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{monthly ? formatMajorMoney(monthlyInr, cur === "USD" ? "INR" : cur) : "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isReceived || !companyId || !orderId || markingReceivedId === orderId || status === "paid"}
                              onClick={async () => {
                                if (!companyId || !orderId) return;
                                try {
                                  setMarkingReceivedId(orderId);
                                  const res = await apiRequest(
                                    "POST",
                                    `/api/admin/employers/${encodeURIComponent(companyId)}/orders/${encodeURIComponent(orderId)}/mark-received`,
                                  );
                                  const json = await res.json().catch(() => null);
                                  const updated = json?.payment ?? null;
                                  if (updated) {
                                    setOrders((prev) =>
                                      prev.map((x: any) => {
                                        const oid = String(x?.orderId ?? x?.order_id ?? "").trim();
                                        if (oid !== orderId) return x;
                                        return {
                                          ...x,
                                          raw: updated?.raw ?? x?.raw,
                                        };
                                      }),
                                    );
                                  }
                                } catch {
                                  return;
                                } finally {
                                  setMarkingReceivedId("");
                                }
                              }}
                            >
                              {isReceived ? "Received" : "Mark received"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[1000px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Full-time offer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pagination.total === 0 && activeTab === "proposals" && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-sm text-muted-foreground">
                      No proposals found.
                    </TableCell>
                  </TableRow>
                )}
                {(activeTab === "proposals" ? (pagination.pageList as any[]) : tabData.proposalList).slice(0, activeTab === "proposals" ? 999999 : 0).map((p: any, idx: number) => {
                  const offer = p?.offerDetails ?? {};
                  const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                  const currency = String(p?.currency ?? offer?.currency ?? (hasFullTimeOffer ? (fullTimeOffer as any)?.ctcCurrency : "INR") ?? "INR").toUpperCase();
                  const monthly = typeof offer?.monthlyAmount === "number" ? offer.monthlyAmount : 0;
                  const duration = String(offer?.duration ?? offer?.internshipDuration ?? "").trim();
                  const months = monthsFromDuration(duration);
                  const totalRaw = Number(offer?.totalPrice ?? offer?.total_price ?? 0);
                  const derivedTotal = Number.isFinite(monthly) ? Number(monthly) * months : 0;
                  const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : derivedTotal;

                  const monthlyInr = currency === "USD" ? convertToInrIfUsd(monthly, currency) : monthly;
                  const totalInr = currency === "USD" ? convertToInrIfUsd(total, currency) : total;

                  const proposalType = hasFullTimeOffer ? "PPO" : "Internship";
                  const statusLabel = displayProposalStatus(p?.status);

                  const fullTimeTitle = hasFullTimeOffer ? String((fullTimeOffer as any)?.jobTitle ?? "") : "";
                  const fullTimeCtc = hasFullTimeOffer ? Number((fullTimeOffer as any)?.annualCtc ?? (fullTimeOffer as any)?.annualCtc ?? 0) : 0;
                  const fullTimeCurrency = hasFullTimeOffer ? String((fullTimeOffer as any)?.ctcCurrency ?? currency).toUpperCase() : currency;
                  const fullTimeCtcInr = hasFullTimeOffer ? convertToInrIfUsd(fullTimeCtc, fullTimeCurrency) : 0;

                  const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
                  const createdAt = createdAtRaw
                    ? (() => {
                        const d = new Date(createdAtRaw);
                        return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
                      })()
                    : "-";

                  const internId = String(p?.internId ?? p?.intern_id ?? p?.intern?.id ?? "").trim();
                  const proposalId = String(p?.id ?? "").trim();
                  return (
                    <TableRow
                      key={String(p?.id ?? Math.random())}
                      className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                    >
                      <TableCell className="font-medium">{String(p?.internName ?? p?.candidateName ?? "-")}</TableCell>
                      <TableCell>{String(p?.projectName ?? "-")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{proposalType}</TableCell>
                      <TableCell>{hasFullTimeOffer ? "Full-time" : duration || "-"}</TableCell>
                      <TableCell>{currency}</TableCell>
                      <TableCell>{monthly ? formatMajorMoney(monthlyInr, currency === "USD" ? "INR" : currency) : "-"}</TableCell>
                      <TableCell>{total ? formatMajorMoney(totalInr, currency === "USD" ? "INR" : currency) : "-"}</TableCell>
                      <TableCell>
                        {hasFullTimeOffer
                          ? `${fullTimeTitle || "Full-time"} · ${formatMajorMoney(fullTimeCtcInr, "INR")}`
                          : "-"}
                      </TableCell>
                      <TableCell>{createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!proposalId) return;
                              setSelectedProposal(p);
                              setProposalDialogOpen(true);
                            }}
                            disabled={!proposalId}
                          >
                            View proposal
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!internId) return;
                              setLocation(`/admin/interns/${encodeURIComponent(internId)}`);
                            }}
                            disabled={!internId}
                          >
                            View intern
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            <Dialog
              open={proposalDialogOpen}
              onOpenChange={(open) => {
                setProposalDialogOpen(open);
                if (!open) setSelectedProposal(null);
              }}
            >
              <DialogContent className="max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Proposal details</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[85vh] pr-4">
                  {(() => {
                    const pr = selectedProposal ?? {};
                    const offer = (pr as any)?.offerDetails ?? (pr as any)?.offer_details ?? {};
                    const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                    const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";

                    const internId = String((pr as any)?.internId ?? (pr as any)?.intern_id ?? "").trim();

                    const currency = String((pr as any)?.currency ?? (offer as any)?.currency ?? "INR").toUpperCase();
                    const monthly = Number((offer as any)?.monthlyAmount ?? 0);
                    const duration = String((offer as any)?.duration ?? "").trim();
                    const months = monthsFromDuration(duration);
                    const totalRaw = Number((offer as any)?.totalPrice ?? 0);
                    const derivedTotal = Number.isFinite(monthly) ? monthly * months : 0;
                    const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : derivedTotal;

                    const displayCurrency = currency === "USD" ? "INR" : currency;
                    const monthlyDisplay = currency === "USD" ? convertToInrIfUsd(monthly, currency) : monthly;
                    const totalDisplay = currency === "USD" ? convertToInrIfUsd(total, currency) : total;

                    const ctcCurrency = hasFullTimeOffer ? String((fullTimeOffer as any)?.ctcCurrency ?? "").toUpperCase() : "";
                    const annualCtc = hasFullTimeOffer ? Number((fullTimeOffer as any)?.annualCtc ?? 0) : 0;
                    const annualCtcInr = hasFullTimeOffer
                      ? convertToInrIfUsd(annualCtc, ctcCurrency || "INR")
                      : 0;

                    const offerLetterUrl = hasFullTimeOffer ? String((fullTimeOffer as any)?.offerLetterUrl ?? "") : "";
                    const offerHref = offerLetterUrl ? toDisplayUrl(offerLetterUrl) : "";

                    const candidateName = String((pr as any)?.internName ?? (pr as any)?.candidateName ?? "").trim() || "-";
                    const projectName = String((pr as any)?.projectName ?? "").trim() || "-";
                    const projectLocation = String((offer as any)?.location ?? (offer as any)?.jobLocation ?? "").trim();
                    const workMode = String((offer as any)?.workMode ?? (offer as any)?.work_mode ?? "").trim();

                    const startDateRaw = String((offer as any)?.startDate ?? (offer as any)?.start_date ?? "").trim();
                    const startDate = startDateRaw ? formatDate(startDateRaw) : "-";
                    const shiftTimings = String((offer as any)?.shiftTimings ?? (offer as any)?.shift_timings ?? "").trim();
                    const weeklySchedule = String((offer as any)?.weeklySchedule ?? (offer as any)?.weekly_schedule ?? "").trim();
                    const leavePerMonth = String((offer as any)?.leavePerMonth ?? (offer as any)?.leave_per_month ?? "").trim();
                    const monthlyHours = String((offer as any)?.monthlyHours ?? (offer as any)?.monthly_hours ?? "").trim();
                    const laptop = String((offer as any)?.laptopProvided ?? (offer as any)?.laptop_provided ?? "").trim();

                    return (
                      <div className="grid gap-4 py-2">
                        <div className="rounded-lg border bg-background p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Project</p>
                              <p className="mt-1 text-base font-semibold break-words">{projectName}</p>
                              <p className="mt-1 text-xs text-muted-foreground break-words">
                                {[workMode, projectLocation].filter(Boolean).join(" • ") || "-"}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-700">
                                {hasFullTimeOffer ? "Full-time offer" : duration || "-"}
                              </Badge>
                              <Badge className={String((pr as any)?.status ?? "").toLowerCase() === "hired" ? "bg-[#0E6049]" : "bg-slate-500"}>
                                {displayProposalStatus((pr as any)?.status)}
                              </Badge>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Candidate</p>
                              <p className="mt-1 text-sm font-medium break-words">{candidateName}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Start date</p>
                              <p className="mt-1 text-sm break-words">{startDate}</p>
                            </div>
                            <div className="flex items-start justify-start sm:justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!internId}
                                onClick={() => {
                                  if (!internId) return;
                                  setLocation(`/admin/interns/${encodeURIComponent(internId)}`);
                                }}
                              >
                                View Profile
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border bg-background p-4">
                            <p className="text-sm font-semibold">Internship details</p>
                            <div className="mt-4 grid gap-3 text-sm">
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Monthly hours</p>
                                <p className="text-right break-words">{monthlyHours || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Shift timings</p>
                                <p className="text-right break-words">{shiftTimings || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Weekly schedule</p>
                                <p className="text-right break-words">{weeklySchedule || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Leave / month</p>
                                <p className="text-right break-words">{leavePerMonth || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Work mode</p>
                                <p className="text-right break-words">{workMode || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Location</p>
                                <p className="text-right break-words">{projectLocation || "-"}</p>
                              </div>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-xs text-muted-foreground">Laptop</p>
                                <p className="text-right break-words">{laptop || "-"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border bg-background p-4">
                            <p className="text-sm font-semibold">Compensation</p>
                            <div className="mt-4 grid gap-3 text-sm">
                              {!hasFullTimeOffer && (
                                <>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-muted-foreground">Monthly pay</p>
                                    <p className="text-right break-words">
                                      {monthlyDisplay ? formatMajorMoney(monthlyDisplay, displayCurrency) : "-"}
                                    </p>
                                  </div>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-muted-foreground">Total amount</p>
                                    <p className="text-right break-words">
                                      {totalDisplay ? formatMajorMoney(totalDisplay, displayCurrency) : "-"}
                                    </p>
                                  </div>
                                </>
                              )}

                              {hasFullTimeOffer && (
                                <>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-muted-foreground">Job title</p>
                                    <p className="text-right break-words">{String((fullTimeOffer as any)?.jobTitle ?? "-")}</p>
                                  </div>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-muted-foreground">Annual CTC (INR)</p>
                                    <p className="text-right break-words">{annualCtcInr ? formatMajorMoney(annualCtcInr, "INR") : "-"}</p>
                                  </div>
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-xs text-muted-foreground">Offer letter</p>
                                    <p className="text-right break-words">
                                      {offerHref ? (
                                        <a
                                          href={offerHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary underline underline-offset-2"
                                        >
                                          Open
                                        </a>
                                      ) : (
                                        "-"
                                      )}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <Collapsible>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Raw JSON</p>
                            <CollapsibleTrigger asChild>
                              <Button size="sm" variant="outline">Toggle</Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <ScrollArea className="mt-3 h-[35vh] w-full rounded-md border bg-muted/10 p-3">
                              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                                {selectedProposal ? JSON.stringify(selectedProposal, null, 2) : "-"}
                              </pre>
                            </ScrollArea>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })()}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="interviews" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Meeting link</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pagination.total === 0 && activeTab === "interviews" && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      No interviews found.
                    </TableCell>
                  </TableRow>
                )}
                {(activeTab === "interviews" ? (pagination.pageList as any[]) : tabData.interviewList).slice(0, activeTab === "interviews" ? 999999 : 0).map((i: any, idx: number) => {
                  const createdAtRaw = i?.createdAt ?? i?.created_at ?? null;
                  const createdAt = createdAtRaw
                    ? (() => {
                        const d = new Date(createdAtRaw);
                        return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
                      })()
                    : "-";
                  const link = String(i?.meetingLink ?? "").trim();
                  const href = link ? toDisplayUrl(link) : "";
                  const notes = String(i?.notes ?? "");
                  const feedbackLine = notes
                    .split("\n")
                    .map((l: string) => l.trim())
                    .find((l: string) => l.toLowerCase().startsWith("feedback_text:"));
                  const feedbackText = String(feedbackLine ? feedbackLine.slice("feedback_text:".length).trim() : "");
                  return (
                    <TableRow
                      key={String(i?.id ?? Math.random())}
                      className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                    >
                      <TableCell className="font-medium">{String(i?.internName ?? "-")}</TableCell>
                      <TableCell>{String(i?.projectName ?? "-")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {String(i?.status ?? "-")}
                        </Badge>
                      </TableCell>
                      <TableCell>{String(i?.timezone ?? "-")}</TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {link}
                          </a>
                        ) : (
                          link || "-"
                        )}
                      </TableCell>
                      <TableCell>{createdAt}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!feedbackText}
                          onClick={() => {
                            setSelectedInterviewFeedback(feedbackText);
                            setFeedbackDialogOpen(true);
                          }}
                        >
                          View feedback
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>

            <Dialog
              open={feedbackDialogOpen}
              onOpenChange={(open) => {
                setFeedbackDialogOpen(open);
                if (!open) setSelectedInterviewFeedback("");
              }}
            >
              <DialogContent className="max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>Interview feedback</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[40vh] w-full rounded-md border bg-muted/10 p-3">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {selectedInterviewFeedback || "-"}
                  </pre>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="payments" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                  <TableHead>Order ID</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Paid at</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pagination.total === 0 && activeTab === "payments" && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      No payments found.
                    </TableCell>
                  </TableRow>
                )}
                {(activeTab === "payments" ? (pagination.pageList as any[]) : tabData.paymentList).slice(0, activeTab === "payments" ? 999999 : 0).map((o: any, idx: number) => {
                  const orderId = String(o?.orderId ?? o?.order_id ?? "").trim();
                  const candidateName = String(o?.internName ?? "").trim();
                  const projectName = String(o?.projectName ?? "").trim();
                  const status = String(o?.status ?? "").trim().toLowerCase();
                  const amountMinor = Number(o?.amountMinor ?? o?.amount_minor ?? 0);
                  const cur = String(o?.currency ?? "INR").toUpperCase();
                  const paidAtRaw = o?.paidAt ?? o?.paid_at ?? null;
                  const createdAtRaw = o?.createdAt ?? o?.created_at ?? null;
                  return (
                    <TableRow
                      key={String(o?.id ?? orderId ?? Math.random())}
                      className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                    >
                      <TableCell className="font-mono text-xs">{orderId || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{candidateName || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{projectName || "-"}</TableCell>
                      <TableCell>
                        <Badge className={status === "paid" ? "bg-[#0E6049]" : "bg-slate-500"}>
                          {status ? status.toUpperCase() : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatAmount(amountMinor, cur)}</TableCell>
                      <TableCell>{cur}</TableCell>
                      <TableCell>{formatDate(paidAtRaw ? String(paidAtRaw) : null)}</TableCell>
                      <TableCell>{formatDate(createdAtRaw ? String(createdAtRaw) : null)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const id = orderId;
                            if (companyId && id) {
                              try {
                                window.open(
                                  `/api/employer/${encodeURIComponent(companyId)}/orders/${encodeURIComponent(id)}/invoice`,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                                return;
                              } catch {
                                // fallback
                              }
                            }
                            setSelectedPayment(o);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>

            <Dialog
              open={paymentDialogOpen}
              onOpenChange={(open) => {
                setPaymentDialogOpen(open);
                if (!open) setSelectedPayment(null);
              }}
            >
              <DialogContent className="max-w-[900px]">
                <DialogHeader>
                  <DialogTitle>Payment data</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                  {(() => {
                    const p = selectedPayment ?? {};
                    const raw = (p as any)?.raw ?? {};
                    const order = raw?.order ?? (p as any)?.order ?? {};
                    const verification = raw?.verification ?? (p as any)?.verification ?? {};
                    const notes = order?.notes ?? {};

                    const orderId = String(p?.orderId ?? p?.order_id ?? order?.id ?? "-") || "-";
                    const paymentId = String(p?.paymentId ?? p?.payment_id ?? "-") || "-";
                    const status = String(p?.status ?? order?.status ?? "-") || "-";
                    const cur = String(p?.currency ?? order?.currency ?? "INR").toUpperCase();
                    const amountMinor = Number(p?.amountMinor ?? p?.amount_minor ?? order?.amount ?? 0);
                    const computedMinor = Number(notes?.computedAmountMinor ?? 0);
                    const paidAtRaw = p?.paidAt ?? p?.paid_at ?? null;
                    const createdAtRaw = p?.createdAt ?? p?.created_at ?? order?.created_at ?? null;

                    const proposalIds = Array.isArray(notes?.proposalIds) ? notes.proposalIds : [];
                    const candidates = proposalIds
                      .map((id: any) => {
                        const pid = String(id ?? "").trim();
                        if (!pid) return null;
                        const pr = (proposals ?? []).find((x: any) => String(x?.id ?? "").trim() === pid);
                        return {
                          proposalId: pid,
                          candidate: String(pr?.internName ?? pr?.candidateName ?? "-") || "-",
                          project: String(pr?.projectName ?? "-") || "-",
                          paymentMode: String(notes?.paymentMode ?? "-") || "-",
                        };
                      })
                      .filter(Boolean) as Array<{ proposalId: string; candidate: string; project: string; paymentMode: string }>;

                    return (
                      <>
                        <div className="grid gap-3 rounded-lg border p-4">
                          <p className="text-sm font-medium">Overview</p>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Order ID</p>
                              <p className="mt-1 break-words font-mono text-xs">{orderId}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Payment ID</p>
                              <p className="mt-1 break-words font-mono text-xs">{paymentId}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="mt-1 text-sm">{String(status).toUpperCase()}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Amount</p>
                              <p className="mt-1 text-sm font-semibold">{formatAmount(amountMinor, cur)}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Currency</p>
                              <p className="mt-1 text-sm">{cur}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Computed amount</p>
                              <p className="mt-1 text-sm">{computedMinor ? formatAmount(computedMinor, cur) : "-"}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Paid at</p>
                              <p className="mt-1 text-sm">{formatDate(paidAtRaw ? String(paidAtRaw) : null)}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Created</p>
                              <p className="mt-1 text-sm">{formatDate(createdAtRaw ? String(createdAtRaw) : null)}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">Purpose</p>
                              <p className="mt-1 text-sm">{String(notes?.purpose ?? "-") || "-"}</p>
                            </div>
                          </div>
                        </div>

                       

                        {(verification?.razorpay_order_id || verification?.razorpay_payment_id || verification?.razorpay_signature) && (
                          <div className="grid gap-3 rounded-lg border p-4">
                            <p className="text-sm font-medium">Verification</p>
                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Razorpay order id</p>
                                <p className="mt-1 break-words font-mono text-xs">{String(verification?.razorpay_order_id ?? "-")}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Razorpay payment id</p>
                                <p className="mt-1 break-words font-mono text-xs">{String(verification?.razorpay_payment_id ?? "-")}</p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Signature</p>
                                <p className="mt-1 break-words font-mono text-xs">{String(verification?.razorpay_signature ?? "-")}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <Separator />

                        <Collapsible>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Raw JSON</p>
                            <CollapsibleTrigger asChild>
                              <Button size="sm" variant="outline">Toggle</Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            <ScrollArea className="mt-3 h-[35vh] w-full rounded-md border bg-muted/10 p-3">
                              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                                {selectedPayment ? JSON.stringify(selectedPayment, null, 2) : "-"}
                              </pre>
                            </ScrollArea>
                          </CollapsibleContent>
                        </Collapsible>
                      </>
                    );
                  })()}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!selectedPayment) return;
                      try {
                        await navigator.clipboard.writeText(JSON.stringify(selectedPayment, null, 2));
                      } catch {
                        // ignore
                      }
                    }}
                    disabled={!selectedPayment}
                  >
                    Copy JSON
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="hired" className="px-6 pb-6 pt-4">
            <div className="relative w-full overflow-auto rounded-lg border">
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="bg-background">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Monthly</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pagination.total === 0 && activeTab === "hired" ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No hired resources found.
                    </TableCell>
                  </TableRow>
                ) : (
                  (activeTab === "hired" ? (pagination.pageList as any[]) : tabData.hiredList).slice(0, activeTab === "hired" ? 999999 : 0).map((p: any, idx: number) => {
                    const offer = p?.offerDetails ?? {};
                    const monthly = typeof offer?.monthlyAmount === "number" ? offer.monthlyAmount : 0;
                    const total = typeof offer?.totalPrice === "number" ? offer.totalPrice : 0;
                    const internId = String(p?.internId ?? p?.intern_id ?? p?.intern?.id ?? "").trim();
                    return (
                      <TableRow
                        key={String(p?.id ?? Math.random())}
                        className={idx % 2 === 0 ? "bg-background hover:bg-muted/40" : "bg-muted/20 hover:bg-muted/40"}
                      >
                        <TableCell className="font-medium">{String(p?.internName ?? "-")}</TableCell>
                        <TableCell>{String(p?.projectName ?? "-")}</TableCell>
                        <TableCell>{monthly ? `${monthly}` : "-"}</TableCell>
                        <TableCell>{total ? `${total}` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!internId) return;
                              setLocation(`/admin/interns/${encodeURIComponent(internId)}`);
                            }}
                            disabled={!internId}
                          >
                            View intern
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <div className="px-6 pb-6">
            {!loading && (
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {pagination.total === 0 ? 0 : pagination.startIndex + 1}-{pagination.endIndex} of {pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTabPage((prev) => ({
                        ...prev,
                        [activeTab]: Math.max(1, prev[activeTab] - 1),
                      }))
                    }
                    disabled={pagination.safePage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="min-w-[110px] text-center text-sm text-muted-foreground">
                    Page {pagination.safePage} / {pagination.totalPages}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTabPage((prev) => ({
                        ...prev,
                        [activeTab]: Math.min(pagination.totalPages, prev[activeTab] + 1),
                      }))
                    }
                    disabled={pagination.safePage >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </Card>
    </AdminLayout>
  );
}


