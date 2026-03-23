import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GraduationCap,
  Check,
  X,
  MapPin,
  Sparkles,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { CandidateHeader } from "@/components/CandidateHeader";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import DOMPurify from "dompurify";
import { formatMonthlyStipendForInternView } from "@/lib/currency";

export default function ProposalsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [updatingStatus, setUpdatingStatus] = useState<null | "accepted" | "rejected">(null);
  const [updatingProposalId, setUpdatingProposalId] = useState<string | null>(null);

  const [termsOpen, setTermsOpen] = useState(false);
  const [pendingAcceptProposalId, setPendingAcceptProposalId] = useState<string | null>(null);
  const [acceptCountdown, setAcceptCountdown] = useState(0);

  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [pendingRejectProposalId, setPendingRejectProposalId] = useState<string | null>(null);

  const [fullTimeConfirmOpen, setFullTimeConfirmOpen] = useState(false);
  const [pendingFullTimeAcceptProposalId, setPendingFullTimeAcceptProposalId] = useState<string | null>(null);
  const [fullTimeAcceptCountdown, setFullTimeAcceptCountdown] = useState(0);
  const [fullTimeAcceptedTerms, setFullTimeAcceptedTerms] = useState(false);

  const [openToWork, setOpenToWork] = useState(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem("openToWork");
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  });

  const storedUserId =
    typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

  const proposalsQueryKey: [string, string | null] = [
    "/api/intern/proposals",
    storedUserId,
  ];

  const { data, isLoading, error } = useQuery({
    queryKey: proposalsQueryKey,
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) {
        throw new Error("User not logged in");
      }
      const res = await fetch(`/api/intern/${storedUserId}/proposals`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch proposals";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const proposals = (data?.proposals ?? []) as any[];

  const { data: nonDisclosureResp } = useQuery<{ terms: { title: string; bodyHtml: string } | null }>({
    queryKey: ["/api/intern/non-disclosure"],
    queryFn: async () => {
      const res = await fetch("/api/intern/non-disclosure", { credentials: "include" });
      if (!res.ok) return { terms: null };
      return res.json();
    },
  });

  const termsTitle = String(nonDisclosureResp?.terms?.title ?? "Non-Disclosure of Contact Information").trim() || "Non-Disclosure of Contact Information";
  const termsBodyHtml = String(nonDisclosureResp?.terms?.bodyHtml ?? "").trim();
  const safeTermsHtml = useMemo(
    () => (termsBodyHtml ? DOMPurify.sanitize(termsBodyHtml, { USE_PROFILES: { html: true } }) : ""),
    [termsBodyHtml],
  );

  const stripHtml = (value: string) =>
    String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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
    if (!pendingFullTimeAcceptProposalId) return;

    const initial = 10;
    setFullTimeAcceptCountdown(initial);
    setFullTimeAcceptedTerms(false);

    const t = window.setInterval(() => {
      setFullTimeAcceptCountdown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => {
      window.clearInterval(t);
    };
  }, [fullTimeConfirmOpen, pendingFullTimeAcceptProposalId]);

  async function handleUpdateStatus(
    proposalId: string,
    status: "accepted" | "rejected",
  ) {
    try {
      setUpdatingStatus(status);
      setUpdatingProposalId(proposalId);
      const res = await fetch(`/api/proposals/${proposalId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to update proposal status";
        throw new Error(message);
      }

      toast({
        title: status === "accepted" ? "Proposal accepted" : "Proposal rejected",
        description:
          status === "accepted"
            ? "You have accepted this internship offer."
            : "You have rejected this internship offer.",
      });

      await queryClient.invalidateQueries({ queryKey: proposalsQueryKey });
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err?.message || "Could not update proposal status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
      setUpdatingProposalId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <CandidateHeader openToWork={openToWork} onOpenToWorkChange={setOpenToWork} />

      <Dialog
        open={rejectConfirmOpen}
        onOpenChange={(open) => {
          setRejectConfirmOpen(open);
          if (!open) {
            setPendingRejectProposalId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject proposal?</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-slate-600">
            This action can’t be undone. Are you sure you want to reject this proposal?
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              disabled={!pendingRejectProposalId || updatingStatus !== null}
              onClick={async () => {
                if (!pendingRejectProposalId) return;
                await handleUpdateStatus(pendingRejectProposalId, "rejected");
                setRejectConfirmOpen(false);
              }}
            >
              {updatingStatus === "rejected" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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
            setPendingFullTimeAcceptProposalId(null);
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
              disabled={
                !pendingFullTimeAcceptProposalId ||
                fullTimeAcceptCountdown > 0 ||
                !fullTimeAcceptedTerms ||
                updatingStatus !== null
              }
              onClick={async () => {
                if (!pendingFullTimeAcceptProposalId) return;
                await handleUpdateStatus(pendingFullTimeAcceptProposalId, "accepted");
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

      <Dialog
        open={termsOpen}
        onOpenChange={(open) => {
          setTermsOpen(open);
          if (!open) {
            setPendingAcceptProposalId(null);
            setAcceptCountdown(0);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{termsTitle}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[60vh] rounded-md border p-4">
            {safeTermsHtml ? (
              <div className="prose prose-slate prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: safeTermsHtml }} />
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
                await handleUpdateStatus(pendingAcceptProposalId, "accepted");
                setTermsOpen(false);
              }}
            >
              {updatingStatus === "accepted" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : acceptCountdown > 0 ? (
                `Accept enabled in ${acceptCountdown}s`
              ) : (
                "Accept"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container px-4 md:px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0E6049] mb-2">Internship Proposals</h1>
        {isLoading && (
          <p className="text-sm text-muted-foreground mb-6">Loading your proposals...</p>
        )}
        {!isLoading && error instanceof Error && (
          <p className="text-sm text-red-500 mb-6">{error.message}</p>
        )}
        {!isLoading && !error && proposals.length === 0 && (
          <p className="text-sm text-muted-foreground mb-6">
            You don't have any proposals yet. Once employers send you offers, they will appear here.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposals.map((proposal) => {
            const offer = (proposal.offerDetails || {}) as any;
            const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
            const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
            const ratings = (proposal.aiRatings || {}) as any;
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
            const skills = requiredSkills;
            const normalizedRequiredSkills = new Set(requiredSkills.map((s) => s.toLowerCase()));
            const employerMeta = (proposal.employer || null) as any;
            const jdRaw = String(offer.jd ?? "").trim();
            const jd = stripHtml(jdRaw);
            const status: string | undefined = proposal.status;
            const isAccepted = status === "accepted";
            const isRejected = status === "rejected";
            const isExpiredStatus = status === "expired";
            const isHired = status === "hired";
            const isFinal = isAccepted || isRejected || isExpiredStatus || isHired;
            const statusLower = String(status ?? "sent").trim().toLowerCase();

            const todayYmd = (() => {
              const now = new Date();
              return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            })();

            const startDateYmd = String((offer as any)?.startDate ?? "").trim();
            const isStartDateToday =
              /^\d{4}-\d{2}-\d{2}$/.test(startDateYmd) && startDateYmd === todayYmd;
            const isExpired = statusLower === "sent" && !isFinal && isStartDateToday;

            const canRespondToProposal = (() => {
              if (isFinal) return false;
              if (statusLower !== "sent") return false;

              if (!startDateYmd) return true;

              if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateYmd)) return true;

              return startDateYmd > todayYmd;
            })();

            const badge = (() => {
              if (statusLower === "hired") {
                return {
                  label: "Hired",
                  className:
                    "absolute top-3 right-3 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200",
                };
              }

              if (statusLower === "accepted") {
                return {
                  label: "Approved",
                  className:
                    "absolute top-3 right-3 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200",
                };
              }

              if (statusLower === "rejected") {
                return {
                  label: "Rejected",
                  className:
                    "absolute top-3 right-3 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 border border-red-200",
                };
              }

              if (statusLower === "expired") {
                return {
                  label: "Expired",
                  className:
                    "absolute top-3 right-3 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 border border-red-200",
                };
              }



              if (isExpired) {
                return {
                  label: "Expired",
                  className:
                    "absolute top-3 right-3 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 border border-red-200",
                };
              }

              if (statusLower !== "sent") return null;

              const created = new Date(String((proposal as any)?.createdAt ?? (proposal as any)?.created_at ?? "")).getTime();
              const updated = new Date(String((proposal as any)?.updatedAt ?? (proposal as any)?.updated_at ?? "")).getTime();
              const projectUpdated = new Date(
                String((proposal as any)?.projectUpdatedAt ?? (proposal as any)?.project_updated_at ?? ""),
              ).getTime();
              if (!Number.isFinite(created)) return null;

              const changedByEmployer =
                (Number.isFinite(updated) && updated > created) ||
                (Number.isFinite(projectUpdated) && projectUpdated > created);
              if (!changedByEmployer) return null;

              return {
                label: "Updated",
                className:
                  "absolute top-3 right-3 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700 border border-emerald-200",
              };
            })();

            const fullProposalBadge = hasFullTimeOffer
              ? {
                  label: "Full Time Job Role - Proposal",
                  className:
                    "absolute top-0 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white border border-emerald-700/40 shadow-sm",
                }
              : null;

            const stipendLabel = (() => {
              const n = Number(offer.monthlyAmount ?? 0);
              if (!Number.isFinite(n) || n <= 0) return "";
              const money = formatMonthlyStipendForInternView({
                monthlyAmount: n,
                employer: employerMeta,
                offerCurrency: offer.currency,
              });
              if (!money) return "";
              return `${money} / month`;
            })();

            const findternScore = Number((proposal as any)?.findternScore ?? 0);
            const isStipendEligible = Number.isFinite(findternScore) && findternScore >= 6;
            const showNoStipend = Number.isFinite(findternScore) && findternScore > 0 && findternScore < 6;

            return (
              <Card
                key={proposal.id}
                className={
                  "shadow-sm rounded-2xl p-4 md:p-5 flex flex-col gap-4 relative " +
                  (hasFullTimeOffer
                    ? "border border-emerald-200/70 ring-1 ring-emerald-100 bg-gradient-to-br from-emerald-50/40 to-background"
                    : "border border-emerald-50")
                }
              >
                {badge ? <span className={badge.className}>{badge.label}</span> : null}
                {fullProposalBadge ? (
                  <span className={fullProposalBadge.className}>
                    <Sparkles className="w-3.5 h-3.5 text-white/90" />
                    {fullProposalBadge.label}
                  </span>
                ) : null}
                {/* Header: company + meta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-col gap-0.5 mb-1">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-slate-900 line-clamp-1 break-words [overflow-wrap:anywhere]">
                          {hasFullTimeOffer
                            ? String((fullTimeOffer as any)?.jobTitle ?? "").trim() || "Full Proposal"
                            : offer.roleTitle || "Internship Offer"}
                        </p>
                      </div>
                      {proposal.projectName && (
                        <div className="flex items-center gap-1 ml-6">
                           <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Project:</span>
                           <span className="text-[11px] font-semibold text-emerald-700">{proposal.projectName}</span>
                        </div>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {hasFullTimeOffer
                        ? (() => {
                            const city = String((fullTimeOffer as any)?.jobLocationCity ?? "").trim();
                            const state = String((fullTimeOffer as any)?.jobLocationState ?? "").trim();
                            const mode = String((fullTimeOffer as any)?.jobMode ?? "").trim().toLowerCase();
                            if (mode === "remote") return "Remote";
                            const loc = [city, state].filter(Boolean).join(", ");
                            return loc || "Location not specified";
                          })()
                        : offer.location || "Location not specified"}
                    </p>

                    {jd && (
                      <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 break-words [overflow-wrap:anywhere]">
                        <span className="font-semibold text-slate-700">JD:</span> {jd}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      {/* <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-100">
                        {offer.duration || "Duration not specified"}
                      </span> */}
                      {showNoStipend ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 border border-slate-200 cursor-help">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              No stipend
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <div className="text-xs">
                              For candidates who scored less than 6 in AI interview are not eligible for stipend.
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              Findtern score: {Number.isFinite(findternScore) ? findternScore.toFixed(1) : "0.0"}/10
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : isStipendEligible && stipendLabel ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-100">
                          Stipend: {stipendLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <p className="mb-1 flex items-center gap-1 font-semibold text-slate-800">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    AI Interview Ratings
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                    <span className="flex items-center justify-between">
                      <span>Communication</span>
                      <span className="font-semibold text-emerald-700">{ratings.communication ?? "-"}</span>
                    </span>
                    <span className="flex items-center justify-between">
                      <span>Coding</span>
                      <span className="font-semibold text-emerald-700">{ratings.coding ?? "-"}</span>
                    </span>
                    <span className="flex items-center justify-between">
                      <span>Aptitude</span>
                      <span className="font-semibold text-emerald-700">{ratings.aptitude ?? "-"}</span>
                    </span>
                    <span className="flex items-center justify-between">
                      <span>Overall Interview</span>
                      <span className="font-semibold text-emerald-700">{ratings.overall ?? "-"}</span>
                    </span>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-800">Project Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length === 0 && (
                      <span className="text-[11px] text-slate-500">No project skills data available</span>
                    )}
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className={
                          normalizedRequiredSkills.has(String(skill).toLowerCase())
                            ? "inline-flex items-center rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[11px] text-emerald-800"
                            : "inline-flex items-center rounded-full bg-emerald-50/60 border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-700"
                        }
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    className="w-full rounded-full h-9 text-xs font-medium flex items-center justify-center gap-1.5 bg-[#0E6049] hover:bg-[#0b4b3a]"
                    disabled={!canRespondToProposal}
                    onClick={() => {
                      if (!canRespondToProposal) {
                        toast({
                          title: "Action not allowed",
                          description: "You can accept or reject only before the start date.",
                          variant: "destructive",
                        });
                        return;
                      }
                      if (hasFullTimeOffer) {
                        setPendingFullTimeAcceptProposalId(String(proposal.id));
                        setFullTimeConfirmOpen(true);
                        return;
                      }
                      setPendingAcceptProposalId(String(proposal.id));
                      setTermsOpen(true);
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isHired ? "Hired" : isAccepted ? "Accepted" : "Accept"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-full h-9 text-xs font-medium flex items-center justify-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={!canRespondToProposal}
                    onClick={() => {
                      if (!canRespondToProposal) {
                        toast({
                          title: "Action not allowed",
                          description: "You can accept or reject only before the start date.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setPendingRejectProposalId(String(proposal.id));
                      setRejectConfirmOpen(true);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    {isRejected ? "Rejected" : "Reject"}
                  </Button>
                  <Button
                    className="w-full rounded-full h-9 text-xs font-medium border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    variant="outline"
                    onClick={() => setLocation(`/proposals/${proposal.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Proposal
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
     </div>
    </div>
  );
}