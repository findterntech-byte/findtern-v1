import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import DOMPurify from "dompurify";
import { formatMonthlyStipendForInternView } from "@/lib/currency";
import { addDaysToDateString, formatTimeRangeInTimeZone, parseDateTimeInTimeZoneToUtc } from "@/lib/timezone";
import { companySizes } from "@shared/schema";
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  Briefcase,
  MessageSquare,
  GraduationCap,
  Check,
  X,
  ExternalLink,
  Download,
  Wallet,
  Clock,
  Building2,
  User,
  Phone,
  ShieldAlert,
  EyeOff,
  PhoneOff,
  Ban,
  Video,
  Scale,
  Loader2,
} from "lucide-react";

type Proposal = {
  id: string;
  internId?: string;
  status: string;
  employerId?: string;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
  offerDetails?: {
    roleTitle?: string;
    mode?: string;
    jd?: string;
    startDate?: string;
    duration?: string;
    monthlyAmount?: number;
    monthlyHours?: number;
    timezone?: string;
    laptop?: string;
    location?: string;
    shiftFrom?: string;
    shiftTo?: string;
    weeklySchedule?: string;
    paidLeavesPerMonth?: number;
    workFromHomeDays?: number;
    workFromOfficeDays?: number;
    requiredSkills?: string[];
    projectSkills?: string[];
  };
  aiRatings?: {
    communication?: number;
    coding?: number;
    aptitude?: number;
    overall?: number;
  };
  skills?: string[];
};

