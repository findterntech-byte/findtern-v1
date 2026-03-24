import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  interviewSentCount?: number;
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
    | "interviewSent"
    | "interviewScheduled"
    | "interviewCompleted"
    | "pendingProposals"
    | "toPay"
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
    | "approval"
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
        { key: "interviewSent" as const, label: "Sent" },
        { key: "interviewScheduled" as const, label: "Scheduled" },
        { key: "interviewCompleted" as const, label: "Completed" },
        { key: "findternScore" as const, label: "Findtern Score" },
        { key: "profileStatus" as const, label: "Profile Status" },
        { key: "onboardingStatus" as const, label: "Onboarding status", filterKey: "onboardingStatus" as const },
        { key: "pendingProposals" as const, label: "Pending Interviews", sortKey: "pendingInterviewCount" as const },
        { key: "toPay" as const, label: "Intern payout (50%)", sortKey: "toPay" as const },
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
        { key: "approval" as const, label: "Approval" },
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

    const interviewCounts = interns.reduce(
      (acc, i) => {
        const key = i.interview || "Waiting";
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const approvalSeries = [
      { key: "Approved", value: approved, fill: "hsl(142 76% 36%)" },
      { key: "Pending", value: pendingApproval, fill: "hsl(38 92% 50%)" },
      { key: "Rejected", value: rejected, fill: "hsl(0 72% 51%)" },
    ].filter((x) => x.value > 0);

    const interviewSeries = ["Waiting", "Applied", "Interview", "Completed"].map(
      (k) => ({
        key: k,
        value: Number(interviewCounts[k] ?? 0),
      }),
    );

    const interviewPalette: Record<string, string> = {
      Waiting: "hsl(215 16% 47%)",
      Applied: "hsl(38 92% 50%)",
      Interview: "hsl(0 72% 51%)",
      Completed: "hsl(199 89% 48%)",
    };

    const interviewSeriesWithFill = interviewSeries
      .filter((x) => x.value > 0)
      .map((x) => ({ ...x, fill: interviewPalette[x.key] ?? "hsl(215 16% 47%)" }));

    const approvalConfig = {
      Approved: { label: "Approved", color: "hsl(142 76% 36%)" },
      Pending: { label: "Pending", color: "hsl(38 92% 50%)" },
      Rejected: { label: "Rejected", color: "hsl(0 72% 51%)" },
    } as const;

    const interviewConfig = {
      Waiting: { label: "Waiting", color: "hsl(215 16% 47%)" },
      Applied: { label: "Applied", color: "hsl(38 92% 50%)" },
      Interview: { label: "Interview", color: "hsl(0 72% 51%)" },
      Completed: { label: "Completed", color: "hsl(199 89% 48%)" },
    } as const;

    return {
      total,
      active,
      inactive,
      pendingApproval,
      approved,
      rejected,
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
          const interviewSentCountRaw = Number((item as any)?.interviewSentCount ?? 0);
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
          const internshipStatus = String((item as any)?.internshipStatus ?? "-");
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
            interviewSentCount: Number.isFinite(interviewSentCountRaw) ? Math.max(0, Math.floor(interviewSentCountRaw)) : 0,
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
        if (c.key === "interviewSent") row[c.label] = intern.interviewSentCount ?? 0;
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
          const minor = intern.totalToPayMinor == null ? null : Number(intern.totalToPayMinor);
          row[c.label] = minor == null ? "-" : minor / 100;
        }
        if (c.key === "paidTillNow") {
          const minor = Number(intern.paidTillNowMinor ?? 0) || 0;
          row[c.label] = minor / 100;
        }
        if (c.key === "leftToPay") {
          const minor = intern.leftToPayMinor == null ? null : Number(intern.leftToPayMinor);
          row[c.label] = minor == null ? "-" : minor / 100;
        }
        if (c.key === "liveStatus") row[c.label] = intern.liveStatus ?? "Live";
        if (c.key === "internshipStatus") row[c.label] = intern.internshipStatus ?? "-";
        if (c.key === "paymentStatus") row[c.label] = intern.paymentStatus ?? "-";
        if (c.key === "offerStatus") row[c.label] = intern.offerStatus ?? "-";
        if (c.key === "accountNumber") row[c.label] = intern.bankDetails?.accountNumber ?? "-";
        if (c.key === "ifsc") row[c.label] = intern.bankDetails?.ifscCode ?? "-";
        if (c.key === "bankName") row[c.label] = intern.bankDetails?.bankName ?? "-";
        if (c.key === "upi") row[c.label] = intern.bankDetails?.upiId ?? "-";
        if (c.key === "approval") row[c.label] = intern.approvalStatus;
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
      const toPayMinor = Number(intern.toPayMinor ?? 0) || 0;
      const hasUpcoming = Boolean(String(intern.upcomingPaymentDueAt ?? "").trim());
      const payoutTotal = Number(intern.payoutTotalCount ?? 0) || 0;
      const isNotStarted = payoutTotal <= 0;
      const isComplete = !isNotStarted && (!hasUpcoming || toPayMinor <= 0);
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 md:col-span-2 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Proposal vs Interview</p>
        
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            

            <ChartContainer config={overview.interviewConfig as any} className="h-[220px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
                <Pie
                  data={overview.interviewSeries}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
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

        <Card className="p-5 md:col-span-2 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Proposals vs AI Interviews</p>
              <p className="mt-2 text-sm text-muted-foreground">Last 6 months</p>
            </div>
          </div>
          <div className="mt-4 h-[240px]">
            {dashboardAnalyticsError ? (
              <p className="text-sm text-red-600">{dashboardAnalyticsError}</p>
            ) : (
              <ChartContainer config={trendConfig}>
                <ResponsiveContainer>
                  <LineChart data={proposalsTrendData}>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
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
            )}
          </div>
        </Card>

       
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-muted-foreground">Intern List</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end md:w-auto">
            <div className="relative w-full sm:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <Select
              value={interviewStatusFilter}
              onValueChange={(v) => setInterviewStatusFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="Proposal vs Interview" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Proposal vs Interview</SelectItem>
                <SelectItem value="Waiting">Not applied</SelectItem>
                <SelectItem value="Applied">Applied / Pending</SelectItem>
                <SelectItem value="Interview">Scheduled</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={internPayoutFilter} onValueChange={(v) => setInternPayoutFilter(v === "__clear__" ? "" : (v as any))}>
              <SelectTrigger className="h-10 w-full sm:w-[170px]">
                <SelectValue placeholder="Intern payout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All payout</SelectItem>
                <SelectItem value="Not started">Not started</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={offerStatusFilter} onValueChange={(v) => setOfferStatusFilter(v === "__clear__" ? "" : (v as any))}>
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="Offer status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All offer status</SelectItem>
                <SelectItem value="Rejected">Offer rejected by intern</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={liveHiddenFilter}
              onValueChange={(v) => setLiveHiddenFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[170px]">
                <SelectValue placeholder="Live / Hidden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Live / Hidden</SelectItem>
                <SelectItem value="Live">Live</SelectItem>
                <SelectItem value="Hidden">Hidden</SelectItem>
                <SelectItem value="Deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={internshipStatusFilter}
              onValueChange={(v) => setInternshipStatusFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="Internship Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Internship Status</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="-">-</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={paymentStatusFilter}
              onValueChange={(v) => setPaymentStatusFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[170px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Payment Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={onboardingStatusFilter}
              onValueChange={(v) => setOnboardingStatusFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="Onboarding status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Onboarding</SelectItem>
                <SelectItem value="Onboarded">Onboarded</SelectItem>
                <SelectItem value="Not onboarded">Not onboarded</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={profileStatusFilter}
              onValueChange={(v) => setProfileStatusFilter(v === "__clear__" ? "" : (v as any))}
            >
              <SelectTrigger className="h-10 w-full sm:w-[190px]">
                <SelectValue placeholder="Profile status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">All Profile Status</SelectItem>
                <SelectItem value="Complete">Profile Complete</SelectItem>
                <SelectItem value="Incomplete">Incomplete Profile</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-full sm:w-[180px]">
              <Input
                className="h-10"
                value={minFindternScore}
                onChange={(e) => setMinFindternScore(e.target.value)}
                placeholder="Min score (0-10)"
                inputMode="numeric"
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-10 w-full sm:w-[160px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Created On</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
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
              className="h-10 bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload Skill Ratings"}
            </Button>
            <Button className="h-10" variant="outline" onClick={handleDownloadSample}>
              <Download className="mr-2 h-4 w-4" />
              Download Sample
            </Button>
            <Button
              className="h-10"
              variant="outline"
              onClick={handleExportExcel}
              disabled={sorted.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {(uploadMessage || uploadError) && (
          <div className="px-6 pt-3 text-sm">
            {uploadError ? (
              <span className="text-red-600">{uploadError}</span>
            ) : (
              <span className="text-emerald-700">{uploadMessage}</span>
            )}
          </div>
        )}
        <div className="px-4 py-4">
          <div className="relative w-full overflow-auto rounded-lg border">
            <Table className="min-w-[1700px]">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow className="bg-background">
                  {columnVisibility.sno && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[0]} />
                    </TableHead>
                  )}
                  {columnVisibility.name && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[1]} />
                    </TableHead>
                  )}
                  {columnVisibility.email && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[2]} />
                    </TableHead>
                  )}
                  {columnVisibility.phone && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[3]} />
                    </TableHead>
                  )}
                  {columnVisibility.createdAt && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[4]} />
                    </TableHead>
                  )}
                  {columnVisibility.interview && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[5]} />
                    </TableHead>
                  )}
                  {columnVisibility.interviewSent && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[6]} />
                    </TableHead>
                  )}
                  {columnVisibility.interviewScheduled && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[7]} />
                    </TableHead>
                  )}
                  {columnVisibility.interviewCompleted && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[8]} />
                    </TableHead>
                  )}
                  {columnVisibility.findternScore && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[9]} />
                    </TableHead>
                  )}
                  {columnVisibility.profileStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[10]} />
                    </TableHead>
                  )}
                  {columnVisibility.onboardingStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[11]} />
                    </TableHead>
                  )}
                  {columnVisibility.pendingProposals && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[12]} />
                    </TableHead>
                  )}
                  {columnVisibility.toPay && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[13]} />
                    </TableHead>
                  )}
                  {columnVisibility.totalToPay && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[14]} />
                    </TableHead>
                  )}
                  {columnVisibility.paidTillNow && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[15]} />
                    </TableHead>
                  )}
                  {columnVisibility.leftToPay && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[16]} />
                    </TableHead>
                  )}
                  {columnVisibility.liveStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[17]} />
                    </TableHead>
                  )}
                  {columnVisibility.internshipStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[18]} />
                    </TableHead>
                  )}
                  {columnVisibility.paymentStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[19]} />
                    </TableHead>
                  )}
                  {columnVisibility.offerStatus && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[20]} />
                    </TableHead>
                  )}
                  {columnVisibility.accountNumber && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[21]} />
                    </TableHead>
                  )}
                  {columnVisibility.ifsc && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[22]} />
                    </TableHead>
                  )}
                  {columnVisibility.bankName && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[23]} />
                    </TableHead>
                  )}
                  {columnVisibility.upi && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[24]} />
                    </TableHead>
                  )}

                  {/* {columnVisibility.approval && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[25]} />
                    </TableHead>
                  )} */}
          
                  {columnVisibility.status && (
                    <TableHead className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      <ColumnHeader col={columns[26]} />
                    </TableHead>
                  )}
                  <TableHead className="whitespace-nowrap text-right text-xs font-semibold text-muted-foreground">
                    <ColumnHeader col={columns[27]} alignRight />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-sm text-muted-foreground">
                    Loading interns...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-sm text-red-600">
                    {error}
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnCount} className="py-8 text-center text-sm text-muted-foreground">
                    No interns found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((intern, index) => (
                  <TableRow
                    key={intern.id}
                    className={
                      (startIndex + index) % 2 === 0
                        ? "bg-background hover:bg-muted/40"
                        : "bg-muted/20 hover:bg-muted/40"
                    }
                  >
                    {columnVisibility.sno && <TableCell>{startIndex + index + 1}</TableCell>}
                    {columnVisibility.name && (
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{intern.name}</span>
                          {intern.isFullTime && (
                            <Badge className="mt-1 w-fit bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-semibold py-0 h-4">
                              Full Time
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {columnVisibility.email && (
                      <TableCell className="whitespace-nowrap">{intern.email}</TableCell>
                    )}
                    {columnVisibility.phone && (
                      <TableCell className="whitespace-nowrap">{intern.phone}</TableCell>
                    )}
                    {columnVisibility.createdAt && <TableCell>{intern.createdAt}</TableCell>}
                    {columnVisibility.interview && (
                      <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={
                            intern.interview === "Scheduled"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : intern.interview === "Sent"
                                ? "border-blue-400 bg-blue-50 text-blue-700"
                                : intern.interview === "Expired"
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : intern.interview === "Completed"
                                    ? "border-sky-500 bg-sky-50 text-sky-700"
                                    : intern.interview === "Applied"
                                      ? "border-amber-400 bg-amber-50 text-amber-700"
                                      : "border-slate-300 bg-slate-50 text-slate-700"
                          }
                        >
                          {intern.interview}
                        </Badge>
                        {Number(intern.totalInterviewCount ?? 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            Total: {intern.totalInterviewCount}
                          </span>
                        )}
                      </div>
                      </TableCell>
                    )}

                    {columnVisibility.interviewSent && (
                      <TableCell className="text-center">
                        {Number(intern.interviewSentCount ?? 0) > 0 ? (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-400" variant="outline">
                            {intern.interviewSentCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.interviewScheduled && (
                      <TableCell className="text-center">
                        {Number(intern.interviewScheduledCount ?? 0) > 0 ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-500" variant="outline">
                            {intern.interviewScheduledCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.interviewCompleted && (
                      <TableCell className="text-center">
                        {Number(intern.interviewCompletedCount ?? 0) > 0 ? (
                          <Badge className="bg-sky-50 text-sky-700 border-sky-500" variant="outline">
                            {intern.interviewCompletedCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}

                    {columnVisibility.findternScore && (
                      <TableCell className="whitespace-nowrap">
                        {typeof intern.findternScore === "number" && Number.isFinite(intern.findternScore)
                          ? formatRating(intern.findternScore)
                          : "-"}
                      </TableCell>
                    )}

                    {columnVisibility.profileStatus && (
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            intern.isProfileComplete
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-amber-400 bg-amber-50 text-amber-700"
                          }
                        >
                          {intern.isProfileComplete ? "Complete" : "Incomplete"}
                        </Badge>
                      </TableCell>
                    )}

                    {columnVisibility.onboardingStatus && (
                      <TableCell className="whitespace-nowrap">{intern.onboardingStatus ?? "Not onboarded"}</TableCell>
                    )}

                    {columnVisibility.pendingProposals && (
                      <TableCell className="whitespace-nowrap">{Number(intern.pendingInterviewCount ?? 0) || 0}</TableCell>
                    )}

                    {columnVisibility.toPay && (
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const isOnboarded = String(intern.onboardingStatus ?? "").trim() === "Onboarded";
                          if (!isOnboarded) {
                            return <span className="text-sm text-muted-foreground">-</span>;
                          }
                          const toPayMinor = Number(intern.toPayMinor ?? 0) || 0;
                          const hasUpcoming = Boolean(String(intern.upcomingPaymentDueAt ?? "").trim());
                          const isComplete = !hasUpcoming || toPayMinor <= 0;
                          if (isComplete) {
                            return <span className="text-sm text-muted-foreground">Completed</span>;
                          }
                          return (
                            <div className="flex flex-col">
                              <span>{formatPayoutInInrIfUsd(toPayMinor, intern.offerCurrency)}</span>
                              <span className="text-xs text-muted-foreground">{formatDueDateOnly(intern.upcomingPaymentDueAt)}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    )}

                    {columnVisibility.totalToPay && (
                      <TableCell className="whitespace-nowrap">
                        {intern.totalToPayMinor == null
                          ? "-"
                          : formatPayoutInInrIfUsd(Number(intern.totalToPayMinor), intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.paidTillNow && (
                      <TableCell className="whitespace-nowrap">
                        {formatPayoutInInrIfUsd(Number(intern.paidTillNowMinor ?? 0) || 0, intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.leftToPay && (
                      <TableCell className="whitespace-nowrap">
                        {intern.leftToPayMinor == null
                          ? "-"
                          : formatPayoutInInrIfUsd(Number(intern.leftToPayMinor), intern.offerCurrency)}
                      </TableCell>
                    )}

                    {columnVisibility.liveStatus && (
                      <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          intern.liveStatus === "Hidden"
                            ? "border-slate-400 bg-slate-50 text-slate-700"
                            : "border-emerald-500 bg-emerald-50 text-emerald-700"
                        }
                      >
                        {intern.liveStatus ?? "Live"}
                      </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.internshipStatus && (
                      <TableCell>{intern.internshipStatus ?? "-"}</TableCell>
                    )}
                    {columnVisibility.paymentStatus && (
                      <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          String(intern.paymentStatus ?? "").toLowerCase() === "paid"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-amber-400 bg-amber-50 text-amber-700"
                        }
                      >
                        {intern.paymentStatus ?? "-"}
                      </Badge>
                      </TableCell>
                    )}

                    {columnVisibility.offerStatus && (
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            String(intern.offerStatus ?? "").toLowerCase() === "rejected"
                              ? "border-red-500 bg-red-50 text-red-700"
                              : "border-slate-300 bg-slate-50 text-slate-700"
                          }
                        >
                          {intern.offerStatus ?? "-"}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.accountNumber && (
                      <TableCell className="whitespace-nowrap">{intern.bankDetails?.accountNumber ?? "-"}</TableCell>
                    )}
                    {columnVisibility.ifsc && (
                      <TableCell className="whitespace-nowrap">{intern.bankDetails?.ifscCode ?? "-"}</TableCell>
                    )}
                    {columnVisibility.bankName && (
                      <TableCell className="whitespace-nowrap">{intern.bankDetails?.bankName ?? "-"}</TableCell>
                    )}
                    {columnVisibility.upi && (
                      <TableCell className="whitespace-nowrap">{intern.bankDetails?.upiId ?? "-"}</TableCell>
                    )}

                    {/* {columnVisibility.approval && (
                      <TableCell className="whitespace-nowrap">
                        <Select
                          value={intern.approvalStatus}
                          onValueChange={(v) => void handleApprovalChange(intern.id, v as any)}
                          disabled={Boolean(approvalSaving[intern.id])}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )} */}
                  
                    {columnVisibility.status && (
                      <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          intern.status === "Active"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-400 bg-slate-50 text-slate-700"
                        }
                      >
                        {intern.status}
                      </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setLocation(`/admin/interns/${intern.id}`)}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenRatingsModal(intern)}>
                            <Star className="h-4 w-4" />
                            Ratings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenLinksModal(intern)}>
                            <Link2 className="h-4 w-4" />
                            Interview Links
                          </DropdownMenuItem>
                        
                         
                          <DropdownMenuSeparator />
                          {intern.status === "Inactive" ? (
                            <DropdownMenuItem onClick={() => void handleActivateIntern(intern.id)}>
                              Activate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => void handleDeactivateIntern(intern.id)}
                              className="text-red-700"
                            >
                              Deactivate
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
                  {openFilterFor ? `Filter: ${columns.find((c) => c.key === openFilterFor)?.label ?? openFilterFor}` : "Filter"}
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

          {!loading && !error && sorted.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, total)} of {total}
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v) as 5 | 10 | 25 | 50)}
                >
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Interview Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Interview Link"
              value={meetingLinkInput}
              onChange={(e) => setMeetingLinkInput(e.target.value)}
            />
            <Input
              placeholder="Feedback Link"
              value={feedbackLinkInput}
              onChange={(e) => setFeedbackLinkInput(e.target.value)}
            />
            <Input
              placeholder="Recording Link"
              value={recordingLinkInput}
              onChange={(e) => setRecordingLinkInput(e.target.value)}
            />
            <Button
              className="mt-2 w-full bg-[#0E6049] hover:bg-[#0b4b3a]"
              disabled={savingLinks || !selectedIntern?.latestInterviewId || !meetingLinkInput.trim()}
              onClick={() => void handleSaveInterviewLinks()}
            >
              <Link2 className="mr-2 h-4 w-4" />
              {savingLinks ? "Saving..." : "Save Links"}
            </Button>
            {!selectedIntern?.latestInterviewId && (
              <p className="text-xs text-muted-foreground">
                This intern has not applied for a Proposal vs Interview yet.
              </p>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Skill Ratings</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Communication"
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={communicationRating}
              onChange={(e) => setCommunicationRating(e.target.value)}
              onBlur={() => handleRatingBlur(communicationRating, setCommunicationRating)}
            />
            <Input
              placeholder="Coding"
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={codingRating}
              onChange={(e) => setCodingRating(e.target.value)}
              onBlur={() => handleRatingBlur(codingRating, setCodingRating)}
            />
            <Input
              placeholder="Aptitude"
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={aptitudeRating}
              onChange={(e) => setAptitudeRating(e.target.value)}
              onBlur={() => handleRatingBlur(aptitudeRating, setAptitudeRating)}
            />
            <Input
              placeholder="AI Interview"
              type="number"
              min={0}
              max={10}
              step="0.1"
              value={interviewRating}
              onChange={(e) => setInterviewRating(e.target.value)}
              onBlur={() => handleRatingBlur(interviewRating, setInterviewRating)}
            />
            <Input
              placeholder="Findtern Score"
              value={findternScore}
              readOnly
            />
            <Button
              className="mt-2 w-full bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={() => void handleSaveRatings()}
              disabled={savingRatings || !selectedIntern?.id}
            >
              <Star className="mr-2 h-4 w-4" />
              {savingRatings ? "Saving..." : "Save Ratings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}


