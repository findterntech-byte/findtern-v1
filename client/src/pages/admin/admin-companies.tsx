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
  Columns,
  EyeOff,
  Filter,
  MoreVertical,
  Search,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";

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
};

export default function AdminCompaniesPage() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    | "createdAt"
    | "companyName"
    | "email"
    | "phone"
    | "activeInternships"
    | "lastPaymentAt"
    | "upcomingPaymentAt"
  >("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<5 | 10 | 25 | 50>(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [actionCompanyId, setActionCompanyId] = useState<string>("");
  const [ifteOpen, setIfteOpen] = useState(false);
  const [ifteCompanyId, setIfteCompanyId] = useState<string>("");

  type ColumnKey =
    | "sno"
    | "companyName"
    | "email"
    | "country"
    | "city"
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

  const columns = useMemo(
    () =>
      [
        { key: "sno" as const, label: "S.No" },
        {
          key: "companyName" as const,
          label: "Company name",
          sortKey: "companyName" as const,
          filterKey: "companyName" as const,
        },
        {
          key: "email" as const,
          label: "Company email",
          sortKey: "email" as const,
          filterKey: "email" as const,
        },
        {
          key: "country" as const,
          label: "Country",
          filterKey: "country" as const,
        },
        {
          key: "city" as const,
          label: "City",
          filterKey: "city" as const,
        },
        {
          key: "spocName" as const,
          label: "SPOC Name",
          filterKey: "spocName" as const,
        },
        {
          key: "phone" as const,
          label: "Phone",
          sortKey: "phone" as const,
          filterKey: "phone" as const,
        },
        {
          key: "createdAt" as const,
          label: "Created on",
          sortKey: "createdAt" as const,
        },
        {
          key: "activeInternships" as const,
          label: "Active Projects",
          sortKey: "activeInternships" as const,
        },
        {
          key: "lastPaymentAt" as const,
          label: "Last payment date",
          sortKey: "lastPaymentAt" as const,
        },
        {
          key: "totalBilledAmount" as const,
          label: "Total Amount",
        },
        {
          key: "totalPaidAmount" as const,
          label: "Paid till now",
        },
        {
          key: "totalRemainingAmount" as const,
          label: "Remaining",
        },
        {
          key: "upcomingPaymentAmount" as const,
          label: "Upcoming Payment",
        },
        {
          key: "upcomingPaymentAt" as const,
          label: "Upcoming Payment date",
          sortKey: "upcomingPaymentAt" as const,
        },
        {
          key: "proposalsTotal" as const,
          label: "Total proposals",
        },
        {
          key: "proposalsSent" as const,
          label: "Proposals sent",
        },
        {
          key: "proposalsAccepted" as const,
          label: "Accepted",
        },
        {
          key: "proposalsRejected" as const,
          label: "Rejected",
        },
        {
          key: "proposalsExpired" as const,
          label: "Withdrawn",
        },
        {
          key: "totalHires" as const,
          label: "Hires",
        },
        {
          key: "internationalFte" as const,
          label: "International FTE",
        },
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
        const res = await apiRequest("GET", "/api/admin/employers");
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

          const phone = [String(e?.countryCode ?? ""), String(e?.phoneNumber ?? "")]
            .filter(Boolean)
            .join(" ") || "-";

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
  }, []);

  const formatDate = (raw: string | null) => {
    if (!raw) return "-";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toISOString().slice(0, 10);
  };

  const formatAmount = (amountMinor: number | null, currencyCode: string | null) => {
    if (amountMinor === null || amountMinor === undefined) return "-";
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const formatAmountMajor = (amountMinor: number) => {
    const cur = "INR";
    const locale = "en-IN";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const toggleActive = async (companyId: string, nextIsActive: boolean) => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    try {
      setActionCompanyId(id);
      await apiRequest("POST", `/api/admin/employers/${encodeURIComponent(id)}/toggle-active`, {
        isActive: nextIsActive,
      });
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
      const res = await apiRequest(
        "POST",
        `/api/admin/employers/${encodeURIComponent(id)}/international-fte/status`,
        { status: nextStatus },
      );
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

  const openInternationalFteDialog = (companyId: string) => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    setIfteCompanyId(id);
    setIfteOpen(true);
  };

  const approveInternationalFte = async (companyId: string) => {
    const id = String(companyId ?? "").trim();
    if (!id) return;
    try {
      setActionCompanyId(id);
      const res = await apiRequest(
        "POST",
        `/api/admin/employers/${encodeURIComponent(id)}/international-fte/approve`,
        {},
      );
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
    const active = rows.filter((c) => c.isActive).length;
    const deactivated = Math.max(0, total - active);
    const onboardingCompleted = rows.filter((c) => c.isActive && c.onboardingCompleted).length;
    const onboardingPending = rows.filter((c) => c.isActive && !c.onboardingCompleted).length;

    const series = [
      { key: "Active", value: onboardingCompleted, fill: "hsl(142 76% 36%)" },
      { key: "Pending", value: onboardingPending, fill: "hsl(38 92% 50%)" },
      { key: "Deactivated", value: deactivated, fill: "hsl(215 16% 47%)" },
    ].filter((x) => x.value > 0);

    const config = {
      Active: { label: "Active", color: "hsl(142 76% 36%)" },
      Pending: { label: "Pending", color: "hsl(38 92% 50%)" },
      Deactivated: { label: "Deactivated", color: "hsl(215 16% 47%)" },
    } as const;

    return {
      total,
      active,
      deactivated,
      onboardingCompleted,
      onboardingPending,
      series,
      config,
    };
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

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortBy, sortDir, columnFilters]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginated = sorted.slice(startIndex, endIndex);

  const ColumnHeader = ({
    col,
    alignRight,
  }: {
    col: (typeof columns)[number];
    alignRight?: boolean;
  }) => {
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
      <div className={alignRight ? "flex items-center justify-end gap-2" : "flex items-center gap-2"}>
        <span className="truncate">{col.label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">{col.label}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled={!isSortable} onClick={() => onSort("asc")}>
                <ArrowUp className="h-4 w-4" />
                Sort by ASC
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!isSortable} onClick={() => onSort("desc")}>
                <ArrowDown className="h-4 w-4" />
                Sort by DESC
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!(col as any).filterKey} onClick={openFilter}>
                <Filter className="h-4 w-4" />
                {isFiltered ? "Edit filter" : "Filter"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setColumnVisibility((prev) => ({
                    ...prev,
                    [col.key]: false,
                  }))
                }
                disabled={col.key === "actions"}
              >
                <EyeOff className="h-4 w-4" />
                Hide column
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Columns className="h-4 w-4" />
                  Manage columns
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-60">
                  {columns
                    .filter((c) => c.key !== "actions")
                    .map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={Boolean(columnVisibility[c.key])}
                        onCheckedChange={(checked) =>
                          setColumnVisibility((prev) => ({
                            ...prev,
                            [c.key]: Boolean(checked),
                          }))
                        }
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <AdminLayout
      title="Companies"
      description="Manage companies, view their details, and see associated interns."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Total companies</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{overview.total}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Active {overview.active}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">Deactivated {overview.deactivated}</span>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Onboarding completed</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{overview.onboardingCompleted}</p>
          <p className="mt-2 text-xs text-muted-foreground">Companies with completed onboarding.</p>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Onboarding pending</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{overview.onboardingPending}</p>
          <p className="mt-2 text-xs text-muted-foreground">Active companies still pending onboarding.</p>
        </Card>

        <Card className="p-5 md:col-span-2 xl:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Company status split</p>
          <p className="mt-2 text-sm text-muted-foreground">Active vs Pending vs Deactivated</p>
          <div className="mt-4">
            <ChartContainer config={overview.config as any} className="h-[180px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={overview.series}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {overview.series.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="key" />} />
              </PieChart>
            </ChartContainer>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-muted-foreground">Company List</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search company, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <Select
              value={sortBy}
              onValueChange={(v) => {
                const next = v as any;
                setSortBy(next);
                if (next === "upcomingPaymentAt") {
                  setSortDir("asc");
                }
              }}
            >
              <SelectTrigger className="h-10 w-full sm:w-[170px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created on</SelectItem>
                <SelectItem value="companyName">Company name</SelectItem>
                <SelectItem value="email">Company email</SelectItem>
                <SelectItem value="activeInternships">Active Projects</SelectItem>
                <SelectItem value="lastPaymentAt">Last payment date</SelectItem>
                <SelectItem value="upcomingPaymentAt">Upcoming payment date</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[140px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">DESC</SelectItem>
                <SelectItem value="asc">ASC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="relative w-full overflow-auto rounded-lg border">
            <Table className="min-w-[1200px]">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-background">
                  {columnVisibility.sno && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[0]} />
                    </TableHead>
                  )}
                  {columnVisibility.companyName && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[1]} />
                    </TableHead>
                  )}
                  {columnVisibility.email && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[2]} />
                    </TableHead>
                  )}
                  {columnVisibility.country && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[3]} />
                    </TableHead>
                  )}
                  {columnVisibility.city && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[4]} />
                    </TableHead>
                  )}
                  {columnVisibility.spocName && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[5]} />
                    </TableHead>
                  )}
                  {columnVisibility.phone && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[6]} />
                    </TableHead>
                  )}
                  {columnVisibility.createdAt && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[7]} />
                    </TableHead>
                  )}
                  {columnVisibility.activeInternships && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[8]} />
                    </TableHead>
                  )}
                  {columnVisibility.lastPaymentAt && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[9]} />
                    </TableHead>
                  )}
                  {columnVisibility.totalBilledAmount && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[10]} />
                    </TableHead>
                  )}
                  {columnVisibility.totalPaidAmount && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[11]} />
                    </TableHead>
                  )}
                  {columnVisibility.totalRemainingAmount && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[12]} />
                    </TableHead>
                  )}
                  {columnVisibility.upcomingPaymentAmount && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[13]} />
                    </TableHead>
                  )
                  }
                  {columnVisibility.upcomingPaymentAt && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[14]} />
                    </TableHead>
                  )}
                  {columnVisibility.proposalsTotal && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[15]} />
                    </TableHead>
                  )}
                  {columnVisibility.proposalsSent && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[16]} />
                    </TableHead>
                  )}
                  {columnVisibility.proposalsAccepted && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[17]} />
                    </TableHead>
                  )}
                  {columnVisibility.proposalsRejected && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[18]} />
                    </TableHead>
                  )}
                  {columnVisibility.proposalsExpired && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[19]} />
                    </TableHead>
                  )}
                  {columnVisibility.totalHires && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[20]} />
                    </TableHead>
                  )}
                  {columnVisibility.internationalFte && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[21]} />
                    </TableHead>
                  )}
                  {columnVisibility.actions && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[22]} />
                    </TableHead>
                  )}
                  {columnVisibility.status && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[23]} />
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={24} className="py-8 text-center text-sm text-muted-foreground">
                      Loading companies...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={24} className="py-8 text-center text-sm text-red-600">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={24} className="py-8 text-center text-sm text-muted-foreground">
                      No companies found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((company, index) => (
                    <TableRow
                      key={company.id || String(startIndex + index)}
                      className={
                        (startIndex + index) % 2 === 0
                          ? "bg-background hover:bg-muted/40"
                          : "bg-muted/20 hover:bg-muted/40"
                      }
                    >
                      {columnVisibility.sno && <TableCell>{startIndex + index + 1}</TableCell>}
                      {columnVisibility.companyName && (
                        <TableCell className="font-medium whitespace-nowrap">{company.companyName}</TableCell>
                      )}
                      {columnVisibility.email && (
                        <TableCell className="whitespace-nowrap">{company.email}</TableCell>
                      )}
                      {columnVisibility.country && <TableCell className="whitespace-nowrap">{company.country}</TableCell>}
                      {columnVisibility.city && <TableCell className="whitespace-nowrap">{company.city}</TableCell>}
                      {columnVisibility.spocName && <TableCell className="whitespace-nowrap">{company.spocName}</TableCell>}
                      {columnVisibility.phone && <TableCell className="whitespace-nowrap">{company.phone}</TableCell>}
                      {columnVisibility.createdAt && <TableCell className="whitespace-nowrap">{company.createdAt}</TableCell>}
                      {columnVisibility.activeInternships && (
                        <TableCell className="whitespace-nowrap">{company.activeInternships}</TableCell>
                      )}
                      {columnVisibility.lastPaymentAt && (
                        <TableCell className="whitespace-nowrap">{formatDate(company.lastPaymentAt)}</TableCell>
                      )}
                      {columnVisibility.totalBilledAmount && (
                        <TableCell className="whitespace-nowrap">{formatAmountMajor(company.totalBilledAmountMinor)}</TableCell>
                      )}
                      {columnVisibility.totalPaidAmount && (
                        <TableCell className="whitespace-nowrap">{formatAmountMajor(company.totalPaidAmountMinor)}</TableCell>
                      )}
                      {columnVisibility.totalRemainingAmount && (
                        <TableCell className="whitespace-nowrap">{formatAmountMajor(company.totalRemainingAmountMinor)}</TableCell>
                      )}
                      {columnVisibility.upcomingPaymentAmount && (
                        <TableCell className="whitespace-nowrap">
                          {formatAmount(company.upcomingPaymentAmountMinor, company.upcomingPaymentCurrency)}
                        </TableCell>
                      )}
                      {columnVisibility.upcomingPaymentAt && (
                        <TableCell className="whitespace-nowrap">{formatDate(company.upcomingPaymentAt)}</TableCell>
                      )}
                      {columnVisibility.proposalsTotal && (
                        <TableCell className="whitespace-nowrap">{company.proposalsTotal}</TableCell>
                      )}
                      {columnVisibility.proposalsSent && (
                        <TableCell className="whitespace-nowrap">{company.proposalsSent}</TableCell>
                      )}
                      {columnVisibility.proposalsAccepted && (
                        <TableCell className="whitespace-nowrap">{company.proposalsAccepted}</TableCell>
                      )}
                      {columnVisibility.proposalsRejected && (
                        <TableCell className="whitespace-nowrap">{company.proposalsRejected}</TableCell>
                      )}
                      {columnVisibility.proposalsExpired && (
                        <TableCell className="whitespace-nowrap">{company.proposalsExpired}</TableCell>
                      )}
                      {columnVisibility.totalHires && (
                        <TableCell className="whitespace-nowrap">{company.totalHires}</TableCell>
                      )}
                      {columnVisibility.internationalFte && (
                        <TableCell className="whitespace-nowrap">
                          {(() => {
                            const s = String(company.internationalFteStatus ?? "none").trim().toLowerCase();
                            const label = s === "approved" ? "Approved" : s === "applied" ? "Applied" : "—";
                            const cls = s === "approved" ? "bg-[#0E6049]" : s === "applied" ? "bg-amber-500" : "bg-slate-500";
                            return <Badge className={cls}>{label}</Badge>;
                          })()}
                        </TableCell>
                      )}
                      {columnVisibility.actions && (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/admin/companies/${company.id}`)}
                            >
                              View profile
                            </Button>
                           
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" disabled={actionCompanyId === company.id}>
                                  International FTE action
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => void updateInternationalFteStatus(company.id, "none")}>
                                  Set: None
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => void updateInternationalFteStatus(company.id, "approved")}>
                                  Set: Approved
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void toggleActive(company.id, !company.isActive)}
                              disabled={actionCompanyId === company.id}
                            >
                              {company.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell>
                          <Badge
                            className={
                              !company.isActive
                                ? "bg-slate-500"
                                : company.onboardingCompleted
                                  ? "bg-[#0E6049]"
                                  : "bg-amber-500"
                            }
                          >
                            {!company.isActive
                              ? "Deactivated"
                              : company.onboardingCompleted
                                ? "Active"
                                : "Pending"}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog
            open={openFilterFor !== null}
            onOpenChange={(open) => {
              if (open) return;
              setOpenFilterFor(null);
              setFilterDraft("");
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {openFilterFor
                    ? `Filter: ${columns.find((c) => c.key === openFilterFor)?.label ?? openFilterFor}`
                    : "Filter"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Type to filter..."
                  value={filterDraft}
                  onChange={(e) => setFilterDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (!openFilterFor) return;
                      setColumnFilters((prev) => {
                        const next = { ...prev } as any;
                        delete next[openFilterFor];
                        return next;
                      });
                      setOpenFilterFor(null);
                      setFilterDraft("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (!openFilterFor) return;
                      setColumnFilters((prev) => ({
                        ...prev,
                        [openFilterFor]: filterDraft,
                      }));
                      setOpenFilterFor(null);
                      setFilterDraft("");
                    }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={ifteOpen}
            onOpenChange={(open) => {
              setIfteOpen(open);
              if (!open) setIfteCompanyId("");
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>International FTE</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-slate-700">
                <p>Approve this company for International FTE (payroll-managed hiring).</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIfteOpen(false)}
                  disabled={actionCompanyId === ifteCompanyId}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={() => void approveInternationalFte(ifteCompanyId)}
                  disabled={!ifteCompanyId || actionCompanyId === ifteCompanyId}
                >
                  Approve
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {!loading && !error && sorted.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, total)} of {total}
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / page</SelectItem>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="min-w-[110px] text-center text-sm text-muted-foreground">
                    Page {safePage} / {totalPages}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </AdminLayout>
  );
}