export default function ProposalDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/proposals/:id");
  const proposalId = params?.id ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingStatus, setUpdatingStatus] = useState<null | "accepted" | "rejected">(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [pendingAcceptProposalId, setPendingAcceptProposalId] = useState<string | null>(null);
  const [acceptCountdown, setAcceptCountdown] = useState(0);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const [fullTimeConfirmOpen, setFullTimeConfirmOpen] = useState(false);
  const [fullTimeAcceptCountdown, setFullTimeAcceptCountdown] = useState(0);
  const [fullTimeAcceptedTerms, setFullTimeAcceptedTerms] = useState(false);

  const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/intern/proposals", storedUserId, proposalId],
    enabled: !!proposalId,
    queryFn: async () => {
      if (!storedUserId) {
        throw new Error("User not logged in");
      }

      const res = await fetch(
        `/api/intern/${encodeURIComponent(String(storedUserId))}/proposals/${encodeURIComponent(String(proposalId))}`,
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch proposal";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const proposal = (data?.proposal ?? null) as Proposal | null;
  const employerMeta = ((proposal as any)?.employer ?? null) as any;

  const employerId = String((proposal as any)?.employerId ?? (proposal as any)?.employer_id ?? "").trim();

  const { data: nonDisclosureResp } = useQuery<{ terms: { title: string; bodyHtml: string } | null }>({
    queryKey: ["/api/intern/non-disclosure"],
    queryFn: async () => {
      const res = await fetch("/api/intern/non-disclosure", { credentials: "include" });
      if (!res.ok) return { terms: null };
      return res.json();
    },
  });

  const termsTitle =
    String(nonDisclosureResp?.terms?.title ?? "Non-Disclosure of Contact Information").trim() ||
    "Non-Disclosure of Contact Information";
  const termsBodyHtml = String(nonDisclosureResp?.terms?.bodyHtml ?? "").trim();
  const safeTermsHtml = useMemo(
    () => (termsBodyHtml ? DOMPurify.sanitize(termsBodyHtml, { USE_PROFILES: { html: true } }) : ""),
    [termsBodyHtml],
  );

  useEffect(() => {
    if (!termsOpen) return;
    if (!pendingAcceptProposalId) return;

    const initial = 10;
    setAcceptCountdown(initial);

    const t = window.setInterval(() => {
      setAcceptCountdown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => {
      window.clearInterval(t);
    };
  }, [pendingAcceptProposalId, termsOpen]);

  useEffect(() => {
    if (!fullTimeConfirmOpen) return;

    const initial = 10;
    setFullTimeAcceptCountdown(initial);
    setFullTimeAcceptedTerms(false);

    const t = window.setInterval(() => {
      setFullTimeAcceptCountdown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => {
      window.clearInterval(t);
    };
  }, [fullTimeConfirmOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-sm text-slate-600">Loading proposal...</p>
        </Card>
      </div>
    );
  }

  if (error instanceof Error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-lg font-semibold">Proposal not found</p>
          <Button onClick={() => setLocation("/proposals")}>Back to proposals</Button>
        </Card>
      </div>
    );
  }

  const offer = proposal.offerDetails ?? {};
  const fullTimeOffer = ((offer as any)?.fullTimeOffer ?? null) as any;
  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
  const skills = Array.isArray(proposal.skills) ? proposal.skills : [];
  const ratings = proposal.aiRatings ?? {};
  const escapeHtml = (value: string) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const jd = String((offer as any)?.jd ?? "").trim();
  const jdHtml = (() => {
    if (!jd) return "";
    const looksLikeHtml = /<[^>]+>/.test(jd);
    if (looksLikeHtml) return jd;
    return escapeHtml(jd).replace(/\r\n|\r|\n/g, "<br />");
  })();
  const jdSafeHtml = jdHtml ? DOMPurify.sanitize(jdHtml, { USE_PROFILES: { html: true } }) : "";

  const employerCompanyName = String(employerMeta?.companyName ?? "").trim();
  const employerCompanySize = (() => {
    const raw =
      (employerMeta as any)?.companySize ??
      (employerMeta as any)?.company_size ??
      (employerMeta as any)?.company_size_text ??
      (employerMeta as any)?.size ??
      "";

    if (Array.isArray(raw)) return "";

    const s = String(raw ?? "").trim();
    if (!s) return "";

    const matchByValue = companySizes.find((opt) => String(opt.value).trim() === s);
    if (matchByValue) return String(matchByValue.value);

    const matchByLabel = companySizes.find((opt) => String(opt.label).trim() === s);
    if (matchByLabel) return String(matchByLabel.value);

    return s;
  })();
  const reportingManagerName = String(employerMeta?.primaryContactName ?? "").trim();
  const reportingManagerPhone = String(employerMeta?.phoneNumber ?? "").trim();

  const badge = (() => {
    const statusLower = String((proposal as any)?.status ?? "sent").trim().toLowerCase();

    if (statusLower === "hired") {
      return { key: "hired", label: "Hired" };
    }
    if (statusLower === "accepted") {
      return { key: "approved", label: "Approved" };
    }
    if (statusLower === "rejected") {
      return { key: "rejected", label: "Rejected" };
    }
    if (statusLower === "withdrawn") {
      return { key: "withdrawn", label: "Withdrawn" };
    }

    if (statusLower !== "sent") return null;

    const todayYmd = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    })();

    const startDateYmd = String((offer as any)?.startDate ?? "").trim();
    const isStartDateToday = /^\d{4}-\d{2}-\d{2}$/.test(startDateYmd) && startDateYmd === todayYmd;
    if (isStartDateToday) {
      return { key: "expired", label: "Expired" };
    }

    const created = new Date(String((proposal as any)?.createdAt ?? (proposal as any)?.created_at ?? "")).getTime();
    const updated = new Date(String((proposal as any)?.updatedAt ?? (proposal as any)?.updated_at ?? "")).getTime();
    const projectUpdated = new Date(
      String((proposal as any)?.projectUpdatedAt ?? (proposal as any)?.project_updated_at ?? ""),
    ).getTime();

    if (!Number.isFinite(created)) return null;

    const changedByEmployer =
      (Number.isFinite(updated) && updated > created) ||
      (Number.isFinite(projectUpdated) && projectUpdated > created);

    return changedByEmployer ? { key: "updated", label: "Updated" } : null;
  })();

  const roleTitle = hasFullTimeOffer
    ? (String(fullTimeOffer?.jobTitle ?? "").trim() || "Full Proposal")
    : offer.roleTitle || "Internship Offer";

  const mode = hasFullTimeOffer
    ? (String(fullTimeOffer?.jobMode ?? "remote").trim() || "remote")
    : offer.mode || "remote";

  const internshipLocationLabel = (() => {
    const modeRaw = String(mode ?? "").trim().toLowerCase();
    if (modeRaw === "remote") return "Remote";

    const offerLoc = String((offer as any)?.location ?? "").trim();
    if (offerLoc) return offerLoc;

    const city = String(employerMeta?.city ?? "").trim();
    const state = String(employerMeta?.state ?? "").trim();
    const country = String(employerMeta?.country ?? "").trim();
    const fallback = [city, state, country].filter(Boolean).join(", ");
    return fallback || "To be shared";
  })();

  const moneyLocale = "en-IN";

  const startDate = offer.startDate
    ? new Date(offer.startDate).toLocaleDateString(moneyLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      })
    : "Not specified";

  const durationLabel = (() => {
    switch (offer.duration) {
      case "1m":
        return "1 month";
      case "2m":
        return "2 months";
      case "3m":
        return "3 months";
      case "6m":
        return "6 months";
      default:
        return "Duration not specified";
    }
  })();

  const stipendLabel = (() => {
    const n = Number((offer as any)?.monthlyAmount ?? 0);
    if (!Number.isFinite(n) || n <= 0) return "No stipend";
    const money = formatMonthlyStipendForInternView({
      monthlyAmount: n,
      employer: employerMeta,
      offerCurrency: (offer as any)?.currency,
    });
    if (!money) return "No stipend";
    return `${money} / month`;
  })();

  const monthlyHoursLabel =
    typeof offer.monthlyHours === "number" && offer.monthlyHours > 0
      ? `${offer.monthlyHours} hrs / month`
      : "Approx. 160 hrs / month";

  const timezoneLabel = hasFullTimeOffer
    ? (String(fullTimeOffer?.timezone ?? "").trim() || "Asia/Kolkata")
    : offer.timezone || "Asia/Kolkata";
  const locationLabel = (() => {
    if (hasFullTimeOffer) {
      const modeRaw = String(fullTimeOffer?.jobMode ?? "").trim().toLowerCase();
      if (modeRaw === "remote") return "";
      const city = String(fullTimeOffer?.jobLocationCity ?? "").trim();
      const state = String(fullTimeOffer?.jobLocationState ?? "").trim();
      const loc = [city, state].filter(Boolean).join(", ");
      return loc;
    }

    const raw = String((offer as any)?.location ?? "").trim();
    if (!raw) return "";
    if (raw.toLowerCase() === "remote") return "";
    return raw;
  })();

  const laptopShortLabel = (() => {
    const raw = String((offer as any)?.laptop ?? "").trim().toLowerCase();
    if (!raw) return "Not specified";
    if (raw === "company") return "Company";
    if (raw === "candidate") return "Candidate";
    return raw;
  })();

  const laptopLabel = (() => {
    const raw = String((offer as any)?.laptop ?? "").trim().toLowerCase();
    if (!raw) return "Not specified";
    if (raw === "company") return "Company will send the laptop to you.";
    if (raw === "candidate") return "You are required to work on your own laptop.";
    return raw;
  })();

  const status = proposal.status || "sent";
  const isAccepted = status === "accepted";
  const isRejected = status === "rejected";
  const isExpired = status === "expired";
  const isHired = status === "hired";
  const isFinal = isAccepted || isRejected || isExpired || isHired;

  const statusLabel = (() => {
    const s = String(status || "").trim().toLowerCase();
    if (s === "sent") return "Awaiting your approval";
    if (s === "accepted") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "expired") return "Expired";
    if (s === "withdrawn") return "Withdrawn";
    if (s === "hired") return "Hired";
    return s || "Awaiting your approval";
  })();

  const maskedStatusForBadge = statusLabel;

  const scheduleLabel = (() => {
    const raw = String((offer as any)?.weeklySchedule ?? "").trim().toLowerCase();
    if (raw === "mon_fri") return "Monday - Friday";
    if (raw === "mon_sat") return "Monday - Saturday";
    if (raw === "sun_thu") return "Sunday - Thursday";
    return raw ? raw : "Not specified";
  })();

  const paidLeavesLabel = (() => {
    const n = Number((offer as any)?.paidLeavesPerMonth ?? NaN);
    if (!Number.isFinite(n) || n < 0) return "Not specified";
    return `${n} / month`;
  })();

  const wfhDays = Number((offer as any)?.workFromHomeDays ?? 0);
  const wfoDays = Number((offer as any)?.workFromOfficeDays ?? 0);

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const offerStartDatePartForShift = (() => {
    const raw = String((offer as any)?.startDate ?? "").trim();
    const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    try {
      const d = new Date(raw);
      if (Number.isFinite(d.getTime())) {
        return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      }
    } catch {
      // ignore
    }
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  })();

  const shiftLabelIst = (() => {
    const fromTz = String(timezoneLabel || "Asia/Kolkata").trim() || "Asia/Kolkata";
    const from = hasFullTimeOffer
      ? String(fullTimeOffer?.shiftFrom ?? "").trim()
      : String((offer as any)?.shiftFrom ?? "").trim();
    const to = hasFullTimeOffer
      ? String(fullTimeOffer?.shiftTo ?? "").trim()
      : String((offer as any)?.shiftTo ?? "").trim();
    if (!from || !to) return "Not specified";

    const startUtc = parseDateTimeInTimeZoneToUtc(offerStartDatePartForShift, from, fromTz);
    if (!startUtc) return "Not specified";

    let endUtc = parseDateTimeInTimeZoneToUtc(offerStartDatePartForShift, to, fromTz);
    if (!endUtc) return "Not specified";

    if (endUtc.getTime() <= startUtc.getTime()) {
      const next = addDaysToDateString(offerStartDatePartForShift, 1);
      if (next) {
        const nextEnd = parseDateTimeInTimeZoneToUtc(next, to, fromTz);
        if (nextEnd) endUtc = nextEnd;
      }
    }

    const range = formatTimeRangeInTimeZone(startUtc, endUtc, "Asia/Kolkata");
    return range ? `${range} IST` : "Not specified";
  })();

  const requiredSkills = (() => {
    const fromApi = (proposal as any)?.projectSkills;
    const fromOfferA = (offer as any)?.requiredSkills;
    const fromOfferB = (offer as any)?.projectSkills;
    const fromProposal = (proposal as any)?.skills;
    const arr =
      Array.isArray(fromApi) && fromApi.length > 0
        ? fromApi
        : Array.isArray(fromOfferA) && fromOfferA.length > 0
          ? fromOfferA
          : Array.isArray(fromOfferB) && fromOfferB.length > 0
            ? fromOfferB
            : Array.isArray(fromProposal)
              ? fromProposal
              : [];
    return arr
      .map((s: any) => String(s ?? "").trim())
      .filter((s: string) => s.length > 0);
  })();

  const normalizedRequiredSkills = new Set(requiredSkills.map((s) => s.toLowerCase()));
  const displaySkills = requiredSkills;

  const companyDetailsLocked =
    !hasFullTimeOffer &&
    !isHired &&
    !Boolean(
      (proposal as any)?.companyDetailsUnlocked ??
        (offer as any)?.companyDetailsUnlocked ??
        (offer as any)?.companyPaid ??
        (offer as any)?.isPaid,
    );
  const companyLockedMessage = "Company details will be given after the company pays for your approved proposal.";

  async function handleUpdateStatus(nextStatus: "accepted" | "rejected") {
    try {
      setUpdatingStatus(nextStatus);
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to update proposal status";
        throw new Error(message);
      }

      toast({
        title: nextStatus === "accepted" ? "Proposal accepted" : "Proposal rejected",
        description:
          nextStatus === "accepted"
            ? "You have accepted this internship offer."
            : "You have rejected this internship offer.",
      });

      if (storedUserId) {
        queryClient.setQueryData(["/api/intern/proposals", storedUserId, proposalId], (prev: any) => {
          const prevObj = prev && typeof prev === "object" ? prev : {};
          const prevProposal = prevObj?.proposal && typeof prevObj.proposal === "object" ? prevObj.proposal : {};
          return {
            ...prevObj,
            proposal: {
              ...prevProposal,
              status: nextStatus,
            },
          };
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/intern/proposals", storedUserId, proposalId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/intern/proposals", storedUserId] });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err?.message || "Could not update proposal status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  const statusBadgeClasses = (() => {
    switch (status) {
      case "accepted":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "hired":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "rejected":
        return "border-red-200 bg-red-50 text-red-700";
      case "sent":
      default:
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/15 to-teal-50/30 px-4 py-6 md:px-6 md:py-8">
      <Dialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject proposal?</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-slate-600">
         Are you sure you want to reject this proposal?
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setRejectConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={updatingStatus !== null}
              onClick={async () => {
                if (updatingStatus !== null) return;
                await handleUpdateStatus("rejected");
                setRejectConfirmOpen(false);
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fullTimeConfirmOpen}
        onOpenChange={(open) => {
          setFullTimeConfirmOpen(open);
          if (!open) {
            setFullTimeAcceptCountdown(0);
            setFullTimeAcceptedTerms(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Full-Time Offer Acceptance Confirmation</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] rounded-md border p-4">
            <div className="space-y-4 text-sm text-slate-700">
              <div className="text-slate-800 font-medium">
                Before accepting this full-time employment proposal, please carefully read and acknowledge the following terms:
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Offer Review Confirmation</div>
                <div>
                  By clicking “Accept,” you confirm that you have thoroughly reviewed and understood all details of the employment offer,
                  including job responsibilities, compensation, benefits, work expectations, notice periods, and other terms mentioned in the proposal.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Binding Employment Commitment</div>
                <div>
                  Acceptance of this full-time offer represents a formal professional commitment. Once accepted, the offer cannot be withdrawn,
                  declined, or reversed without valid and documented justification.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Failure to Join After Acceptance</div>
                <div>
                  If you accept the full-time offer but fail to join the organization on the agreed joining date without legitimate justification,
                  Findtern reserves the right to impose platform-level actions including penalties and restrictions.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Mandatory Platform Compliance</div>
                <div>
                  All employment processes facilitated through Findtern must be conducted transparently through the platform. Any attempt to bypass
                  the platform after receiving an offer through Findtern will be considered a violation of platform policies.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Undisclosed Direct Hiring Restriction</div>
                <div>
                  If you receive or accept a full-time offer through an organization connected via Findtern but fail to formally notify Findtern at
                  communicate@findtern.in, it will be considered a breach of platform policy.
                </div>
                <div>Such violations may result in:</div>
                <div className="pl-5 space-y-1">
                  <div>- A monetary penalty equivalent to one month of your salary, and</div>
                  <div>- Permanent blacklisting from Findtern and its partner organizations.</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Platform Blacklisting Policy</div>
                <div>
                  Any serious violation of these terms, including failure to join after accepting an offer or bypassing the platform,
                  may result in permanent removal and blacklisting from the Findtern platform and its partner companies.
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Professional Integrity Requirement</div>
                <div>
                  Findtern operates on professional trust and accountability. Candidates accepting employment offers are expected to maintain the
                  highest level of professionalism and commitment.
                </div>
              </div>

              <div className="rounded-md border p-3 flex items-start gap-3">
                <Checkbox
                  checked={fullTimeAcceptedTerms}
                  onCheckedChange={(v) => setFullTimeAcceptedTerms(Boolean(v))}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-slate-900">
                    I confirm that I have read, understood, and agreed to the above terms. I acknowledge that accepting this offer represents a binding professional commitment.
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {fullTimeAcceptCountdown > 0
                      ? `Please wait ${fullTimeAcceptCountdown}s before you can accept.`
                      : "You can accept once you confirm your agreement."}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={updatingStatus !== null}
              onClick={() => setFullTimeConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              disabled={fullTimeAcceptCountdown > 0 || !fullTimeAcceptedTerms || updatingStatus !== null}
              onClick={async () => {
                await handleUpdateStatus("accepted");
                setFullTimeConfirmOpen(false);
              }}
            >
              {updatingStatus === "accepted" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : fullTimeAcceptCountdown > 0 ? (
                `Accept enabled in ${fullTimeAcceptCountdown}s`
              ) : (
                "Accept"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <Button
              variant="ghost"
              className="mt-0.5 flex shrink-0 items-center gap-2 text-slate-600 hover:text-emerald-700"
              onClick={() => setLocation("/proposals")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight break-words">
                {hasFullTimeOffer ? "Full Proposal" : "Proposal"} — {roleTitle}
              </p>
              <p className="text-[11px] text-slate-500 leading-snug">
                Review all offer details and approve if everything looks good.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {badge ? (
                <Badge
                  variant="outline"
                  className={(() => {
                    if (badge.key === "updated") {
                      return "h-7 rounded-full px-3 text-[11px] font-medium border-emerald-200 bg-emerald-50/60 text-emerald-700 whitespace-nowrap";
                    }
                    if (badge.key === "approved" || badge.key === "hired") {
                      return "h-7 rounded-full px-3 text-[11px] font-medium border-emerald-200 bg-emerald-100 text-emerald-800 whitespace-nowrap";
                    }
                    if (badge.key === "expired" || badge.key === "rejected" || badge.key === "withdrawn") {
                      return "h-7 rounded-full px-3 text-[11px] font-medium border-red-200 bg-red-50 text-red-700 whitespace-nowrap";
                    }
                    return "";
                  })()}
                >
                  {badge.label}
                </Badge>
              ) : null}
            </div>

            {isHired ? null : (
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  className="flex-1 sm:flex-none rounded-full h-9 px-4 text-xs font-medium flex items-center justify-center gap-1.5 bg-[#0E6049] hover:bg-[#0b4b3a]"
                  disabled={isFinal || updatingStatus !== null}
                  onClick={() => {
                    if (isFinal) return;
                    if (hasFullTimeOffer) {
                      setFullTimeConfirmOpen(true);
                      return;
                    }
                    setPendingAcceptProposalId(proposalId);
                    setTermsOpen(true);
                  }}
                >
                  {updatingStatus === "accepted" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {updatingStatus === "accepted" ? "Approving..." : isAccepted ? "Approved" : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none rounded-full h-9 px-4 text-xs font-medium flex items-center justify-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isFinal || updatingStatus !== null}
                  onClick={() => {
                    if (isFinal || updatingStatus !== null) return;
                    setRejectConfirmOpen(true);
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  {isRejected ? "Rejected" : "Reject"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={hasFullTimeOffer ? false : termsOpen}
          onOpenChange={(open) => {
            if (hasFullTimeOffer) return;
            setTermsOpen(open);
            if (!open) {
              setPendingAcceptProposalId(null);
              setAcceptCountdown(0);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Important Instructions</DialogTitle>
            </DialogHeader>

            <div className="text-xs text-slate-600 font-medium">{termsTitle}</div>

            <ScrollArea className="h-[60vh] rounded-md border p-4">
              {safeTermsHtml ? (
                <div
                  className="prose prose-slate prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: safeTermsHtml }}
                />
              ) : (
                <div className="text-sm text-muted-foreground">Terms content is not available right now.</div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTermsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                disabled={!pendingAcceptProposalId || acceptCountdown > 0 || updatingStatus !== null}
                onClick={async () => {
                  if (!pendingAcceptProposalId) return;
                  await handleUpdateStatus("accepted");
                  setTermsOpen(false);
                }}
              >
                {updatingStatus === "accepted" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : acceptCountdown > 0 ? (
                  `I Accept enabled in ${acceptCountdown}s`
                ) : (
                  "I Accept"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {hasFullTimeOffer ? (
          <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Full-time offer details</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  These details were shared by the employer as part of a full-time offer.
                </p>
              </div>

              {String(fullTimeOffer?.offerLetterUrl ?? "").trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-3 rounded-full bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                  onClick={() => {
                    const url = String(fullTimeOffer?.offerLetterUrl ?? "").trim();
                    if (!url) return;
                    window.open(`https://findtern.in/${url}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs font-semibold">Offer letter</span>
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Job mode</span>
                <span className="font-medium text-slate-800 capitalize">{String(fullTimeOffer?.jobMode ?? "").trim() || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Location</span>
                <span className="font-medium text-slate-800 text-right">
                  {(() => {
                    const modeRaw = String(fullTimeOffer?.jobMode ?? "").trim().toLowerCase();
                    if (modeRaw === "remote") return "Remote";
                    const city = String(fullTimeOffer?.jobLocationCity ?? "").trim();
                    const state = String(fullTimeOffer?.jobLocationState ?? "").trim();
                    const loc = [city, state].filter(Boolean).join(", ");
                    return loc || "—";
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Timezone</span>
                <span className="font-medium text-slate-800 text-right">{String(fullTimeOffer?.timezone ?? "").trim() || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Shift</span>
                <span className="font-medium text-slate-800 text-right">
                  {String(fullTimeOffer?.shiftFrom ?? "").trim() && String(fullTimeOffer?.shiftTo ?? "").trim()
                    ? `${String(fullTimeOffer?.shiftFrom).trim()} - ${String(fullTimeOffer?.shiftTo).trim()}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2">
                <span className="text-slate-500">Annual CTC</span>
                <span className="font-medium text-slate-800 text-right">
                  {String(fullTimeOffer?.ctcCurrency ?? "").trim() && Number.isFinite(Number(fullTimeOffer?.annualCtc))
                    ? `${String(fullTimeOffer?.ctcCurrency).trim()} ${Number(fullTimeOffer?.annualCtc).toLocaleString("en-IN")}`
                    : "—"}
                </span>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Header card */}
        <Card className="p-5 md:p-6 rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">
              {roleTitle[0]?.toUpperCase() || "P"}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-col gap-0.5">
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">{roleTitle}</h1>
                {(proposal as any)?.projectName && (
                  <p className="text-[13px] font-semibold text-emerald-700">
                    Project: {(proposal as any).projectName}
                  </p>
                )}
              </div>
              <p className="text-sm text-slate-700 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="capitalize">{mode}</span>
                {locationLabel ? (
                  <>
                    <span className="text-slate-400">•</span>
                    <span>{locationLabel}</span>
                  </>
                ) : null}
                <span className="text-slate-400">•</span>
                <span>{timezoneLabel}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {hasFullTimeOffer ? (
                  <>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      Full Time Proposal
                    </Badge>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Annual CTC: {String(fullTimeOffer?.ctcCurrency ?? "").trim() && Number.isFinite(Number(fullTimeOffer?.annualCtc))
                        ? `${String(fullTimeOffer?.ctcCurrency).trim()} ${Number(fullTimeOffer?.annualCtc).toLocaleString("en-IN")}`
                        : "—"}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {durationLabel}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      Stipend: {stipendLabel}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {/* Left column */}
          <div className="space-y-4 md:space-y-6">
            {/* Role summary */}
            <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">Company details</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className={`text-xs text-slate-700 ${companyDetailsLocked ? "blur-[3px] select-none" : ""}`}>
                            {employerCompanyName || "Hidden"}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">{companyLockedMessage}</p>
                        </TooltipContent>
                      </Tooltip>

                     

                      <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={companyDetailsLocked ? "blur-[3px] select-none" : ""}>
                                {reportingManagerName || "Reporting manager"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{companyLockedMessage}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={companyDetailsLocked ? "blur-[3px] select-none" : ""}>
                                {reportingManagerPhone || "Contact number"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">{companyLockedMessage}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                         <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-2">
                        <span className="text-slate-400">Company size</span>
                        <span className="font-medium text-slate-800">{employerCompanySize || "—"}</span>
                      </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="h-9 px-3 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-2"
                    onClick={() => setLocation("/proposals")}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-xs font-semibold">Back to proposals</span>
                  </Button>
                </div>

                {!hasFullTimeOffer ? (
                  <div className="flex flex-wrap gap-1.5">
                    {displaySkills.length === 0 && (
                      <span className="text-[11px] text-slate-500">No project skills highlighted in this offer.</span>
                    )}
                    {displaySkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className={
                          normalizedRequiredSkills.has(String(skill).toLowerCase())
                            ? "text-xs px-2.5 py-1 rounded-full border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "text-xs px-2.5 py-1 rounded-full border-emerald-200 bg-emerald-50/60 text-emerald-700"
                        }
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </Card>

            {!hasFullTimeOffer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Internship details</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Start date</span>
                      <span className="font-medium text-slate-800">{startDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Monthly hours</span>
                      <span className="font-medium text-slate-800">{monthlyHoursLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Shift timings (IST)</span>
                      <span className="font-medium text-slate-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {shiftLabelIst}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Weekly working schedule</span>
                      <span className="font-medium text-slate-800">{scheduleLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Leave per month</span>
                      <span className="font-medium text-slate-800">{paidLeavesLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Work mode</span>
                      <span className="font-medium text-slate-800 capitalize">{mode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Location</span>
                      <span className="font-medium text-slate-800 text-right">{internshipLocationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Laptop</span>
                      <span className="font-medium text-slate-800">{laptopShortLabel}</span>
                    </div>
                    {String(mode).toLowerCase() === "hybrid" && (wfhDays > 0 || wfoDays > 0) && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Hybrid schedule</span>
                        <span className="font-medium text-slate-800">WFH {wfhDays} days · WFO {wfoDays} days</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Compensation</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="text-slate-400">Monthly pay</span>
                      <span className="font-semibold text-emerald-700">{stipendLabel}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Final payout and compliance will be handled via Findtern as per agreed terms.
                    </p>
                  </div>
                </Card>
              </div>
            ) : null}

            {!hasFullTimeOffer ? (
              <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm md:text-base font-semibold text-slate-900 leading-tight">Important Instructions</h2>
                    <p className="text-[11px] md:text-xs text-slate-600 leading-relaxed mt-1">
                      Before Accepting a Proposal
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <p className="text-[11px] md:text-xs text-slate-700 leading-relaxed">
                    By accepting an internship proposal through Findtern, you acknowledge and agree to the following restrictions and responsibilities:
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">Do Not Accept Casually</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Do not accept an internship proposal unless you are fully committed to completing the entire internship duration.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Proposal acceptance is considered a professional and contractual commitment.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">Internship Completion &amp; Professional Conduct</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Interns must follow all rules, policies, and workplace regulations set by the employer throughout the internship duration.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Failure to maintain professional conduct or comply with company policies may lead to disciplinary action from both the employer and Findtern.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-900">Do Not Withdraw Midway Without Valid Reason</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Interns must not discontinue, abandon, or remain inactive during the internship period without legitimate justification and prior approval.
                        </p>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                          <p className="text-[11px] font-medium text-slate-800 leading-relaxed">Failure to comply may result in:</p>
                          <ul className="mt-1 list-disc pl-5 text-[11px] text-slate-700 space-y-1">
                            <li>Monetary penalty as per Findtern policies</li>
                            <li>Account suspension or restriction</li>
                            <li>
                              Blacklisting from Findtern and possible restriction from opportunities with multiple partner companies
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <PhoneOff className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">Do Not Bypass Findtern Engagement</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Interns selected through Findtern must complete the internship through the platform.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Direct employment discussions, payment arrangements, or continuation of work outside Findtern without platform acknowledgement is strictly prohibited.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Violations may result in financial penalties and platform restrictions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">Use Findtern for Communication</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Interns should only communicate through Findtern-approved channels during the internship duration.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Avoid sharing private contact details unless officially permitted after hiring confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">PPO / Conversion Disclosure</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          If you receive a Pre-Placement Offer (PPO) or full-time employment opportunity during or after the internship, you must immediately inform Findtern at:
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2">
                          <span className="text-[11px] font-semibold text-emerald-900">communicate@findtern.in</span>
                      

                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Failure to disclose PPO conversion may result in financial penalties and account action.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <EyeOff className="w-4 h-4 text-emerald-700 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900">Confidentiality of Employer Information</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Employer and company details may be disclosed to interns only after the employer completes the required confirmation or payment process.
                        </p>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Interns must not misuse, share, or distribute company details or confidential information received through Findtern.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* What you will work on */}
            {!hasFullTimeOffer ? (
              <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Roles & responsibilities</h2>
                {jdSafeHtml ? (
                  <div
                    className="prose prose-slate prose-sm max-w-none break-words [overflow-wrap:anywhere]"
                    dangerouslySetInnerHTML={{ __html: jdSafeHtml }}
                  />
                ) : (proposal as any)?.projectScopeOfWork ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                    {(proposal as any).projectScopeOfWork}
                  </p>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    No roles and responsibilities details available for this proposal.
                  </p>
                )}
              </Card>
            ) : null}

            {/* What the company expects */}
            {!hasFullTimeOffer ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">AI interview ratings</h2>
                  </div>
                  <div className="space-y-1.5 text-sm text-slate-700">
                    {["communication", "coding", "aptitude", "overall"].map((key) => {
                      const label =
                        key === "overall"
                          ? "Overall"
                          : key.charAt(0).toUpperCase() + key.slice(1);
                      const value = (ratings as any)[key] ?? 0;
                      return (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span>{label}</span>
                          <span className="font-semibold text-emerald-700">{value}/10</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* <Card className="p-4 md:p-5 rounded-2xl bg-white/95">
                  <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Required Key Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.length === 0 && (
                      <span className="text-[11px] text-slate-500">No skills highlighted in this offer.</span>
                    )}
                    {requiredSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className={
                          "text-xs px-2.5 py-1 rounded-full border-emerald-300 bg-emerald-50 text-emerald-800"
                        }
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </Card> */}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button variant="outline" className="rounded-full" onClick={() => setLocation("/proposals")}>
                Close
              </Button>
            </div>
          </div>

          {/* Right column */}
          <div className="hidden" />
        </div>
      </div>
    </div>
  );
}

