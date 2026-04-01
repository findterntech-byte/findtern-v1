import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowDown,
  ArrowUp,
  Columns,
  EyeOff,
  Filter,
  Link2,
  MoreVertical,
  Search,
  Star,
  UploadCloud,
  Download,
  Users,
  CheckCircle2,
  Clock,
  Activity,
  UserCheck,
  LayoutGrid,
  ListFilter,
  ChevronRight,
  Receipt,
  Sparkles,
  GraduationCap,
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type Intern = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  companyCount: number;
  interview: "Waiting" | "Applied" | "Interview" | "Completed" | "Scheduled" | "Sent" | "Expired";
  interviewLink: string | null;
  feedbackLink?: string | null;
  recordingLink?: string | null;
  latestInterviewId: string | null;
  findternScore?: number;
  onboardingStatus?: "Onboarded" | "Not onboarded";
  pendingInterviewCount?: number;
  totalInterviewCount?: number;
  // interviewSentCount?: number;
  interviewScheduledCount?: number;
  interviewCompletedCount?: number;
  interviewExpiredCount?: number;
  upcomingPaymentMinor?: number;
  upcomingPaymentDueAt?: string | null;
  toPayMinor?: number;
  paidTillNowMinor?: number;
  totalToPayMinor?: number | null;
  leftToPayMinor?: number | null;
  payoutTotalCount?: number;
  offerCurrency?: "INR" | "USD";
  offerStatus?: string;
  ratings?: {
    communication?: number;
    interview?: number;
    aptitude?: number;
    coding?: number;
  };
  liveStatus?: "Live" | "Hidden";
  isProfileComplete?: boolean;
  internshipStatus?: string;
  paymentStatus?: string;
  isFullTime?: boolean;
  bankDetails?: {
    accountNumber?: string | null;
    ifscCode?: string | null;
    bankName?: string | null;
    upiId?: string | null;
  };
  status: "Active" | "Inactive";
  approvalStatus: "Pending" | "Approved" | "Rejected";
};

type AdminDashboardAnalytics = {
  trendData?: Array<{ month: string; applications: number; interviews: number }>;
  funnelData?: Array<{ stage: string; value: number }>;
};

