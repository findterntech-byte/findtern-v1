import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Clock,
  Copy,
  Mail,
  ExternalLink,
  FileText,
  Link2,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Briefcase,
  Building2,
  User,
  GraduationCap,
  IndianRupee,
  Star,
  Award,
  TrendingUp,
  FileCheck,
  Clock3,
  MapPin,
  Phone,
  Code,
  Bot,
  Brain,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import findternLogo from "/logo.png";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const scrollbarStyles = `
  .custom-scrollbar-horizontal::-webkit-scrollbar {
    height: 14px;
    display: block !important;
  }
  .custom-scrollbar-horizontal::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 7px;
    border: 1px solid #e2e8f0;
    box-shadow: inset 0 0 5px rgba(0,0,0,0.05);
  }
  .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 7px;
    border: 3px solid #f1f5f9;
  }
  .custom-scrollbar-horizontal::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
`;

type LoadedIntern = {
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    countryCode?: string | null;
    phoneNumber?: string | null;
  };
  onboarding: any;
  intern_document: any;
};

type DocRow = {
  key: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  href?: string;
};

type SkillEntry = {
  id: string;
  name: string;
  rating: number;
};

type PayoutRow = {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  method: string;
  referenceId?: string | null;
  scheduledFor?: string | null;
  source?: string | null;
  proposalId?: string | null;
  employerId?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
};

type EmployerDueRow = {
  proposalId: string;
  employerId: string;
  employerCompanyName?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  startDate?: string | null;
  duration?: string | null;
  totalMonths: number;
  paidMonths: number;
  remainingMonths: number;
  internPaidMonths?: number;
  internRemainingMonths?: number;
  upcomingPaymentDate?: string | null;
  currency: string;
  monthlyAmountMinor: number;
  totalAmountMinor: number;
  dueAmountMinor: number;
  internMonthlyAmountMinor?: number;
  internTotalAmountMinor?: number;
  internDueAmountMinor?: number;
};

