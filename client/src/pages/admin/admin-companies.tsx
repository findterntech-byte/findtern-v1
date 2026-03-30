import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Columns,
  EyeOff,
  Filter,
  Globe,
  Loader2,
  MoreVertical,
  Phone,
  Plus,
  Search,
  TrendingUp,
  Users,
  X,
  DollarSign,
  Calendar,
  Mail,
  MapPin,
  Briefcase,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

type Company = {
  id: string;
  companyName: string;
  email: string;
  country: string;
  city: string;
  spocName: string;
  phone: string;
  createdAt: string;
  activeInternships: number;
  lastPaymentAt: string | null;
  upcomingPaymentAt: string | null;
  upcomingPaymentAmountMinor: number | null;
  upcomingPaymentCurrency: string | null;
  totalBilledAmountMinor: number;
  totalPaidAmountMinor: number;
  totalRemainingAmountMinor: number;
  proposalsTotal: number;
  proposalsSent: number;
  proposalsAccepted: number;
  proposalsRejected: number;
  proposalsExpired: number;
  proposalsHired: number;
  totalHires: number;
  internationalFteStatus: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  projectCities: string[];
  projectLocationTypes: string[];
};

type ColumnKey =
  | "sno"
  | "companyName"
  | "email"
  | "country"
  | "city"
  | "projectCity"
  | "projectLocation"
  | "spocName"
  | "phone"
  | "createdAt"
  | "activeInternships"
  | "lastPaymentAt"
  | "totalBilledAmount"
  | "totalPaidAmount"
  | "totalRemainingAmount"
  | "upcomingPaymentAmount"
  | "upcomingPaymentAt"
  | "proposalsTotal"
  | "proposalsSent"
  | "proposalsAccepted"
  | "proposalsRejected"
  | "proposalsExpired"
  | "totalHires"
  | "internationalFte"
  | "actions"
  | "status";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  variant?: "default" | "success" | "warning" | "muted";
}

function StatCard({ title, value, subtitle, icon, trend, className, variant = "default" }: StatCardProps) {
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
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-rose-600")}>
              <TrendingUp className={cn("h-3 w-3", !trend.positive && "rotate-180")} />
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
          {icon}
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
    </Card>
  );
}

function StatusBadge({ status }: { status: "active" | "pending" | "deactivated" | "none" }) {
  const config = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
    deactivated: { label: "Deactivated", className: "bg-slate-100 text-slate-600 border-slate-200" },
    none: { label: "None", className: "bg-slate-100 text-slate-500 border-slate-200" },
  };

  return (
    <Badge className={cn("font-medium border", config[status].className)}>
      {status === "active" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {status === "pending" && <Clock className="h-3 w-3 mr-1" />}
      {status === "deactivated" && <AlertCircle className="h-3 w-3 mr-1" />}
      {config[status].label}
    </Badge>
  );
}

function InternationalFteBadge({ status }: { status: string }) {
  const s = String(status ?? "none").trim().toLowerCase();
  if (s === "approved") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
  }
  if (s === "applied") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Applied</Badge>;
  }
  return <Badge variant="outline" className="text-slate-500">—</Badge>;
}