export default function AdminInternsPage() {
  const [search, setSearch] = useState("");
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<"" | "Waiting" | "Applied" | "Interview" | "Completed">("");
  const [liveHiddenFilter, setLiveHiddenFilter] = useState<"" | "Live" | "Hidden" | "Deactivated">("");
  const [internshipStatusFilter, setInternshipStatusFilter] = useState<"" | "Ongoing" | "Completed" | "-">("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"" | "Paid" | "Unpaid">("");
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState<"" | "Onboarded" | "Not onboarded">("");
  const [profileStatusFilter, setProfileStatusFilter] = useState<"" | "Complete" | "Incomplete">("");
  const [internPayoutFilter, setInternPayoutFilter] = useState<"" | "Not started" | "Pending" | "Completed">("");
  const [offerStatusFilter, setOfferStatusFilter] = useState<"" | "Rejected">("");
  const [minFindternScore, setMinFindternScore] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "email" | "phone" | "toPay" | "pendingInterviewCount">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<5 | 10 | 25 | 50>(10);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null);
  const [openLinksModal, setOpenLinksModal] = useState(false);
  const [openRatingsModal, setOpenRatingsModal] = useState(false);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [feedbackLinkInput, setFeedbackLinkInput] = useState("");
  const [recordingLinkInput, setRecordingLinkInput] = useState("");
  const [savingLinks, setSavingLinks] = useState(false);
  const [communicationRating, setCommunicationRating] = useState("");
  const [interviewRating, setInterviewRating] = useState("");
  const [aptitudeRating, setAptitudeRating] = useState("");
  const [codingRating, setCodingRating] = useState("");
  const [findternScore, setFindternScore] = useState("");
  const [savingRatings, setSavingRatings] = useState(false);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalSaving, setApprovalSaving] = useState<Record<string, boolean>>({});
  const [, setLocation] = useLocation();

  const [dashboardAnalytics, setDashboardAnalytics] = useState<AdminDashboardAnalytics | null>(null);
  const [dashboardAnalyticsError, setDashboardAnalyticsError] = useState<string | null>(null);

  const handleResetFilters = () => {
    setSearch("");
    setInterviewStatusFilter("");
    setLiveHiddenFilter("");
    setInternshipStatusFilter("");
    setPaymentStatusFilter("");
    setOnboardingStatusFilter("");
    setProfileStatusFilter("");
    setInternPayoutFilter("");
    setOfferStatusFilter("");
    setMinFindternScore("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      search !== "" ||
      interviewStatusFilter !== "" ||
      liveHiddenFilter !== "" ||
      internshipStatusFilter !== "" ||
      paymentStatusFilter !== "" ||
      onboardingStatusFilter !== "" ||
      profileStatusFilter !== "" ||
      internPayoutFilter !== "" ||
      offerStatusFilter !== "" ||
      minFindternScore !== ""
    );
  }, [
    search,
    interviewStatusFilter,
    liveHiddenFilter,
    internshipStatusFilter,
    paymentStatusFilter,
    onboardingStatusFilter,
    profileStatusFilter,
    internPayoutFilter,
    offerStatusFilter,
    minFindternScore,
  ]);

  type ColumnKey =
    | "sno"
    | "name"
    | "email"
    | "phone"
    | "createdAt"
    | "interview"
    | "findternScore"
    | "onboardingStatus"
    | "profileStatus"
    // | "interviewSent"
    | "interviewScheduled"
    | "interviewCompleted"
    | "interviewExpired"
    | "interviewPending"
    | "totalInterview"
    // | "pendingProposals"
    | "toPay"
    | "upcomingPaymentDate"
    | "totalToPay"
    | "paidTillNow"
    | "leftToPay"
    | "liveStatus"
    | "internshipStatus"
    | "paymentStatus"
    | "offerStatus"
    | "accountNumber"
    | "ifsc"
    | "bankName"
    | "upi"
    // | "approval"
    | "status"
    | "actions";

  const columns = useMemo(
    () =>
      [
        { key: "sno" as const, label: "S.No" },
        { key: "name" as const, label: "Name", sortKey: "name" as const, filterKey: "name" as const },
        { key: "email" as const, label: "Email", sortKey: "email" as const, filterKey: "email" as const },
        { key: "phone" as const, label: "Phone", sortKey: "phone" as const, filterKey: "phone" as const },
        { key: "createdAt" as const, label: "Created On", sortKey: "createdAt" as const },
        { key: "interview" as const, label: "Proposal vs Interview" },
        // { key: "interviewSent" as const, label: "Sent" },
        { key: "interviewScheduled" as const, label: "Scheduled" },
        { key: "interviewCompleted" as const, label: "Completed" },
        { key: "interviewExpired" as const, label: "Expired" },
        { key: "interviewPending" as const, label: "Pending" },
        { key: "totalInterview" as const, label: "Total" },
        { key: "findternScore" as const, label: "Findtern Score" },
        { key: "profileStatus" as const, label: "Profile Status" },
        { key: "onboardingStatus" as const, label: "Onboarding status", filterKey: "onboardingStatus" as const },
        // { key: "pendingProposals" as const, label: "Pending Interviews", sortKey: "pendingInterviewCount" as const },
        { key: "toPay" as const, label: "Intern payout (50%)", sortKey: "toPay" as const },
        { key: "upcomingPaymentDate" as const, label: "Upcoming payment date" },
        { key: "totalToPay" as const, label: "Total to pay" },
        { key: "paidTillNow" as const, label: "Paid till now" },
        { key: "leftToPay" as const, label: "Left to pay" },
        { key: "liveStatus" as const, label: "Live / Hidden" },
        { key: "internshipStatus" as const, label: "Internship Status" },
        { key: "paymentStatus" as const, label: "Payment Status" },
        { key: "offerStatus" as const, label: "Offer Status" },
        { key: "accountNumber" as const, label: "Account Number" },
        { key: "ifsc" as const, label: "IFSC" },
        { key: "bankName" as const, label: "Bank Name" },
        { key: "upi" as const, label: "UPI" },
        // { key: "approval" as const, label: "Approval" },
        { key: "status" as const, label: "Status" },
        { key: "actions" as const, label: "Actions" },
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

  const overview = useMemo(() => {
    const total = interns.length;
    const active = interns.filter((i) => i.status === "Active").length;
    const inactive = Math.max(0, total - active);

    const pendingApproval = interns.filter((i) => i.approvalStatus === "Pending").length;
    const approved = interns.filter((i) => i.approvalStatus === "Approved").length;
    const rejected = interns.filter((i) => i.approvalStatus === "Rejected").length;
    const onboarded = interns.filter((i) => i.onboardingStatus === "Onboarded").length;

    const interviewCounts = interns.reduce(
      (acc, i) => {
        const key = i.interview || "Waiting";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const approvalSeries = [
      { key: "Approved", value: approved, fill: "hsl(var(--primary))" },
      { key: "Pending", value: pendingApproval, fill: "hsl(var(--warning))" },
      { key: "Rejected", value: rejected, fill: "hsl(var(--destructive))" },
    ].filter((x) => x.value > 0);

    const interviewSeries = ["Waiting", "Applied", "Interview", "Completed"].map(
      (k) => ({
        key: k,
        value: Number(interviewCounts[k] ?? 0),
      }),
    );

    const interviewPalette: Record<string, string> = {
      Waiting: "hsl(var(--muted-foreground))",
      Applied: "hsl(var(--warning))",
      Interview: "hsl(var(--primary))",
      Completed: "hsl(var(--success, 142 76% 36%))",
    };

    const interviewSeriesWithFill = interviewSeries
      .filter((x) => x.value > 0)
      .map((x) => ({ ...x, fill: interviewPalette[x.key] ?? "hsl(var(--muted-foreground))" }));

    const approvalConfig = {
      Approved: { label: "Approved", color: "hsl(var(--primary))" },
      Pending: { label: "Pending", color: "hsl(var(--warning))" },
      Rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
    } as const;

    const interviewConfig = {
      Waiting: { label: "Waiting", color: "hsl(var(--muted-foreground))" },
      Applied: { label: "Applied", color: "hsl(var(--warning))" },
      Interview: { label: "Interview", color: "hsl(var(--primary))" },
      Completed: { label: "Completed", color: "hsl(var(--success, 142 76% 36%))" },
    } as const;

    return {
      total,
      active,
      inactive,
      pendingApproval,
      approved,
      rejected,
      onboarded,
      approvalSeries,
      interviewSeries: interviewSeriesWithFill,
      approvalConfig,
      interviewConfig,
    };
  }, [interns]);

  const proposalsTrendData = dashboardAnalytics?.trendData ?? [];
  const conversionFunnelData = dashboardAnalytics?.funnelData ?? [];

  const trendConfig: ChartConfig = {
    applications: {
      label: "Proposals",
      color: "hsl(152, 61%, 40%)",
    },
    interviews: {
      label: "Interviews",
      color: "hsl(215, 16%, 47%)",
    },
  };

  const funnelConfig: ChartConfig = {
    value: {
      label: "Interns",
      color: "hsl(43, 96%, 56%)",
    },
  };

  const clampRating = (n: number) => {
    if (!Number.isFinite(n)) return n;
    return Math.min(10, Math.max(0, n));
  };

  const formatRating = (n: number) => {
    const rounded = Math.round(n * 10) / 10;
    return String(rounded);
  };

  const loadInterns = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? false;
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const res = await apiRequest("GET", "/api/admin/interns");
      const json = await res.json();
      const list = (json?.interns || []) as any[];

      const mapped: Intern[] = list
        .map((item) => {
          const onboarding = (item as any)?.onboarding ?? {};
          const user = (item as any)?.user ?? {};
          const latestInterview = (item as any)?.latestInterview ?? null;
          const onboardingStatus = String((item as any)?.onboardingStatus ?? "").trim();
          const pendingInterviewCountRaw = Number((item as any)?.pendingInterviewCount ?? 0);
          const totalInterviewCountRaw = Number((item as any)?.totalInterviewCount ?? 0);
          // const interviewSentCountRaw = Number((item as any)?.interviewSentCount ?? 0);
          const interviewScheduledCountRaw = Number((item as any)?.interviewScheduledCount ?? 0);
          const interviewCompletedCountRaw = Number((item as any)?.interviewCompletedCount ?? 0);
          const interviewExpiredCountRaw = Number((item as any)?.interviewExpiredCount ?? 0);
          const payoutAgg = (item as any)?.payoutAgg ?? {};
          const toPayMinorRaw = Number(payoutAgg?.pendingSumMinor ?? 0);
          const paidTillNowMinorRaw = Number(payoutAgg?.paidSumMinor ?? 0);
          const upcomingPaymentMinorRaw = Number(payoutAgg?.upcomingAmountMinor ?? 0);
          const upcomingPaymentDueAtRaw = (payoutAgg?.upcomingDueAt ?? null) as string | null;
          const payoutTotalCountRaw = Number(payoutAgg?.totalCount ?? 0);
          const payoutTotals = (item as any)?.payoutTotals ?? {};
          const totalToPayMinorRaw = payoutTotals?.totalPlannedMinor ?? null;
          const leftToPayMinorRaw = payoutTotals?.leftToPayMinor ?? null;
          const offerCurrencyRaw = String((item as any)?.offerCurrency ?? "INR").trim().toUpperCase();
          const offerCurrency: Intern["offerCurrency"] = offerCurrencyRaw === "USD" ? "USD" : "INR";
          const offerStatus = String((item as any)?.offerStatus ?? "-");
          const ratings = (onboarding as any)?.extraData?.ratings ?? {};
          const liveStatus = (item as any)?.liveStatus as Intern["liveStatus"] | undefined;
          const rawInternshipStatus = String((item as any)?.internshipStatus ?? "-").trim();
          const internshipStatus = rawInternshipStatus.toLowerCase() === "onboarding" || rawInternshipStatus.toLowerCase() === "ongoing"
            ? "Ongoing"
            : rawInternshipStatus.toLowerCase() === "completed"
            ? "Completed"
            : "-";
          const paymentStatus = String((item as any)?.paymentStatus ?? "-");
          const isFullTime = Boolean((item as any)?.isFullTime ?? (item as any)?.is_full_time ?? false);
          const bankDetailsRaw = (onboarding as any)?.extraData?.bankDetails ?? {};

          const firstName = String(user?.firstName ?? "");
          const lastName = String(user?.lastName ?? "");
          const name = `${firstName} ${lastName}`.trim() || "Intern";
          const email = String(user?.email ?? "-");

          const countryCode = String(user?.countryCode ?? "");
          const phoneNumber = String(user?.phoneNumber ?? "");
          const phone = [countryCode, phoneNumber].filter(Boolean).join(" ") || "-";

          const createdAtRaw = onboarding?.createdAt ?? "";
          const createdAt = createdAtRaw
            ? (() => {
                const d = new Date(createdAtRaw);
                return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
              })()
            : "-";

          const id = String(user?.id ?? onboarding?.userId ?? onboarding?.id ?? "");
          const status: Intern["status"] = (user as any)?.isActive === false ? "Inactive" : "Active";
          const rawApproval = String((onboarding as any)?.extraData?.approvalStatus ?? "").trim();
          const approvalStatus: Intern["approvalStatus"] =
            rawApproval === "Approved" || rawApproval === "Rejected" || rawApproval === "Pending"
              ? (rawApproval as any)
              : "Pending";

          const rawInterviewStatus = String(latestInterview?.status ?? "").toLowerCase();
          const interviewLink =
            (latestInterview?.meet_link ?? latestInterview?.meetingLink ?? null) as string | null;

          const rawFindternScore = (onboarding as any)?.extraData?.findternScore;
          const parsedFindternScore = (() => {
            const n = Number(rawFindternScore);
            return Number.isFinite(n) ? n : undefined;
          })();

          let interview: Intern["interview"] = latestInterview
            ? rawInterviewStatus === "completed"
              ? "Completed"
              : rawInterviewStatus === "scheduled"
                ? "Scheduled"
                : rawInterviewStatus === "sent"
                  ? "Sent"
                  : rawInterviewStatus === "expired"
                    ? "Expired"
                    : rawInterviewStatus === "waiting" || rawInterviewStatus === "pending"
                      ? "Applied"
                      : "Waiting"
            : "Waiting";

          if (parsedFindternScore !== undefined && !interviewLink && interview !== "Completed") {
            interview = "Completed";
          }

          const feedbackLink =
            (latestInterview?.feedback_link ?? latestInterview?.feedbackLink ?? null) as string | null;
          const recordingLink =
            (latestInterview?.recording_link ?? latestInterview?.recordingLink ?? null) as string | null;
          const latestInterviewId = (latestInterview?.id ?? null) as string | null;

          const row: Intern = {
            id,
            name,
            email,
            phone,
            createdAt,
            companyCount: 0,
            interview,
            interviewLink,
            feedbackLink,
            recordingLink,
            latestInterviewId,
            ratings,
            findternScore: parsedFindternScore,
            onboardingStatus: onboardingStatus.toLowerCase() === "onboarded" ? "Onboarded" : "Not onboarded",
            pendingInterviewCount: Number.isFinite(pendingInterviewCountRaw) ? Math.max(0, Math.floor(pendingInterviewCountRaw)) : 0,
            totalInterviewCount: Number.isFinite(totalInterviewCountRaw) ? Math.max(0, Math.floor(totalInterviewCountRaw)) : 0,
            // interviewSentCount: Number.isFinite(interviewSentCountRaw) ? Math.max(0, Math.floor(interviewSentCountRaw)) : 0,
            interviewScheduledCount: Number.isFinite(interviewScheduledCountRaw) ? Math.max(0, Math.floor(interviewScheduledCountRaw)) : 0,
            interviewCompletedCount: Number.isFinite(interviewCompletedCountRaw) ? Math.max(0, Math.floor(interviewCompletedCountRaw)) : 0,
            interviewExpiredCount: Number.isFinite(interviewExpiredCountRaw) ? Math.max(0, Math.floor(interviewExpiredCountRaw)) : 0,
            toPayMinor: Number.isFinite(toPayMinorRaw) ? Math.max(0, Math.floor(toPayMinorRaw)) : 0,
            paidTillNowMinor: Number.isFinite(paidTillNowMinorRaw) ? Math.max(0, Math.floor(paidTillNowMinorRaw)) : 0,
            totalToPayMinor:
              totalToPayMinorRaw == null
                ? null
                : Number.isFinite(Number(totalToPayMinorRaw))
                  ? Math.max(0, Math.floor(Number(totalToPayMinorRaw)))
                  : null,
            leftToPayMinor:
              leftToPayMinorRaw == null
                ? null
                : Number.isFinite(Number(leftToPayMinorRaw))
                  ? Math.max(0, Math.floor(Number(leftToPayMinorRaw)))
                  : null,
            upcomingPaymentMinor: Number.isFinite(upcomingPaymentMinorRaw) ? Math.max(0, Math.floor(upcomingPaymentMinorRaw)) : 0,
            upcomingPaymentDueAt: typeof upcomingPaymentDueAtRaw === "string" && upcomingPaymentDueAtRaw.trim() ? upcomingPaymentDueAtRaw : null,
            payoutTotalCount: Number.isFinite(payoutTotalCountRaw) ? Math.max(0, Math.floor(payoutTotalCountRaw)) : 0,
            offerCurrency,
            offerStatus,
            liveStatus,
            isProfileComplete: Boolean(item.isProfileComplete),
            internshipStatus,
            paymentStatus,
            isFullTime,
            bankDetails: {
              accountNumber: (bankDetailsRaw as any)?.accountNumber ?? null,
              ifscCode: (bankDetailsRaw as any)?.ifscCode ?? null,
              bankName: (bankDetailsRaw as any)?.bankName ?? null,
              upiId: (bankDetailsRaw as any)?.upiId ?? null,
            },
            status,
            approvalStatus,
          };

          return row;
        })
        .filter((x) => x.id);

      setInterns(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load interns");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleDeactivateIntern = async (id: string) => {
    const ok = typeof window !== "undefined"
      ? window.confirm("Deactivate this intern? They will not be able to login until activated again.")
      : false;
    if (!ok) return;

    try {
      await apiRequest("POST", `/api/users/${encodeURIComponent(id)}/deactivate`, {});
      setInterns((prev) => prev.map((i) => (i.id === id ? { ...i, status: "Inactive" } : i)));
    } catch (e) {
      console.error("Deactivate intern error:", e);
    }
  };

  const handleActivateIntern = async (id: string) => {
    try {
      await apiRequest("POST", `/api/users/${encodeURIComponent(id)}/activate`, {});
      setInterns((prev) => prev.map((i) => (i.id === id ? { ...i, status: "Active" } : i)));
    } catch (e) {
      console.error("Activate intern error:", e);
    }
  };

  const handleDownloadSample = () => {
    if (typeof window === "undefined") return;
    window.open("/api/admin/interns/ratings/sample", "_blank");
  };

  const handleExportExcel = () => {
    if (typeof window === "undefined") return;

    const visibleCols = columns.filter((c) => c.key !== "actions" && columnVisibility[c.key]);
    const data = sorted.map((intern, idx) => {
      const row: Record<string, any> = {};
      for (const c of visibleCols) {
        if (c.key === "sno") row[c.label] = idx + 1;
        if (c.key === "name") row[c.label] = intern.name;
        if (c.key === "email") row[c.label] = intern.email;
        if (c.key === "phone") row[c.label] = intern.phone;
        if (c.key === "createdAt") row[c.label] = intern.createdAt;
        if (c.key === "interview") row[c.label] = intern.interview;
        // if (c.key === "interviewSent") row[c.label] = intern.interviewSentCount ?? 0;
        if (c.key === "interviewScheduled") row[c.label] = intern.interviewScheduledCount ?? 0;
        if (c.key === "interviewCompleted") row[c.label] = intern.interviewCompletedCount ?? 0;
        if (c.key === "findternScore") row[c.label] = typeof intern.findternScore === "number" ? intern.findternScore : "-";
        if (c.key === "profileStatus") row[c.label] = intern.isProfileComplete ? "Complete" : "Incomplete";
        if (c.key === "onboardingStatus") row[c.label] = intern.onboardingStatus ?? "Not onboarded";
        if (c.key === "toPay") {
          const minor = Number(intern.toPayMinor ?? 0) || 0;
          row[c.label] = minor / 100;
        }
        if (c.key === "totalToPay") {
          const minor = Number(intern.totalToPayMinor ?? 0) || 0;
          row[c.label] = minor / 100;
        }
        if (c.key === "paidTillNow") {
          const minor = Number(intern.paidTillNowMinor ?? 0) || 0;
          row[c.label] = minor / 100;
        }
        if (c.key === "leftToPay") {
          const minor = Number(intern.leftToPayMinor ?? 0) || 0;
          row[c.label] = minor / 100;
        }
        if (c.key === "liveStatus") row[c.label] = intern.liveStatus ?? "Live";
        if (c.key === "internshipStatus") row[c.label] = intern.internshipStatus ?? "-";
        if (c.key === "paymentStatus") row[c.label] = intern.paymentStatus ?? "-";
        if (c.key === "offerStatus") row[c.label] = intern.offerStatus ?? "-";
        if (c.key === "accountNumber") row[c.label] = intern.bankDetails?.accountNumber ?? "-";
        if (c.key === "ifsc") row[c.label] = intern.bankDetails?.ifscCode ?? "-";
        if (c.key === "bankName") row[c.label] = intern.bankDetails?.bankName ?? "-";
        if (c.key === "upi") row[c.label] = intern.bankDetails?.upiId ?? "-";
        // if (c.key === "approval") row[c.label] = intern.approvalStatus;
        if (c.key === "status") row[c.label] = intern.status;
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Interns");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `interns_${stamp}.xlsx`);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/interns/ratings/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const msg = json?.message ?? text ?? res.statusText;
        throw new Error(`${res.status}: ${msg}`);
      }

      const updated = Number(json?.updated ?? 0);
      const failed = Number(json?.failed ?? 0);
      setUploadMessage(`Uploaded: ${updated} updated, ${failed} failed`);
      await loadInterns();
    } catch (e: any) {
      setUploadError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        await loadInterns({ showLoading: true });
      } finally {
        if (!mounted) return;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setDashboardAnalyticsError(null);
        const qs = new URLSearchParams({
          internPage: "1",
          internLimit: "1",
          internQ: "",
          internStatus: "all",
          projectPage: "1",
          projectLimit: "1",
        });
        const res = await apiRequest("GET", `/api/admin/dashboard?${qs.toString()}`);
        const json = (await res.json()) as AdminDashboardAnalytics;
        if (!mounted) return;
        setDashboardAnalytics(json);
      } catch (e: any) {
        console.error("Failed to load dashboard analytics", e);
        if (!mounted) return;
        setDashboardAnalytics(null);
        setDashboardAnalyticsError(e?.message ?? "Failed to load analytics");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = interns.filter((intern) => {
    if (interviewStatusFilter) {
      const expected = interviewStatusFilter;
      if (String(intern.interview ?? "") !== expected) return false;
    }

    if (liveHiddenFilter) {
      if (liveHiddenFilter === "Deactivated") {
        if (intern.status !== "Inactive") return false;
      } else {
        const s = (intern.liveStatus ?? "Live") as any;
        if (String(s) !== liveHiddenFilter) return false;
      }
    }

    if (internshipStatusFilter) {
      const v = String(intern.internshipStatus ?? "-");
      if (v !== internshipStatusFilter) return false;
    }

    if (paymentStatusFilter) {
      const v = String(intern.paymentStatus ?? "-");
      if (v !== paymentStatusFilter) return false;
    }

    if (onboardingStatusFilter) {
      const v = String(intern.onboardingStatus ?? "Not onboarded");
      if (v !== onboardingStatusFilter) return false;
    }

    if (profileStatusFilter) {
      const isComplete = Boolean(intern.isProfileComplete);
      const status = isComplete ? "Complete" : "Incomplete";
      if (status !== profileStatusFilter) return false;
    }

    if (internPayoutFilter) {
      const paidTillNowMinor = Number(intern.paidTillNowMinor ?? 0) || 0;
      const toPayMinor = Number(intern.toPayMinor ?? 0) || 0;
      const hasUpcoming = Boolean(String(intern.upcomingPaymentDueAt ?? "").trim());
      const isNotStarted = paidTillNowMinor <= 0;
      const isComplete = !isNotStarted && !hasUpcoming;
      const status = isNotStarted ? "Not started" : isComplete ? "Completed" : "Pending";
      if (status !== internPayoutFilter) return false;
    }

    if (offerStatusFilter) {
      const v = String(intern.offerStatus ?? "-");
      if (v !== offerStatusFilter) return false;
    }

    const minScore = Number(String(minFindternScore ?? "").trim());
    if (String(minFindternScore ?? "").trim() !== "" && Number.isFinite(minScore)) {
      const score = Number(intern.findternScore ?? 0);
      if (!Number.isFinite(score) || score < minScore) return false;
    }

    const cfName = String(columnFilters.name ?? "").trim().toLowerCase();
    if (cfName && !String(intern.name ?? "").toLowerCase().includes(cfName)) return false;
    const cfEmail = String(columnFilters.email ?? "").trim().toLowerCase();
    if (cfEmail && !String(intern.email ?? "").toLowerCase().includes(cfEmail)) return false;
    const cfPhone = String(columnFilters.phone ?? "").trim().toLowerCase();
    if (cfPhone && !String(intern.phone ?? "").toLowerCase().includes(cfPhone)) return false;

    const q = search.trim().toLowerCase();
    if (!q) return true;

    const haystack = `${intern.name} ${intern.email} ${intern.phone}`.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((t) => haystack.includes(t));
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;

    const toInrMinor = (intern: Intern) => {
      const minor = Number(intern.toPayMinor ?? 0);
      return Number.isFinite(minor) ? minor : 0;
    };

    const cmpText = (x: unknown, y: unknown) => {
      const ax = String(x ?? "").toLowerCase();
      const by = String(y ?? "").toLowerCase();
      return ax.localeCompare(by);
    };

    if (sortBy === "name") return cmpText(a.name, b.name) * dir;
    if (sortBy === "email") return cmpText(a.email, b.email) * dir;
    if (sortBy === "phone") return cmpText(a.phone, b.phone) * dir;

    if (sortBy === "pendingInterviewCount") {
      const av = Number(a.pendingInterviewCount ?? 0);
      const bv = Number(b.pendingInterviewCount ?? 0);
      const aSafe = Number.isFinite(av) ? av : 0;
      const bSafe = Number.isFinite(bv) ? bv : 0;
      return (aSafe - bSafe) * dir;
    }

    if (sortBy === "toPay") {
      // Pending items first by nearest due date (nulls last), then by amount.
      const aDue = a.upcomingPaymentDueAt ? new Date(a.upcomingPaymentDueAt).getTime() : NaN;
      const bDue = b.upcomingPaymentDueAt ? new Date(b.upcomingPaymentDueAt).getTime() : NaN;
      const aDueSafe = Number.isFinite(aDue) ? aDue : Number.POSITIVE_INFINITY;
      const bDueSafe = Number.isFinite(bDue) ? bDue : Number.POSITIVE_INFINITY;

      if (aDueSafe !== bDueSafe) return (aDueSafe - bDueSafe) * dir;

      const aSafe = toInrMinor(a);
      const bSafe = toInrMinor(b);
      return (aSafe - bSafe) * dir;
    }

    const aT = a.createdAt && a.createdAt !== "-" ? new Date(a.createdAt).getTime() : 0;
    const bT = b.createdAt && b.createdAt !== "-" ? new Date(b.createdAt).getTime() : 0;
    return (aT - bT) * dir;
  });

  useEffect(() => {
    setPage(1);
  }, [
    search,
    interviewStatusFilter,
    liveHiddenFilter,
    internshipStatusFilter,
    paymentStatusFilter,
    onboardingStatusFilter,
    profileStatusFilter,
    internPayoutFilter,
    offerStatusFilter,
    minFindternScore,
    pageSize,
    sortBy,
    sortDir,
  ]);

  const formatMoneyMinor = (amountMinor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const formatPayoutInInrIfUsd = (amountMinor: number, offerCurrency?: string) => {
    const safeMinor = Number.isFinite(amountMinor) ? Math.max(0, Math.floor(amountMinor)) : 0;
    // Backend now returns all values in INR paise for consistent display.
    return formatMoneyMinor(safeMinor, "INR");
  };

  const formatDateOnly = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().slice(0, 10);
  };

  const formatDueDateOnly = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toISOString().slice(0, 10);
  };

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

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginated = sorted.slice(startIndex, endIndex);

  const visibleColumnCount = useMemo(() => {
    const count = columns.reduce((acc, c) => {
      if (c.key === "actions") return acc + 1;
      return acc + (columnVisibility[c.key] ? 1 : 0);
    }, 0);
    return Math.max(1, count);
  }, [columnVisibility, columns]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => columnVisibility[c.key]),
    [columns, columnVisibility],
  );

  const handleApprovalChange = async (id: string, nextStatus: Intern["approvalStatus"]) => {
    const existing = interns.find((i) => i.id === id);
    const prevStatus = existing?.approvalStatus ?? "Pending";

    setInterns((prev) =>
      prev.map((intern) =>
        intern.id === id ? { ...intern, approvalStatus: nextStatus } : intern,
      ),
    );
    setApprovalSaving((prev) => ({ ...prev, [id]: true }));

    try {
      await apiRequest("PUT", `/api/admin/interns/${encodeURIComponent(id)}/approval`, {
        approvalStatus: nextStatus,
      });
    } catch (e: any) {
      console.error("Update approval error:", e);
      setInterns((prev) =>
        prev.map((intern) =>
          intern.id === id ? { ...intern, approvalStatus: prevStatus } : intern,
        ),
      );
    } finally {
      setApprovalSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleOpenLinksModal = (intern: Intern) => {
    setSelectedIntern(intern);
    setMeetingLinkInput(intern.interviewLink ?? "");
    setFeedbackLinkInput(intern.feedbackLink ?? "");
    setRecordingLinkInput(intern.recordingLink ?? "");
    setOpenLinksModal(true);
  };

  const parseRating = (v: string) => {
    const raw = String(v ?? "").trim();
    if (!raw) return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return Math.round(clampRating(n) * 10) / 10;
  };

  const handleRatingBlur = (value: string, setter: (v: string) => void) => {
    const parsed = parseRating(value);
    if (parsed === undefined) {
      setter("");
      return;
    }
    setter(formatRating(parsed));
  };

  const hydrateRatingsForm = (intern: Intern | null) => {
    const r: any = intern?.ratings ?? {};
    setCommunicationRating(r.communication != null ? String(r.communication) : "");
    setInterviewRating(r.interview != null ? String(r.interview) : "");
    setAptitudeRating(r.aptitude != null ? String(r.aptitude) : "");
    setCodingRating(r.coding != null ? String(r.coding) : "");
    setFindternScore(intern?.findternScore != null ? String(intern.findternScore) : "");
  };

  const handleOpenRatingsModal = (intern: Intern) => {
    setSelectedIntern(intern);
    hydrateRatingsForm(intern);
    setOpenRatingsModal(true);
  };

  useEffect(() => {
    if (!openRatingsModal) return;
    if (!selectedIntern?.id) return;

    const latest = interns.find((i) => i.id === selectedIntern.id) ?? selectedIntern;
    hydrateRatingsForm(latest);
  }, [openRatingsModal, selectedIntern?.id, interns]);

  useEffect(() => {
    if (!openRatingsModal) return;

    const comm = parseRating(communicationRating);
    const code = parseRating(codingRating);
    const apt = parseRating(aptitudeRating);
    const intr = parseRating(interviewRating);

    const values = [comm, code, apt, intr].filter(
      (v): v is number => typeof v === "number" && Number.isFinite(v),
    );

    if (values.length === 0) {
      setFindternScore("");
      return;
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    setFindternScore(formatRating(avg));
  }, [openRatingsModal, communicationRating, codingRating, aptitudeRating, interviewRating]);

  const handleSaveRatings = async () => {
    try {
      if (!selectedIntern?.id) return;
      setSavingRatings(true);

      const commRaw = String(communicationRating ?? "");
      const intrRaw = String(interviewRating ?? "");
      const aptRaw = String(aptitudeRating ?? "");
      const codeRaw = String(codingRating ?? "");
      const scoreRaw = String(findternScore ?? "");

      const comm = parseRating(commRaw);
      const intr = parseRating(intrRaw);
      const apt = parseRating(aptRaw);
      const code = parseRating(codeRaw);

      const clearedRatings: string[] = [];
      const ratingPayload: any = {};
      const payload: any = {};

      if (!commRaw.trim()) {
        payload.communication = null;
        clearedRatings.push("communication");
      } else if (comm !== undefined) {
        payload.communication = comm;
        ratingPayload.communication = comm;
      }

      if (!intrRaw.trim()) {
        payload.interview = null;
        clearedRatings.push("interview");
      } else if (intr !== undefined) {
        payload.interview = intr;
        ratingPayload.interview = intr;
      }

      if (!aptRaw.trim()) {
        payload.aptitude = null;
        clearedRatings.push("aptitude");
      } else if (apt !== undefined) {
        payload.aptitude = apt;
        ratingPayload.aptitude = apt;
      }

      if (!codeRaw.trim()) {
        payload.coding = null;
        clearedRatings.push("coding");
      } else if (code !== undefined) {
        payload.coding = code;
        ratingPayload.coding = code;
      }

      const allRatingFieldsCleared = clearedRatings.length === 4;
      const scoreParts = [comm, intr, apt, code].filter(
        (v): v is number => typeof v === "number" && Number.isFinite(v),
      );
      const canComputeScore = scoreParts.length > 0;

      if (allRatingFieldsCleared) {
        payload.findternScore = null;
      } else if (canComputeScore) {
        payload.findternScore = Math.round((scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) * 10) / 10;
      } else if (!scoreRaw.trim()) {
        payload.findternScore = null;
      }

      await apiRequest("PUT", `/api/admin/interns/${selectedIntern.id}/ratings`, payload);

      setInterns((prev) =>
        prev.map((i) =>
          i.id === selectedIntern.id
            ? ({
                ...i,
                ratings: {
                  ...(() => {
                    const base: any = { ...(i.ratings ?? {}) };
                    for (const k of clearedRatings) delete base[k];
                    return { ...base, ...ratingPayload };
                  })(),
                },
                findternScore:
                  payload.findternScore === null
                    ? undefined
                    : typeof payload.findternScore === "number"
                      ? payload.findternScore
                      : i.findternScore,
              } as any)
            : i,
        ),
      );

      await loadInterns();

      setOpenRatingsModal(false);
      setSelectedIntern(null);
    } catch (e) {
      console.error("Save ratings error:", e);
    } finally {
      setSavingRatings(false);
    }
  };

  const handleSaveInterviewLinks = async () => {
    try {
      if (!selectedIntern?.latestInterviewId) return;

      const meetingLink = String(meetingLinkInput ?? "").trim();
      if (!meetingLink) return;

      setSavingLinks(true);

      const notesParts: string[] = [];
      const feedback = String(feedbackLinkInput ?? "").trim();
      const recording = String(recordingLinkInput ?? "").trim();
      if (feedback) notesParts.push(`feedback: ${feedback}`);
      if (recording) notesParts.push(`recording: ${recording}`);
      const notes = notesParts.length ? notesParts.join("\n") : null;

      const res = await apiRequest(
        "PUT",
        `/api/admin/interviews/${selectedIntern.latestInterviewId}/meeting-link`,
        {
          meetingLink,
          notes,
        },
      );
      const json = await res.json();
      const updatedInterview = json?.interview ?? null;
      const updatedLink =
        (updatedInterview?.meet_link ?? updatedInterview?.meetingLink ?? meetingLink) as string;
      const updatedFeedbackLink =
        (updatedInterview?.feedback_link ?? updatedInterview?.feedbackLink ?? null) as string | null;
      const updatedRecordingLink =
        (updatedInterview?.recording_link ?? updatedInterview?.recordingLink ?? null) as string | null;

      const updatedRawStatus = String(updatedInterview?.status ?? "").trim().toLowerCase();
      const isDone = ["completed", "expired", "cancelled", "canceled"].includes(updatedRawStatus);
      const nextInterviewBadge: Intern["interview"] = isDone ? "Completed" : "Interview";

      setInterns((prev) =>
        prev.map((i) =>
          i.id === selectedIntern.id
            ? {
                ...i,
                interview: nextInterviewBadge,
                interviewLink: updatedLink,
                feedbackLink: updatedFeedbackLink,
                recordingLink: updatedRecordingLink,
              }
            : i,
        ),
      );

      await loadInterns();

      setOpenLinksModal(false);
      setSelectedIntern(null);
    } catch (e) {
      console.error("Save interview link error:", e);
    } finally {
      setSavingLinks(false);
    }
  };

  return (
    <AdminLayout
      title="Interns"
      description="Review intern proposals, update ratings, and manage interview links."
    >
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-row items-center justify-between p-6 transition-all hover:shadow-md">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Interns</p>
              <h2 className="text-3xl font-bold tracking-tight">{overview.total}</h2>
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Users className="h-6 w-6" />
            </div>
          </Card>

          <Card className="flex flex-row items-center justify-between p-6 transition-all hover:shadow-md">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Now</p>
              <h2 className="text-3xl font-bold tracking-tight text-emerald-600">{overview.active}</h2>
            </div>
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
              <Activity className="h-6 w-6" />
            </div>
          </Card>

         
          <Card className="flex flex-row items-center justify-between p-6 transition-all hover:shadow-md">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Onboarded</p>
              <h2 className="text-3xl font-bold tracking-tight text-blue-600">{overview.onboarded}</h2>
            </div>
            <div className="rounded-full bg-blue-50 p-3 text-blue-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col p-6 transition-all hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Proposal vs Interview</h3>
                <p className="text-sm text-muted-foreground">Status distribution of all interns</p>
              </div>
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <ChartContainer config={overview.interviewConfig as any} className="h-[240px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                  <Pie
                    data={overview.interviewSeries}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    strokeWidth={0}
                  >
                    {overview.interviewSeries.map((entry) => (
                      <Cell key={entry.key} fill={(entry as any).fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                </PieChart>
              </ChartContainer>
            </div>
          </Card>

          <Card className="flex flex-col p-6 transition-all hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Activity Trends</h3>
                <p className="text-sm text-muted-foreground">All Proposals vs All Interviews (Last 6 months)</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="h-[240px] w-full">
              {dashboardAnalyticsError ? (
                <div className="flex h-full items-center justify-center text-sm text-destructive">
                  {dashboardAnalyticsError}
                </div>
              ) : (
                <ChartContainer config={trendConfig} className="h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={proposalsTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        className="text-xs font-medium"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        className="text-xs font-medium"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="applications"
                        stroke="var(--color-applications)"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="interviews"
                        stroke="var(--color-interviews)"
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: "white" }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Intern List Section */}
        <Card className="border-none shadow-sm overflow-hidden bg-background">
          <div className="flex flex-col gap-8 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Intern Directory</h3>
                <p className="text-sm text-muted-foreground">Manage, evaluate, and monitor all registered interns in one place.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!file) return;
                    void handleUploadFile(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 gap-2 border-muted-foreground/20 hover:bg-muted/50 shadow-sm"
                  onClick={handleDownloadSample}
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>Sample</span>
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 gap-2 border-muted-foreground/20 hover:bg-muted/50 shadow-sm"
                  onClick={handleExportExcel}
                  disabled={sorted.length === 0}
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>Export</span>
                </Button>
                <Button
                  size="default"
                  className="h-10 gap-2 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-[0.98]"
                  onClick={handleUploadClick}
                  disabled={uploading}
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>{uploading ? "Uploading..." : "Upload Ratings"}</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Filter Toolbar */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      placeholder="Search name, email, phone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-12 pl-12 border-muted-foreground/20 focus-visible:ring-primary transition-all shadow-sm text-base rounded-xl"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Select
                      value={interviewStatusFilter}
                      onValueChange={(v) => setInterviewStatusFilter(v === "__clear__" ? "" : (v as any))}
                    >
                      <SelectTrigger className="h-12 w-full sm:w-[220px] border-muted-foreground/20 shadow-sm rounded-xl">
                        <ListFilter className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Interview Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="__clear__">All Status</SelectItem>
                        <SelectItem value="Waiting">Not applied</SelectItem>
                        <SelectItem value="Applied">Applied / Pending</SelectItem>
                        <SelectItem value="Interview">Scheduled</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Collapsible className="w-full sm:w-auto">
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="h-12 w-full gap-2 border-muted-foreground/20 shadow-sm hover:bg-muted/50 data-[state=open]:bg-muted rounded-xl"
                          >
                            <Filter className="h-4 w-4" />
                            <span className="font-medium">Advanced Filters</span>
                            {hasActiveFilters && (
                              <span className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in duration-200">
                                !
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200 absolute left-0 right-0 z-50">
                          <div className="rounded-2xl border border-muted-foreground/10 bg-background p-8 shadow-2xl ring-1 ring-black/5">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Advanced Filters
                              </h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-8 px-3 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="mr-2 h-3 w-3" />
                                Reset All
                              </Button>
                            </div>
                            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Receipt className="h-3.5 w-3.5" />
                                  Payout
                                </label>
                                <Select value={internPayoutFilter} onValueChange={(v) => setInternPayoutFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All payout" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All payout</SelectItem>
                                    <SelectItem value="Not started">Not started</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Activity className="h-3.5 w-3.5" />
                                  Offer Status
                                </label>
                                <Select value={offerStatusFilter} onValueChange={(v) => setOfferStatusFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All offer status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All offer status</SelectItem>
                                    <SelectItem value="Hired">Hired</SelectItem>
                                    <SelectItem value="Accepted">Accepted</SelectItem>
                                    <SelectItem value="Sent">Sent</SelectItem>
                                    <SelectItem value="Rejected">Offer rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Visibility
                                </label>
                                <Select value={liveHiddenFilter} onValueChange={(v) => setLiveHiddenFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All Live / Hidden" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All Live / Hidden</SelectItem>
                                    <SelectItem value="Live">Live</SelectItem>
                                    <SelectItem value="Hidden">Hidden</SelectItem>
                                    <SelectItem value="Deactivated">Deactivated</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <GraduationCap className="h-3.5 w-3.5" />
                                  Internship
                                </label>
                                <Select value={internshipStatusFilter} onValueChange={(v) => setInternshipStatusFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All Internship Status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All Internship Status</SelectItem>
                                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="-">-</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Receipt className="h-3.5 w-3.5" />
                                  Payment
                                </label>
                                <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All Payment Status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All Payment Status</SelectItem>
                                    <SelectItem value="Paid">Paid</SelectItem>
                                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  Onboarding
                                </label>
                                <Select value={onboardingStatusFilter} onValueChange={(v) => setOnboardingStatusFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All Onboarding" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All Onboarding</SelectItem>
                                    <SelectItem value="Onboarded">Onboarded</SelectItem>
                                    <SelectItem value="Not onboarded">Not onboarded</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Users className="h-3.5 w-3.5" />
                                  Profile
                                </label>
                                <Select value={profileStatusFilter} onValueChange={(v) => setProfileStatusFilter(v === "__clear__" ? "" : (v as any))}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="All Profile Status" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="__clear__">All Profile Status</SelectItem>
                                    <SelectItem value="Complete">Profile Complete</SelectItem>
                                    <SelectItem value="Incomplete">Incomplete Profile</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <Star className="h-3.5 w-3.5" />
                                  Min Score
                                </label>
                                <div className="relative">
                                  <Input
                                    className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg pl-3 pr-10"
                                    value={minFindternScore}
                                    onChange={(e) => setMinFindternScore(e.target.value)}
                                    placeholder="0-10"
                                    inputMode="numeric"
                                  />
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50">/ 10</div>
                                </div>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <ArrowDown className="h-3.5 w-3.5" />
                                  Sort By
                                </label>
                                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="Sort" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="createdAt">Created On</SelectItem>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2.5">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                  <ListFilter className="h-3.5 w-3.5" />
                                  Order
                                </label>
                                <Select value={sortDir} onValueChange={(v) => setSortDir(v as any)}>
                                  <SelectTrigger className="h-10 bg-background border-muted-foreground/20 shadow-sm rounded-lg">
                                    <SelectValue placeholder="Order" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg">
                                    <SelectItem value="desc">DESC</SelectItem>
                                    <SelectItem value="asc">ASC</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetFilters}
                          className="h-12 px-4 text-muted-foreground hover:text-destructive transition-colors rounded-xl"
                        >
                          <X className="mr-2 h-4 w-4" />
                          <span className="font-medium">Clear</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(uploadMessage || uploadError) && (
              <div className="rounded-lg border bg-muted/50 px-4 py-2 text-sm">
                {uploadError ? (
                  <span className="font-medium text-destructive">Error: {uploadError}</span>
                ) : (
                  <span className="font-medium text-emerald-600">{uploadMessage}</span>
                )}
              </div>
            )}

            <div className="relative w-full overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <Table className="min-w-[1700px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                  {visibleColumns.map((col) => (
                    <TableHead key={col.key} className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={col} alignRight={col.key === "actions"} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-sm font-medium text-muted-foreground">Loading interns...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                        <Activity className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-destructive">{error}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-muted p-3 text-muted-foreground">
                        <Search className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No interns found matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((intern, index) => (
                  <TableRow
                    key={intern.id}
                    className="group border-b transition-colors hover:bg-muted/30"
                  >
                    {columnVisibility.sno && (
                      <TableCell className="py-4 text-xs text-muted-foreground font-medium">
                        {startIndex + index + 1}
                      </TableCell>
                    )}
                    {columnVisibility.name && (
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
                            {intern.name}
                          </span>
                          {intern.isFullTime && (
                            <Badge className="w-fit bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-bold py-0 h-4 uppercase tracking-wider">
                              Full Time
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.email && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {intern.email}
                      </TableCell>
                    )}
                    {columnVisibility.phone && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {intern.phone}
                      </TableCell>
                    )}
                    {columnVisibility.createdAt && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {intern.createdAt}
                      </TableCell>
                    )}
                    {columnVisibility.interview && (
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit font-bold text-[10px] uppercase tracking-wider px-2 py-0.5",
                              intern.interview === "Scheduled"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                : intern.interview === "Sent"
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-700"
                                  : intern.interview === "Expired"
                                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                                    : intern.interview === "Completed"
                                      ? "border-sky-500/20 bg-sky-500/10 text-sky-700"
                                      : intern.interview === "Applied"
                                        ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                                        : "border-muted-foreground/20 bg-muted/50 text-muted-foreground"
                            )}
                          >
                            {intern.interview}
                          </Badge>

                        </div>
                      </TableCell>
                    )}

                    {/* {columnVisibility.interviewSent && (
                      <TableCell className="py-4 text-center">
                        {Number(intern.interviewSentCount ?? 0) > 0 ? (
                          <Badge className="bg-blue-50/50 text-blue-700 border-blue-200/50 font-bold" variant="outline">
                            {intern.interviewSentCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )} */}

                    {columnVisibility.interviewScheduled && (
                      <TableCell className="py-4 text-center">
                        {Number(intern.interviewScheduledCount ?? 0) > 0 ? (
                          <Badge className="bg-emerald-50/50 text-emerald-700 border-emerald-200/50 font-bold" variant="outline">
                            {intern.interviewScheduledCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.interviewCompleted && (
                      <TableCell className="py-4 text-center">
                        {Number(intern.interviewCompletedCount ?? 0) > 0 ? (
                          <Badge className="bg-sky-50/50 text-sky-700 border-sky-200/50 font-bold" variant="outline">
                            {intern.interviewCompletedCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.interviewExpired && (
                      <TableCell className="py-4 text-center">
                        {Number(intern.interviewExpiredCount ?? 0) > 0 ? (
                          <Badge className="bg-red-50/50 text-red-700 border-red-200/50 font-bold" variant="outline">
                            {intern.interviewExpiredCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.interviewPending && (
                      <TableCell className="py-4 text-center">
                        {Number(intern.pendingInterviewCount ?? 0) > 0 ? (
                          <Badge className="bg-amber-50/50 text-amber-700 border-amber-200/50 font-bold" variant="outline">
                            {intern.pendingInterviewCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.totalInterview && (
                      <TableCell className="py-4 text-center">
                        {(() => {
                          const total =  
                                       (intern.interviewScheduledCount ?? 0) + 
                                       (intern.interviewCompletedCount ?? 0) + 
                                       (intern.interviewExpiredCount ?? 0) +
                                       (intern.pendingInterviewCount ?? 0);
                          return total > 0 ? (
                            <Badge className="bg-purple-50/50 text-purple-700 border-purple-200/50 font-bold" variant="outline">
                              {total}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40">-</span>
                          );
                        })()}
                      </TableCell>
                    )}

                    {columnVisibility.findternScore && (
                      <TableCell className="py-4 whitespace-nowrap text-sm font-bold text-primary">
                        {typeof intern.findternScore === "number" && Number.isFinite(intern.findternScore)
                          ? formatRating(intern.findternScore)
                          : <span className="text-muted-foreground/40 font-normal">-</span>}
                      </TableCell>
                    )}

                    {columnVisibility.profileStatus && (
                      <TableCell className="py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2",
                            intern.isProfileComplete
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          )}
                        >
                          {intern.isProfileComplete ? "Complete" : "Incomplete"}
                        </Badge>
                      </TableCell>
                    )}

                    {columnVisibility.onboardingStatus && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider",
                          intern.onboardingStatus === "Onboarded" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {intern.onboardingStatus ?? "Not onboarded"}
                        </span>
                      </TableCell>
                    )}

                    {/* {columnVisibility.pendingProposals && (
                      <TableCell className="py-4 whitespace-nowrap text-sm font-medium">
                        {Number(intern.pendingInterviewCount ?? 0) || <span className="text-muted-foreground/40 font-normal">0</span>}
                      </TableCell>
                    )} */}

                    {columnVisibility.toPay && (
                      <TableCell className="py-4 whitespace-nowrap">
                        {(() => {
                          const isOnboarded = String(intern.onboardingStatus ?? "").trim() === "Onboarded";
                          if (!isOnboarded) {
                            return <span className="text-xs text-muted-foreground/40 italic">Not Onboarded</span>;
                          }
                          const toPayMinor = Number(intern.toPayMinor ?? 0) || 0;
                          const hasUpcoming = Boolean(String(intern.upcomingPaymentDueAt ?? "").trim());
                          if (toPayMinor <= 0) {
                            return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider">Completed</Badge>;
                          }
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-emerald-700 tracking-tight">{formatPayoutInInrIfUsd(toPayMinor, intern.offerCurrency)}</span>
                              {hasUpcoming && (
                                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDueDateOnly(intern.upcomingPaymentDueAt)}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                    )}

                    {columnVisibility.upcomingPaymentDate && (
                      <TableCell className="py-4 whitespace-nowrap text-sm">
                        <span className={cn(
                          "font-medium",
                          intern.upcomingPaymentDueAt ? "text-amber-600" : "text-muted-foreground"
                        )}>
                          {intern.upcomingPaymentDueAt ? formatDueDateOnly(intern.upcomingPaymentDueAt) : "-"}
                        </span>
                      </TableCell>
                    )}

                    {columnVisibility.totalToPay && (
                      <TableCell className="py-4 whitespace-nowrap text-sm font-medium text-muted-foreground">
                        {formatPayoutInInrIfUsd(Number(intern.totalToPayMinor ?? 0) || 0, intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.paidTillNow && (
                      <TableCell className="py-4 whitespace-nowrap text-sm font-medium text-emerald-600/80">
                        {formatPayoutInInrIfUsd(Number(intern.paidTillNowMinor ?? 0) || 0, intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.leftToPay && (
                      <TableCell className="py-4 whitespace-nowrap text-sm font-medium text-amber-600/80">
                        {formatPayoutInInrIfUsd(Number(intern.leftToPayMinor ?? 0) || 0, intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.liveStatus && (
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2",
                            intern.liveStatus === "Hidden"
                              ? "border-muted-foreground/20 bg-muted text-muted-foreground"
                              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                          )}
                        >
                          {intern.liveStatus ?? "Live"}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.internshipStatus && (
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {intern.internshipStatus ?? "-"}
                      </TableCell>
                    )}
                    {columnVisibility.paymentStatus && (
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2",
                            String(intern.paymentStatus ?? "").toLowerCase() === "paid"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          )}
                        >
                          {intern.paymentStatus ?? "-"}
                        </Badge>
                      </TableCell>
                    )}

                    {columnVisibility.offerStatus && (
                      <TableCell className="py-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2",
                            String(intern.offerStatus ?? "").toLowerCase() === "rejected"
                              ? "border-destructive/20 bg-destructive/10 text-destructive"
                              : "border-muted-foreground/20 bg-muted text-muted-foreground"
                          )}
                        >
                          {intern.offerStatus ?? "-"}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.accountNumber && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground font-mono tracking-tighter">
                        {intern.bankDetails?.accountNumber ?? "-"}
                      </TableCell>
                    )}
                    {columnVisibility.ifsc && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground font-mono tracking-tighter">
                        {intern.bankDetails?.ifscCode ?? "-"}
                      </TableCell>
                    )}
                    {columnVisibility.bankName && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {intern.bankDetails?.bankName ?? "-"}
                      </TableCell>
                    )}
                    {columnVisibility.upi && (
                      <TableCell className="py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {intern.bankDetails?.upiId ?? "-"}
                      </TableCell>
                    )}

                    {columnVisibility.status && (
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase tracking-wider px-2",
                            intern.status === "Active"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                              : "border-destructive/20 bg-destructive/10 text-destructive"
                          )}
                        >
                          {intern.status}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-muted-foreground/10">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setLocation(`/admin/interns/${intern.id}`)} className="gap-2">
                            <Users className="h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenRatingsModal(intern)} className="gap-2 text-amber-600 focus:text-amber-600">
                            <Star className="h-4 w-4 fill-amber-600/20" />
                            Update Ratings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenLinksModal(intern)} className="gap-2 text-primary focus:text-primary">
                            <Link2 className="h-4 w-4" />
                            Interview Links
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          {intern.status === "Inactive" ? (
                            <DropdownMenuItem onClick={() => void handleActivateIntern(intern.id)} className="gap-2 text-emerald-600 focus:text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Activate Intern
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => void handleDeactivateIntern(intern.id)}
                              className="gap-2 text-destructive focus:text-destructive"
                            >
                              <Activity className="h-4 w-4" />
                              Deactivate Intern
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Section */}
        {!loading && !error && sorted.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-4 border-t px-6 py-4 md:flex-row">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
              <span className="font-semibold text-foreground">{Math.min(endIndex, total)}</span> of{" "}
              <span className="font-semibold text-foreground">{total}</span> interns
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-muted-foreground">Rows per page</p>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <div className="flex h-8 items-center justify-center rounded-md border bg-muted/50 px-3 text-xs font-bold">
                  Page {safePage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  </div>

  {/* Interview Links Modal */}
      <Dialog
        open={openLinksModal}
        onOpenChange={(open) => {
          setOpenLinksModal(open);
          if (!open) {
            setSelectedIntern(null);
            setMeetingLinkInput("");
            setFeedbackLinkInput("");
            setRecordingLinkInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Interview Links
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Update the meeting, feedback, and recording links for {selectedIntern?.name}.
            </p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meeting Link</label>
              <Input
                placeholder="https://zoom.us/j/..."
                value={meetingLinkInput}
                onChange={(e) => setMeetingLinkInput(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feedback Link</label>
              <Input
                placeholder="https://forms.gle/..."
                value={feedbackLinkInput}
                onChange={(e) => setFeedbackLinkInput(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recording Link</label>
              <Input
                placeholder="https://drive.google.com/..."
                value={recordingLinkInput}
                onChange={(e) => setRecordingLinkInput(e.target.value)}
                className="h-10"
              />
            </div>
            <Button
              className="mt-2 w-full font-bold shadow-sm"
              disabled={savingLinks || !selectedIntern?.latestInterviewId || !meetingLinkInput.trim()}
              onClick={() => void handleSaveInterviewLinks()}
            >
              {savingLinks ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Update Links
                </>
              )}
            </Button>
            {!selectedIntern?.latestInterviewId && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 border border-amber-200">
                This intern has not applied for an interview yet. Links can only be updated for active applications.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ratings Modal */}
      <Dialog
        open={openRatingsModal}
        onOpenChange={(open) => {
          setOpenRatingsModal(open);
          if (!open) {
            setSelectedIntern(null);
            setCommunicationRating("");
            setInterviewRating("");
            setAptitudeRating("");
            setCodingRating("");
            setFindternScore("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Skill Ratings
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Evaluate {selectedIntern?.name}'s performance across different categories (0-10).
            </p>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Communication</label>
                <Input
                  placeholder="0.0"
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={communicationRating}
                  onChange={(e) => setCommunicationRating(e.target.value)}
                  onBlur={() => handleRatingBlur(communicationRating, setCommunicationRating)}
                  className="h-10 font-mono font-bold"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Coding</label>
                <Input
                  placeholder="0.0"
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={codingRating}
                  onChange={(e) => setCodingRating(e.target.value)}
                  onBlur={() => handleRatingBlur(codingRating, setCodingRating)}
                  className="h-10 font-mono font-bold"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aptitude</label>
                <Input
                  placeholder="0.0"
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={aptitudeRating}
                  onChange={(e) => setAptitudeRating(e.target.value)}
                  onBlur={() => handleRatingBlur(aptitudeRating, setAptitudeRating)}
                  className="h-10 font-mono font-bold"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Interview</label>
                <Input
                  placeholder="0.0"
                  type="number"
                  min={0}
                  max={10}
                  step="0.1"
                  value={interviewRating}
                  onChange={(e) => setInterviewRating(e.target.value)}
                  onBlur={() => handleRatingBlur(interviewRating, setInterviewRating)}
                  className="h-10 font-mono font-bold"
                />
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 p-6 border border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary/60">Calculated Findtern Score</p>
                  <p className="text-sm text-muted-foreground">Average of all ratings</p>
                </div>
                <div className="text-4xl font-black text-primary tracking-tighter">
                  {findternScore || "0.0"}
                </div>
              </div>
            </div>

            <Button
              className="w-full font-bold shadow-md h-11"
              onClick={() => void handleSaveRatings()}
              disabled={savingRatings || !selectedIntern?.id}
            >
              {savingRatings ? (
                <>
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                  Updating Ratings...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}