export default function AdminInternDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/interns/:id");
  const internId = params?.id;

  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #999;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const sendStipendTransferredEmail = useCallback(
    async (payoutId: string) => {
      if (!internId) return;
      const pid = String(payoutId ?? "").trim();
      if (!pid) return;

      try {
        await apiRequest(
          "POST",
          `/api/admin/interns/${encodeURIComponent(internId)}/payouts/${encodeURIComponent(pid)}/send-stipend-email`,
          {},
        );
        toast({
          title: "Email sent",
          description: "Stipend transfer email has been sent to the intern.",
        });
      } catch (e: any) {
        toast({
          title: "Failed",
          description: String(e?.message ?? "Failed to send email"),
          variant: "destructive",
        });
      }
    },
    [internId],
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intern, setIntern] = useState<LoadedIntern | null>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const [employerDues, setEmployerDues] = useState<EmployerDueRow[]>([]);
  const [loadingEmployerDues, setLoadingEmployerDues] = useState(false);
  const [employerDuesError, setEmployerDuesError] = useState<string>("");
  const [employerDuesRefreshKey, setEmployerDuesRefreshKey] = useState(0);

  const [openCreatePayout, setOpenCreatePayout] = useState(false);
  const [creatingPayout, setCreatingPayout] = useState(false);
  const [createPayoutError, setCreatePayoutError] = useState<string>("");
  const [createAmountMajor, setCreateAmountMajor] = useState<string>("");
  const [createCurrency, setCreateCurrency] = useState<"INR" | "USD">("INR");
  const [createScheduledFor, setCreateScheduledFor] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [createMonths, setCreateMonths] = useState<string>("");
  const [createSource, setCreateSource] = useState<string>("");
  const [createProposalId, setCreateProposalId] = useState<string>("");
  const [createEmployerId, setCreateEmployerId] = useState<string>("");
  const [createMaxMonths, setCreateMaxMonths] = useState<number>(0);
  const [createInternDueMinor, setCreateInternDueMinor] = useState<number>(0);
  const [createBaseMonthlyMinor, setCreateBaseMonthlyMinor] = useState<number>(0);

  useEffect(() => {
    const src = String(createSource ?? "").trim();
    if (src !== "employer_due") return;

    const monthsNum = Math.max(1, Math.floor(Number(createMonths || 1) || 1));
    const base = Math.max(0, Number(createBaseMonthlyMinor ?? 0) || 0);
    const due = Math.max(0, Number(createInternDueMinor ?? 0) || 0);

    if (!base) return;

    // Use intern monthly payout times number of months.
    const amountMinor = Math.min(due || Number.MAX_SAFE_INTEGER, base * monthsNum);
    const amountMajor = Math.floor(amountMinor / 100);
    setCreateAmountMajor(amountMajor > 0 ? String(amountMajor) : "");
  }, [createSource, createMonths, createBaseMonthlyMinor, createInternDueMinor]);

  const [openMarkPaid, setOpenMarkPaid] = useState(false);
  const [markPaidPayoutId, setMarkPaidPayoutId] = useState<string>("");
  const [markPaidReferenceId, setMarkPaidReferenceId] = useState<string>("");
  const [markingPaid, setMarkingPaid] = useState(false);
  const [markPaidError, setMarkPaidError] = useState<string>("");

  const [interviewStatusFilter, setInterviewStatusFilter] = useState<string>("all");
  const [interviewSlotFilter, setInterviewSlotFilter] = useState<"all" | "selected" | "unselected">("all");
  const [interviewFromDate, setInterviewFromDate] = useState<string>("");
  const [interviewToDate, setInterviewToDate] = useState<string>("");
  const [interviewSearch, setInterviewSearch] = useState<string>("");
  const [openInterviewDetails, setOpenInterviewDetails] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);

  const [projectsById, setProjectsById] = useState<Record<string, any>>({});

  const [employersById, setEmployersById] = useState<Record<string, any>>({});

  const [proposalStatusFilter, setProposalStatusFilter] = useState<string>("all");
  const [proposalSearch, setProposalSearch] = useState<string>("");
  const [openProposalDetails, setOpenProposalDetails] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documents");

  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loadingTimesheets, setLoadingTimesheets] = useState(false);
  const [timesheetsError, setTimesheetsError] = useState<string>("");
  const [openTimesheetDetails, setOpenTimesheetDetails] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<any | null>(null);

  const [timesheetSearch, setTimesheetSearch] = useState<string>("");
  const [timesheetProjectFilter, setTimesheetProjectFilter] = useState<string>("all");
  const [timesheetCompanyFilter, setTimesheetCompanyFilter] = useState<string>("all");

  const [openEditSkills, setOpenEditSkills] = useState(false);
  const [skillDraft, setSkillDraft] = useState<SkillEntry[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!internId) {
        setLoading(false);
        setIntern(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const interviewsPromise = apiRequest("GET", `/api/intern/${internId}/interviews`).catch(() => null as any);
        const proposalsPromise = apiRequest("GET", `/api/intern/${internId}/proposals`).catch(() => null as any);

        let onboardingJson: any = null;
        try {
          const onboardingRes = await apiRequest("GET", `/api/onboarding/${internId}`);
          onboardingJson = await onboardingRes.json().catch(() => null);
        } catch (e: any) {
          if (e?.status === 404) {
            const userRes = await apiRequest("GET", `/api/users/${internId}`).catch(() => null as any);
            const userJson = userRes ? await userRes.json().catch(() => null) : null;
            onboardingJson = {
              user: userJson?.user ?? { id: internId },
              onboarding: null,
              intern_document: null,
            };
          } else {
            throw e;
          }
        }

        const [interviewsRes, proposalsRes] = await Promise.all([interviewsPromise, proposalsPromise]);

        const nextIntern: LoadedIntern = {
          user: onboardingJson?.user ?? { id: internId },
          onboarding: onboardingJson?.onboarding ?? null,
          intern_document: onboardingJson?.intern_document ?? null,
        };

        let nextInterviews: any[] = [];
        if (interviewsRes) {
          const interviewsJson = await interviewsRes.json().catch(() => null);
          nextInterviews = Array.isArray(interviewsJson?.interviews)
            ? interviewsJson.interviews
            : Array.isArray(interviewsJson)
              ? interviewsJson
              : [];
        }

        let nextProposals: any[] = [];
        if (proposalsRes) {
          const proposalsJson = await proposalsRes.json().catch(() => null);
          nextProposals = Array.isArray(proposalsJson?.proposals)
            ? proposalsJson.proposals
            : Array.isArray(proposalsJson)
              ? proposalsJson
              : [];
        }

        setIntern(nextIntern);
        setInterviews(nextInterviews);
        setProposals(nextProposals);
      } catch (e) {
        console.error("Failed to load intern details", e);
        setError("Failed to load intern details");
        setIntern(null);
        setInterviews([]);
        setProposals([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [internId]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        [...(employerDues ?? []), ...(payouts ?? [])]
          .map((r: any) => String(r?.employerId ?? "").trim())
          .filter(Boolean),
      ),
    );
    const missing = ids.filter((id) => !employersById[id]);
    if (missing.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const resList = await Promise.all(
          missing.map((id) => apiRequest("GET", `/api/admin/employers/${encodeURIComponent(id)}`).catch(() => null as any)),
        );
        const next: Record<string, any> = {};
        for (let i = 0; i < missing.length; i += 1) {
          const id = missing[i];
          const res = resList[i];
          if (!id || !res) continue;
          const json = await res.json().catch(() => null);
          const e = json?.employer ?? null;
          if (e) next[id] = e;
        }
        if (!cancelled && Object.keys(next).length > 0) {
          setEmployersById((prev) => ({ ...prev, ...next }));
        }
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerDues, payouts, employersById]);

  const refreshEmployerDues = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!internId) return;
      try {
        if (!opts?.silent) setLoadingEmployerDues(true);
        setEmployerDuesError("");

        const res = await apiRequest(
          "GET",
          `/api/admin/interns/${encodeURIComponent(internId)}/employer-dues`,
        );
        const json = await res.json().catch(() => null);
        const items = Array.isArray(json?.employerDues) ? (json.employerDues as any[]) : Array.isArray(json?.items) ? (json.items as any[]) : [];

        const mapped: EmployerDueRow[] = items.map((r: any) => ({
          proposalId: String(r?.proposalId ?? ""),
          employerId: String(r?.employerId ?? ""),
          employerCompanyName: (r?.employerCompanyName ?? null) as any,
          projectId: (r?.projectId ?? null) as any,
          projectName: (r?.projectName ?? null) as any,
          startDate: (r?.startDate ?? null) as any,
          duration: (r?.duration ?? null) as any,
          totalMonths: Number(r?.totalMonths ?? 0) || 0,
          paidMonths: Number(r?.paidMonths ?? 0) || 0,
          remainingMonths: Number(r?.remainingMonths ?? 0) || 0,
          internPaidMonths: Number(r?.internPaidMonths ?? r?.intern_paid_months ?? 0) || 0,
          internRemainingMonths: Number(r?.internRemainingMonths ?? r?.intern_remaining_months ?? 0) || 0,
          upcomingPaymentDate: (r?.upcomingPaymentDate ?? null) as any,
          currency: String(r?.currency ?? "INR").toUpperCase(),
          monthlyAmountMinor: Number(r?.monthlyAmountMinor ?? 0) || 0,
          totalAmountMinor: Number(r?.totalAmountMinor ?? 0) || 0,
          dueAmountMinor: Number(r?.dueAmountMinor ?? 0) || 0,
          internMonthlyAmountMinor: Number(r?.internMonthlyAmountMinor ?? r?.intern_monthly_amount_minor ?? 0) || 0,
          internTotalAmountMinor: Number(r?.internTotalAmountMinor ?? r?.intern_total_amount_minor ?? 0) || 0,
          internDueAmountMinor: Number(r?.internDueAmountMinor ?? r?.intern_due_amount_minor ?? 0) || 0,
        }));

        if (items.length === 0) {
          setEmployerDues((prev) => prev);
          setEmployerDuesError("No dues returned on refresh. Please try again.");
        } else {
          setEmployerDues(mapped);
          setEmployerDuesError("");
        }
      } catch {
        setEmployerDuesError("Failed to refresh employer dues. Please try again.");
      } finally {
        if (!opts?.silent) setLoadingEmployerDues(false);
      }
    },
    [internId],
  );

  useEffect(() => {
    if (!internId) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await refreshEmployerDues();
    })();
    return () => {
      cancelled = true;
    };
  }, [internId, employerDuesRefreshKey, refreshEmployerDues]);

  useEffect(() => {
    if (!internId) return;
    const onFocus = () => {
      void refreshEmployerDues({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      void refreshEmployerDues({ silent: true });
    }, 10000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [internId, refreshEmployerDues]);

  useEffect(() => {
    const employerIds = Array.from(
      new Set(
        [...(interviews ?? []), ...(proposals ?? [])]
          .map((i) => String(i?.employerId ?? "").trim())
          .filter((x) => x && x.toLowerCase() !== "admin"),
      ),
    );
    if (employerIds.length === 0) return;

    let cancelled = false;

    (async () => {
      try {
        const resList = await Promise.all(
          employerIds.map((id) => apiRequest("GET", `/api/employer/${encodeURIComponent(id)}/projects`).catch(() => null as any)),
        );

        const next: Record<string, any> = {};
        for (const res of resList) {
          if (!res) continue;
          const json = await res.json().catch(() => null);
          const list = Array.isArray(json?.projects) ? json.projects : Array.isArray(json) ? json : [];
          for (const p of list) {
            const pid = String(p?.id ?? "").trim();
            if (!pid) continue;
            next[pid] = p;
          }
        }

        if (!cancelled && Object.keys(next).length > 0) {
          setProjectsById((prev) => ({ ...prev, ...next }));
        }
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [interviews, proposals]);

  useEffect(() => {
    if (!internId) return;
    let cancelled = false;
    setLoadingPayouts(true);

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/admin/interns/${encodeURIComponent(internId)}/payouts`,
        );
        const json = await res.json().catch(() => null);
        const items = Array.isArray(json?.items) ? json.items : [];

        const mapped: PayoutRow[] = items.map((p: any) => ({
          id: String(p?.id ?? p?.referenceId ?? p?.reference_id ?? ""),
          amountMinor: (() => {
            const raw = p?.amountMinor ?? p?.amount_minor ?? p?.amount ?? 0;
            const n = Number(raw);
            return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
          })(),
          currency: String(p?.currency ?? "INR").toUpperCase(),
          status: String(p?.status ?? "-").toLowerCase(),
          method: String(p?.method ?? "-").toLowerCase(),
          referenceId: (p?.referenceId ?? p?.reference_id ?? null) as any,
          scheduledFor: (p?.raw?.scheduledFor ?? p?.raw?.scheduled_for ?? null) as any,
          source: (p?.raw?.source ?? null) as any,
          proposalId: (p?.raw?.proposalId ?? p?.raw?.proposal_id ?? null) as any,
          employerId: (p?.raw?.employerId ?? p?.raw?.employer_id ?? null) as any,
          paidAt: (p?.paidAt ?? p?.paid_at ?? null) as any,
          createdAt: (p?.createdAt ?? p?.created_at ?? null) as any,
        }));

        if (!cancelled) setPayouts(mapped);
      } catch {
        if (!cancelled) setPayouts([]);
      } finally {
        if (!cancelled) setLoadingPayouts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [internId]);

  useEffect(() => {
    if (!internId) return;
    let cancelled = false;
    setLoadingTimesheets(true);
    setTimesheetsError("");

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/intern/${encodeURIComponent(String(internId))}/timesheets?limit=500`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.timesheets) ? (json.timesheets as any[]) : [];
        if (cancelled) return;
        setTimesheets(list);
      } catch (e: any) {
        if (cancelled) return;
        setTimesheets([]);
        setTimesheetsError(String(e?.message ?? "Failed to fetch timesheets"));
      } finally {
        if (!cancelled) setLoadingTimesheets(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [internId]);

  const summary = useMemo(() => {
    const user = intern?.user ?? ({} as any);
    const onboarding = intern?.onboarding ?? {};
    const extra = onboarding?.extraData ?? {};

    const firstName = String(user?.firstName ?? "");
    const lastName = String(user?.lastName ?? "");
    const name = `${firstName} ${lastName}`.trim() || String(extra?.fullName ?? extra?.name ?? "Intern");
    const email = String(user?.email ?? "-");
    const phone = [String(user?.countryCode ?? ""), String(user?.phoneNumber ?? "")]
      .filter(Boolean)
      .join(" ") || "-";
    const location = [onboarding?.city, onboarding?.state].filter(Boolean).join(", ") || "-";

    const joinedAtRaw = onboarding?.createdAt ?? null;
    const joinedAt = joinedAtRaw
      ? (() => {
        const d = new Date(joinedAtRaw);
        return Number.isNaN(d.getTime()) ? String(joinedAtRaw) : d.toISOString().slice(0, 10);
      })()
      : "-";

    const ratings = extra?.ratings ?? {};
    const academics = extra?.academics ?? null;
    const languages = Array.isArray(extra?.languages) ? extra.languages : [];
    const extracurricular = Array.isArray(extra?.extracurricular) ? extra.extracurricular : [];
    const skills = Array.isArray(onboarding?.skills) ? onboarding.skills : [];
    const bankDetails = extra?.bankDetails ?? {};

    const aboutMe = String(onboarding?.bio ?? extra?.aboutMe ?? "").trim();
    const previewSummary = String(onboarding?.previewSummary ?? extra?.previewSummary ?? "").trim();
    const linkedinUrl = String(onboarding?.linkedinUrl ?? extra?.linkedinUrl ?? "").trim();

    const experience = Array.isArray(onboarding?.experienceJson)
      ? onboarding.experienceJson
      : Array.isArray(extra?.experience)
        ? extra.experience
        : [];

    const locationTypes = Array.isArray(onboarding?.locationTypes)
      ? onboarding.locationTypes
      : Array.isArray(extra?.locationTypes)
        ? extra.locationTypes
        : [];

    const preferredLocations = Array.isArray(onboarding?.preferredLocations)
      ? onboarding.preferredLocations
      : Array.isArray(extra?.preferredLocations)
        ? extra.preferredLocations
        : [];

    const pinCode = String(onboarding?.pinCode ?? extra?.pinCode ?? "").trim();
    const hasLaptop = typeof onboarding?.hasLaptop === "boolean" ? onboarding.hasLaptop : null;

    const emergencyName = String(extra?.emergencyName ?? extra?.emergencyContactName ?? "").trim();
    const emergencyPhone = [String(extra?.emergencyCountryCode ?? ""), String(extra?.emergencyPhone ?? "")]
      .filter(Boolean)
      .join(" ") || "";

    const aadhaarNumber = String(onboarding?.aadhaarNumber ?? extra?.aadhaarNumber ?? "").trim();
    const panNumber = String(onboarding?.panNumber ?? extra?.panNumber ?? "").trim();
    const state = String(onboarding?.state ?? extra?.state ?? "").trim();
    const city = String(onboarding?.city ?? extra?.city ?? "").trim();

    return {
      name,
      email,
      phone,
      location,
      joinedAt,
      status: (intern?.user as any)?.isActive === false ? "Inactive" : "Active",
      verified: "Not Verified",
      approvalStatus: "Pending",
      ratings,
      aboutMe,
      previewSummary,
      linkedinUrl,
      experience,
      locationTypes,
      preferredLocations,
      pinCode,
      hasLaptop,
      aadhaarNumber,
      panNumber,
      emergencyName,
      emergencyPhone,
      city,
      state,
      academics,
      languages,
      extracurricular,
      skills,
      bankDetails,
    };
  }, [intern]);

  const skillsForDisplay = useMemo<SkillEntry[]>(() => {
    const arr = Array.isArray((summary as any)?.skills) ? (((summary as any).skills as any[]) ?? []) : [];
    return arr
      .map((s: any, idx: number): SkillEntry => {
        if (typeof s === "string") {
          const name = String(s ?? "").trim();
          return {
            id: `skill-${idx}-${name}`,
            name,
            rating: 1,
          };
        }
        return {
          id: String(s?.id ?? s?.name ?? `skill-${idx}`),
          name: String(s?.name ?? "").trim(),
          rating: Number(s?.rating ?? 1),
        };
      })
      .filter((s) => Boolean(s.name));
  }, [summary]);

  const findScoreChart = useMemo(() => {
    const comm = Number((summary as any)?.ratings?.communication);
    const coding = Number((summary as any)?.ratings?.coding);
    const aptitude = Number((summary as any)?.ratings?.aptitude);
    const interview = Number((summary as any)?.ratings?.interview);

    const safe = (n: number) => (Number.isFinite(n) ? n : 0);

    const data = [
      { name: "Communication", score: safe(comm) },
      { name: "Coding", score: safe(coding) },
      { name: "Aptitude", score: safe(aptitude) },
      { name: "AI Interview", score: safe(interview) },
    ];

    const config = {
      score: { label: "FindScore", color: "hsl(142 76% 36%)" },
    } as const;

    const hasAny = [comm, coding, aptitude, interview].some((n) => Number.isFinite(n));
    return { data, config, hasAny };
  }, [summary]);

  const payoutsChart = useMemo(() => {
    const fmtDate = (v: string) => {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0, 10);
    };

    const agg = new Map<string, number>();
    for (const p of payouts) {
      const raw = (p.paidAt ?? p.createdAt ?? "") as string;
      if (!raw) continue;
      const k = fmtDate(raw);
      const amountMajor = Number(p.amountMinor ?? 0) / 100;
      agg.set(k, (agg.get(k) ?? 0) + (Number.isFinite(amountMajor) ? amountMajor : 0));
    }

    const data = Array.from(agg.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

    const config = {
      amount: { label: "Paid", color: "hsl(199 89% 48%)" },
    } as const;

    return { data, config };
  }, [payouts]);

  const kpis = useMemo(() => {
    const currency = payouts[0]?.currency ? String(payouts[0].currency).toUpperCase() : "INR";
    const totalPaid = payouts.reduce((sum, p) => sum + (Number(p.amountMinor ?? 0) || 0), 0) / 100;
    const totalPaidRounded = Math.round(totalPaid * 100) / 100;

    const comm = Number((summary as any)?.ratings?.communication);
    const coding = Number((summary as any)?.ratings?.coding);
    const aptitude = Number((summary as any)?.ratings?.aptitude);
    const interview = Number((summary as any)?.ratings?.interview);
    const scoreParts = [comm, coding, aptitude, interview].filter((n) => Number.isFinite(n));
    const overall = scoreParts.length
      ? Math.round(((scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) || 0) * 10) / 10
      : null;

    return {
      currency,
      totalPaid: totalPaidRounded,
      interviews: interviews.length,
      proposals: proposals.length,
      skills: skillsForDisplay.length,
      overall,
    };
  }, [payouts, interviews.length, proposals.length, skillsForDisplay.length, summary]);

  const formatIsoDate = (v: any) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10);
  };

  const formatMoney = (amountMinor: number, currency: string) => {
    const cur = String(currency || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  const formatMoneyInInrIfUsd = (amountMinor: number, currency: string) => {
    // Backend now returns all amounts in INR paise for consistency in admin views.
    return formatMoney(amountMinor, "INR");
  };

  const handleCreatePayout = async () => {
    if (!internId) return;

    setCreatePayoutError("");
    const amountMajorNum = Number(String(createAmountMajor ?? "").trim());
    if (!Number.isFinite(amountMajorNum) || amountMajorNum <= 0) {
      setCreatePayoutError("Enter a valid amount");
      return;
    }
    if (!createScheduledFor) {
      setCreatePayoutError("Select a payout date");
      return;
    }

    const monthsNum = Number(String(createMonths ?? "").trim());
    const hasCycle = Number.isFinite(monthsNum) && monthsNum > 1;
    const amountMinor = Math.round(amountMajorNum * 100);

    setCreatingPayout(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/admin/interns/${encodeURIComponent(internId)}/payouts`,
        {
          amountMinor,
          currency: "INR",
          status: "pending",
          method: "bank",
          scheduledFor: createScheduledFor,
          source: createSource || null,
          proposalId: createProposalId || null,
          employerId: createEmployerId || null,
          cycle: hasCycle
            ? {
              remaining: Math.floor(monthsNum),
              monthsStep: 1,
              amountMinor,
              currency: "INR",
              method: "bank",
            }
            : null,
        },
      );
      const json = await res.json().catch(() => null);
      const created = json?.item ?? null;

      if (created) {
        setPayouts((prev) => [
          {
            id: String(created?.id ?? ""),
            amountMinor: Number(created?.amountMinor ?? created?.amount_minor ?? 0) || 0,
            currency: String(created?.currency ?? "INR").toUpperCase(),
            status: String(created?.status ?? "pending").toLowerCase(),
            method: String(created?.method ?? "bank").toLowerCase(),
            referenceId: (created?.referenceId ?? created?.reference_id ?? null) as any,
            scheduledFor: (created?.raw?.scheduledFor ?? created?.raw?.scheduled_for ?? createScheduledFor) as any,
            source: (created?.raw?.source ?? createSource ?? null) as any,
            proposalId: (created?.raw?.proposalId ?? createProposalId ?? null) as any,
            employerId: (created?.raw?.employerId ?? createEmployerId ?? null) as any,
            paidAt: (created?.paidAt ?? created?.paid_at ?? null) as any,
            createdAt: (created?.createdAt ?? created?.created_at ?? null) as any,
          },
          ...prev,
        ]);
      }

      setOpenCreatePayout(false);
      setCreateAmountMajor("");
      setCreateCurrency("INR");
      setCreateScheduledFor("");
      setCreateMonths("");
      setCreateSource("");
      setCreateProposalId("");
      setCreateEmployerId("");

      setEmployerDuesRefreshKey((v) => v + 1);
    } catch (e: any) {
      setCreatePayoutError(String(e?.message ?? "Failed to create payout"));
    } finally {
      setCreatingPayout(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!internId) return;
    const payoutId = String(markPaidPayoutId ?? "").trim();
    const referenceId = String(markPaidReferenceId ?? "").trim();
    if (!payoutId) return;
    if (!referenceId) {
      setMarkPaidError("Payment reference ID is required");
      return;
    }

    setMarkPaidError("");
    setMarkingPaid(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/admin/interns/${encodeURIComponent(internId)}/payouts/${encodeURIComponent(payoutId)}/mark-paid`,
        { referenceId },
      );
      const json = await res.json().catch(() => null);
      const updated = json?.item ?? null;
      const nextCreated = json?.nextCreated ?? null;

      if (updated) {
        setPayouts((prev) =>
          prev.map((p) =>
            p.id === payoutId
              ? {
                ...p,
                status: String(updated?.status ?? "paid").toLowerCase(),
                referenceId: referenceId,
                paidAt: (updated?.paidAt ?? updated?.paid_at ?? new Date().toISOString()) as any,
              }
              : p,
          ),
        );
      }

      if (nextCreated) {
        setPayouts((prev) => [
          {
            id: String(nextCreated?.id ?? ""),
            amountMinor: Number(nextCreated?.amountMinor ?? nextCreated?.amount_minor ?? 0) || 0,
            currency: String(nextCreated?.currency ?? "INR").toUpperCase(),
            status: String(nextCreated?.status ?? "pending").toLowerCase(),
            method: String(nextCreated?.method ?? "bank").toLowerCase(),
            referenceId: (nextCreated?.referenceId ?? nextCreated?.reference_id ?? null) as any,
            scheduledFor: (nextCreated?.raw?.scheduledFor ?? nextCreated?.raw?.scheduled_for ?? null) as any,
            paidAt: (nextCreated?.paidAt ?? nextCreated?.paid_at ?? null) as any,
            createdAt: (nextCreated?.createdAt ?? nextCreated?.created_at ?? null) as any,
          },
          ...prev,
        ]);
      }

      setOpenMarkPaid(false);
      setMarkPaidPayoutId("");
      setMarkPaidReferenceId("");

      setEmployerDuesRefreshKey((v) => v + 1);
    } catch (e: any) {
      setMarkPaidError(String(e?.message ?? "Failed to mark payout paid"));
    } finally {
      setMarkingPaid(false);
    }
  };

  const stripHtml = (html: any) => {
    const s = String(html ?? "");
    if (!s) return "";
    return s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<p>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[ ]+/g, " ")
      .trim();
  };

  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatSlot = (slot: any, timeZone?: any) => {
    if (!slot) return "-";
    const d = new Date(slot);
    if (Number.isNaN(d.getTime())) return String(slot);
    return d.toLocaleString(undefined, {
      timeZone: String(timeZone ?? "").trim() || undefined,
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getSelectedSlotMeta = (interview: any) => {
    const n = Number(interview?.selectedSlot ?? interview?.selected_slot ?? 0);
    if (!n) return { slot: null as number | null, label: "Not selected" };
    const key = `slot${n}` as const;
    const raw = interview?.[key];
    const label = raw ? formatSlot(raw, interview?.timezone) : `Slot ${n}`;
    return { slot: n, label };
  };

  const getProjectMeta = (interview: any) => {
    const projectId = String(interview?.projectId ?? interview?.project_id ?? "").trim();
    const fromMap = projectId ? projectsById[projectId] : null;
    const name = String(fromMap?.projectName ?? interview?.projectName ?? "").trim();
    const scopeOfWork = String(fromMap?.scopeOfWork ?? "").trim();
    const locationType = String(fromMap?.locationType ?? "").trim();
    const city = String(fromMap?.city ?? "").trim();
    const state = String(fromMap?.state ?? "").trim();
    const skills = Array.isArray(fromMap?.skills) ? fromMap.skills : [];
    const fullTimeOffer = typeof fromMap?.fullTimeOffer === "boolean" ? fromMap.fullTimeOffer : null;
    const location = [city, state].filter(Boolean).join(", ");
    return {
      projectId,
      name: name || "Project",
      scopeOfWork: scopeOfWork || null,
      locationType: locationType || null,
      location: location || null,
      skills: skills,
      fullTimeOffer,
    };
  };

  const monthsFromDuration = (duration: string | undefined) => {
    const v = String(duration ?? "").trim().toLowerCase();
    const m = v.match(/^(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return Math.floor(n);
    }
    return 1;
  };

  const monthsBetweenDateOnlyUtc = (start: Date, end: Date) => {
    const startY = start.getUTCFullYear();
    const startM = start.getUTCMonth();
    const startD = start.getUTCDate();
    const endY = end.getUTCFullYear();
    const endM = end.getUTCMonth();
    const endD = end.getUTCDate();

    let months = (endY - startY) * 12 + (endM - startM);
    if (endD < startD) months -= 1;
    return Math.max(0, months);
  };

  const parseDateOnlyUtc = (raw: unknown) => {
    const value = String(raw ?? "").trim();
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const addMonthsUtc = (dt: Date, months: number) => {
    const base = new Date(dt.getTime());
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const day = base.getUTCDate();
    const targetMonth = m + months;
    const firstOfTarget = new Date(Date.UTC(y, targetMonth, 1, 0, 0, 0));
    const daysInTargetMonth = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
    const safeDay = Math.min(day, daysInTargetMonth);
    return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), safeDay, 0, 0, 0));
  };

  const resolveProposalPricingLabel = (proposal: any) => {
    const score = Number(proposal?.findternScore ?? 0);
    const offer = (proposal?.offerDetails || proposal?.offer_details || {}) as any;
    const cur = String(offer?.currency ?? "INR").toUpperCase();
    const isFullTime = Boolean(offer?.isFullTime ?? offer?.is_full_time ?? proposal?.isFullTime ?? proposal?.is_full_time ?? false);

    if (isFullTime) {
      const annualCTC = Number(offer?.annualCTC ?? offer?.annual_ctc ?? 0);
      if (annualCTC > 0) {
        return `Annual CTC: ${cur === "USD" ? "$" : "₹"}${annualCTC.toLocaleString()}`;
      }
      return "Full-time offer";
    }

    if (!Number.isFinite(score) || score < 6) {
      return cur === "USD" ? "$50 / hire" : "₹5000 / hire";
    }
    if (score < 8) {
      return cur === "USD" ? "$1/hour" : "₹100/hour";
    }
    return cur === "USD" ? "$2/hour" : "₹200/hour";
  };

  const resolveInterviewStatus = (interview: any) => {
    const raw = String(interview?.status ?? "").trim().toLowerCase();
    const selectedSlot = Number(interview?.selectedSlot ?? interview?.selected_slot ?? 0);

    const score = (intern?.onboarding as any)?.extraData?.findternScore;
    const meetLink = interview?.meet_link ?? interview?.meetingLink;

    if (score !== undefined && score !== null && !meetLink && raw !== "completed") {
      return "completed";
    }

    if (raw) return raw;
    if (selectedSlot) return "scheduled";
    return "sent";
  };

  const statusBadgeClass = (status: string) => {
    switch (String(status ?? "").toLowerCase()) {
      case "scheduled":
        return "border-emerald-500 bg-emerald-50 text-emerald-700";
      case "completed":
        return "border-slate-300 bg-slate-50 text-slate-700";
      case "expired":
        return "border-red-400 bg-red-50 text-red-700";
      case "pending":
        return "border-amber-400 bg-amber-50 text-amber-700";
      case "sent":
        return "border-amber-400 bg-amber-50 text-amber-700";
      default:
        return "border-slate-300 bg-white text-slate-700";
    }
  };

  const proposalBadgeClass = (status: string) => {
    switch (String(status ?? "").toLowerCase()) {
      case "accepted":
        return "border-emerald-500 bg-emerald-50 text-emerald-700";
      case "hired":
        return "border-emerald-500 bg-emerald-50 text-emerald-700";
      case "sent":
        return "border-amber-400 bg-amber-50 text-amber-700";
      case "rejected":
        return "border-red-400 bg-red-50 text-red-700";
      default:
        return "border-slate-300 bg-slate-50 text-slate-700";
    }
  };

  const normalizeUrl = (value: any) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("/")) return "";
    return `https://${raw}`;
  };

  const copyToClipboard = async (value: any) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
    }
  };

  const openExternal = (value: any) => {
    const normalized = normalizeUrl(value);
    if (!normalized) return;
    try {
      window.open(normalized, "_blank", "noopener,noreferrer");
    } catch {
    }
  };

  const filteredInterviews = useMemo(() => {
    const q = String(interviewSearch ?? "").trim().toLowerCase();
    const fromKey = String(interviewFromDate ?? "").trim();
    const toKey = String(interviewToDate ?? "").trim();

    const getFilterTime = (i: any) => {
      const updatedRaw = i?.updatedAt ?? i?.updated_at ?? i?.createdAt ?? i?.created_at;
      const d = updatedRaw ? new Date(updatedRaw) : null;
      if (!d || Number.isNaN(d.getTime())) return null;
      return d;
    };

    return interviews
      .filter((i) => {
        const status = resolveInterviewStatus(i);
        if (interviewStatusFilter !== "all" && status !== String(interviewStatusFilter).toLowerCase()) return false;

        const selected = Number(i?.selectedSlot ?? i?.selected_slot ?? 0);
        if (interviewSlotFilter === "selected" && !selected) return false;
        if (interviewSlotFilter === "unselected" && selected) return false;

        if (q) {
          const employer = String(i?.employerName ?? "").trim().toLowerCase();
          const company = String(i?.employerCompanyName ?? "").trim().toLowerCase();
          const meet = String(i?.meet_link ?? i?.meetingLink ?? "").trim().toLowerCase();
          const notes = String(i?.notes ?? "").trim().toLowerCase();
          const projectName = String(getProjectMeta(i).name ?? "").trim().toLowerCase();
          const hay = `${employer} ${company} ${meet} ${notes} ${projectName}`;
          if (!hay.includes(q)) return false;
        }

        if (fromKey || toKey) {
          const t = getFilterTime(i);
          if (!t) return false;
          const key = new Intl.DateTimeFormat("en-CA", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(t);
          if (fromKey && key < fromKey) return false;
          if (toKey && key > toKey) return false;
        }

        return true;
      })
      .slice()
      .sort((a, b) => {
        const ta = new Date(a?.updatedAt ?? a?.updated_at ?? a?.createdAt ?? a?.created_at ?? 0).getTime();
        const tb = new Date(b?.updatedAt ?? b?.updated_at ?? b?.createdAt ?? b?.created_at ?? 0).getTime();
        return tb - ta;
      });
  }, [interviews, interviewFromDate, interviewSearch, interviewSlotFilter, interviewStatusFilter, interviewToDate]);

  const filteredProposals = useMemo(() => {
    const q = String(proposalSearch ?? "").trim().toLowerCase();
    return proposals
      .filter((p) => {
        const status = String(p?.status ?? "").trim().toLowerCase();
        if (proposalStatusFilter !== "all" && status !== String(proposalStatusFilter).toLowerCase()) return false;

        if (q) {
          const offer = (p?.offerDetails || p?.offer_details || {}) as any;
          const projectName = String(getProjectMeta(p).name ?? "").trim().toLowerCase();
          const role = String(offer?.roleTitle ?? offer?.role_title ?? "").trim().toLowerCase();
          const mode = String(offer?.mode ?? "").trim().toLowerCase();
          const location = String(offer?.location ?? "").trim().toLowerCase();
          const jd = stripHtml(offer?.jd ?? "").toLowerCase();
          const hay = `${projectName} ${role} ${mode} ${location} ${jd}`;
          if (!hay.includes(q)) return false;
        }

        return true;
      })
      .slice()
      .sort((a, b) => {
        const ta = new Date(a?.updatedAt ?? a?.updated_at ?? a?.createdAt ?? a?.created_at ?? 0).getTime();
        const tb = new Date(b?.updatedAt ?? b?.updated_at ?? b?.createdAt ?? b?.created_at ?? 0).getTime();
        return tb - ta;
      });
  }, [proposals, proposalSearch, proposalStatusFilter, projectsById]);

  const proposalsById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const p of Array.isArray(proposals) ? proposals : []) {
      const id = String((p as any)?.id ?? "").trim();
      if (!id) continue;
      map[id] = p;
    }
    return map;
  }, [proposals]);

  const approvedTimesheets = useMemo(() => {
    const list = Array.isArray(timesheets) ? timesheets : [];
    return list
      .filter((t) => String(t?.status ?? "").trim().toLowerCase() === "approved")
      .slice()
      .sort((a, b) => new Date(String(b?.periodStart ?? 0)).getTime() - new Date(String(a?.periodStart ?? 0)).getTime());
  }, [timesheets]);

  const formatDurationLabel = (duration: unknown) => {
    const v = String(duration ?? "").trim().toLowerCase();
    if (!v) return "-";
    const m = v.match(/^(\d+)\s*m$/i);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n === 1 ? "1 month" : `${Math.floor(n)} months`;
    }
    return v;
  };

  const getTimesheetProposalMeta = (t: any) => {
    const pid = String(t?.proposalId ?? t?.proposal_id ?? "").trim();
    const proposal = pid ? proposalsById[pid] : null;
    const offer = (proposal?.offerDetails || proposal?.offer_details || {}) as any;
    const project = proposal ? getProjectMeta(proposal) : null;
    const projectName = String(project?.name ?? "Project").trim() || "Project";
    const roleTitle = String(offer?.roleTitle ?? offer?.role_title ?? "-").trim() || "-";
    const duration = formatDurationLabel(offer?.duration);
    const companyName = String(proposal?.employerCompanyName ?? proposal?.employerName ?? "-").trim() || "-";
    return {
      pid,
      proposal,
      projectName,
      roleTitle,
      duration,
      companyName,
      projectId: String(proposal?.projectId ?? proposal?.project_id ?? "").trim(),
    };
  };

  const timesheetProjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of approvedTimesheets) {
      const meta = getTimesheetProposalMeta(t);
      const name = String(meta.projectName ?? "").trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [approvedTimesheets, proposalsById]);

  const timesheetCompanyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of approvedTimesheets) {
      const meta = getTimesheetProposalMeta(t);
      const name = String(meta.companyName ?? "").trim();
      if (name && name !== "-") set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [approvedTimesheets, proposalsById]);

  const filteredApprovedTimesheets = useMemo(() => {
    const q = String(timesheetSearch ?? "").trim().toLowerCase();
    return approvedTimesheets.filter((t) => {
      const meta = getTimesheetProposalMeta(t);

      if (timesheetProjectFilter !== "all" && String(meta.projectName) !== String(timesheetProjectFilter)) return false;
      if (timesheetCompanyFilter !== "all" && String(meta.companyName) !== String(timesheetCompanyFilter)) return false;

      if (q) {
        const periodStart = formatIsoDate(t?.periodStart);
        const periodEnd = formatIsoDate(t?.periodEnd);
        const hay = `${meta.projectName} ${meta.companyName} ${meta.roleTitle} ${meta.duration} ${periodStart} ${periodEnd}`
          .trim()
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [approvedTimesheets, timesheetCompanyFilter, timesheetProjectFilter, timesheetSearch]);

  const timesheetAttendanceSummary = (t: any) => {
    const entries = Array.isArray(t?.entries) ? t.entries : [];
    let present = 0;
    let absent = 0;
    let fixedOff = 0;
    let holiday = 0;
    let unfilled = 0;

    for (const e of entries) {
      const st = String(e?.status ?? "").trim();
      if (!st) {
        unfilled += 1;
      } else if (st === "Present") {
        present += 1;
      } else if (st === "Absent") {
        absent += 1;
      } else if (st === "Fixed off") {
        fixedOff += 1;
      } else if (st === "Holiday") {
        holiday += 1;
      } else {
        unfilled += 1;
      }
    }

    const total = entries.length;
    const filled = total - unfilled;
    return { total, filled, present, absent, fixedOff, holiday, unfilled };
  };

  const handleSaveSkills = async () => {
    if (!internId) return;

    if (skillDraft.length < 4) {
      setSkillError("Please add at least 4 skills.");
      return;
    }
    if (skillDraft.length > 7) {
      setSkillError("Maximum 7 skills are allowed.");
      return;
    }

    if (skillDraft.some(s => !s.name.trim())) {
      setSkillError("Skill names cannot be empty.");
      return;
    }

    const payload: { skills: SkillEntry[] } = {
      skills: skillDraft.map((s, idx) => ({
        id: s.id || `admin-skill-${Date.now()}-${idx}`,
        name: s.name.trim(),
        rating: s.rating || 1,
      })),
    };

    setSavingSkills(true);
    setSkillError(null);
    try {
      const res = await apiRequest(
        "PUT",
        `/api/admin/interns/${encodeURIComponent(internId)}/skills`,
        payload,
      );
      const json = await res.json().catch(() => null);
      const onboarding = json?.onboarding ?? null;
      if (onboarding) {
        setIntern((prev) => (prev ? { ...prev, onboarding } : prev));
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/onboarding", internId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/interns"] });
      setOpenEditSkills(false);
    } catch (e: any) {
      setSkillError(e?.message || "Failed to save skills.");
    } finally {
      setSavingSkills(false);
    }
  };

  const documentRows: DocRow[] = useMemo(() => {
    const d = intern?.intern_document ?? null;
    const academics = (intern as any)?.onboarding?.extraData?.academics ?? null;

    const formatDate = (v: any) => {
      if (!v) return "-";
      const dt = new Date(v);
      return Number.isNaN(dt.getTime()) ? String(v) : dt.toISOString().slice(0, 10);
    };

    const updatedAt = d ? formatDate(d.updatedAt ?? d.createdAt) : formatDate((intern as any)?.onboarding?.updatedAt ?? (intern as any)?.onboarding?.createdAt);

    const rows: DocRow[] = [];
    const add = (
      key: string,
      name: string,
      fileName: any,
      fileType: any,
    ) => {
      const fn = String(fileName ?? "").trim();
      if (!fn) return;
      const encoded = encodeURIComponent(fn);
      rows.push({
        key,
        name,
        type: String(fileType ?? "-") || "-",
        status: "Uploaded",
        updatedAt,
        href: `/uploads/${encoded}`,
      });
    };

    const addAcademicsUpload = (
      key: string,
      name: string,
      upload: any,
    ) => {
      if (!upload) return;
      const rawHref = String((upload as any)?.name ?? "").trim();
      if (!rawHref) return;
      const type = String((upload as any)?.type ?? "-") || "-";
      const href = rawHref.startsWith("/uploads/")
        ? rawHref
        : rawHref.includes("/")
          ? rawHref
          : `/uploads/academics/${encodeURIComponent(rawHref)}`;
      rows.push({
        key,
        name,
        type,
        status: "Uploaded",
        updatedAt,
        href,
      });
    };

    if (d) {
      add("profilePhoto", "Profile Photo", d.profilePhotoName, d.profilePhotoType);
      add("introVideo", "Intro Video", d.introVideoName, d.introVideoType);
      add("aadhaar", "Aadhaar", d.aadhaarImageName, d.aadhaarImageType);
      add("pan", "PAN", d.panImageName, d.panImageType);
    }

    const marksheetUploads = Array.isArray((academics as any)?.marksheetUploads)
      ? ((academics as any)?.marksheetUploads as any[])
      : [];

    for (let i = 0; i < marksheetUploads.length; i++) {
      addAcademicsUpload(`marksheet-${i}`, `Marksheet ${i + 1}`, marksheetUploads[i]);
    }

    const professionalCourses = Array.isArray((academics as any)?.professionalCourses)
      ? ((academics as any)?.professionalCourses as any[])
      : [];

    for (let i = 0; i < professionalCourses.length; i++) {
      const course = professionalCourses[i];
      const certs = Array.isArray(course?.certificateUploads) ? course.certificateUploads : [];
      for (let j = 0; j < certs.length; j++) {
        const name = course.courseNamePreset === "Other" ? course.courseNameOther : course.courseNamePreset;
        addAcademicsUpload(`prof-cert-${i}-${j}`, `${name} Certificate ${j + 1}`, certs[j]);
      }
    }

    const certifications = Array.isArray((academics as any)?.certifications)
      ? ((academics as any)?.certifications as any[])
      : [];

    for (let i = 0; i < certifications.length; i++) {
      const cert = certifications[i];
      const certs = Array.isArray(cert?.certificateUploads) ? cert.certificateUploads : [];
      for (let j = 0; j < certs.length; j++) {
        addAcademicsUpload(`cert-${i}-${j}`, `${cert.certificateName || "Certification"} ${j + 1}`, certs[j]);
      }
    }

    return rows;
  }, [intern]);

  const computedProfileImage = useMemo(() => {
    const d = intern?.intern_document ?? null;
    const fn = String(d?.profilePhotoName ?? "").trim();
    if (fn) {
      const encoded = encodeURIComponent(fn);
      return {
        src: `/uploads/${encoded}`,
        mode: "cover" as const,
      };
    }
    return {
      src: findternLogo,
      mode: "contain" as const,
    };
  }, [intern]);

  const [profileImageSrc, setProfileImageSrc] = useState<string>(computedProfileImage.src);
  const [profileImageMode, setProfileImageMode] = useState<"cover" | "contain">(computedProfileImage.mode);

  const [openDocPreview, setOpenDocPreview] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocRow | null>(null);

  useEffect(() => {
    setProfileImageSrc(computedProfileImage.src);
    setProfileImageMode(computedProfileImage.mode);
  }, [computedProfileImage.src, computedProfileImage.mode]);

  const selectedDocKind = useMemo(() => {
    const type = String(selectedDoc?.type ?? "").toLowerCase();
    if (!type) return "other" as const;
    if (type.startsWith("image/")) return "image" as const;
    if (type.startsWith("video/")) return "video" as const;
    if (type === "application/pdf" || type.includes("pdf")) return "pdf" as const;
    return "other" as const;
  }, [selectedDoc]);

  if (loading) {
    return (
      <AdminLayout
        title="Intern Profile"
        description="Deep-dive into all data related to a specific intern."
      >
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading intern profile...</p>
        </Card>
      </AdminLayout>
    );
  }

  if (!intern || !internId) {
    return (
      <AdminLayout
        title="Intern Profile"
        description="Deep-dive into all data related to a specific intern."
      >
        <Card className="p-6 space-y-3">
          <p className="text-sm text-red-600">{error ?? "Intern not found"}</p>
          <Button variant="outline" onClick={() => setLocation("/admin/interns")}>
            Back to Interns
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Intern Profile"
      description="Deep-dive into all data related to a specific intern."
    >
      <style>{scrollbarStyles}</style>
      
      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0E6049]/5 to-transparent" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">FindScore</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0E6049]">{kpis.overall ?? "-"}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Overall Rating</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[#0E6049]/10 flex items-center justify-center shadow-sm">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-[#0E6049]" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Skills</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{kpis.skills}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Top skills</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Interviews</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{kpis.interviews}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Attempts</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-purple-100 flex items-center justify-center shadow-sm">
                <Clock3 className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Proposals</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{kpis.proposals}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Received</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-100 flex items-center justify-center shadow-sm">
                <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Payouts</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-emerald-600">{kpis.currency} {kpis.totalPaid.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Paid</p>
              </div>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm">
                <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        {/* Summary Card - Modern Design */}
        <Card className="overflow-hidden border-0 shadow-md">
          <div className="bg-gradient-to-r from-[#0E6049] to-[#0d7a5f] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-white/30 bg-white shadow-lg flex items-center justify-center">
                  <img
                    src={profileImageSrc}
                    alt="Profile"
                    onError={() => {
                      setProfileImageSrc(findternLogo);
                      setProfileImageMode("contain");
                    }}
                    className={profileImageMode === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain p-1"}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{summary.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-white/70" />
                    <p className="text-sm text-white/80">{summary.location}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarDays className="h-3.5 w-3.5 text-white/70" />
                    <p className="text-xs text-white/70">Joined: {summary.joinedAt}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm border border-white/20">
                  {summary.status}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm border border-white/20">
                  FindScore: {kpis.overall ?? "-"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-b from-white to-muted/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-blue-50/50 to-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Communication</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{summary.ratings?.communication ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-emerald-50/50 to-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Code className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Coding</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{summary.ratings?.coding ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-purple-50/50 to-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Aptitude</span>
                </div>
                <span className="text-lg font-bold text-purple-600">{summary.ratings?.aptitude ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-gradient-to-r from-amber-50/50 to-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">AI Interview</span>
                </div>
                <span className="text-lg font-bold text-amber-600">{summary.ratings?.interview ?? "-"}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{summary.email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{summary.phone}</span>
              </div>
            </div>
            
            {summary.emergencyPhone && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div className="flex-1">
                  <span className="text-xs text-muted-foreground">Emergency: </span>
                  <span className="text-sm font-medium text-red-700">
                    {summary.emergencyName ? `${summary.emergencyName} - ` : ""}{summary.emergencyPhone}
                  </span>
                </div>
              </div>
              )}
          </div>
        </Card>
      </div>

      {/* Charts Section - Modern Design */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-blue-500/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  FindScore Breakdown
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Communication, Coding, Aptitude, AI Interview</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {!findScoreChart.hasAny ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No ratings available
              </div>
            ) : (
              <ChartContainer config={findScoreChart.config as any} className="h-[200px] sm:h-[240px] w-full">
                <BarChart data={findScoreChart.data} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fontSize: 10 }}
                    height={50}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    domain={[0, 10]}
                  />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#0E6049" />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
          <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-emerald-500/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  Payouts Timeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Total paid per day</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {payoutsChart.data.length === 0 ? (
              <div className="h-[200px] sm:h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No payouts recorded
              </div>
            ) : (
              <ChartContainer config={payoutsChart.config as any} className="h-[200px] sm:h-[240px] w-full">
                <LineChart data={payoutsChart.data} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} width={50} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="date" />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Tabbed detail sections - Modern Design */}
      <Card className="mt-4 border-0 shadow-md overflow-hidden">
        <div className="border-b bg-muted/30 px-4 sm:px-6">
          <Tabs defaultValue="documents" className="w-full" onValueChange={(v) => setActiveTab(v)}>
            <TabsList className="bg-transparent gap-1 h-auto p-0 -mb-px w-full justify-start overflow-x-auto">
              <TabsTrigger value="documents" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "documents" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Documents
              </TabsTrigger>
              <TabsTrigger value="profile" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "profile" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Profile
              </TabsTrigger>
              <TabsTrigger value="interviews" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "interviews" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Interviews
                <span className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                  activeTab === "interviews" ? "bg-[#0E6049] text-white" : "bg-muted text-muted-foreground"
                )}>
                  {interviews.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="proposals" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "proposals" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Proposals
                <span className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                  activeTab === "proposals" ? "bg-[#0E6049] text-white" : "bg-muted text-muted-foreground"
                )}>
                  {proposals.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="timesheets" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "timesheets" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Timesheet
              </TabsTrigger>
              <TabsTrigger value="payments" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "payments" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Payments
                <span className={cn(
                  "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                  activeTab === "payments" ? "bg-[#0E6049] text-white" : "bg-muted text-muted-foreground"
                )}>
                  {payouts.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="bank" className={cn(
                "capitalize px-4 py-3 border-b-2 border-transparent rounded-none transition-all whitespace-nowrap",
                activeTab === "bank" 
                  ? "border-[#0E6049] text-[#0E6049] bg-[#0E6049]/5 font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}>
                Bank Details
              </TabsTrigger>
            </TabsList>
            <TabsContent value="documents" className="m-0">
          <div className="p-4 sm:p-6">
            <ScrollArea className="h-[500px] pr-4">
                <div className="w-full overflow-x-auto rounded-xl border custom-scrollbar-horizontal pb-3">
                  <Table className="min-w-[800px] border-collapse">
                  <TableHeader className="sticky top-0 z-30 bg-background">
                    <TableRow className="bg-background">
                      <TableHead className="sticky left-0 z-40 bg-background border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="sticky right-0 z-40 bg-background border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-sm text-muted-foreground">
                          No documents uploaded.
                        </TableCell>
                      </TableRow>
                    )}
                    {documentRows.map((doc) => (
                      <TableRow key={doc.key} className="bg-background transition-colors hover:bg-muted/40">
                        <TableCell className="sticky left-0 z-10 bg-inherit border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{doc.name}</span>
                        </TableCell>
                        <TableCell>{doc.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              doc.status === "Uploaded"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : doc.status === "Pending"
                                  ? "border-amber-400 bg-amber-50 text-amber-700"
                                  : "border-slate-300 bg-slate-50 text-slate-700"
                            }
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{doc.updatedAt}</TableCell>
                        <TableCell className="sticky right-0 z-10 bg-inherit border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!doc.href}
                            onClick={() => {
                              if (!doc.href) return;
                              setSelectedDoc(doc);
                              setOpenDocPreview(true);
                            }}
                          >
                            View / Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="m-0">
            <div className="p-4 sm:p-6">
              <div className="h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payout schedule</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create pending payouts with a scheduled date. Marking as paid requires a reference ID.
                  </p>
                </div>

                
              </div>

              <div className="mt-4">
                <Card className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold">Employer dues</h3>
                      <p className="text-xs text-muted-foreground">
                        Shows how much the employer still needs to pay for this intern (monthly cycle). Use this to decide payouts.
                      </p>
                      {employerDuesError ? (
                        <p className="text-xs text-red-600">{employerDuesError}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      disabled={loadingEmployerDues}
                      onClick={() => {
                        if (!internId) return;
                        void refreshEmployerDues();
                      }}
                    >
                      {loadingEmployerDues ? "Refreshing..." : "Refresh"}
                    </Button>
                  </div>

                  <div className="mt-3 relative w-full overflow-x-auto rounded-lg border custom-scrollbar-horizontal pb-4">
                    <table className="w-full min-w-[1400px] border-collapse text-sm">
                      <thead className="sticky top-0 z-30 bg-white">
                        <tr className="bg-white border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky left-0 z-40 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[150px]">Employer</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Project</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Start</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Duration</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Upcoming payment date</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[140px]">Employer monthly</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[160px]">Employer total amount</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Employer due</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[140px]">Intern payout (50%)</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Intern due</th>
                          <th className="h-12 px-4 align-middle font-medium text-muted-foreground sticky right-0 z-40 bg-white border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right min-w-[120px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {(() => {
                          if (loadingEmployerDues && employerDues.length === 0) {
                            return (
                              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td colSpan={11} className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm text-muted-foreground text-center">
                                  Loading employer dues...
                                </td>
                              </tr>
                            );
                          }

                          if (employerDues.length === 0) {
                            return (
                              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <td colSpan={11} className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-sm text-muted-foreground text-center">
                                  No dues found.
                                </td>
                              </tr>
                            );
                          }

                          return employerDues
                            .slice()
                            .sort((a, b) => {
                              const dateA = String(a.upcomingPaymentDate ?? "").trim();
                              const dateB = String(b.upcomingPaymentDate ?? "").trim();
                              if (!dateA && !dateB) return 0;
                              if (!dateA) return 1;
                              if (!dateB) return -1;
                              return dateA.localeCompare(dateB);
                            })
                            .map((r) => {
                              const employerDueMinor = Number(r.dueAmountMinor ?? 0) || 0;
                              const internMonthlyMinor = Number(r.internMonthlyAmountMinor ?? 0) || 0;
                              const internDueMinor = Number(r.internDueAmountMinor ?? 0) || 0;
                              const totalMonths = Number(r.totalMonths ?? 0) || 0;
                              const monthlyAmountMinor = Number(r.monthlyAmountMinor ?? 0) || 0;
                              const canPay = internMonthlyMinor > 0 && internDueMinor > 0;

                              const isLowScoringIntern = internDueMinor === 0 && monthlyAmountMinor > 0;
                              const calculatedTotalAmount = isLowScoringIntern 
                                ? monthlyAmountMinor 
                                : totalMonths * monthlyAmountMinor;

                              const rawStartDate = String(r.startDate ?? "").trim();
                              const advanceIsoMonth = (iso: string, months: number) => {
                                const s = String(iso ?? "").trim();
                                if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
                                const dt = new Date(`${s}T00:00:00`);
                                if (Number.isNaN(dt.getTime())) return "";
                                dt.setMonth(dt.getMonth() + Math.max(0, months));
                                return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                              };
                              const upcomingPaymentDateDisplay = isLowScoringIntern ? "-" : (rawStartDate ? advanceIsoMonth(rawStartDate, 1) : "-");

                              const scheduledFor = String(r.upcomingPaymentDate ?? "").trim();
                              const cyclePayout = payouts.find((p) => {
                                const pid = String(p.proposalId ?? "").trim();
                                const sf = String(p.scheduledFor ?? "").trim();
                                if (!pid || !scheduledFor) return false;
                                if (pid !== String(r.proposalId ?? "").trim()) return false;
                                return sf === scheduledFor;
                              });
                              const cyclePayoutStatus = String((cyclePayout as any)?.status ?? "").toLowerCase();
                              const hasPendingPayoutForCycle = cyclePayoutStatus === "pending";
                              const hasPaidPayoutForCycle = cyclePayoutStatus === "paid";

                              const isComplete = internDueMinor <= 0;

                              const effectiveScheduledFor =
                                hasPaidPayoutForCycle && scheduledFor ? advanceIsoMonth(scheduledFor, 1) : scheduledFor;

                              return (
                                <tr key={`${r.employerId}_${r.proposalId}`}
                                  className={cn(
                                    "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                                    canPay
                                      ? "bg-white"
                                      : "bg-slate-50 hover:bg-slate-100"
                                  )}
                                >
                                  <td className="p-4 align-middle sticky left-0 z-10 bg-inherit border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap font-medium min-w-[150px]">
                                    {String(r.employerCompanyName ?? r.employerId ?? "-")}
                                  </td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[150px]">{String(r.projectName ?? "-")}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[100px]">{String(r.startDate ?? "-")}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[100px]">{String(r.duration ?? "-")}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[150px] text-amber-600 font-medium">{upcomingPaymentDateDisplay}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[140px]">{formatMoneyInInrIfUsd(monthlyAmountMinor, r.currency)}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[160px] font-bold">{formatMoneyInInrIfUsd(calculatedTotalAmount, r.currency)}</td>
                                  <td className="p-4 align-middle whitespace-nowrap font-bold min-w-[120px] text-rose-600">{formatMoneyInInrIfUsd(employerDueMinor, r.currency)}</td>
                                  <td className="p-4 align-middle whitespace-nowrap min-w-[140px] text-emerald-600 font-medium">{formatMoneyInInrIfUsd(internMonthlyMinor, r.currency)}</td>
                                  <td className="p-4 align-middle whitespace-nowrap font-bold min-w-[120px] text-amber-600">{formatMoneyInInrIfUsd(internDueMinor, r.currency)}</td>
                                  <td className="p-4 align-middle sticky right-0 z-10 bg-inherit border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right min-w-[120px]">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canPay || hasPendingPayoutForCycle || isComplete}
                                      onClick={() => {
                                        setCreatePayoutError("");
                                        setCreateCurrency("INR");
                                        setCreateScheduledFor(String(effectiveScheduledFor ?? ""));
                                        const maxMonths = Math.max(1, Number(r.internRemainingMonths ?? r.remainingMonths ?? 1) || 1);
                                        setCreateMaxMonths(maxMonths);
                                        setCreateMonths("1");
                                        setCreateSource("employer_due");
                                        setCreateProposalId(String(r.proposalId ?? ""));
                                        setCreateEmployerId(String(r.employerId ?? ""));

                                        setCreateInternDueMinor(Number(r.internDueAmountMinor ?? 0) || 0);
                                        setCreateBaseMonthlyMinor(internMonthlyMinor);

                                        const major = Math.floor(internMonthlyMinor / 100);
                                        setCreateAmountMajor(major > 0 ? String(major) : "");
                                        setOpenCreatePayout(true);
                                      }}
                                    >
                                      {isComplete
                                        ? "Completed"
                                        : hasPendingPayoutForCycle
                                          ? "Payout pending"
                                          : hasPaidPayoutForCycle
                                            ? "Create next payout"
                                            : "Create payout"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                        })()}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              <div className="mt-4">
                <div className="relative w-full overflow-x-auto rounded-lg border custom-scrollbar-horizontal pb-3">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="sticky top-0 z-30 bg-white">
                      <tr className="bg-white border-b transition-colors hover:bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky left-0 z-40 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[120px]">Payout date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Status</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Company</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Project</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Amount</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px]">Method</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[150px]">Reference ID</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px]">Paid at</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground sticky right-0 z-40 bg-white border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right min-w-[150px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {payouts.length === 0 ? (
                        <tr className="border-b transition-colors hover:bg-muted/50">
                          <td colSpan={9} className="p-8 text-center text-sm text-muted-foreground">
                            {loadingPayouts ? "Loading payouts..." : "No payouts created yet."}
                          </td>
                        </tr>
                      ) : (
                        payouts
                          .filter((p, idx, self) => self.findIndex((x) => x.id === p.id) === idx)
                          .slice()
                          .sort((a, b) => {
                            const da = String(a.scheduledFor ?? "").trim();
                            const db = String(b.scheduledFor ?? "").trim();
                            if (da && db) return da.localeCompare(db);
                            if (da) return -1;
                            if (db) return 1;
                            return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
                          })
                          .map((p) => {
                            const status = String(p.status ?? "-").toLowerCase();
                            const isPaid = status === "paid";
                            const isPending = status === "pending";

                            const employerId = String(p.employerId ?? "").trim();
                            const employerName = String(
                              (employersById as any)?.[employerId]?.companyName ??
                              (employersById as any)?.[employerId]?.name ??
                              "",
                            ).trim();
                            const companyLabel = employerName || employerId || "-";

                            const proposalId = String(p.proposalId ?? "").trim();
                            const proposal = proposalId ? (proposals ?? []).find((x: any) => String(x?.id ?? "").trim() === proposalId) : null;
                            const projName = String(
                              (proposal as any)?.projectName ??
                              (proposal as any)?.project_name ??
                              "",
                            ).trim();

                            const projectLabel = projName || "-";

                            return (
                              <tr key={p.id} className="bg-white border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle sticky left-0 z-10 bg-inherit border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap min-w-[120px]">
                                  {formatIsoDate(p.scheduledFor ?? p.createdAt)}
                                </td>
                                <td className="p-4 align-middle min-w-[100px]">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      isPaid
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                        : isPending
                                          ? "border-amber-400 bg-amber-50 text-amber-700"
                                          : "border-slate-300 bg-slate-50 text-slate-700"
                                    )}
                                  >
                                    {status || "-"}
                                  </Badge>
                                </td>
                                <td className="p-4 align-middle whitespace-nowrap min-w-[150px]">{companyLabel}</td>
                                <td className="p-4 align-middle whitespace-nowrap min-w-[150px]">{projectLabel}</td>
                                <td className="p-4 align-middle whitespace-nowrap font-medium min-w-[120px]">
                                  {formatMoney(p.amountMinor ?? 0, p.currency)}
                                </td>
                                <td className="p-4 align-middle whitespace-nowrap min-w-[100px]">{String(p.method ?? "-")}</td>
                                <td className="p-4 align-middle whitespace-nowrap font-mono text-xs min-w-[150px]">
                                  {String(p.referenceId ?? "-")}
                                </td>
                                <td className="p-4 align-middle whitespace-nowrap min-w-[120px]">{formatIsoDate(p.paidAt)}</td>
                                <td className="p-4 align-middle sticky right-0 z-10 bg-inherit border-l shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] text-right min-w-[150px]">
                                  <div className="flex items-center justify-end gap-2">
                                    {isPaid ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void sendStipendTransferredEmail(String(p.id))}
                                        title="Send stipend transferred email"
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isPending}
                                      onClick={() => {
                                        setMarkPaidError("");
                                        setMarkPaidPayoutId(String(p.id));
                                        setMarkPaidReferenceId("");
                                        setOpenMarkPaid(true);
                                      }}
                                    >
                                      Mark as paid
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Dialog
                open={openCreatePayout}
                onOpenChange={(open) => {
                  setOpenCreatePayout(open);
                  if (!open) {
                    setCreatePayoutError("");
                    setCreateSource("");
                    setCreateProposalId("");
                    setCreateEmployerId("");
                    setCreateMaxMonths(0);
                    setCreateInternDueMinor(0);
                    setCreateBaseMonthlyMinor(0);
                  }
                }}
              >
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Create payout</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Amount (major)</Label>
                      <Input
                        inputMode="decimal"
                        placeholder="e.g. 8000"
                        value={createAmountMajor}
                        onChange={(e) => setCreateAmountMajor(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter amount in INR. It will be stored in minor units.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Payout date</Label>
                      <Input
                        type="date"
                        value={createScheduledFor}
                        onChange={(e) => setCreateScheduledFor(e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Months (optional)</Label>
                      {createMaxMonths > 0 ? (
                        <Select value={createMonths || "1"} onValueChange={(v) => setCreateMonths(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Months" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: createMaxMonths }, (_, i) => {
                              const n = i + 1;
                              return (
                                <SelectItem key={String(n)} value={String(n)}>
                                  {n} month{n === 1 ? "" : "s"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          inputMode="numeric"
                          placeholder="e.g. 3"
                          value={createMonths}
                          onChange={(e) => setCreateMonths(e.target.value)}
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        If you enter more than 1, each time you mark a payout paid, the next month payout will be auto-created.
                      </p>
                    </div>

                    {createPayoutError ? <p className="text-sm text-red-600">{createPayoutError}</p> : null}

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => setOpenCreatePayout(false)} disabled={creatingPayout}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleCreatePayout()} disabled={creatingPayout}>
                        {creatingPayout ? "Creating..." : "Create"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog
                open={openMarkPaid}
                onOpenChange={(open) => {
                  setOpenMarkPaid(open);
                  if (!open) {
                    setMarkPaidError("");
                    setMarkPaidPayoutId("");
                    setMarkPaidReferenceId("");
                  }
                }}
              >
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Mark payout as paid</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Payment reference ID</Label>
                      <Input
                        placeholder="Enter transaction / reference id"
                        value={markPaidReferenceId}
                        onChange={(e) => setMarkPaidReferenceId(e.target.value)}
                      />
                    </div>

                    {markPaidError ? <p className="text-sm text-red-600">{markPaidError}</p> : null}

                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => setOpenMarkPaid(false)} disabled={markingPaid}>
                        Cancel
                      </Button>
                      <Button onClick={() => void handleMarkPaid()} disabled={markingPaid}>
                        {markingPaid ? "Saving..." : "Mark paid"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="timesheets" className="m-0">
            <div className="p-4 sm:p-6">
              <ScrollArea className="h-[500px]">
                <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Only approved timesheets are shown here.</p>
                  {timesheetsError ? <p className="text-xs text-rose-600 mt-1">{timesheetsError}</p> : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loadingTimesheets}
                  onClick={() => {
                    if (!internId) return;
                    setLoadingTimesheets(true);
                    setTimesheetsError("");
                    void (async () => {
                      try {
                        const res = await apiRequest(
                          "GET",
                          `/api/intern/${encodeURIComponent(String(internId))}/timesheets?limit=500`,
                        );
                        const json = await res.json().catch(() => null);
                        const list = Array.isArray(json?.timesheets) ? (json.timesheets as any[]) : [];
                        setTimesheets(list);
                      } catch (e: any) {
                        setTimesheets([]);
                        setTimesheetsError(String(e?.message ?? "Failed to fetch timesheets"));
                      } finally {
                        setLoadingTimesheets(false);
                      }
                    })();
                  }}
                >
                  {loadingTimesheets ? "Loading..." : "Refresh"}
                </Button>
              </div>

              <div className="grid gap-3 mt-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={timesheetSearch}
                    onChange={(e) => setTimesheetSearch(e.target.value)}
                    placeholder="Search project / company / role / duration"
                    className="pl-9"
                  />
                </div>

                <Select value={timesheetProjectFilter} onValueChange={(v) => setTimesheetProjectFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {timesheetProjectOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={timesheetCompanyFilter} onValueChange={(v) => setTimesheetCompanyFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {timesheetCompanyOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4">
                {loadingTimesheets ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">Loading timesheets...</p>
                  </Card>
                ) : approvedTimesheets.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No approved timesheets found.</p>
                  </Card>
                ) : filteredApprovedTimesheets.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No approved timesheets match your filters.</p>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {filteredApprovedTimesheets.map((t: any) => {
                      const tid = String(t?.id ?? "").trim();
                      const pmeta = getTimesheetProposalMeta(t);
                      const periodStart = formatIsoDate(t?.periodStart);
                      const periodEnd = formatIsoDate(t?.periodEnd);
                      const summary = timesheetAttendanceSummary(t);
                      const managerNote = String(t?.managerNote ?? t?.manager_note ?? "").trim();
                      const approvedAt = formatIsoDate(t?.approvedAt ?? t?.approved_at ?? null);
                      return (
                        <Card key={tid || Math.random()} className="p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold truncate">
                                  {periodStart} → {periodEnd}
                                </div>
                                <Badge className="bg-emerald-600">Approved</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium text-slate-700">{pmeta.projectName}</span>
                                {pmeta.companyName && pmeta.companyName !== "-" ? ` • ${pmeta.companyName}` : ""}
                                {pmeta.roleTitle && pmeta.roleTitle !== "-" ? ` • ${pmeta.roleTitle}` : ""}
                                {pmeta.duration && pmeta.duration !== "-" ? ` • ${pmeta.duration}` : ""}
                                {approvedAt && approvedAt !== "-" ? ` • Approved: ${approvedAt}` : ""}
                              </div>
                              <div className="grid gap-2 md:grid-cols-5 text-xs text-muted-foreground">
                                <div className="rounded-md border bg-muted/20 p-2">
                                  <div className="font-medium text-slate-700">Present</div>
                                  <div className="mt-0.5">{summary.present}</div>
                                </div>
                                <div className="rounded-md border bg-muted/20 p-2">
                                  <div className="font-medium text-slate-700">Absent</div>
                                  <div className="mt-0.5">{summary.absent}</div>
                                </div>
                                <div className="rounded-md border bg-muted/20 p-2">
                                  <div className="font-medium text-slate-700">Fixed off</div>
                                  <div className="mt-0.5">{summary.fixedOff}</div>
                                </div>
                                <div className="rounded-md border bg-muted/20 p-2">
                                  <div className="font-medium text-slate-700">Holiday</div>
                                  <div className="mt-0.5">{summary.holiday}</div>
                                </div>
                                <div className="rounded-md border bg-muted/20 p-2">
                                  <div className="font-medium text-slate-700">Days</div>
                                  <div className="mt-0.5">
                                    {summary.filled}/{summary.total}
                                  </div>
                                </div>
                              </div>
                              {managerNote ? (
                                <div className="rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                                  <span className="text-xs font-medium text-muted-foreground">Manager note</span>
                                  <div className="mt-1">{managerNote}</div>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTimesheet(t);
                                  setOpenTimesheetDetails(true);
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                View
                              </Button>
                              {pmeta.projectId ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setLocation(`/admin/projects?projectId=${encodeURIComponent(pmeta.projectId)}`);
                                  }}
                                >
                                  View Project Details
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <Dialog
                open={openTimesheetDetails}
                onOpenChange={(open) => {
                  setOpenTimesheetDetails(open);
                  if (!open) setSelectedTimesheet(null);
                }}
              >
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Timesheet details</DialogTitle>
                  </DialogHeader>

                  <ScrollArea className="max-h-[70vh] pr-3">
                    {!selectedTimesheet ? (
                      <p className="text-sm text-muted-foreground">No timesheet selected.</p>
                    ) : (
                      <div className="space-y-4">
                        {(() => {
                          const t = selectedTimesheet;
                          const pmeta = getTimesheetProposalMeta(t);
                          const periodStart = formatIsoDate(t?.periodStart);
                          const periodEnd = formatIsoDate(t?.periodEnd);
                          const approvedAt = formatIsoDate(t?.approvedAt ?? t?.approved_at ?? null);
                          const managerNote = String(t?.managerNote ?? t?.manager_note ?? "").trim();
                          const internNote = String(t?.internNote ?? t?.intern_note ?? "").trim();
                          const entries = Array.isArray(t?.entries) ? t.entries : [];
                          const summary = timesheetAttendanceSummary(t);

                          const normalized = entries
                            .map((e: any) => {
                              const date = String(e?.date ?? "").slice(0, 10);
                              const status = String(e?.status ?? "").trim();
                              return { date, status };
                            })
                            .filter((r: any) => r.date)
                            .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));

                          return (
                            <>
                              <Card className="p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="text-sm font-semibold">
                                      {periodStart} → {periodEnd}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      <span className="font-medium text-slate-700">{pmeta.projectName}</span>
                                      {pmeta.companyName && pmeta.companyName !== "-" ? ` • ${pmeta.companyName}` : ""}
                                      {pmeta.roleTitle && pmeta.roleTitle !== "-" ? ` • ${pmeta.roleTitle}` : ""}
                                      {pmeta.duration && pmeta.duration !== "-" ? ` • ${pmeta.duration}` : ""}
                                      {approvedAt && approvedAt !== "-" ? ` • Approved: ${approvedAt}` : ""}
                                    </div>
                                  </div>
                                  <Badge className="bg-emerald-600">Approved</Badge>
                                </div>
                              </Card>

                              <div className="grid gap-3 md:grid-cols-2">
                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Attendance summary</p>
                                  <div className="mt-2 grid gap-2 grid-cols-2 text-sm">
                                    <div className="rounded-md border bg-muted/20 p-2">
                                      <div className="text-xs text-muted-foreground">Present</div>
                                      <div className="font-medium text-slate-800">{summary.present}</div>
                                    </div>
                                    <div className="rounded-md border bg-muted/20 p-2">
                                      <div className="text-xs text-muted-foreground">Absent</div>
                                      <div className="font-medium text-slate-800">{summary.absent}</div>
                                    </div>
                                    <div className="rounded-md border bg-muted/20 p-2">
                                      <div className="text-xs text-muted-foreground">Fixed off</div>
                                      <div className="font-medium text-slate-800">{summary.fixedOff}</div>
                                    </div>
                                    <div className="rounded-md border bg-muted/20 p-2">
                                      <div className="text-xs text-muted-foreground">Holiday</div>
                                      <div className="font-medium text-slate-800">{summary.holiday}</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Filled days: {summary.filled}/{summary.total}
                                  </div>
                                </Card>

                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Notes</p>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <div className="rounded-md border bg-muted/20 p-3 whitespace-pre-wrap">
                                      <span className="text-xs font-medium text-muted-foreground">Intern note</span>
                                      <div className="mt-1">{internNote || "-"}</div>
                                    </div>
                                    <div className="rounded-md border bg-muted/20 p-3 whitespace-pre-wrap">
                                      <span className="text-xs font-medium text-muted-foreground">Manager note</span>
                                      <div className="mt-1">{managerNote || "-"}</div>
                                    </div>
                                  </div>
                                </Card>
                              </div>

                              <Card className="p-4">
                                <p className="text-xs font-medium text-muted-foreground">Entries</p>
                                <div className="mt-3 overflow-x-auto rounded-lg border custom-scrollbar-horizontal pb-3">
                                  <Table className="border-collapse">
                                    <TableHeader className="sticky top-0 z-30 bg-background">
                                      <TableRow className="bg-background">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {normalized.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={2} className="text-sm text-muted-foreground">
                                            No entries.
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        normalized.map((r: any) => (
                                          <TableRow key={String(r.date)} className="bg-background transition-colors hover:bg-muted/40">
                                            <TableCell>{String(r.date)}</TableCell>
                                            <TableCell>{String(r.status || "-")}</TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </Card>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="m-0">
            <div className="p-4 sm:p-6">
              <ScrollArea className="h-[500px]">
                <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">About Me</p>
                  <div className="mt-2 space-y-3 text-sm">


                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-md border bg-white p-3">
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="mt-1">{summary.city ? String(summary.city) : "-"}</p>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <p className="text-xs text-muted-foreground">State</p>
                        <p className="mt-1">{summary.state ? String(summary.state) : "-"}</p>
                      </div>

                      <div className="rounded-md border bg-white p-3">
                        <p className="text-xs text-muted-foreground">Aadhaar</p>
                        <p className="mt-1 font-mono">{summary.aadhaarNumber ? String(summary.aadhaarNumber) : "-"}</p>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <p className="text-xs text-muted-foreground">PAN</p>
                        <p className="mt-1 font-mono">{summary.panNumber ? String(summary.panNumber) : "-"}</p>
                      </div>
                      {summary.emergencyPhone && (
                        <div className="rounded-md border bg-white p-3 md:col-span-2">
                          <p className="text-xs text-muted-foreground">Emergency Contact</p>
                          <p className="mt-1 font-medium text-rose-600">
                            {summary.emergencyName ? `${summary.emergencyName}: ` : ""}
                            {summary.emergencyPhone}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">

                      <div>
                        <p className="text-xs text-muted-foreground">LinkedIn</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <div className="min-w-0 rounded-md border bg-white px-3 py-2 text-sm truncate">
                            {summary.linkedinUrl ? String(summary.linkedinUrl) : "-"}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!summary.linkedinUrl}
                            onClick={() => openExternal(summary.linkedinUrl)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!summary.linkedinUrl}
                            onClick={() => void copyToClipboard(summary.linkedinUrl)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm md:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                      </div>
                      Professional Experience
                    </h3>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                      {(Array.isArray(summary.experience) ? summary.experience : []).length} Records
                    </Badge>
                  </div>

                  <div className="space-y-6">
                    {(Array.isArray(summary.experience) ? summary.experience : []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                          <Briefcase className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">No professional experience added yet.</p>
                      </div>
                    ) : (
                      (summary.experience as any[]).map((e: any, idx: number) => {
                        const company = String(e?.company ?? e?.companyName ?? e?.organization ?? "-").trim() || "-";
                        const role = String(e?.role ?? e?.title ?? e?.position ?? "-").trim() || "-";
                        const type = String(e?.type ?? "").trim();
                        const start = String(e?.from ?? e?.startDate ?? e?.start ?? "").trim();
                        const end = String(e?.to ?? e?.endDate ?? e?.end ?? "").trim();
                        const period = [start, end].filter(Boolean).join(" - ") || "-";
                        const description = String(e?.description ?? e?.details ?? "-").trim() || "-";

                        return (
                          <div
                            key={String(e?.id ?? `${company}-${role}-${idx}`)}
                            className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-100 group hover:before:bg-emerald-200 transition-all"
                          >
                            <div className="absolute left-[-5px] top-0 h-[12px] w-[12px] rounded-full border-2 border-white bg-slate-200 group-hover:bg-emerald-500 transition-colors" />

                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  {type && (
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1">
                                      {type}
                                    </div>
                                  )}
                                  <h4 className="text-base font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors truncate">
                                    {role}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                      {company}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 whitespace-nowrap self-start">
                                  <CalendarDays className="h-3 w-3" />
                                  {period}
                                </div>
                              </div>

                              {description !== "-" && (
                                <div className="rounded-xl border border-slate-50 bg-slate-50/40 p-4 mt-1">
                                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                                    {description}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>

                <Card className="p-4 md:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Skills</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {skillsForDisplay.length === 0 && (
                          <p className="text-sm text-muted-foreground">No skills added.</p>
                        )}
                        {skillsForDisplay.map((s) => {
                          const level = s.rating === 3 ? "Advanced" : s.rating === 2 ? "Intermediate" : "Beginner";
                          const colorClass = s.rating === 3 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : s.rating === 2 ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-slate-100 text-slate-800 border-slate-200";
                          return (
                            <div key={s.id} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", colorClass)}>
                              {s.name}
                              <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                              <span className="opacity-80 font-normal">{level}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSkillDraft(skillsForDisplay.map(s => ({ ...s })));
                        setSkillError(null);
                        setOpenEditSkills(true);
                      }}
                    >
                      Edit Skills
                    </Button>
                  </div>
                </Card>

                <Card className="p-6 border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-indigo-600" />
                      </div>
                      Academics
                    </h3>
                    {summary.academics?.status && (
                      <Badge variant="outline" className={cn(
                        "px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider",
                        summary.academics.status === "Completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {summary.academics.status}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Primary Education */}
                    <div className="relative pl-4 border-l-2 border-slate-100 pb-2">
                      <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm" />
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-tight bg-indigo-50 px-1.5 py-0.5 rounded">
                            {summary.academics?.level || "-"}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">
                            {summary.academics?.degree || "-"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-tight">
                          {summary.academics?.institution || "-"}
                        </p>
                        {summary.academics?.specialization && (
                          <p className="text-xs text-slate-500 italic">
                            Specialization: {summary.academics.specialization}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{summary.academics?.startYear || "-"} — {summary.academics?.endYear || (summary.academics?.status === "Pursuing" ? "Present" : "-")}</span>
                          </div>
                          {summary.academics?.score && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
                              <span className="text-slate-500 font-normal">Score:</span>
                              {summary.academics.score} {summary.academics.scoreType === "cgpa" ? "CGPA" : "%"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Professional Courses */}
                    {Array.isArray(summary.academics?.professionalCourses) && summary.academics.professionalCourses.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Professional Courses</p>
                        <div className="grid gap-3">
                          {summary.academics.professionalCourses.map((course: any, idx: number) => (
                            <div key={course.id || idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold text-slate-800">
                                    {course.courseNamePreset === "Other" ? course.courseNameOther : course.courseNamePreset}
                                    {course.level && <span className="ml-2 text-xs font-normal text-slate-500">({course.level})</span>}
                                  </p>
                                  <p className="text-xs font-medium text-slate-600">{course.institution || "-"}</p>
                                </div>
                                <Badge variant="outline" className={cn(
                                  "text-[9px] font-semibold h-5 px-1.5",
                                  course.status === "Completed" ? "bg-white text-emerald-600 border-emerald-100" : "bg-white text-amber-600 border-amber-100"
                                )}>
                                  {course.status}
                                </Badge>
                              </div>
                              {(course.completionDate || course.score) && (
                                <div className="mt-2 flex items-center gap-4 text-[11px]">
                                  {course.completionDate && (
                                    <span className="text-slate-500 flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" /> {course.completionDate}
                                    </span>
                                  )}
                                  {course.score && (
                                    <span className="font-semibold text-slate-700">
                                      Score: {course.score}{course.scoreType === "cgpa" ? " CGPA" : "%"}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Certifications */}
                    {Array.isArray(summary.academics?.certifications) && summary.academics.certifications.length > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Certifications</p>
                        <div className="grid gap-3">
                          {summary.academics.certifications.map((cert: any, idx: number) => (
                            <div key={cert.id || idx} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                              <p className="text-sm font-bold text-slate-800">{cert.certificateName || "-"}</p>
                              <p className="text-xs font-medium text-slate-600 mt-0.5">{cert.institution || "-"}</p>
                              {(cert.startDate || cert.endDate) && (
                                <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {cert.startDate || "-"} — {cert.endDate || "-"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">Languages</p>
                  <div className="mt-2 space-y-1 text-sm">
                    {summary.languages.length === 0 && (
                      <p className="text-muted-foreground">No languages added.</p>
                    )}
                    {summary.languages.map((l: any) => {
                      const options = [
                        l?.read === "yes" ? "Read" : null,
                        l?.write === "yes" ? "Write" : null,
                        l?.speak === "yes" ? "Speak" : null,
                      ].filter(Boolean);

                      return (
                        <div key={String(l?.id ?? l?.language ?? JSON.stringify(l))} className="rounded-md border border-slate-100 bg-slate-50/50 p-2 last:mb-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900">
                              {String(l?.language ?? "-")}
                            </p>
                            {l?.level && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-white">
                                {String(l.level)}
                              </Badge>
                            )}
                          </div>
                          {options.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {options.map((opt) => (
                                <span key={opt} className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-4 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Extracurricular</p>
                  <div className="mt-2 space-y-1 text-sm">
                    {summary.extracurricular.length === 0 && (
                      <p className="text-muted-foreground">No extracurricular activities added.</p>
                    )}
                    {summary.extracurricular.map((a: any) => (
                      <p key={String(a?.id ?? a?.activity ?? JSON.stringify(a))}>
                        {String(a?.activity ?? "-")}
                        {a?.level ? ` (${String(a.level)})` : ""}
                      </p>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Location Preferences</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Location types</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(summary.locationTypes) ? summary.locationTypes : []).length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          (summary.locationTypes as any[]).map((t: any, idx: number) => (
                            <Badge key={`${String(t)}-${idx}`} variant="outline" className="bg-white">
                              {String(t)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Preferred locations</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(Array.isArray(summary.preferredLocations) ? summary.preferredLocations : []).length === 0 ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          (summary.preferredLocations as any[]).map((loc: any, idx: number) => (
                            <Badge key={`${String(loc)}-${idx}`} variant="outline" className="bg-white">
                              {String(loc)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border bg-white p-3">
                      <p className="text-xs text-muted-foreground">Current location</p>
                      <p className="mt-1">{summary.location || "-"}</p>

                    </div>

                    <div className="rounded-md border bg-white p-3">
                      <p className="text-xs text-muted-foreground">Laptop</p>
                      <p className="mt-1">
                        {summary.hasLaptop === null ? "-" : summary.hasLaptop ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="interviews" className="m-0">
            <div className="p-4 sm:p-6">
              <ScrollArea className="h-[500px]">
                <Dialog
                open={openInterviewDetails}
                onOpenChange={(next) => {
                  setOpenInterviewDetails(next);
                  if (!next) setSelectedInterview(null);
                }}
              >
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Interview details</DialogTitle>
                  </DialogHeader>

                  <ScrollArea className="max-h-[70vh] pr-3">
                    {!selectedInterview ? (
                      <div className="text-sm text-muted-foreground">No interview selected.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold">
                              {String(
                                selectedInterview?.employerCompanyName ??
                                selectedInterview?.employerName ??
                                selectedInterview?.employerId ??
                                "Employer",
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Interview ID: {String(selectedInterview?.id ?? "-")}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={statusBadgeClass(resolveInterviewStatus(selectedInterview))}
                          >
                            {resolveInterviewStatus(selectedInterview)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">Project</p>
                            <p className="mt-1 text-sm">
                              {getProjectMeta(selectedInterview).name}
                            </p>
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {getProjectMeta(selectedInterview).locationType && (
                                <p>
                                  <span className="text-muted-foreground">Work:</span> {getProjectMeta(selectedInterview).locationType}
                                  {getProjectMeta(selectedInterview).location ? ` • ${getProjectMeta(selectedInterview).location}` : ""}
                                </p>
                              )}
                              {getProjectMeta(selectedInterview).scopeOfWork && (
                                <p className="line-clamp-2">{getProjectMeta(selectedInterview).scopeOfWork}</p>
                              )}
                            </div>
                            <p className="mt-2 text-xs font-medium text-muted-foreground">Timezone</p>
                            <p className="mt-1 text-sm">{String(selectedInterview?.timezone ?? "-")}</p>
                          </Card>
                          <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">Updated</p>
                            <p className="mt-1 text-sm">
                              {formatIsoDate(
                                selectedInterview?.updatedAt ??
                                selectedInterview?.updated_at ??
                                selectedInterview?.createdAt ??
                                selectedInterview?.created_at,
                              )}
                            </p>
                            <p className="mt-2 text-xs font-medium text-muted-foreground">Selected slot</p>
                            <p className="mt-1 text-sm">
                              {getSelectedSlotMeta(selectedInterview).label}
                            </p>
                          </Card>
                        </div>

                        <Card className="p-4">
                          <p className="text-xs font-medium text-muted-foreground">Slots</p>
                          <div className="mt-3 grid gap-2">
                            {([1, 2, 3] as const).map((n) => {
                              const key = `slot${n}` as const;
                              const raw = selectedInterview?.[key];
                              const selected = Number(
                                selectedInterview?.selectedSlot ?? selectedInterview?.selected_slot ?? 0,
                              );
                              const isSelected = selected === n;
                              return (
                                <div
                                  key={n}
                                  className={
                                    isSelected
                                      ? "flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2"
                                      : "flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2"
                                  }
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      Slot {n}
                                    </Badge>
                                    <span className="text-sm">{raw ? formatSlot(raw, selectedInterview?.timezone) : "-"}</span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[11px] font-semibold text-emerald-700">Selected</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Card>

                        <Card className="p-4">
                          <p className="text-xs font-medium text-muted-foreground">Links</p>
                          <div className="mt-3 space-y-2">
                            {(
                              String(selectedInterview?.meet_link ?? selectedInterview?.meetingLink ?? "")
                                .trim()
                                .length > 0
                            ) && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Meeting</p>
                                    <p className="text-sm truncate max-w-[520px]">
                                      {String(selectedInterview?.meet_link ?? selectedInterview?.meetingLink)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyToClipboard(selectedInterview?.meet_link ?? selectedInterview?.meetingLink)}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openExternal(selectedInterview?.meet_link ?? selectedInterview?.meetingLink)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                            {(
                              String(selectedInterview?.feedback_link ?? selectedInterview?.feedbackLink ?? "")
                                .trim()
                                .length > 0
                            ) && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Feedback</p>
                                    <p className="text-sm truncate max-w-[520px]">
                                      {String(selectedInterview?.feedback_link ?? selectedInterview?.feedbackLink)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openExternal(selectedInterview?.feedback_link ?? selectedInterview?.feedbackLink)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                            {(
                              String(selectedInterview?.recording_link ?? selectedInterview?.recordingLink ?? "")
                                .trim()
                                .length > 0
                            ) && (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">Recording</p>
                                    <p className="text-sm truncate max-w-[520px]">
                                      {String(selectedInterview?.recording_link ?? selectedInterview?.recordingLink)}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openExternal(selectedInterview?.recording_link ?? selectedInterview?.recordingLink)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                          </div>
                        </Card>

                        <Card className="p-4">
                          <p className="text-xs font-medium text-muted-foreground">Notes</p>
                          <div className="mt-2 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                            {String(selectedInterview?.notes ?? "-")}
                          </div>
                        </Card>
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={interviewSearch}
                    onChange={(e) => setInterviewSearch(e.target.value)}
                    placeholder="Search employer / company / project / notes / link"
                    className="pl-9"
                  />
                </div>

                <Select value={interviewStatusFilter} onValueChange={(v) => setInterviewStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={interviewSlotFilter} onValueChange={(v) => setInterviewSlotFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All slots</SelectItem>
                    <SelectItem value="selected">Selected slot</SelectItem>
                    <SelectItem value="unselected">Unselected</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={interviewFromDate}
                    onChange={(e) => setInterviewFromDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={interviewToDate}
                    onChange={(e) => setInterviewToDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="lg:col-span-2 flex items-center justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInterviewSearch("");
                      setInterviewStatusFilter("all");
                      setInterviewSlotFilter("all");
                      setInterviewFromDate("");
                      setInterviewToDate("");
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                {interviews.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No interviews found.</p>
                  </Card>
                ) : filteredInterviews.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No interviews match your filters.</p>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {filteredInterviews.map((i: any) => {
                      const status = resolveInterviewStatus(i);
                      const selected = Number(i?.selectedSlot ?? i?.selected_slot ?? 0);
                      const companyLabel = String(i?.employerCompanyName ?? i?.employerName ?? "-").trim() || "-";
                      const employerLabel = String(i?.employerName ?? "").trim();
                      const tz = String(i?.timezone ?? "-").trim() || "-";
                      const meet = String(i?.meet_link ?? i?.meetingLink ?? "").trim();

                      const updated = formatIsoDate(i?.updatedAt ?? i?.updated_at ?? i?.createdAt ?? i?.created_at);

                      return (
                        <Card key={String(i?.id ?? Math.random())} className="p-5">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold truncate">{companyLabel}</div>
                                {employerLabel && employerLabel !== companyLabel && (
                                  <div className="text-xs text-muted-foreground truncate">({employerLabel})</div>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Link2 className="h-3 w-3" /> {tz}
                                </span>
                                <span>Updated: {updated}</span>
                                {String(getProjectMeta(i).name ?? "").trim() && (
                                  <span className="truncate">Project: {String(getProjectMeta(i).name)}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <Badge variant="outline" className={statusBadgeClass(status)}>
                                {status}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={
                                  selected
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 bg-slate-50 text-slate-700"
                                }
                              >
                                {selected
                                  ? `Slot ${selected} • ${String(getSelectedSlotMeta(i).label)}`
                                  : "No slot"}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInterview(i);
                                  setOpenInterviewDetails(true);
                                }}
                              >
                                View details
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 text-xs text-muted-foreground">
                              {meet ? (
                                <span className="truncate block max-w-[760px]">Meeting: {meet}</span>
                              ) : (
                                <span>Meeting: -</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" disabled={!meet} onClick={() => copyToClipboard(meet)}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" disabled={!meet} onClick={() => openExternal(meet)}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="m-0">
            <div className="p-4 sm:p-6">
              <ScrollArea className="h-[500px]">
                <Dialog
                open={openProposalDetails}
                onOpenChange={(next) => {
                  setOpenProposalDetails(next);
                  if (!next) setSelectedProposal(null);
                }}
              >
                <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Proposal details</DialogTitle>
                  </DialogHeader>

                  <ScrollArea className="max-h-[85vh] pr-3">
                    {!selectedProposal ? (
                      <div className="text-sm text-muted-foreground">No proposal selected.</div>
                    ) : (
                      <div className="space-y-4">
                        {(() => {
                          const offer = (selectedProposal?.offerDetails || selectedProposal?.offer_details || {}) as any;
                          const updatedRaw =
                            selectedProposal?.updatedAt ??
                            selectedProposal?.updated_at ??
                            selectedProposal?.createdAt ??
                            selectedProposal?.created_at;
                          const updated = formatIsoDate(updatedRaw);
                          const hiredAtRaw =
                            selectedProposal?.hiredAt ??
                            selectedProposal?.hired_at;
                          const hiredAt = hiredAtRaw ? formatIsoDate(hiredAtRaw) : null;
                          const status = String(selectedProposal?.status ?? "-");
                          const meta = getProjectMeta(selectedProposal);
                          const roleTitle = String(offer?.roleTitle ?? offer?.role_title ?? "-");
                          const jdRaw = String(offer?.jd ?? "").trim();
                          const jdHtml = (() => {
                            if (!jdRaw) return "";
                            const looksLikeHtml = /<[^>]+>/.test(jdRaw);
                            if (looksLikeHtml) return jdRaw;
                            return escapeHtml(jdRaw).replace(/\r\n|\r|\n/g, "<br />");
                          })();
                          const jdSafeHtml = jdHtml ? DOMPurify.sanitize(jdHtml, { USE_PROFILES: { html: true } }) : "";
                          const score = Number(selectedProposal?.findternScore ?? 0);
                          const currency = String(offer?.currency ?? "INR").toUpperCase();
                          const monthlyHours = Number(offer?.monthlyHours ?? offer?.monthly_hours ?? 160) || 160;

                          const rawMonthly = Number(offer?.monthlyAmount ?? offer?.monthly_amount ?? 0);
                          const rawTotal = Number(offer?.totalPrice ?? offer?.total_price ?? 0);

                          const monthlyAmount = (() => {
                            if (rawMonthly > 0) return rawMonthly;
                            if (score < 6) return currency === "USD" ? 50 : 5000;
                            const rate = score < 8 ? 1 : 2;
                            const rateInCur = currency === "USD" ? rate : rate * 100;
                            return monthlyHours * rateInCur;
                          })();

                          const totalPrice = (() => {
                            if (rawTotal > 0) return rawTotal;
                            const duration = monthsFromDuration(offer?.duration);
                            return monthlyAmount * duration;
                          })();

                          const employerCompanyName = String(
                            selectedProposal?.employerCompanyName ??
                            selectedProposal?.employerName ??
                            selectedProposal?.employerId ??
                            "-",
                          ).trim();

                          const startRaw = offer?.startDate ?? offer?.start_date ?? null;
                          const endRaw = offer?.endDate ?? offer?.end_date ?? null;
                          const durationRaw = String(offer?.duration ?? "").trim();
                          const startUtc = parseDateOnlyUtc(startRaw);
                          const endUtc = parseDateOnlyUtc(endRaw);

                          const derivedMonths = startUtc && endUtc ? monthsBetweenDateOnlyUtc(startUtc, endUtc) : null;
                          const parsedMonths = monthsFromDuration(durationRaw);
                          const durationMonths = derivedMonths !== null ? derivedMonths : parsedMonths;

                          const endDate = (() => {
                            if (endUtc) return endUtc.toISOString().slice(0, 10);
                            if (!startUtc) return "-";
                            return addMonthsUtc(startUtc, durationMonths).toISOString().slice(0, 10);
                          })();

                          const isFullTimeOffer = Boolean(offer?.isFullTime ?? offer?.is_full_time ?? selectedProposal?.isFullTime ?? selectedProposal?.is_full_time ?? false);

                          const durationLabel = isFullTimeOffer ? "Full-time" : (durationMonths === 1 ? "1 month" : `${durationMonths} months`);

                          const fullTimeOfferLabel =
                            typeof offer?.isFullTime === "boolean" || typeof offer?.is_full_time === "boolean"
                              ? (offer.isFullTime || offer.is_full_time ? "Yes" : "No")
                              : "-";

                          return (
                            <>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold">{roleTitle}</div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>Company: {employerCompanyName || "-"}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Proposal ID: {String(selectedProposal?.id ?? "-")} • Updated: {updated}{hiredAt ? ` • Hired: ${hiredAt}` : ""}
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      proposalBadgeClass(status),
                                      status.toLowerCase() === "hired" ? "bg-emerald-600 text-white border-none font-bold px-3 py-1" : ""
                                    )}
                                  >
                                    {status.toLowerCase() === "hired" && isFullTimeOffer
                                      ? "full time hired"
                                      : String(status).toLowerCase()}
                                  </Badge>
                                  {isFullTimeOffer && status.toLowerCase() !== "rejected" && status.toLowerCase() !== "hired" && (
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold py-1 px-3">
                                      Full Time Proposal
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="grid gap-3 lg:grid-cols-3">
                                <Card className="p-4 lg:col-span-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-muted-foreground">Project</p>
                                      <p className="mt-1 text-sm font-semibold truncate">{meta.name}</p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {meta.locationType && (
                                          <Badge variant="outline" className="bg-white">
                                            {meta.locationType}
                                          </Badge>
                                        )}
                                        {meta.location && (
                                          <Badge variant="outline" className="bg-white">
                                            {meta.location}
                                          </Badge>
                                        )}
                                        {Array.isArray(meta.skills) && meta.skills.map((skill: string) => (
                                          <Badge key={skill} variant="outline" className="bg-white">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const pid = meta.projectId;
                                        if (!pid) return;
                                        setLocation(`/admin/projects?projectId=${encodeURIComponent(pid)}`);
                                      }}
                                    >
                                      View Project Details
                                    </Button>
                                  </div>

                                  {meta.scopeOfWork && (
                                    <div className="mt-3 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                                      {meta.scopeOfWork}
                                    </div>
                                  )}
                                </Card>

                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Offer summary</p>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">Mode:</span> {String(offer?.mode ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Location:</span> {String(offer?.location ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Start:</span> {String(offer?.startDate ?? offer?.start_date ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Duration:</span> {durationLabel}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">End:</span> {endDate}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Full-time conversion:</span> {fullTimeOfferLabel}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Shift:</span> {String(offer?.shiftFrom ?? offer?.shift_from ?? "-")}
                                      {String(offer?.shiftTo ?? offer?.shift_to ?? "").trim()
                                        ? ` - ${String(offer?.shiftTo ?? offer?.shift_to)}`
                                        : ""}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Timezone:</span> {String(offer?.timezone ?? "-")}
                                    </p>
                                  </div>
                                </Card>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3">
                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Pricing</p>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">Tier:</span> {resolveProposalPricingLabel(selectedProposal)}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Monthly hours:</span> {String(offer?.monthlyHours ?? offer?.monthly_hours ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Monthly amount:</span> {isFullTimeOffer ? "-" : (monthlyAmount ? `${String(offer?.currency ?? "INR")} ${monthlyAmount.toLocaleString()}` : "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Total price:</span> {isFullTimeOffer ? "-" : (totalPrice ? `${String(offer?.currency ?? "INR")} ${totalPrice.toLocaleString()}` : "-")}
                                    </p>
                                  </div>
                                </Card>

                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Policy</p>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">Laptop:</span> {String(offer?.laptop ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Paid leaves / month:</span> {String(offer?.paidLeavesPerMonth ?? offer?.paid_leaves_per_month ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Schedule:</span> {String(offer?.weeklySchedule ?? offer?.weekly_schedule ?? "-")}
                                    </p>
                                  </div>
                                </Card>

                                <Card className="p-4">
                                  <p className="text-xs font-medium text-muted-foreground">Work setup</p>
                                  <div className="mt-2 space-y-1 text-sm">
                                    <p>
                                      <span className="text-muted-foreground">WFH days:</span> {String(offer?.workFromHomeDays ?? offer?.work_from_home_days ?? "-")}
                                    </p>
                                    <p>
                                      <span className="text-muted-foreground">Office days:</span> {String(offer?.workFromOfficeDays ?? offer?.work_from_office_days ?? "-")}
                                    </p>
                                  </div>
                                </Card>
                              </div>

                              <Card className="p-4">
                                <p className="text-xs font-medium text-muted-foreground">Job description</p>
                                {jdSafeHtml ? (
                                  <div
                                    className="mt-2 rounded-md border bg-muted/20 p-3 text-sm prose prose-slate prose-sm max-w-none break-words [overflow-wrap:anywhere]"
                                    dangerouslySetInnerHTML={{ __html: jdSafeHtml }}
                                  />
                                ) : (
                                  <div className="mt-2 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                                    {stripHtml(jdRaw) || "-"}
                                  </div>
                                )}
                              </Card>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={proposalSearch}
                    onChange={(e) => setProposalSearch(e.target.value)}
                    placeholder="Search project / role / mode / location"
                    className="pl-9"
                  />
                </div>

                <Select value={proposalStatusFilter} onValueChange={(v) => setProposalStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setProposalSearch("");
                      setProposalStatusFilter("all");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                {proposals.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No proposals found.</p>
                  </Card>
                ) : filteredProposals.length === 0 ? (
                  <Card className="p-6">
                    <p className="text-sm text-muted-foreground">No proposals match your filters.</p>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {filteredProposals.map((p: any) => {
                      const meta = getProjectMeta(p);
                      const offer = (p?.offerDetails || p?.offer_details || {}) as any;
                      const isFullTimeOffer = Boolean(offer?.isFullTime ?? offer?.is_full_time ?? p?.isFullTime ?? p?.is_full_time ?? false);
                      const status = String(p?.status ?? "-");
                      const role = String(offer?.roleTitle ?? offer?.role_title ?? "-");
                      const mode = String(offer?.mode ?? meta.locationType ?? "-");
                      const location = String(offer?.location ?? meta.location ?? "-");
                      const start = String(offer?.startDate ?? offer?.start_date ?? "-");
                      const duration = isFullTimeOffer ? "Full-time" : String(offer?.duration ?? "").trim();
                      const startUtc = parseDateOnlyUtc(offer?.startDate ?? offer?.start_date ?? null);
                      const endDate = isFullTimeOffer ? "-" : (startUtc
                        ? addMonthsUtc(startUtc, monthsFromDuration(duration)).toISOString().slice(0, 10)
                        : "-");
                      const pricingLabel = resolveProposalPricingLabel(p);
                      const updated = formatIsoDate(p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at);
                      const hiredAt = p?.hiredAt ?? p?.hired_at;
                      const hiredAtDisplay = hiredAt ? formatIsoDate(hiredAt) : null;

                      return (
                        <Card
                          key={String(p?.id ?? Math.random())}
                          className={cn(
                            "p-5 transition-all hover:shadow-md",
                            isFullTimeOffer ? "border-l-4 border-l-indigo-500 bg-indigo-50/30" : ""
                          )}
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-semibold truncate">{role}</div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    proposalBadgeClass(status),
                                    status.toLowerCase() === "hired" ? "bg-emerald-600 text-white border-none font-bold" : ""
                                  )}
                                >
                                  {status.toLowerCase() === "hired" && isFullTimeOffer
                                    ? "full time hired"
                                    : String(status).toLowerCase()}
                                </Badge>
                                {hiredAtDisplay && (
                                  <span className="text-xs text-muted-foreground">Hired: {hiredAtDisplay}</span>
                                )}
                                {isFullTimeOffer && status.toLowerCase() !== "rejected" && status.toLowerCase() !== "hired" && (
                                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-semibold py-0.5 px-2">
                                    Full Time Proposal
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium text-slate-700">{meta.name}</span>
                                {meta.locationType ? ` • ${meta.locationType}` : ""}
                                {meta.location ? ` • ${meta.location}` : ""}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>Mode: {mode}</span>
                                <span>Location: {location}</span>
                                <span>Start: {start}</span>
                                <span>End: {endDate}</span>
                                <span>Updated: {updated}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "bg-white font-semibold",
                                  isFullTimeOffer ? "text-indigo-700 border-indigo-200" : ""
                                )}
                              >
                                {pricingLabel}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedProposal(p);
                                  setOpenProposalDetails(true);
                                }}
                              >
                                View details
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const pid = String(meta.projectId ?? "").trim();
                                  if (!pid) return;
                                  setLocation(`/admin/projects?projectId=${encodeURIComponent(pid)}`);
                                }}
                              >
                                View Project Details
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="m-0">
            <div className="p-4 sm:p-6">
              <ScrollArea className="h-[500px] pr-4">
                <Card className="p-5 border-0 shadow-md">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#0E6049]" />
                    Bank Details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Bank Name</p>
                    <p>{String((summary as any)?.bankDetails?.bankName ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account Holder</p>
                    <p>{String((summary as any)?.bankDetails?.accountHolderName ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p>{String((summary as any)?.bankDetails?.accountNumber ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IFSC</p>
                    <p>{String((summary as any)?.bankDetails?.ifscCode ?? "-")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p>{String((summary as any)?.bankDetails?.upiId ?? "-")}</p>
                  </div>
                </div>
                </Card>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </Card>

      <Dialog
        open={openDocPreview}
        onOpenChange={(open) => {
          setOpenDocPreview(open);
          if (!open) setSelectedDoc(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name ?? "Document"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                disabled={!selectedDoc?.href}
                onClick={() => {
                  if (!selectedDoc?.href) return;
                  if (typeof window === "undefined") return;
                  window.open(selectedDoc.href, "_blank");
                }}
              >
                Open in new tab
              </Button>
            </div>

            <div className="w-full">
              {!selectedDoc?.href && (
                <p className="text-sm text-muted-foreground">No file available.</p>
              )}

              {selectedDoc?.href && selectedDocKind === "image" && (
                <img
                  src={selectedDoc.href}
                  alt={selectedDoc.name}
                  className="w-full max-h-[70vh]  rounded-md border"
                />
              )}

              {selectedDoc?.href && selectedDocKind === "video" && (
                <video
                  src={selectedDoc.href}
                  controls
                  className="w-full max-h-[70vh] rounded-md border bg-black"
                />
              )}

              {selectedDoc?.href && (selectedDocKind === "pdf" || selectedDocKind === "other") && (
                <iframe
                  src={selectedDoc.href}
                  className="w-full h-[70vh] rounded-md border bg-white"
                  title={selectedDoc.name}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditSkills} onOpenChange={setOpenEditSkills}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit skills (Min 4, Max 7)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col max-h-[80vh]">
            <div className="flex-1 overflow-y-auto pr-2 min-h-[300px] max-h-[500px] custom-scrollbar">
              <div className="space-y-4 py-1">
                <div className="grid gap-3">
                  {skillDraft.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm">
                      <div className="flex-1">
                        <Input
                          placeholder="Skill name"
                          value={skill.name}
                          onChange={(e) => {
                            const next = [...skillDraft];
                            next[idx].name = e.target.value;
                            setSkillDraft(next);
                          }}
                          className="bg-white"
                          disabled={savingSkills}
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          value={String(skill.rating || 1)}
                          onValueChange={(v) => {
                            const next = [...skillDraft];
                            next[idx].rating = Number(v);
                            setSkillDraft(next);
                          }}
                          disabled={savingSkills}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Beginner</SelectItem>
                            <SelectItem value="2">Intermediate</SelectItem>
                            <SelectItem value="3">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setSkillDraft(skillDraft.filter((_, i) => i !== idx));
                        }}
                        disabled={savingSkills}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {skillDraft.length < 7 && (
                  <Button
                    variant="outline"
                    className="w-full border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 py-5"
                    onClick={() => {
                      setSkillDraft([...skillDraft, { id: `new-${Date.now()}`, name: "", rating: 1 }]);
                    }}
                    disabled={savingSkills}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Skill
                  </Button>
                )}

                {skillError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {skillError}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 border-t pt-3 mt-4">
              <p>Minimum 4 skills required</p>
              <p className={cn("font-medium", skillDraft.length >= 4 && skillDraft.length <= 7 ? "text-emerald-600" : "text-rose-600")}>
                {skillDraft.length}/7 skills
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t mt-2">
              <Button variant="outline" onClick={() => setOpenEditSkills(false)} disabled={savingSkills}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSkills}
                disabled={savingSkills}
                className="bg-[#0E6049] hover:bg-[#0E6049]/90"
              >
                {savingSkills ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}


