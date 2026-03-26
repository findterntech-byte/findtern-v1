import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Building2, FileText, ExternalLink, TrendingUp, Users, Search, Calendar, MapPin, Globe, Mail, Phone, Briefcase,
  CheckCircle2, Clock, AlertCircle, X, ChevronRight, DollarSign, ArrowUpRight, ArrowDownRight, Loader2,
  CreditCard, User, FileCheck, MoreHorizontal, Eye, ArrowLeft, ArrowRight, AlertTriangle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { DEFAULT_USD_TO_INR_RATE } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  logoUrl?: string | null;
  setupCompleted?: boolean | null;
  onboardingCompleted?: boolean | null;
  isActive?: boolean | null;
  createdAt?: string | null;
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  variant?: "default" | "success" | "warning" | "muted";
}

function StatCard({ title, value, subtitle, icon, className, variant = "default" }: StatCardProps) {
  const variants = {
    default: "bg-gradient-to-br from-slate-50 to-white border-slate-200",
    success: "bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200",
    muted: "bg-gradient-to-br from-slate-100/50 to-slate-50 border-slate-200/50",
  };

  const iconVariants = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    muted: "bg-slate-200 text-slate-500",
  };

  return (
    <Card className={cn("p-5 relative overflow-hidden border", variants[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "active" || s === "completed" || s === "paid" || s === "accepted" || s === "hired") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">Active</Badge>;
  }
  if (s === "pending" || s === "sent" || s === "scheduled" || s === "created") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-medium">Pending</Badge>;
  }
  if (s === "rejected" || s === "failed" || s === "expired" || s === "withdrawn" || s === "cancelled") {
    return <Badge className="bg-red-100 text-red-700 border-red-200 font-medium">Inactive</Badge>;
  }
  return <Badge variant="outline" className="font-medium">{status}</Badge>;
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

export default function AdminCompanyDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/companies/:id");
  const companyId = params?.id;

  type TabKey = "profile" | "projects" | "proposals" | "interviews" | "payments" | "upcomingPayments" | "hired";
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [tabSearch, setTabSearch] = useState<Record<TabKey, string>>({
    profile: "", projects: "", proposals: "", interviews: "", payments: "", upcomingPayments: "", hired: "",
  });
  const [tabStatus, setTabStatus] = useState<Record<TabKey, string>>({
    profile: "", projects: "", proposals: "", interviews: "", payments: "", upcomingPayments: "", hired: "",
  });
  const [tabPage, setTabPage] = useState<Record<TabKey, number>>({
    profile: 1, projects: 1, proposals: 1, interviews: 1, payments: 1, upcomingPayments: 1, hired: 1,
  });
  const [pageSize, setPageSize] = useState<5 | 10 | 25 | 50>(10);
  const [projectsCreatedDate, setProjectsCreatedDate] = useState<string>("");

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedInterviewFeedback, setSelectedInterviewFeedback] = useState<string>("");
  const [markingReceivedId, setMarkingReceivedId] = useState<string>("");
  const [logoError, setLogoError] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employer, setEmployer] = useState<LoadedEmployer | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!companyId) { setLoading(false); setEmployer(null); return; }
      try {
        setLoading(true);
        setError(null);
        setLogoError(false);
        const [employerRes, projectsRes, proposalsRes, interviewsRes, ordersRes, paymentSummaryRes] = await Promise.all([
          apiRequest("GET", `/api/admin/employers/${companyId}`),
          apiRequest("GET", `/api/employer/${companyId}/projects`).catch(() => null),
          apiRequest("GET", `/api/employer/${companyId}/proposals`).catch(() => null),
          apiRequest("GET", `/api/employer/${companyId}/interviews`).catch(() => null),
          apiRequest("GET", `/api/admin/employers/${companyId}/orders?limit=200`).catch(() => null),
          apiRequest("GET", `/api/admin/employers/${companyId}/payment-summary`).catch(() => null),
        ]);
        const employerJson = await employerRes.json();
        setEmployer((employerJson?.employer ?? null) as any);
        if (projectsRes) { const j = await projectsRes.json().catch(() => null); setProjects(Array.isArray(j?.projects) ? j.projects : []); }
        else setProjects([]);
        if (proposalsRes) { const j = await proposalsRes.json().catch(() => null); setProposals(Array.isArray(j?.proposals) ? j.proposals : []); }
        else setProposals([]);
        if (interviewsRes) { const j = await interviewsRes.json().catch(() => null); setInterviews(Array.isArray(j?.interviews) ? j.interviews : []); }
        else setInterviews([]);
        if (ordersRes) { const j = await ordersRes.json().catch(() => null); setOrders(Array.isArray(j?.orders) ? j.orders : []); }
        else setOrders([]);
        if (paymentSummaryRes) { const j = await paymentSummaryRes.json().catch(() => null); setPaymentSummary(j); }
      } catch (e) {
        console.error("Failed to load company details", e);
        setError("Failed to load company details");
        setEmployer(null);
        setProjects([]); setProposals([]); setInterviews([]); setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [companyId]);

  const summary = useMemo(() => {
    const e = employer ?? ({} as any);
    const createdAtRaw = e.createdAt ?? null;
    const createdAt = createdAtRaw ? (() => { const d = new Date(createdAtRaw); return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); })() : "-";
    const phone = [String(e.countryCode ?? ""), String(e.phoneNumber ?? "")].filter(Boolean).join(" ") || "-";
    const location = [e.city, e.state].filter(Boolean).join(", ") || "-";
    const activeInternships = (projects ?? []).reduce((acc, p: any) => { const s = String(p?.status ?? "active").trim().toLowerCase(); return acc + (s === "active" ? 1 : 0); }, 0);
    const hiredResourcesCount = (() => { const ids = new Set((proposals ?? []).filter((p: any) => String(p?.status ?? "").trim().toLowerCase() === "hired").map((p: any) => String(p?.internId ?? p?.intern_id ?? "").trim()).filter(Boolean)); return ids.size; })();
    const lastPaymentAt = (() => { let best: Date | null = null; for (const row of orders ?? []) { const raw = row?.paidAt ?? row?.createdAt ?? null; if (!raw) continue; const dt = new Date(raw); if (Number.isNaN(dt.getTime())) continue; if (!best || dt.getTime() > best.getTime()) best = dt; } return best ? best.toISOString() : null; })();
    const earningsMinor = (orders ?? []).reduce((acc, o: any) => { const s = String(o?.status ?? "").trim().toLowerCase(); if (s !== "paid") return acc; const minor = Number(o?.amountMinor ?? o?.amount_minor ?? o?.amount ?? 0); return acc + (Number.isFinite(minor) ? minor : 0); }, 0);
    const totalProposals = Array.isArray(proposals) ? proposals.length : 0;
    const conversionRate = totalProposals > 0 ? hiredResourcesCount / totalProposals : 0;
    
    const paymentSum = paymentSummary?.summary ?? {};
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
      logoUrl: String(e.logoUrl ?? ""), 
      gstNumber: String(e.gstNumber ?? ""), 
      activeInternships, 
      hiredResourcesCount, 
      lastPaymentAt, 
      earningsMinor, 
      totalProposals, 
      conversionRate,
      totalBilledMinor: paymentSum.totalBilledMinor ?? earningsMinor,
      totalPaidMinor: paymentSum.totalPaidMinor ?? earningsMinor,
      remainingMinor: paymentSum.remainingMinor ?? 0,
      upcomingPaymentMinor: paymentSum.upcomingPaymentMinor ?? 0,
      nextUpcomingDate: paymentSum.nextUpcomingDate ?? null,
    };
  }, [employer, orders, projects, proposals, paymentSummary]);

  const tabData = useMemo(() => {
    const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
    const tokens = (q: string) => norm(q).split(/\s+/).filter(Boolean);
    const matches = (haystack: string, q: string) => { const t = tokens(q); if (t.length === 0) return true; const h = norm(haystack); return t.every((x) => h.includes(x)); };
    const toDateKey = (raw: unknown) => { if (!raw) return ""; const d = new Date(String(raw)); if (Number.isNaN(d.getTime())) return ""; return d.toISOString().slice(0, 10); };
    const projectList = (projects ?? []).filter((p: any) => { const s = norm(p?.status ?? "-"); const sf = norm(tabStatus.projects); if (sf && s !== sf) return false; const ck = toDateKey(p?.createdAt ?? p?.created_at ?? null); const cfk = String(projectsCreatedDate ?? "").trim(); if (cfk && ck !== cfk) return false; const skills = Array.isArray(p?.skills) ? p.skills.join(" ") : ""; const hay = `${p?.projectName ?? p?.title ?? ""} ${skills} ${p?.city ?? ""} ${p?.timezone ?? ""} ${p?.locationType ?? p?.location_type ?? ""}`; return matches(hay, tabSearch.projects); });
    const proposalList = (proposals ?? []).filter((p: any) => { const s = norm(p?.status ?? "-"); const sf = norm(tabStatus.proposals); if (sf) { if (sf === "expired") { if (s !== "expired" && s !== "withdrawn") return false; } else if (s !== sf) return false; } const hay = `${p?.internName ?? p?.candidateName ?? ""} ${p?.projectName ?? ""} ${p?.currency ?? ""}`; return matches(hay, tabSearch.proposals); });
    const interviewList = (interviews ?? []).filter((i: any) => { const s = norm(i?.status ?? "-"); const sf = norm(tabStatus.interviews); if (sf && s !== sf) return false; const hay = `${i?.internName ?? ""} ${i?.projectName ?? ""} ${i?.timezone ?? ""} ${i?.meetingLink ?? ""}`; return matches(hay, tabSearch.interviews); });
    const paymentList = (orders ?? []).filter((o: any) => { const s = norm(o?.status ?? "-"); const sf = norm(tabStatus.payments); if (sf && s !== sf) return false; const hay = `${o?.orderId ?? o?.order_id ?? ""} ${o?.currency ?? ""} ${o?.status ?? ""}`; return matches(hay, tabSearch.payments); });
    const upcomingPaymentsList = (paymentSummary?.upcomingPayments ?? []).filter((o: any) => { const s = norm(o?.status ?? ""); if (s === "paid") return false; const sf = norm(tabStatus.upcomingPayments); if (sf && s !== sf) return false; const hay = `${o?.candidateName ?? o?.internName ?? ""} ${o?.projectName ?? ""} ${o?.currency ?? ""} ${o?.id ?? ""}`; return matches(hay, tabSearch.upcomingPayments); });
    const hiredList = (proposals ?? []).filter((p: any) => norm(p?.status ?? "") === "hired").filter((p: any) => { const hay = `${p?.internName ?? p?.candidateName ?? ""} ${p?.projectName ?? ""}`; return matches(hay, tabSearch.hired); });
    const employerDuesList = paymentSummary?.internEmployerDues ?? [];
    return { projectList, proposalList, interviewList, paymentList, upcomingPaymentsList, hiredList, employerDuesList };
  }, [orders, projects, proposals, interviews, tabSearch, tabStatus, paymentSummary]);

  const pagination = useMemo(() => {
    const getList = (tab: TabKey) => { if (tab === "projects") return tabData.projectList; if (tab === "proposals") return tabData.proposalList; if (tab === "interviews") return tabData.interviewList; if (tab === "payments") return tabData.paymentList; if (tab === "upcomingPayments") return tabData.upcomingPaymentsList; return tabData.hiredList; };
    const list = getList(activeTab);
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, tabPage[activeTab]), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    return { total, totalPages, safePage, startIndex, endIndex, list, pageList: list.slice(startIndex, endIndex) };
  }, [activeTab, pageSize, tabData, tabPage]);

  useEffect(() => { setTabPage((prev) => ({ ...prev, [activeTab]: 1 })); }, [activeTab, pageSize, tabSearch, tabStatus]);
  useEffect(() => { setTabPage((prev) => ({ ...prev, projects: 1 })); }, [projectsCreatedDate]);

  const formatDate = (raw: string | null) => { if (!raw) return "—"; const d = new Date(raw); if (Number.isNaN(d.getTime())) return String(raw); return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
  const formatAmount = (amountMinor: number, currencyCode: string) => { const cur = String(currencyCode || "INR").toUpperCase(); const locale = cur === "INR" ? "en-IN" : "en-US"; const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0; return new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(major || 0); };
  const formatMajorMoney = (amountMajor: number, currencyCode: string) => { const cur = String(currencyCode || "INR").toUpperCase(); const locale = cur === "INR" ? "en-IN" : "en-US"; const major = Number.isFinite(amountMajor) ? amountMajor : 0; return new Intl.NumberFormat(locale, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(major || 0); };
  const displayProposalStatus = (raw: unknown) => { const s = String(raw ?? "-").trim().toLowerCase(); if (s === "expired") return "withdrawn"; return s || "-"; };
  const toDisplayUrl = (raw: string) => { const v = String(raw ?? "").trim(); if (!v) return ""; if (v.startsWith("/")) return v; if (/^https?:\/\//i.test(v)) return v; return `https://${v}`; };
  const convertToInrIfUsd = (amountMajor: number, currencyCode: string) => { const cur = String(currencyCode || "INR").toUpperCase(); if (cur !== "USD") return amountMajor; const rate = DEFAULT_USD_TO_INR_RATE; const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 100; return Math.round((Number.isFinite(amountMajor) ? amountMajor : 0) * safeRate); };
  const convertMinorToInrIfUsd = (amountMinor: number, currencyCode: string) => { const cur = String(currencyCode || "INR").toUpperCase(); if (cur !== "USD") return amountMinor; const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0; const inrMajor = convertToInrIfUsd(major, cur); return Math.round(inrMajor * 100); };
  const monthsFromDuration = (duration: unknown) => { switch (String(duration ?? "").trim().toLowerCase()) { case "2m": return 2; case "3m": return 3; case "6m": return 6; default: return 1; } };

  if (loading) {
    return (
      <AdminLayout title="Company Details" description="Complete profile and history of the employer.">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading company details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!companyId || !employer) {
    return (
      <AdminLayout title="Company Details" description="Complete profile and history of the employer.">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{error ?? "Company not found"}</h3>
              <p className="text-sm text-muted-foreground mt-1">We couldn't find the company you're looking for.</p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/admin/companies")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Companies
            </Button>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Company Details" description="Complete profile and history of the employer.">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden border-none shadow-sm">
          <div className="relative bg-gradient-to-r from-[#0E6049] to-[#0d7a5f] p-8">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyMCIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setLocation("/admin/companies")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-lg border-4 border-white/30">
                    {summary.logoUrl && !logoError ? (
                      <img src={toDisplayUrl(summary.logoUrl)} alt={summary.companyName} className="h-full w-full object-contain" onError={() => setLogoError(true)} />
                    ) : (
                      <span className="text-[#0E6049] font-bold text-3xl">{summary.companyName.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{summary.companyName}</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">{summary.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge className={summary.onboardingCompleted ? "bg-emerald-400/80 text-white border-0" : "bg-amber-400/80 text-white border-0"}>
                        {summary.onboardingCompleted ? "Onboarded" : "Pending Onboarding"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                  <p className="text-xs text-white/70 font-medium">Projects</p>
                  <p className="text-2xl font-bold text-white">{projects.length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                  <p className="text-xs text-white/70 font-medium">Active</p>
                  <p className="text-2xl font-bold text-white">{summary.activeInternships}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 text-center border border-white/20">
                  <p className="text-xs text-white/70 font-medium">Hired</p>
                  <p className="text-2xl font-bold text-white">{summary.hiredResourcesCount}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border shadow-sm"><Mail className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="text-sm font-medium truncate">{summary.email}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border shadow-sm"><Phone className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm font-medium">{summary.phone}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border shadow-sm"><MapPin className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Location</p><p className="text-sm font-medium truncate">{summary.location || "—"}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border shadow-sm"><Calendar className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Member Since</p><p className="text-sm font-medium">{summary.createdAt}</p></div>
            </div>
          </div>
        </Card>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Projects" value={projects.length} subtitle={`${summary.activeInternships} active`} icon={<Briefcase className="h-5 w-5" />} />
          <StatCard title="Proposals Sent" value={summary.totalProposals} subtitle={`${Math.round(summary.conversionRate * 100)}% conversion`} icon={<FileCheck className="h-5 w-5" />} variant="success" />
          <StatCard title="Hired Resources" value={summary.hiredResourcesCount} subtitle="Total hires" icon={<Users className="h-5 w-5" />} variant="success" />
          <StatCard title="Total Revenue" value={formatAmount(summary.earningsMinor, "INR")} subtitle={summary.lastPaymentAt ? `Last: ${formatDate(summary.lastPaymentAt)}` : "No payments yet"} icon={<DollarSign className="h-5 w-5" />} />
        </div>

        {/* Main Tabs */}
        <Card className="border shadow-sm overflow-hidden">
          <Tabs defaultValue="profile" className="w-full" onValueChange={(v) => setActiveTab(v as TabKey)}>
            <div className="border-b bg-muted/30 px-6">
              <TabsList className="bg-transparent gap-1 h-auto p-0 -mb-px">
                {(["profile", "projects", "proposals", "interviews", "payments", "upcomingPayments", "hired"] as TabKey[]).map((tab) => (
                  <TabsTrigger key={tab} value={tab} className={cn(
                    "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                    activeTab === tab 
                      ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                    {tab === "upcomingPayments" ? "Upcoming Payments" : tab}
                    {tab !== "profile" && (
                      <span className={cn(
                        "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                        activeTab === tab ? "bg-[#0E6049] text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {tab === "projects" ? tabData.projectList.length : tab === "proposals" ? tabData.proposalList.length : tab === "interviews" ? tabData.interviewList.length : tab === "payments" ? tabData.paymentList.length : tab === "upcomingPayments" ? tabData.employerDuesList.filter((d: any) => (d?.remainingMonths ?? 1) > 0).length : tabData.hiredList.length}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-6">
              {activeTab !== "profile" && (
                <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                  <div className="text-lg font-semibold">{(activeTab === "upcomingPayments" ? "Upcoming Payments" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1))} List</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-[280px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="h-10 pl-10 bg-background" placeholder={`Search ${activeTab}...`} value={tabSearch[activeTab]} onChange={(e) => setTabSearch((prev) => ({ ...prev, [activeTab]: e.target.value }))} />
                    </div>
                    {activeTab === "projects" && <Input type="date" className="h-10 w-full sm:w-[160px] bg-background" value={projectsCreatedDate} onChange={(e) => setProjectsCreatedDate(e.target.value)} />}
                    {activeTab !== "hired" && activeTab !== "upcomingPayments" && (
                      <Select value={tabStatus[activeTab] || "__all__"} onValueChange={(v) => setTabStatus((prev) => ({ ...prev, [activeTab]: v === "__all__" ? "" : v }))}>
                        <SelectTrigger className="h-10 w-full sm:w-[160px] bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Status</SelectItem>
                          {activeTab === "projects" && [<SelectItem key="active" value="active">Active</SelectItem>, <SelectItem key="inactive" value="inactive">Inactive</SelectItem>, <SelectItem key="draft" value="draft">Draft</SelectItem>]}
                          {activeTab === "proposals" && [<SelectItem key="sent" value="sent">Sent</SelectItem>, <SelectItem key="accepted" value="accepted">Accepted</SelectItem>, <SelectItem key="rejected" value="rejected">Rejected</SelectItem>, <SelectItem key="hired" value="hired">Hired</SelectItem>, <SelectItem key="expired" value="expired">Withdrawn</SelectItem>]}
                          {activeTab === "interviews" && [<SelectItem key="scheduled" value="scheduled">Scheduled</SelectItem>, <SelectItem key="completed" value="completed">Completed</SelectItem>, <SelectItem key="cancelled" value="cancelled">Cancelled</SelectItem>]}
                          {activeTab === "payments" && [<SelectItem key="paid" value="paid">Paid</SelectItem>, <SelectItem key="pending" value="pending">Pending</SelectItem>, <SelectItem key="created" value="created">Created</SelectItem>, <SelectItem key="failed" value="failed">Failed</SelectItem>]}
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}>
                      <SelectTrigger className="h-10 w-[120px] bg-background"><SelectValue placeholder="Rows" /></SelectTrigger>
                      <SelectContent><SelectItem value="5">5 / Page</SelectItem><SelectItem value="10">10 / Page</SelectItem><SelectItem value="25">25 / Page</SelectItem><SelectItem value="50">50 / Page</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <TabsContent value="profile" className="m-0 space-y-6">
                <div className="grid gap-6">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    <h4 className="text-lg font-bold">Company Information</h4>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Company Name</p><p className="font-semibold">{summary.companyName}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Email</p><p className="font-semibold">{summary.email || "—"}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Website</p><p className="font-semibold">{summary.websiteUrl ? <a href={toDisplayUrl(summary.websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{summary.websiteUrl}<ExternalLink className="h-3 w-3" /></a> : "—"}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Company Size</p><p className="font-semibold">{summary.companySize || "—"}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Location</p><p className="font-semibold">{summary.location || "—"}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Country</p><p className="font-semibold">{summary.country || "—"}</p></Card>
                    <Card className="p-5"><p className="text-xs text-muted-foreground mb-1">Member Since</p><p className="font-semibold">{summary.createdAt}</p></Card>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="p-6 bg-gradient-to-br from-blue-50/50 to-white border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600"><User className="h-5 w-5" /></div>
                      <div><h4 className="font-semibold">Primary Contact</h4><p className="text-xs text-muted-foreground">First Point of Contact</p></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{employer?.primaryContactName || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Role</span><span className="text-sm font-medium">{employer?.primaryContactRole || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Phone</span><span className="text-sm font-medium">{summary.phone}</span></div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-gradient-to-br from-amber-50/50 to-white border-amber-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600"><AlertCircle className="h-5 w-5" /></div>
                      <div><h4 className="font-semibold">Escalation Contact</h4><p className="text-xs text-muted-foreground">Second Point of Contact</p></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Name</span><span className="text-sm font-medium">{employer?.escalationContactName || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm font-medium">{employer?.escalationContactEmail || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Role</span><span className="text-sm font-medium">{employer?.escalationContactRole || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-sm text-muted-foreground">Phone</span><span className="text-sm font-medium">{employer?.escalationContactPhone || "—"}</span></div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {["projects", "proposals", "interviews", "payments", "upcomingPayments", "hired"].map((tab) => (
                <TabsContent key={tab} value={tab} className="m-0">
                  {tab === "projects" && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Project</TableHead><TableHead>Skills</TableHead><TableHead>Scope</TableHead><TableHead>Location</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {tabData.projectList.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={Briefcase} title="No projects" description="This company hasn't created any projects yet." /></TableCell></TableRow> :
                            tabData.projectList.map((p: any, idx: number) => {
                              const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
                              const createdAt = createdAtRaw ? (() => { const d = new Date(createdAtRaw); return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); })() : "—";
                              const skills = Array.isArray(p?.skills) ? p.skills : [];
                              const projectCity = String(p?.city ?? "—") || "—";
                              const employerCity = summary.location && summary.location !== "—" ? summary.location.split(",")[0].trim() : "";
                              const city = projectCity && projectCity !== "—" ? projectCity : (employerCity || "—");
                              const status = String(p?.status ?? "—") || "—";
                              return (
                                <TableRow key={String(p?.id ?? p?.projectName ?? Math.random())} className="group hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-medium">{String(p?.projectName ?? p?.title ?? "—")}</TableCell>
                                  <TableCell className="max-w-[200px]"><div className="flex flex-wrap gap-1">{skills.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : skills.slice(0, 4).map((s: any) => <Badge key={String(s)} variant="outline" className="text-[10px] rounded-full">{String(s)}</Badge>)}{skills.length > 4 && <Badge variant="outline" className="text-[10px] rounded-full">+{skills.length - 4}</Badge>}</div></TableCell>
                                  <TableCell><Badge variant="outline">{String(p?.scopeOfWork ?? p?.scope_of_work ?? "—")}</Badge></TableCell>
                                  <TableCell>{String(p?.locationType ?? p?.location_type ?? "—")}</TableCell>
                                  <TableCell>{p?.fullTimeOffer ?? p?.full_time_offer ? "Full-time" : "Internship"}</TableCell>
                                  <TableCell><StatusBadge status={status} /></TableCell>
                                  <TableCell className="text-muted-foreground">{createdAt}</TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {tab === "proposals" && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Candidate</TableHead><TableHead>Project</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Monthly</TableHead><TableHead>Duration</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {tabData.proposalList.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={FileCheck} title="No proposals" description="No proposals found for this company." /></TableCell></TableRow> :
                            tabData.proposalList.map((p: any, idx: number) => {
                              const offer = p?.offerDetails ?? {};
                              const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                              const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                              const currency = String(p?.currency ?? offer?.currency ?? "INR").toUpperCase();
                              const monthly = typeof offer?.monthlyAmount === "number" ? offer.monthlyAmount : 0;
                              const duration = String(offer?.duration ?? offer?.internshipDuration ?? "").trim();
                              const months = monthsFromDuration(duration);
                              const totalRaw = Number(offer?.totalPrice ?? offer?.total_price ?? 0);
                              const derivedTotal = Number.isFinite(monthly) ? Number(monthly) * months : 0;
                              const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : derivedTotal;
                              const monthlyInr = currency === "USD" ? convertToInrIfUsd(monthly, currency) : monthly;
                              const proposalType = hasFullTimeOffer ? "PPO" : "Internship";
                              const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
                              const createdAt = createdAtRaw ? (() => { const d = new Date(createdAtRaw); return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); })() : "—";
                              const internId = String(p?.internId ?? p?.intern_id ?? p?.intern?.id ?? "").trim();
                              const proposalId = String(p?.id ?? "").trim();
                              return (
                                <TableRow key={String(p?.id ?? Math.random())} className="group hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-medium">{String(p?.internName ?? p?.candidateName ?? "—")}</TableCell>
                                  <TableCell>{String(p?.projectName ?? "—")}</TableCell>
                                  <TableCell><Badge variant="outline">{proposalType}</Badge></TableCell>
                                  <TableCell><StatusBadge status={displayProposalStatus(p?.status)} /></TableCell>
                                  <TableCell className="font-medium text-emerald-600">{monthly ? formatMajorMoney(monthlyInr, currency === "USD" ? "INR" : currency) : "—"}</TableCell>
                                  <TableCell>{hasFullTimeOffer ? "Full-time" : duration || "—"}</TableCell>
                                  <TableCell className="text-muted-foreground">{createdAt}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" onClick={() => { if (!proposalId) return; setSelectedProposal(p); setProposalDialogOpen(true); }} disabled={!proposalId}><Eye className="h-3 w-3 mr-1" /> View</Button>
                                      <Button size="sm" variant="outline" onClick={() => { if (!internId) return; setLocation(`/admin/interns/${encodeURIComponent(internId)}`); }} disabled={!internId}>Profile</Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {tab === "interviews" && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Candidate</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Timezone</TableHead><TableHead>Meeting Link</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {tabData.interviewList.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={Clock} title="No interviews" description="No interviews scheduled for this company." /></TableCell></TableRow> :
                            tabData.interviewList.map((i: any, idx: number) => {
                              const createdAtRaw = i?.createdAt ?? i?.created_at ?? null;
                              const createdAt = createdAtRaw ? (() => { const d = new Date(createdAtRaw); return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); })() : "—";
                              const link = String(i?.meetingLink ?? "").trim();
                              const href = link ? toDisplayUrl(link) : "";
                              const notes = String(i?.notes ?? "");
                              const feedbackLine = notes.split("\n").map((l: string) => l.trim()).find((l: string) => l.toLowerCase().startsWith("feedback_text:"));
                              const feedbackText = String(feedbackLine ? feedbackLine.slice("feedback_text:".length).trim() : "");
                              return (
                                <TableRow key={String(i?.id ?? Math.random())} className="group hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-medium">{String(i?.internName ?? "—")}</TableCell>
                                  <TableCell>{String(i?.projectName ?? "—")}</TableCell>
                                  <TableCell><StatusBadge status={String(i?.status ?? "—")} /></TableCell>
                                  <TableCell className="text-muted-foreground">{String(i?.timezone ?? "—")}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link}</a> : link || "—"}</TableCell>
                                  <TableCell className="text-muted-foreground">{createdAt}</TableCell>
                                  <TableCell className="text-right"><Button size="sm" variant="outline" disabled={!feedbackText} onClick={() => { setSelectedInterviewFeedback(feedbackText); setFeedbackDialogOpen(true); }}><Eye className="h-3 w-3 mr-1" /> Feedback</Button></TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {tab === "payments" && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Order ID</TableHead><TableHead>Candidate</TableHead><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead><TableHead>Currency</TableHead><TableHead>Paid At</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {tabData.paymentList.length === 0 ? <TableRow><TableCell colSpan={9}><EmptyState icon={CreditCard} title="No payments" description="No payment records found for this company." /></TableCell></TableRow> :
                            tabData.paymentList.map((o: any, idx: number) => {
                              const orderId = String(o?.orderId ?? o?.order_id ?? "").trim();
                              const candidateName = String(o?.internName ?? "").trim();
                              const projectName = String(o?.projectName ?? "").trim();
                              const status = String(o?.status ?? "").trim().toLowerCase();
                              const amountMinor = Number(o?.amountMinor ?? o?.amount_minor ?? 0);
                              const cur = String(o?.currency ?? "INR").toUpperCase();
                              const paidAtRaw = o?.paidAt ?? o?.paid_at ?? null;
                              const createdAtRaw = o?.createdAt ?? o?.created_at ?? null;
                              return (
                                <TableRow key={String(o?.id ?? orderId ?? Math.random())} className="group hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-mono text-xs">{orderId || "—"}</TableCell>
                                  <TableCell className="font-medium">{candidateName || "—"}</TableCell>
                                  <TableCell>{projectName || "—"}</TableCell>
                                  <TableCell><StatusBadge status={status} /></TableCell>
                                  <TableCell className="font-medium">{formatAmount(amountMinor, cur)}</TableCell>
                                  <TableCell>{cur}</TableCell>
                                  <TableCell className="text-muted-foreground">{formatDate(paidAtRaw ? String(paidAtRaw) : null)}</TableCell>
                                  <TableCell className="text-muted-foreground">{formatDate(createdAtRaw ? String(createdAtRaw) : null)}</TableCell>
                                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => { setSelectedPayment(o); setPaymentDialogOpen(true); }}><Eye className="h-3 w-3 mr-1" /> View</Button></TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {tab === "upcomingPayments" && (
                    <Card className="border-0 shadow-md overflow-hidden">
                      <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-[#0E6049]/5 to-transparent">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#0E6049]/10 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-[#0E6049]" />
                            </div>
                            <div>
                              <h2 className="text-base sm:text-lg font-semibold">Payment Tracker</h2>
                              <p className="text-xs text-muted-foreground">
                                Track payments for all hired candidates
                              </p>
                            </div>
                          </div>
                          
                          {/* Stats Summary */}
                          <div className="flex flex-wrap gap-3">
                            {(() => {
                              const active = tabData.employerDuesList.filter((d: any) => {
                                const isCompleted = (d?.remainingMonths ?? 1) <= 0;
                                return !isCompleted;
                              }).length;
                              const completed = tabData.employerDuesList.length - active;
                              const totalDue = tabData.employerDuesList.reduce((sum: number, d: any) => sum + Number(d?.dueAmountMinor ?? 0), 0);
                              return (
                                <>
                                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="text-xs font-medium text-amber-700">{active} Active</span>
                                  </div>
                                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-700">{completed} Completed</span>
                                  </div>
                                  
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        {/* Filter Tabs */}
                        <div className="space-y-3 mb-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground mr-2">Status:</span>
                            {[
                              { key: "all", label: "All", count: tabData.employerDuesList.length },
                              { key: "active", label: "Active", count: tabData.employerDuesList.filter((d: any) => (d?.remainingMonths ?? 1) > 0).length, color: "amber" },
                              { key: "completed", label: "Completed", count: tabData.employerDuesList.filter((d: any) => (d?.remainingMonths ?? 1) <= 0).length, color: "emerald" },
                            ].map((filter) => (
                              <button
                                key={filter.key}
                                onClick={() => setTabStatus((prev) => ({ ...prev, upcomingPayments: filter.key === "all" ? "" : filter.key }))}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  (filter.key === "all" && !tabStatus.upcomingPayments) || tabStatus.upcomingPayments === filter.key
                                    ? filter.color === "amber" ? "bg-amber-100 text-amber-700 border border-amber-300"
                                    : filter.color === "emerald" ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                    : "bg-[#0E6049] text-white border border-[#0E6049]"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                                )}
                              >
                                {filter.label}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[10px]",
                                  (filter.key === "all" && !tabStatus.upcomingPayments) || tabStatus.upcomingPayments === filter.key
                                    ? filter.color === "amber" ? "bg-amber-200 text-amber-800"
                                    : filter.color === "emerald" ? "bg-emerald-200 text-emerald-800"
                                    : "bg-white/20"
                                    : "bg-background"
                                )}>
                                  {filter.count}
                                </span>
                              </button>
                            ))}
                          </div>
                          
                          {/* Currency Filter */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground mr-2">Currency:</span>
                            {[
                              { key: "all", label: "All", count: tabData.employerDuesList.length },
                              { key: "INR", label: "₹ INR", count: tabData.employerDuesList.filter((d: any) => String(d?.currency ?? "INR").toUpperCase() === "INR").length, color: "blue" },
                              { key: "USD", label: "$ USD", count: tabData.employerDuesList.filter((d: any) => String(d?.currency ?? "INR").toUpperCase() === "USD").length, color: "blue" },
                            ].map((filter) => (
                              <button
                                key={`currency-${filter.key}`}
                                onClick={() => setTabSearch((prev) => ({ ...prev, upcomingPayments: filter.key === "all" ? "" : filter.key }))}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                  tabSearch.upcomingPayments === filter.key
                                    ? filter.key === "INR" ? "bg-blue-100 text-blue-700 border border-blue-300"
                                    : filter.key === "USD" ? "bg-purple-100 text-purple-700 border border-purple-300"
                                    : "bg-[#0E6049] text-white border border-[#0E6049]"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                                )}
                              >
                                {filter.label}
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded-full text-[10px]",
                                  tabSearch.upcomingPayments === filter.key
                                    ? filter.key === "INR" ? "bg-blue-200 text-blue-800"
                                    : filter.key === "USD" ? "bg-purple-200 text-purple-800"
                                    : "bg-white/20"
                                    : "bg-background"
                                )}>
                                  {filter.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {tabData.employerDuesList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No payment records</h3>
                            <p className="text-sm text-muted-foreground mt-1">No hired candidates to track payments for.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {tabData.employerDuesList
                              .filter((d: any) => {
                                // Status filter
                                if (tabStatus.upcomingPayments && tabStatus.upcomingPayments !== "all") {
                                  const isCompleted = (d?.remainingMonths ?? 1) <= 0;
                                  if (tabStatus.upcomingPayments === "completed" && !isCompleted) return false;
                                  if (tabStatus.upcomingPayments === "active" && isCompleted) return false;
                                }
                                // Currency filter
                                if (tabSearch.upcomingPayments && tabSearch.upcomingPayments !== "all") {
                                  const currency = String(d?.currency ?? "INR").toUpperCase();
                                  if (currency !== tabSearch.upcomingPayments) return false;
                                }
                                return true;
                              })
                              .map((d: any, idx: number) => {
                                const candidateName = d?.internName ?? "—";
                                const projectName = d?.projectName ?? "—";
                                const startDate = d?.startDate ? formatDate(d.startDate) : "—";
                                const duration = d?.duration ?? "—";
                                const hasFullTime = String(duration).toLowerCase().includes("full-time") || String(duration).toLowerCase().includes("pp");
                                const upcomingPaymentDate = d?.upcomingPaymentDate ? formatDate(d.upcomingPaymentDate) : "—";
                                const currency = String(d?.currency ?? "INR").toUpperCase();
                                const upcomingPaymentMinor = Number(d?.monthlyAmountMinor ?? d?.monthlyAmount ?? 0);
                                const totalAmountMinor = Number(d?.totalAmountMinor ?? 0);
                                const dueAmountMinor = Number(d?.dueAmountMinor ?? 0);
                                const paidMonths = Number(d?.paidMonths ?? 0);
                                const totalMonths = Number(d?.totalMonths ?? 1);
                                const isCompleted = (d?.remainingMonths ?? 1) <= 0;
                                const progress = totalMonths > 0 ? Math.min(100, Math.round((paidMonths / totalMonths) * 100)) : 0;
                                
                                return (
                                  <div 
                                    key={String(d?.proposalId ?? idx)} 
                                    className={cn(
                                      "rounded-xl border overflow-hidden transition-all hover:shadow-md",
                                      isCompleted ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200"
                                    )}
                                  >
                                    {/* Card Header */}
                                    <div className={cn(
                                      "flex items-center justify-between p-4",
                                      isCompleted ? "bg-emerald-100/50" : "bg-slate-50/50"
                                    )}>
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                                          isCompleted ? "bg-emerald-200 text-emerald-700" : "bg-[#0E6049]/10 text-[#0E6049]"
                                        )}>
                                          {candidateName !== "—" ? candidateName.charAt(0).toUpperCase() : "?"}
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-semibold">{candidateName}</h4>
                                          <p className="text-xs text-muted-foreground">{projectName}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={hasFullTime ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                                          {hasFullTime ? "Full-time" : duration}
                                        </Badge>
                                        {isCompleted ? (
                                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Completed
                                          </Badge>
                                        ) : (
                                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Active
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="px-4 py-3 border-t border-slate-100">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-muted-foreground">Payment Progress</span>
                                        <span className="text-xs font-semibold">{paidMonths} / {totalMonths} months</span>
                                      </div>
                                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            isCompleted ? "bg-emerald-500" : "bg-[#0E6049]"
                                          )}
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-t border-slate-100">
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Start Date</p>
                                        <p className="text-sm font-medium">{startDate}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Next Payment</p>
                                        <p className={cn("text-sm font-medium", upcomingPaymentDate !== "—" ? "text-amber-600" : "")}>
                                          {upcomingPaymentDate !== "—" ? upcomingPaymentDate : "—"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Upcoming Amount</p>
                                        <p className={cn("text-sm font-semibold", upcomingPaymentMinor > 0 ? "text-amber-600" : "")}>
                                          {formatAmount(upcomingPaymentMinor, currency)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Amount</p>
                                        <p className="text-sm font-semibold">{formatAmount(totalAmountMinor, currency)}</p>
                                      </div>
                                    </div>

                                    {/* Due Amount Footer */}
                                    <div className={cn(
                                      "flex items-center justify-between px-4 py-3 border-t",
                                      isCompleted ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-100"
                                    )}>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">Due Amount:</span>
                                        <span className={cn(
                                          "text-sm font-bold",
                                          isCompleted ? "text-emerald-600" : dueAmountMinor > 0 ? "text-red-600" : "text-emerald-600"
                                        )}>
                                          {formatAmount(dueAmountMinor, currency)}
                                        </span>
                                      </div>
                                      {!isCompleted && dueAmountMinor > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {totalMonths - paidMonths} payment{totalMonths - paidMonths !== 1 ? "s" : ""} remaining
                                        </span>
                                      )}
                                      {isCompleted && (
                                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          All payments completed
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {tab === "hired" && (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead>Candidate</TableHead><TableHead>Project</TableHead><TableHead>Type</TableHead><TableHead>Monthly</TableHead><TableHead>Total</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {tabData.hiredList.length === 0 ? <TableRow><TableCell colSpan={6}><EmptyState icon={Users} title="No hires" description="No resources have been hired yet." /></TableCell></TableRow> :
                            tabData.hiredList.map((p: any, idx: number) => {
                              const offer = p?.offerDetails ?? {};
                              const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                              const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                              const monthly = typeof offer?.monthlyAmount === "number" ? offer.monthlyAmount : 0;
                              const total = typeof offer?.totalPrice === "number" ? offer.totalPrice : 0;
                              const internId = String(p?.internId ?? p?.intern_id ?? p?.intern?.id ?? "").trim();
                              return (
                                <TableRow key={String(p?.id ?? Math.random())} className="group hover:bg-muted/30 transition-colors">
                                  <TableCell className="font-medium">{String(p?.internName ?? "—")}</TableCell>
                                  <TableCell>{String(p?.projectName ?? "—")}</TableCell>
                                  <TableCell>{hasFullTimeOffer ? <Badge className="bg-emerald-100 text-emerald-700">Full-time</Badge> : <Badge variant="outline">Internship</Badge>}</TableCell>
                                  <TableCell className="font-medium text-emerald-600">{monthly ? formatMajorMoney(monthly, "INR") : "—"}</TableCell>
                                  <TableCell className="font-medium">{total ? formatMajorMoney(total, "INR") : "—"}</TableCell>
                                  <TableCell className="text-right"><Button size="sm" variant="outline" disabled={!internId} onClick={() => { if (!internId) return; setLocation(`/admin/interns/${encodeURIComponent(internId)}`); }}><Eye className="h-3 w-3 mr-1" /> Profile</Button></TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}

              {activeTab !== "profile" && pagination.total > 0 && (
                <div className="flex flex-col gap-4 border-t pt-4 mt-6 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">Showing <span className="font-medium">{pagination.startIndex + 1}</span> to <span className="font-medium">{pagination.endIndex}</span> of <span className="font-medium">{pagination.total}</span></p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setTabPage((prev) => ({ ...prev, [activeTab]: Math.max(1, prev[activeTab] - 1) }))} disabled={pagination.safePage <= 1}><ArrowLeft className="h-4 w-4" /></Button>
                    <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Page</span><span className="font-medium">{pagination.safePage}</span><span className="text-muted-foreground">of {pagination.totalPages}</span></div>
                    <Button size="sm" variant="outline" onClick={() => setTabPage((prev) => ({ ...prev, [activeTab]: Math.min(pagination.totalPages, prev[activeTab] + 1) }))} disabled={pagination.safePage >= pagination.totalPages}><ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </Card>

        {/* Proposal Dialog */}
        <Dialog open={proposalDialogOpen} onOpenChange={(open) => { setProposalDialogOpen(open); if (!open) setSelectedProposal(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl font-bold flex items-center gap-2"><FileCheck className="h-5 w-5 text-primary" /> Proposal Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              {(() => {
                const pr = selectedProposal ?? {};
                const offer = (pr as any)?.offerDetails ?? (pr as any)?.offer ?? {};
                const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                const internId = String((pr as any)?.internId ?? (pr as any)?.intern_id ?? "").trim();
                const currency = String((pr as any)?.currency ?? (offer as any)?.currency ?? "INR").toUpperCase();
                const monthly = Number((pr as any)?.monthlyAmount ?? (offer as any)?.monthlyAmount ?? 0);
                const duration = String((pr as any)?.duration ?? (offer as any)?.duration ?? "").trim();
                const months = monthsFromDuration(duration);
                const totalRaw = Number((pr as any)?.totalPrice ?? (offer as any)?.totalPrice ?? 0);
                const derivedTotal = Number.isFinite(monthly) ? monthly * months : 0;
                const total = Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : derivedTotal;
                const displayCurrency = currency === "USD" ? "INR" : currency;
                const monthlyDisplay = currency === "USD" ? convertToInrIfUsd(monthly, currency) : monthly;
                const totalDisplay = currency === "USD" ? convertToInrIfUsd(total, currency) : total;
                const candidateName = String((pr as any)?.internName ?? (pr as any)?.candidateName ?? "—").trim() || "—";
                const projectName = String((pr as any)?.projectName ?? "—").trim() || "—";
                const workMode = String((offer as any)?.workMode ?? (offer as any)?.mode ?? "—").trim();
                const startDateRaw = String((offer as any)?.startDate ?? (pr as any)?.startDate ?? "").trim();
                const startDate = startDateRaw ? formatDate(startDateRaw) : "—";
                const shiftFrom = String((offer as any)?.shiftFrom ?? "").trim();
                const shiftTo = String((offer as any)?.shiftTo ?? "").trim();
                const shiftTimings = shiftFrom && shiftTo ? `${shiftFrom} - ${shiftTo}` : (shiftFrom || shiftTo || "—");
                const paidLeavesPerMonth = String((offer as any)?.paidLeavesPerMonth ?? (offer as any)?.leavePerMonth ?? "—").trim();
                const laptop = String((offer as any)?.laptop ?? (offer as any)?.laptopProvided ?? "—").trim();
                const jd = String((offer as any)?.jd ?? (offer as any)?.jobDescription ?? "").trim();
                const createdAtRaw = pr?.createdAt ?? pr?.created_at ?? null;
                const createdAt = createdAtRaw ? formatDate(String(createdAtRaw)) : "—";
                const statusBadgeClass = (() => { const s = String((pr as any)?.status ?? "").toLowerCase(); if (s === "hired" || s === "accepted") return "bg-emerald-500"; if (s === "rejected") return "bg-red-500"; if (s === "expired" || s === "withdrawn") return "bg-amber-500"; return "bg-blue-500"; })();
                return (
                  <div className="space-y-4 px-1">
                    <div className="rounded-xl border bg-gradient-to-r from-slate-50 to-blue-50 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3"><Badge className={hasFullTimeOffer ? "bg-purple-500" : "bg-blue-500"}>{hasFullTimeOffer ? "Full-Time" : "Internship"}</Badge><Badge className={statusBadgeClass}>{displayProposalStatus((pr as any)?.status)}</Badge></div>
                          <h3 className="text-xl font-bold">{projectName || "Untitled Proposal"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{candidateName} • {workMode || "Not specified"}</p>
                        </div>
                        {!hasFullTimeOffer && monthlyDisplay > 0 && <div className="text-right bg-white rounded-lg px-4 py-2 shadow-sm"><p className="text-2xl font-bold text-emerald-600">{formatMajorMoney(monthlyDisplay, displayCurrency)}</p><p className="text-xs text-muted-foreground">per month</p></div>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Candidate</p><p className="font-semibold truncate">{candidateName}</p></Card>
                      <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Project</p><p className="font-semibold truncate">{projectName}</p></Card>
                      <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Start Date</p><p className="font-semibold">{startDate}</p></Card>
                      <Card className="p-4"><p className="text-xs text-muted-foreground mb-1">Duration</p><p className="font-semibold">{hasFullTimeOffer ? "Full-time" : (duration || "—")}</p></Card>
                    </div>
                    {!hasFullTimeOffer && (
                      <Card className="p-5">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><span className="w-2 h-5 bg-blue-500 rounded-full"></span>Work Details</h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {[{ label: "Shift Timings", value: shiftTimings }, { label: "Paid Leaves / Month", value: paidLeavesPerMonth }, { label: "Work Mode", value: workMode || "—" }, { label: "Location", value: String((offer as any)?.location ?? "—") }].map((item) => <div key={item.label} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"><span className="text-sm text-muted-foreground">{item.label}</span><span className="font-medium">{item.value}</span></div>)}
                          <div className="flex justify-between items-center py-2"><span className="text-sm text-muted-foreground">Laptop</span><Badge className={laptop.toLowerCase() === "yes" || laptop.toLowerCase() === "provided" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>{laptop}</Badge></div>
                        </div>
                      </Card>
                    )}
                    {!hasFullTimeOffer && monthlyDisplay > 0 && (
                      <Card className="p-5 border-emerald-200 bg-emerald-50/50">
                        <h4 className="font-bold mb-4 flex items-center gap-2"><span className="w-2 h-5 bg-emerald-500 rounded-full"></span>Compensation</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Monthly</span><span className="font-bold text-emerald-600 text-lg">{formatMajorMoney(monthlyDisplay, displayCurrency)}</span></div>
                          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-bold text-lg">{formatMajorMoney(totalDisplay, displayCurrency)}</span></div>
                        </div>
                      </Card>
                    )}
                    {jd && <Card className="p-5"><h4 className="font-bold mb-3">Job Description</h4><div className="text-sm text-muted-foreground [&>p]:mb-3" dangerouslySetInnerHTML={{ __html: jd }} /></Card>}
                    <div className="flex items-center justify-between pt-4 border-t bg-slate-50 -mx-1 px-4 py-3 rounded-b-xl">
                      <div className="text-sm text-muted-foreground"><span className="font-medium">Created:</span> {createdAt}</div>
                      <Button disabled={!internId} onClick={() => { if (!internId) return; setLocation(`/admin/interns/${encodeURIComponent(internId)}`); }}><User className="h-4 w-4 mr-2" /> View Candidate</Button>
                    </div>
                  </div>
                );
              })()}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={(open) => { setFeedbackDialogOpen(open); if (!open) setSelectedInterviewFeedback(""); }}>
          <DialogContent className="max-w-[600px]">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Interview Feedback</DialogTitle></DialogHeader>
            <ScrollArea className="h-[40vh] w-full rounded-lg border bg-muted/10 p-4"><pre className="whitespace-pre-wrap break-words text-sm leading-relaxed">{selectedInterviewFeedback || "—"}</pre></ScrollArea>
            <DialogFooter><Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={(open) => { setPaymentDialogOpen(open); if (!open) setSelectedPayment(null); }}>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0E6049] to-[#0d7a5f] p-6 pb-20">
              <DialogHeader className="text-white">
                <DialogTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5" /> Payment Details</DialogTitle>
              </DialogHeader>
            </div>
            <ScrollArea className="max-h-[60vh]">
              {(() => {
                const p = selectedPayment ?? {};
                const raw = (p as any)?.raw ?? {};
                const order = raw?.order ?? (p as any)?.order ?? {};
                const orderId = String(p?.orderId ?? p?.order_id ?? order?.id ?? "—") || "—";
                const status = String(p?.status ?? order?.status ?? "—") || "—";
                const cur = String(p?.currency ?? order?.currency ?? "INR").toUpperCase();
                const amountMinor = Number(p?.amountMinor ?? p?.amount_minor ?? order?.amount ?? 0);
                const paidAtRaw = p?.paidAt ?? p?.paid_at ?? null;
                const createdAtRaw = p?.createdAt ?? p?.created_at ?? order?.created_at ?? null;
                const internName = String(p?.internName ?? "—").trim() || "—";
                const projectName = String(p?.projectName ?? "—").trim() || "—";
                const description = String(p?.description ?? raw?.description ?? "—").trim() || "—";
                return (
                  <div className="p-6 -mt-12 space-y-5">
                    <div className="bg-background rounded-xl border shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Amount</p>
                          <p className={`text-3xl font-bold ${status === "paid" ? "text-emerald-600" : status === "pending" ? "text-amber-600" : "text-red-600"}`}>
                            {formatAmount(amountMinor, cur)}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Order ID</p>
                        <p className="font-mono text-sm bg-muted/50 px-2 py-1.5 rounded-lg break-all">{orderId}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Currency</p>
                        <p className="text-sm font-medium">{cur}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Candidate</p>
                        <p className="text-sm font-medium">{internName}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Project</p>
                        <p className="text-sm font-medium truncate">{projectName}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Created Date</p>
                        <p className="text-sm font-medium">{formatDate(createdAtRaw ? String(createdAtRaw) : null)}</p>
                      </Card>
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Paid Date</p>
                        <p className="text-sm font-medium">{formatDate(paidAtRaw ? String(paidAtRaw) : null)}</p>
                      </Card>
                    </div>

                    {description && description !== "—" && (
                      <Card className="p-4">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                        <p className="text-sm">{description}</p>
                      </Card>
                    )}

                  
                  </div>
                );
              })()}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