export default function AdminCompaniesPage() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "companyName" | "email" | "phone" | "activeInternships" | "lastPaymentAt" | "upcomingPaymentAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<5 | 10 | 25 | 50>(10);
  const [profileStatus, setProfileStatus] = useState<"all" | "complete" | "incomplete">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [actionCompanyId, setActionCompanyId] = useState<string>("");
  const [ifteOpen, setIfteOpen] = useState(false);
  const [ifteCompanyId, setIfteCompanyId] = useState<string>("");

  const columns = useMemo(
    () =>
      [
        { key: "sno" as const, label: "S.No" },
        { key: "companyName" as const, label: "Company name", sortKey: "companyName" as const, filterKey: "companyName" as const },
        { key: "email" as const, label: "Company email", sortKey: "email" as const, filterKey: "email" as const },
        { key: "country" as const, label: "Country", filterKey: "country" as const },
        { key: "city" as const, label: "Company City", filterKey: "city" as const },
        { key: "projectCity" as const, label: "Project City" },
        { key: "projectLocation" as const, label: "Work Location" },
        { key: "spocName" as const, label: "FPOC Name", filterKey: "spocName" as const },
        { key: "phone" as const, label: "Phone", sortKey: "phone" as const, filterKey: "phone" as const },
        { key: "createdAt" as const, label: "Created on", sortKey: "createdAt" as const },
        { key: "activeInternships" as const, label: "Active Projects", sortKey: "activeInternships" as const },
        { key: "lastPaymentAt" as const, label: "Last payment date", sortKey: "lastPaymentAt" as const },
        { key: "totalBilledAmount" as const, label: "Total Amount" },
        { key: "totalPaidAmount" as const, label: "Paid till now" },
        { key: "totalRemainingAmount" as const, label: "Remaining" },
        { key: "upcomingPaymentAmount" as const, label: "Upcoming Payment" },
        { key: "upcomingPaymentAt" as const, label: "Upcoming Payment date", sortKey: "upcomingPaymentAt" as const },
        { key: "proposalsTotal" as const, label: "Total proposals" },
        { key: "proposalsSent" as const, label: "Proposals sent" },
        { key: "proposalsAccepted" as const, label: "Accepted" },
        { key: "proposalsRejected" as const, label: "Rejected" },
        { key: "proposalsExpired" as const, label: "Withdrawn" },
        { key: "totalHires" as const, label: "Hires" },
        { key: "internationalFte" as const, label: "International FTE" },
        { key: "actions" as const, label: "Action" },
        { key: "status" as const, label: "Status" },
      ] as const,
    [],
  );

  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(() =>
    columns.reduce((acc, c) => {
      acc[c.key] = true;
      return acc;
    }, {} as Record<ColumnKey, boolean>),
  );

  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [openFilterFor, setOpenFilterFor] = useState<ColumnKey | null>(null);
  const [filterDraft, setFilterDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiRequest("GET", `/api/admin/employers?profileStatus=${profileStatus}`);
        const json = await res.json();
        const list = (json?.employers ?? []) as any[];

        const mapped: Company[] = list.map((e) => {
          const createdAtRaw = e?.createdAt ?? null;
          const createdAt = createdAtRaw
            ? (() => {
                const d = new Date(createdAtRaw);
                return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
              })()
            : "-";

          const lastPaymentAtRaw = e?.lastPaymentAt ?? null;
          const lastPaymentAt = lastPaymentAtRaw ? String(lastPaymentAtRaw) : null;

          const upcomingPaymentAtRaw = e?.upcomingPaymentAt ?? null;
          const upcomingPaymentAt = upcomingPaymentAtRaw ? String(upcomingPaymentAtRaw) : null;
          const upcomingPaymentAmountMinorRaw = e?.upcomingPaymentAmountMinor ?? null;
          const upcomingPaymentAmountMinor =
            typeof upcomingPaymentAmountMinorRaw === "number" && Number.isFinite(upcomingPaymentAmountMinorRaw)
              ? upcomingPaymentAmountMinorRaw
              : null;
          const upcomingPaymentCurrency = e?.upcomingPaymentCurrency ? String(e.upcomingPaymentCurrency) : null;

          const phone = [String(e?.countryCode ?? ""), String(e?.phoneNumber ?? "")].filter(Boolean).join(" ") || "-";

          return {
            id: String(e?.id ?? ""),
            companyName: String(e?.companyName ?? e?.name ?? "Company"),
            email: String(e?.companyEmail ?? "-"),
            country: String(e?.country ?? "-") || "-",
            city: String(e?.city ?? "-") || "-",
            spocName: String(e?.primaryContactName ?? e?.name ?? "-") || "-",
            phone,
            createdAt,
            activeInternships: Number(e?.activeInternships ?? 0) || 0,
            lastPaymentAt,
            upcomingPaymentAt,
            upcomingPaymentAmountMinor,
            upcomingPaymentCurrency,
            totalBilledAmountMinor: Number(e?.totalBilledAmountMinor ?? 0) || 0,
            totalPaidAmountMinor: Number(e?.totalPaidAmountMinor ?? 0) || 0,
            totalRemainingAmountMinor: Number(e?.totalRemainingAmountMinor ?? 0) || 0,
            proposalsTotal: Number(e?.proposalsTotal ?? 0) || 0,
            proposalsSent: Number(e?.proposalsSent ?? 0) || 0,
            proposalsAccepted: Number(e?.proposalsAccepted ?? 0) || 0,
            proposalsRejected: Number(e?.proposalsRejected ?? 0) || 0,
            proposalsExpired: Number(e?.proposalsExpired ?? 0) || 0,
            proposalsHired: Number(e?.proposalsHired ?? 0) || 0,
            totalHires: Number(e?.totalHires ?? 0) || 0,
            internationalFteStatus: String(e?.internationalFteStatus ?? "none"),
            isActive: Boolean(e?.isActive ?? true),
            onboardingCompleted: Boolean(e?.onboardingCompleted ?? false),
            projectCities: Array.isArray(e?.projectCities) ? e.projectCities : [],
            projectLocationTypes: Array.isArray(e?.projectLocationTypes) ? e.projectLocationTypes : [],
          };
        });

        setCompanies(mapped);
      } catch (e) {
        console.error("Failed to load employers", e);
        setError("Failed to load companies");
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profileStatus]);

  const formatDate = (raw: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatAmount = (amountMinor: number | null, currencyCode: string | null) => {
    if (amountMinor === null || amountMinor === undefined) return "—";
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(major || 0);
  };

  const formatAmountMajor = (amountMinor: number) => {
    const cur = "INR";
    const locale = "en-IN";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(major || 0);
  };

  const toggleActive = async (companyId: string, nextIsActive: boolean) => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    try {
      setActionCompanyId(id);
      await apiRequest("POST", `/api/admin/employers/${encodeURIComponent(id)}/toggle-active`, { isActive: nextIsActive });
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: nextIsActive } : c)));
    } catch (e) {
      console.error("Failed to toggle company active", e);
      setError("Failed to update company status");
    } finally {
      setActionCompanyId("");
    }
  };

  const updateInternationalFteStatus = async (companyId: string, nextStatus: "none" | "applied" | "approved") => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    try {
      setActionCompanyId(id);
      const res = await apiRequest("POST", `/api/admin/employers/${encodeURIComponent(id)}/international-fte/status`, { status: nextStatus });
      const json = await res.json().catch(() => null);
      const status = String(json?.employer?.internationalFteStatus ?? nextStatus);
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, internationalFteStatus: status } : c)));
    } catch (e) {
      console.error("Failed to update International FTE status", e);
      setError("Failed to update International FTE status");
    } finally {
      setActionCompanyId("");
    }
  };

  const approveInternationalFte = async (companyId: string) => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    try {
      setActionCompanyId(id);
      const res = await apiRequest("POST", `/api/admin/employers/${encodeURIComponent(id)}/international-fte/approve`, {});
      const json = await res.json().catch(() => null);
      const status = String(json?.employer?.internationalFteStatus ?? "approved");
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, internationalFteStatus: status } : c)));
      setIfteOpen(false);
      setIfteCompanyId("");
    } catch (e) {
      console.error("Failed to approve International FTE", e);
      setError("Failed to approve International FTE");
    } finally {
      setActionCompanyId("");
    }
  };

  const rows = useMemo(() => companies, [companies]);

  const overview = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((c) => c.isActive && c.onboardingCompleted).length;
    const pending = rows.filter((c) => c.isActive && !c.onboardingCompleted).length;
    const deactivated = rows.filter((c) => !c.isActive).length;
    const totalRevenue = rows.reduce((sum, c) => sum + c.totalPaidAmountMinor, 0);
    const totalPending = rows.reduce((sum, c) => sum + c.totalRemainingAmountMinor, 0);

    return { total, active, pending, deactivated, onboardingCompleted: active, onboardingPending: pending, totalRevenue, totalPending };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((company) => {
      const cfName = String(columnFilters.companyName ?? "").trim().toLowerCase();
      if (cfName && !String(company.companyName ?? "").toLowerCase().includes(cfName)) return false;

      const cfEmail = String(columnFilters.email ?? "").trim().toLowerCase();
      if (cfEmail && !String(company.email ?? "").toLowerCase().includes(cfEmail)) return false;

      const cfCountry = String(columnFilters.country ?? "").trim().toLowerCase();
      if (cfCountry && !String(company.country ?? "").toLowerCase().includes(cfCountry)) return false;

      const cfSpoc = String(columnFilters.spocName ?? "").trim().toLowerCase();
      if (cfSpoc && !String(company.spocName ?? "").toLowerCase().includes(cfSpoc)) return false;

      const cfPhone = String(columnFilters.phone ?? "").trim().toLowerCase();
      if (cfPhone && !String(company.phone ?? "").toLowerCase().includes(cfPhone)) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      const haystack = `${company.companyName} ${company.email} ${company.country} ${company.spocName} ${company.phone}`.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      return tokens.every((t) => haystack.includes(t));
    });
  }, [rows, columnFilters, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const cmpText = (x: unknown, y: unknown) => {
      const ax = String(x ?? "").toLowerCase();
      const by = String(y ?? "").toLowerCase();
      return ax.localeCompare(by);
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === "companyName") return cmpText(a.companyName, b.companyName) * dir;
      if (sortBy === "email") return cmpText(a.email, b.email) * dir;
      if (sortBy === "phone") return cmpText(a.phone, b.phone) * dir;
      if (sortBy === "activeInternships") return (Number(a.activeInternships ?? 0) - Number(b.activeInternships ?? 0)) * dir;
      if (sortBy === "lastPaymentAt") {
        const aT = a.lastPaymentAt ? new Date(a.lastPaymentAt).getTime() : 0;
        const bT = b.lastPaymentAt ? new Date(b.lastPaymentAt).getTime() : 0;
        return (aT - bT) * dir;
      }
      if (sortBy === "upcomingPaymentAt") {
        const aT = a.upcomingPaymentAt ? new Date(a.upcomingPaymentAt).getTime() : Number.POSITIVE_INFINITY;
        const bT = b.upcomingPaymentAt ? new Date(b.upcomingPaymentAt).getTime() : Number.POSITIVE_INFINITY;
        return (aT - bT) * dir;
      }

      const aT = a.createdAt && a.createdAt !== "-" ? new Date(a.createdAt).getTime() : 0;
      const bT = b.createdAt && b.createdAt !== "-" ? new Date(b.createdAt).getTime() : 0;
      return (aT - bT) * dir;
    });
  }, [filtered, sortBy, sortDir]);

  useEffect(() => { setPage(1); }, [search, pageSize, sortBy, sortDir, columnFilters]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginated = sorted.slice(startIndex, endIndex);

  const ColumnHeader = ({ col }: { col: (typeof columns)[number] }) => {
    const isSortable = Boolean((col as any).sortKey);
    const sortKey = (col as any).sortKey as typeof sortBy | undefined;
    const isFiltered = Boolean(String((columnFilters as any)[col.key] ?? "").trim());

    const onSort = (dir: "asc" | "desc") => {
      if (!sortKey) return;
      setSortBy(sortKey);
      setSortDir(dir);
    };

    const openFilter = () => {
      if (!(col as any).filterKey) return;
      setOpenFilterFor(col.key);
      setFilterDraft(String((columnFilters as any)[col.key] ?? ""));
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn("flex items-center gap-1.5 transition-colors", isFiltered && "text-primary")}>
            <span className="truncate">{col.label}</span>
            {isFiltered && <span className="h-2 w-2 rounded-full bg-primary" />}
            <MoreVertical className="h-4 w-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-xs">{col.label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={!isSortable} onClick={() => onSort("asc")}>
              <ArrowUp className="h-4 w-4" /> Sort Ascending
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!isSortable} onClick={() => onSort("desc")}>
              <ArrowDown className="h-4 w-4" /> Sort Descending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!(col as any).filterKey} onClick={openFilter}>
              <Filter className="h-4 w-4" /> {isFiltered ? "Edit Filter" : "Add Filter"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setColumnVisibility((prev) => ({ ...prev, [col.key]: false }))} disabled={col.key === "actions"}>
              <EyeOff className="h-4 w-4" /> Hide Column
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger><Columns className="h-4 w-4" /> Manage Columns</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {columns.filter((c) => c.key !== "actions").map((c) => (
                  <DropdownMenuCheckboxItem key={c.key} checked={Boolean(columnVisibility[c.key])} onCheckedChange={(checked) => setColumnVisibility((prev) => ({ ...prev, [c.key]: Boolean(checked) }))}>
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <AdminLayout title="Companies" description="Manage companies, view their details, and see associated interns.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Companies"
            value={overview.total}
            icon={<Building2 className="h-5 w-5" />}
            subtitle={`${overview.active} active`}
            variant="default"
          />
          <StatCard
            title="Onboarding Complete"
            value={overview.onboardingCompleted}
            icon={<UserCheck className="h-5 w-5" />}
            subtitle={`${overview.onboardingPending} pending`}
            variant="success"
          />
          <StatCard
            title="Pending Onboarding"
            value={overview.onboardingPending}
            icon={<Clock className="h-5 w-5" />}
            subtitle="Awaiting completion"
            variant="warning"
          />
          <StatCard
            title="Total Revenue"
            value={formatAmountMajor(overview.totalRevenue)}
            icon={<DollarSign className="h-5 w-5" />}
            subtitle={`${formatAmountMajor(overview.totalPending)} pending`}
            variant="default"
          />
        </div>

        <Card className="border shadow-sm">
          <div className="flex flex-col gap-4 border-b bg-muted/30 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Company Directory</h2>
                <p className="text-sm text-muted-foreground">{total} companies found</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-[320px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search companies, emails, contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-11 pr-10 bg-white"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Select value={profileStatus} onValueChange={(v) => setProfileStatus(v as any)}>
                <SelectTrigger className="h-11 w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="Profile status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Profiles</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as any); if (v === "upcomingPaymentAt") setSortDir("asc"); }}>
                <SelectTrigger className="h-11 w-full sm:w-[160px] bg-white">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="companyName">Company Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="activeInternships">Projects</SelectItem>
                  <SelectItem value="lastPaymentAt">Last Payment</SelectItem>
                  <SelectItem value="upcomingPaymentAt">Upcoming Payment</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" className="h-11 w-11" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
                {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading companies...</p>
                </div>
              </div>
            )}

            <div className="overflow-auto">
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {columnVisibility.sno && (
                      <TableHead className="w-[60px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[0]} />
                      </TableHead>
                    )}
                    {columnVisibility.companyName && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[1]} />
                      </TableHead>
                    )}
                    {columnVisibility.email && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[2]} />
                      </TableHead>
                    )}
                    {columnVisibility.country && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[3]} />
                      </TableHead>
                    )}
                    {columnVisibility.city && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[4]} />
                      </TableHead>
                    )}
                    {columnVisibility.projectCity && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[5]} />
                      </TableHead>
                    )}
                    {columnVisibility.projectLocation && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[6]} />
                      </TableHead>
                    )}
                    {columnVisibility.spocName && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[7]} />
                      </TableHead>
                    )}
                    {columnVisibility.phone && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[8]} />
                      </TableHead>
                    )}
                    {columnVisibility.createdAt && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[9]} />
                      </TableHead>
                    )}
                    {columnVisibility.activeInternships && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[10]} />
                      </TableHead>
                    )}
                    {columnVisibility.lastPaymentAt && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[11]} />
                      </TableHead>
                    )}
                    {columnVisibility.totalBilledAmount && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[12]} />
                      </TableHead>
                    )}
                    {columnVisibility.totalPaidAmount && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[13]} />
                      </TableHead>
                    )}
                    {columnVisibility.totalRemainingAmount && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[14]} />
                      </TableHead>
                    )}
                    {columnVisibility.upcomingPaymentAmount && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[15]} />
                      </TableHead>
                    )}
                    {columnVisibility.upcomingPaymentAt && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[16]} />
                      </TableHead>
                    )}
                    {columnVisibility.proposalsTotal && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[17]} />
                      </TableHead>
                    )}
                    {columnVisibility.proposalsSent && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[18]} />
                      </TableHead>
                    )}
                    {columnVisibility.proposalsAccepted && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[19]} />
                      </TableHead>
                    )}
                    {columnVisibility.proposalsRejected && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[20]} />
                      </TableHead>
                    )}
                    {columnVisibility.proposalsExpired && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[21]} />
                      </TableHead>
                    )}
                    {columnVisibility.totalHires && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[22]} />
                      </TableHead>
                    )}
                    {columnVisibility.internationalFte && (
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[23]} />
                      </TableHead>
                    )}
                    {columnVisibility.actions && (
                      <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[24]} />
                      </TableHead>
                    )}
                    {columnVisibility.status && (
                      <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ColumnHeader col={columns[25]} />
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {error ? (
                    <TableRow>
                      <TableCell colSpan={24} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle className="h-8 w-8 text-rose-500" />
                          <p className="font-medium text-rose-600">{error}</p>
                          <p className="text-sm text-muted-foreground">Unable to load companies. Please try again.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={24} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">No companies found</p>
                            <p className="text-sm text-muted-foreground">
                              {search ? `No results for "${search}"` : "Get started by adding your first company"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((company, index) => (
                      <TableRow
                        key={company.id || String(startIndex + index)}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        {columnVisibility.sno && (
                          <TableCell className="font-mono text-sm text-muted-foreground">{startIndex + index + 1}</TableCell>
                        )}
                        {columnVisibility.companyName && (
                          <TableCell>
                            <button
                              onClick={() => setLocation(`/admin/companies/${company.id}`)}
                              className="flex items-center gap-3 hover:text-primary transition-colors text-left"
                            >
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                                {company.companyName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium underline-offset-2 hover:underline">{company.companyName}</span>
                            </button>
                          </TableCell>
                        )}
                        {columnVisibility.email && (
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate max-w-[180px]">{company.email}</span>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.country && (
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                              {company.country}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.city && (
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {company.city}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.projectCity && (
                          <TableCell>
                            <div className="text-sm">
                              {company.projectCities.length > 0 ? company.projectCities.join(", ") : "—"}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.projectLocation && (
                          <TableCell>
                            <div className="text-sm">
                              {company.projectLocationTypes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {company.projectLocationTypes.map((loc) => (
                                    <Badge key={loc} variant="outline" className="text-[10px] capitalize">
                                      {loc}
                                    </Badge>
                                  ))}
                                </div>
                              ) : "—"}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.spocName && (
                          <TableCell className="text-sm">{company.spocName}</TableCell>
                        )}
                        {columnVisibility.phone && (
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {company.phone}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.createdAt && (
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {company.createdAt}
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.activeInternships && (
                          <TableCell>
                            <Badge variant="outline" className="font-medium">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {company.activeInternships}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.lastPaymentAt && (
                          <TableCell className="text-sm text-muted-foreground">{formatDate(company.lastPaymentAt)}</TableCell>
                        )}
                        {columnVisibility.totalBilledAmount && (
                          <TableCell className="font-medium">{formatAmountMajor(company.totalBilledAmountMinor)}</TableCell>
                        )}
                        {columnVisibility.totalPaidAmount && (
                          <TableCell className="text-emerald-600 font-medium">{formatAmountMajor(company.totalPaidAmountMinor)}</TableCell>
                        )}
                        {columnVisibility.totalRemainingAmount && (
                          <TableCell className={company.totalRemainingAmountMinor > 0 ? "text-amber-600" : ""}>
                            {formatAmountMajor(company.totalRemainingAmountMinor)}
                          </TableCell>
                        )}
                        {columnVisibility.upcomingPaymentAmount && (
                          <TableCell>
                            {company.upcomingPaymentAmountMinor ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-medium">
                                {formatAmount(company.upcomingPaymentAmountMinor, company.upcomingPaymentCurrency)}
                              </Badge>
                            ) : "—"}
                          </TableCell>
                        )}
                        {columnVisibility.upcomingPaymentAt && (
                          <TableCell className="text-sm text-muted-foreground">{formatDate(company.upcomingPaymentAt)}</TableCell>
                        )}
                        {columnVisibility.proposalsTotal && (
                          <TableCell className="text-sm">{company.proposalsTotal}</TableCell>
                        )}
                        {columnVisibility.proposalsSent && (
                          <TableCell className="text-sm">{company.proposalsSent}</TableCell>
                        )}
                        {columnVisibility.proposalsAccepted && (
                          <TableCell>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">
                              {company.proposalsAccepted}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.proposalsRejected && (
                          <TableCell>
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 font-medium">
                              {company.proposalsRejected}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.proposalsExpired && (
                          <TableCell className="text-sm text-muted-foreground">{company.proposalsExpired}</TableCell>
                        )}
                        {columnVisibility.totalHires && (
                          <TableCell>
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-medium">
                              <Users className="h-3 w-3 mr-1" />
                              {company.totalHires}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.internationalFte && (
                          <TableCell><InternationalFteBadge status={company.internationalFteStatus} /></TableCell>
                        )}
                        {columnVisibility.actions && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => setLocation(`/admin/companies/${company.id}`)}
                              >
                                View <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => void updateInternationalFteStatus(company.id, company.internationalFteStatus === "approved" ? "none" : "approved")}>
                                    <Globe className="h-4 w-4 mr-2" />
                                    {company.internationalFteStatus === "approved" ? "Remove FTE Status" : "Set FTE Approved"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => void toggleActive(company.id, !company.isActive)}
                                    className={company.isActive ? "text-rose-600" : "text-emerald-600"}
                                  >
                                    {company.isActive ? (
                                      <>
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Deactivate Company
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Activate Company
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        )}
                        {columnVisibility.status && (
                          <TableCell>
                            <StatusBadge
                              status={
                                !company.isActive ? "deactivated" :
                                company.onboardingCompleted ? "active" : "pending"
                              }
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && !error && sorted.length > 0 && (
              <div className="flex flex-col gap-4 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                  <span className="font-medium">{endIndex}</span> of{" "}
                  <span className="font-medium">{total}</span> companies
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}>
                    <SelectTrigger className="h-9 w-full sm:w-[130px]">
                      <SelectValue placeholder="Rows per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 / page</SelectItem>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setPage(1)} disabled={safePage <= 1}>
                      First
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
                      <ArrowUp className="h-4 w-4 rotate-90" />
                    </Button>
                    <div className="flex items-center gap-2 px-2 text-sm">
                      <span className="text-muted-foreground">Page</span>
                      <Input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={String(safePage)}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 1 && v <= totalPages) setPage(v);
                        }}
                        className="h-9 w-14 text-center"
                      />
                      <span className="text-muted-foreground">of {totalPages}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
                      <ArrowDown className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}>
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={openFilterFor !== null} onOpenChange={(open) => { if (!open) { setOpenFilterFor(null); setFilterDraft(""); } }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter: {openFilterFor ? columns.find((c) => c.key === openFilterFor)?.label ?? openFilterFor : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  placeholder={`Enter ${openFilterFor ? columns.find((c) => c.key === openFilterFor)?.label : ""} to filter...`}
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { setColumnFilters((prev) => ({ ...prev, [openFilterFor!]: filterDraft })); setOpenFilterFor(null); setFilterDraft(""); } }}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { if (!openFilterFor) return; setColumnFilters((prev) => { const next = { ...prev } as any; delete next[openFilterFor]; return next; }); setOpenFilterFor(null); setFilterDraft(""); }}>
                  Clear
                </Button>
                <Button className="flex-1" onClick={() => { if (!openFilterFor) return; setColumnFilters((prev) => ({ ...prev, [openFilterFor]: filterDraft })); setOpenFilterFor(null); setFilterDraft(""); }}>
                  Apply Filter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={ifteOpen} onOpenChange={(open) => { setIfteOpen(open); if (!open) setIfteCompanyId(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                International FTE Approval
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Approve this company for International FTE (payroll-managed hiring). This will allow the company to hire international full-time employees through Findtern's managed payroll service.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This action can be reversed at any time from the company actions menu.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIfteOpen(false)} disabled={actionCompanyId === ifteCompanyId}>
                Cancel
              </Button>
              <Button onClick={() => void approveInternationalFte(ifteCompanyId)} disabled={!ifteCompanyId || actionCompanyId === ifteCompanyId}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve FTE
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
