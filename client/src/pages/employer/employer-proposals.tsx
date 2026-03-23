import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Filter, Search, Calendar, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getEmployerAuth, inferEmployerIsIndia } from "@/lib/employerAuth";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import { DEFAULT_USD_TO_INR_RATE } from "@/lib/currency";

// Types
interface EmployerProposal {
  id: string;
  internId?: string;
  candidateName: string;
  isNameUnlocked?: boolean;
  internProfilePhotoName?: string | null;
  projectId?: string;
  projectName: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "interview_scheduled" | "hired" | "expired";
  createdAt: string; // ISO date
  amountPerMonth: number;
  offerCurrency?: "INR" | "USD";
  durationLabel: string;
  mode: string;
  location: string;
  termLabel: string;
  isFullTimeOffer?: boolean;
  annualCtc?: number;
  annualCtcCurrency?: "INR" | "USD";
  interviewRatings?: {
    communication: number;
    coding: number;
    aptitude: number;
    overall: number;
  };
  skills: string[];
}

function toTitleWord(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function toTitleName(name: string) {
  const cleaned = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((p) => toTitleWord(p))
    .join(" ");
}

function getShortNameFromFullName(name: string) {
  const cleaned = String(name ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const parts = cleaned
    .split(" ")
    .filter(Boolean)
    .map((p) => p.replace(/[^A-Za-z]/g, ""))
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return String(parts[0][0] ?? "").toUpperCase();

  const firstInitial = String(parts[0][0] ?? "").toUpperCase();
  const last = parts[parts.length - 1];
  const lastInitial = String(last?.[0] ?? "").toUpperCase();
  return `${firstInitial}${lastInitial}`;
}

function getProposalCandidateDisplayName(p: EmployerProposal) {
  const full = toTitleName(p.candidateName);
  if (p.isNameUnlocked) return full;
  return getShortNameFromFullName(full);
}

// Map raw backend proposal into view model for this page
function mapToEmployerProposal(p: any): EmployerProposal {
  const offer = p.offerDetails || {};
  const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";

  const mappedStatus = (() => {
    const raw = String(p.status ?? "sent").trim().toLowerCase();
    const allowed: EmployerProposal["status"][] = [
      "draft",
      "sent",
      "accepted",
      "hired",
      "rejected",
      "interview_scheduled",
      "expired",
    ];
    return (allowed.includes(raw as any) ? raw : "sent") as EmployerProposal["status"];
  })();

  const offerCurrency = (() => {
    const raw = String((offer as any)?.currency ?? "").trim().toUpperCase();
    if (raw === "USD" || raw === "INR") return raw as "USD" | "INR";
    return undefined;
  })();

  const durationLabel = (() => {
    if (hasFullTimeOffer) return "Full-time";
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

  const termLabel = (() => {
    if (hasFullTimeOffer) return "PPO";
    switch (offer.duration) {
      case "1m":
        return "Short-Term";
      case "2m":
      case "3m":
        return "Medium-Term";
      case "6m":
        return "Long-Term";
      default:
        return "";
    }
  })();

  return {
    id: p.id,
    internId: (() => {
      const raw = p?.internId ?? p?.intern_id ?? p?.intern?.id ?? p?.intern?.userId ?? "";
      const value = String(raw ?? "").trim();
      return value.length > 0 ? value : undefined;
    })(),
    candidateName: (() => {
      const fromTop = p?.internName ?? p?.intern_name ?? p?.candidateName ?? p?.candidate_name;
      const fromNested =
        p?.intern?.name ??
        p?.intern?.fullName ??
        p?.intern?.onboarding?.extraData?.fullName ??
        p?.intern?.onboarding?.extraData?.name;
      const value = String(fromTop ?? fromNested ?? "").trim();
      return value.length > 0 ? value : "";
    })(),
    isNameUnlocked: hasFullTimeOffer ? true : mappedStatus === "hired" ? true : Boolean(p?.isNameUnlocked),
    internProfilePhotoName: (() => {
      const raw =
        p?.internProfilePhotoName ??
        p?.intern_profile_photo_name ??
        p?.intern?.profilePhotoName ??
        p?.intern?.profile_photo_name ??
        null;
      const value = String(raw ?? "").trim();
      return value.length > 0 ? value : null;
    })(),
    projectId: (() => {
      const raw = p?.projectId ?? p?.project_id ?? p?.project?.id ?? "";
      const value = String(raw ?? "").trim();
      return value.length > 0 ? value : undefined;
    })(),
    projectName: p.projectName || "Project",
    status: mappedStatus,
    createdAt: p.createdAt || new Date().toISOString(),
    amountPerMonth: hasFullTimeOffer ? 0 : typeof offer.monthlyAmount === "number" ? offer.monthlyAmount : 0,
    offerCurrency,
    durationLabel,
    mode: (() => {
      if (hasFullTimeOffer) {
        const raw = String((fullTimeOffer as any)?.jobMode ?? "").trim();
        return raw ? toTitleWord(raw) : "Remote";
      }
      const raw = String(offer?.mode ?? p?.projectMode ?? p?.mode ?? "").trim();
      return raw ? toTitleWord(raw) : "Remote";
    })(),
    location: (() => {
      if (hasFullTimeOffer) {
        const mode = String((fullTimeOffer as any)?.jobMode ?? "").trim().toLowerCase();
        if (mode === "remote") return "Remote";
        const city = String((fullTimeOffer as any)?.jobLocationCity ?? "").trim();
        const state = String((fullTimeOffer as any)?.jobLocationState ?? "").trim();
        const loc = [city, state].filter(Boolean).join(", ");
        return loc || "Location not specified";
      }
      const raw = String(offer?.location ?? p?.projectLocation ?? p?.location ?? "").trim();
      return raw || "Location not specified";
    })(),
    termLabel,
    isFullTimeOffer: hasFullTimeOffer,
    annualCtc: hasFullTimeOffer ? Number((fullTimeOffer as any)?.annualCtc ?? 0) : undefined,
    annualCtcCurrency: (() => {
      if (!hasFullTimeOffer) return undefined;
      const raw = String((fullTimeOffer as any)?.ctcCurrency ?? "").trim().toUpperCase();
      if (raw === "INR" || raw === "USD") return raw as "INR" | "USD";
      return undefined;
    })(),
    interviewRatings: p.aiRatings || {},
    skills: Array.isArray(p.skills) ? p.skills : [],
  };

}

export default function EmployerProposalsPage() {
  const [currentLocation, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const auth = getEmployerAuth();
  const employerId = (auth?.id ?? "") as string;

  const expectedCurrency = inferEmployerIsIndia(auth) ? "INR" : "USD";
  const usdToInrRate = DEFAULT_USD_TO_INR_RATE;
  const formatMoney = (amount: number, currency: "INR" | "USD") => {
    const n = Number(amount ?? 0);
    if (!Number.isFinite(n)) return "";
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/employer/proposals", employerId],
    enabled: !!employerId,
    refetchOnMount: "always",
    queryFn: async () => {
      if (!employerId) {
        throw new Error("Employer not logged in");
      }
      const res = await fetch(`/api/employer/${employerId}/proposals`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch employer proposals";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployerProposal["status"] | "all">("all");
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState("");
  const [photoPreviewAlt, setPhotoPreviewAlt] = useState("");
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);

  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawingProposalId, setWithdrawingProposalId] = useState<string>("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const openPhotoPreview = (photoName: string, alt: string) => {
    const name = String(photoName ?? "").trim();
    if (!name) return;
    setPhotoPreviewSrc(`/uploads/${name}`);
    setPhotoPreviewAlt(String(alt ?? "").trim());
    setIsPhotoPreviewOpen(true);
  };

  const rawProposals = (data?.proposals ?? []) as any[];
  const proposals: EmployerProposal[] = useMemo(() => {
    const mapped = rawProposals.map(mapToEmployerProposal);
    const latestByKey = new Map<string, EmployerProposal>();
    for (const p of mapped) {
      const internId = String(p?.internId ?? "").trim();
      const projectId = String(p?.projectId ?? "").trim();
      const typeKey = p.isFullTimeOffer ? "full_time" : "internship";
      const statusKey = p.isFullTimeOffer ? String(p.status ?? "sent") : "latest";
      const rejectedKey = p.status === "rejected" ? `:rejected:${String(p.id)}` : "";
      const key = `${projectId}:${internId}:${typeKey}:${statusKey}${rejectedKey}`;
      if (!internId || !projectId) {
        latestByKey.set(`__misc__:${String(p.id)}`, p);
        continue;
      }
      const prev = latestByKey.get(key);
      if (!prev) {
        latestByKey.set(key, p);
        continue;
      }
      const prevTs = new Date(prev.createdAt).getTime();
      const nextTs = new Date(p.createdAt).getTime();
      if ((Number.isFinite(nextTs) ? nextTs : 0) >= (Number.isFinite(prevTs) ? prevTs : 0)) {
        latestByKey.set(key, p);
      }
    }
    return Array.from(latestByKey.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [rawProposals]);

  const internIdsToRestrict = useMemo(() => {
    const out = new Set<string>();
    for (const p of proposals) {
      const internId = String(p?.internId ?? "").trim();
      if (!internId) continue;
      if (p.status === "hired" || p.isFullTimeOffer) {
        out.add(internId);
      }
    }
    return out;
  }, [proposals]);

  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      const q = search.trim().toLowerCase();
      const initialsLower = getShortNameFromFullName(toTitleName(p.candidateName)).toLowerCase();
      const projectNameLower = String(p.projectName ?? "").toLowerCase();

      const internId = String(p?.internId ?? "").trim();
      const isRestrictedIntern = internId ? internIdsToRestrict.has(internId) : false;
      if (isRestrictedIntern && !p.isFullTimeOffer && p.status !== "hired" && p.status !== "rejected") {
        return false;
      }

      const matchesSearch =
        !q ||
        initialsLower === q ||
        projectNameLower.includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [proposals, search, statusFilter, internIdsToRestrict]);

  const canWithdrawStatus = (status: EmployerProposal["status"]) => {
    const s = String(status ?? "").trim().toLowerCase();
    return s !== "rejected" && s !== "hired" && s !== "expired";
  };

  const handleConfirmWithdraw = async () => {
    const proposalId = String(withdrawingProposalId ?? "").trim();
    if (!proposalId) return;
    if (isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const msg = String(errJson?.message ?? "Failed to withdraw proposal");
        toast({ title: "Withdraw failed", description: msg, variant: "destructive" });
        return;
      }
      toast({ title: "Proposal withdrawn", description: "The proposal has been withdrawn." });
      setIsWithdrawDialogOpen(false);
      setWithdrawingProposalId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/employer/proposals", employerId] }),
        employerId
          ? queryClient.invalidateQueries({ queryKey: ["/api/employer", employerId, "proposals"] })
          : Promise.resolve(),
      ]);
    } catch {
      toast({
        title: "Withdraw failed",
        description: "Something went wrong while withdrawing the proposal.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="proposals" />

      <Dialog
        open={isPhotoPreviewOpen}
        onOpenChange={(open) => {
          setIsPhotoPreviewOpen(open);
          if (!open) {
            setPhotoPreviewSrc("");
            setPhotoPreviewAlt("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
          </DialogHeader>
          {photoPreviewSrc ? (
            <img
              src={photoPreviewSrc}
              alt={photoPreviewAlt || "Profile photo"}
              className="w-full max-h-[70vh] object-contain rounded-md border"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Page title + quick stats */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Hiring Proposals
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track all proposals you sent – whether directly or after interviews.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 md:p-5 rounded-2xl border-slate-100 bg-white shadow-sm flex flex-wrap gap-3 md:items-center md:justify-between">
          <div className="flex flex-1 min-w-[220px] items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by candidate or project..."
                className="h-10 pl-9 rounded-xl border-slate-200 focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as EmployerProposal["status"] | "all")}
            >
              <SelectTrigger className="h-9 w-[150px] rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="expired">Withdrawn</SelectItem>
              </SelectContent>
            </Select>

           
          </div>
        </Card>

        {/* Table list */}
        <div className="space-y-3">
          {isLoading && (
            <Card className="p-8 text-center rounded-3xl border-slate-100 bg-white/80">
              <p className="text-sm text-slate-600">Loading proposals...</p>
            </Card>
          )}

          {!isLoading && error instanceof Error && (
            <Card className="p-8 text-center rounded-3xl border-red-100 bg-red-50/80">
              <p className="text-sm font-medium text-red-700 mb-1">Failed to load proposals</p>
              <p className="text-xs text-red-600">{error.message}</p>
            </Card>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <Card className="p-8 text-center rounded-3xl border-dashed border-slate-200 bg-white/80">
              <p className="text-sm font-medium text-slate-700 mb-1">
                No proposals match your filters.
              </p>
              <p className="text-xs text-slate-500">
                Try clearing filters or adjusting the search keywords.
              </p>
            </Card>
          )}

          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr className="text-xs text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">Candidate</th>
                    <th className="px-4 py-3 text-left font-medium">Project & location</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Monthly stipend</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proposal) => {
                    const statusLabelMap: Record<EmployerProposal["status"], string> = {
                      draft: "Draft",
                      sent: "Sent",
                      accepted: "Accepted",
                      hired: "Hired",
                      rejected: "Rejected",
                      interview_scheduled: "Interview scheduled",
                      expired: "Withdrawn",
                    };

                    const statusColorMap: Record<EmployerProposal["status"], string> = {
                      draft: "bg-slate-100 text-slate-700 border-slate-200",
                      sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      accepted: "bg-emerald-600 text-white border-emerald-700",
                      hired: "bg-emerald-600 text-white border-emerald-700",
                      rejected: "bg-red-50 text-red-700 border-red-200",
                      interview_scheduled: "bg-amber-50 text-amber-700 border-amber-200",
                      expired: "bg-slate-100 text-slate-700 border-slate-200",
                    };

                    const stipendCurrency: "INR" | "USD" = (proposal.offerCurrency ?? expectedCurrency) as "INR" | "USD";
                    const monthly = formatMoney(Number(proposal.amountPerMonth ?? 0), stipendCurrency);
                    const annualCtcCurrency: "INR" | "USD" =
                      (proposal.annualCtcCurrency ?? proposal.offerCurrency ?? expectedCurrency) as "INR" | "USD";
                    const annualCtc = formatMoney(Number(proposal.annualCtc ?? 0), annualCtcCurrency);

                    return (
                      <tr
                        key={proposal.id}
                        className="border-t border-slate-100 hover:bg-emerald-50/40 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-3 max-w-[260px]">
                            <Avatar
                              className={`h-9 w-9 rounded-xl${proposal.internProfilePhotoName ? " cursor-pointer" : ""}`}
                              onClick={() => {
                                if (!proposal.internProfilePhotoName) return;
                                openPhotoPreview(
                                  proposal.internProfilePhotoName,
                                  getProposalCandidateDisplayName(proposal),
                                );
                              }}
                            >
                              {proposal.internProfilePhotoName ? (
                                <AvatarImage
                                  src={`/uploads/${proposal.internProfilePhotoName}`}
                                  alt={getProposalCandidateDisplayName(proposal)}
                                />
                              ) : null}
                              <AvatarFallback className="rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold">
                                {getProposalCandidateDisplayName(proposal)}
                              </AvatarFallback>
                            </Avatar>

                            <button
                              type="button"
                              className="font-semibold text-slate-900 hover:underline text-left block min-w-0 truncate"
                              onClick={() => {
                                if (!proposal.internId) {
                                  toast({
                                    title: "Profile unavailable",
                                    description: "This proposal is missing intern id.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                setLocation(
                                  `/employer/intern/${encodeURIComponent(String(proposal.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                                );
                              }}
                            >
                              {getProposalCandidateDisplayName(proposal)}
                            </button>
                          </div>
                        </td>
                      
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            <span className="font-medium text-slate-800 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                              {proposal.projectName}
                            </span>
                            <span>
                              {proposal.location} · {proposal.mode} · {proposal.durationLabel}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColorMap[proposal.status]}`}
                            >
                              {statusLabelMap[proposal.status]}
                            </Badge>
                            {proposal.isFullTimeOffer && proposal.status === "hired" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                              >
                                Full Time Proposal
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          {proposal.isFullTimeOffer ? (
                            <>
                              <div className="text-xs text-slate-500">Annual CTC</div>
                              <div className="text-sm font-semibold text-slate-900">{annualCtc}</div>
                            </>
                          ) : (
                            <>
                              <div className="text-xs text-slate-500">Monthly stipend</div>
                              <div className="text-sm font-semibold text-slate-900">{monthly}</div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-xs flex items-center gap-1.5"
                              onClick={() => {
                                if (proposal.status === "accepted") {
                                  const projectParam = proposal.projectId
                                    ? `&projectId=${encodeURIComponent(String(proposal.projectId))}`
                                    : "";
                                  setLocation(
                                    `/employer/cart?tab=checkout&scroll=checkout&proposalId=${encodeURIComponent(
                                      String(proposal.id ?? ""),
                                    )}${projectParam}#checkout`,
                                  );
                                  return;
                                }
                                if (proposal.status === "hired") {
                                  setLocation("/employer/orders");
                                  return;
                                }
                                setLocation(`/employer/proposals/${proposal.id}`);
                              }}
                            >
                              {proposal.status === "accepted"
                                ? "Proceed to hire"
                                : proposal.status === "hired"
                                  ? "View orders"
                                  : "View proposal"}
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-8 w-8 rounded-full border-slate-200 text-slate-500 hover:text-slate-700"
                                >
                                  ···
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setLocation(`/employer/proposals/${proposal.id}`);
                                  }}
                                >
                                  View proposal
                                </DropdownMenuItem>

                                {proposal.status !== "accepted" &&
                                proposal.status !== "rejected" &&
                                proposal.status !== "hired" &&
                                proposal.status !== "expired" &&
                                !proposal.isFullTimeOffer ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setLocation(`/employer/proposals/${proposal.id}/edit`)
                                    }
                                  >
                                    Edit proposal
                                  </DropdownMenuItem>
                                ) : null}

                                {canWithdrawStatus(proposal.status) ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setWithdrawingProposalId(String(proposal.id ?? ""));
                                      setIsWithdrawDialogOpen(true);
                                    }}
                                  >
                                    Withdraw
                                  </DropdownMenuItem>
                                ) : null}

                                {!proposal.isFullTimeOffer ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (!proposal.internId) {
                                        toast({
                                          title: "Profile unavailable",
                                          description: "This proposal is missing intern id.",
                                          variant: "destructive",
                                        });
                                        return;
                                      }
                                      setLocation(
                                        `/employer/intern/${encodeURIComponent(String(proposal.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                                      );
                                    }}
                                  >
                                    View profile
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">Withdraw proposal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the proposal as expired. You can still view it later, but you won&apos;t be able to proceed with it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isWithdrawing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isWithdrawing}
                  onClick={handleConfirmWithdraw}
                >
                  {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((proposal) => {
              const statusLabelMap: Record<EmployerProposal["status"], string> = {
                draft: "Draft",
                sent: "Sent",
                accepted: "Accepted",
                hired: "Hired",
                rejected: "Rejected",
                interview_scheduled: "Interview scheduled",
                expired: "Withdrawn",
              };

              const statusColorMap: Record<EmployerProposal["status"], string> = {
                draft: "bg-slate-100 text-slate-700 border-slate-200",
                sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
                accepted: "bg-emerald-600 text-white border-emerald-700",
                hired: "bg-emerald-600 text-white border-emerald-700",
                rejected: "bg-red-50 text-red-700 border-red-200",
                interview_scheduled: "bg-amber-50 text-amber-700 border-amber-200",
                expired: "bg-slate-100 text-slate-700 border-slate-200",
              };

              const currency: "INR" | "USD" = (proposal.offerCurrency ?? expectedCurrency) as "INR" | "USD";
              const monthly = formatMoney(Number(proposal.amountPerMonth ?? 0), currency);
              const annualCtcCurrency: "INR" | "USD" =
                (proposal.annualCtcCurrency ?? proposal.offerCurrency ?? expectedCurrency) as "INR" | "USD";
              const annualCtc = formatMoney(Number(proposal.annualCtc ?? 0), annualCtcCurrency);

              return (
                <Card
                  key={proposal.id}
                  className="p-4 rounded-2xl bg-white shadow-sm flex flex-col gap-2 border border-slate-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Avatar
                          className={`h-9 w-9 rounded-xl${proposal.internProfilePhotoName ? " cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!proposal.internProfilePhotoName) return;
                            openPhotoPreview(
                              proposal.internProfilePhotoName,
                              getProposalCandidateDisplayName(proposal),
                            );
                          }}
                        >
                          {proposal.internProfilePhotoName ? (
                            <AvatarImage
                              src={`/uploads/${proposal.internProfilePhotoName}`}
                              alt={getProposalCandidateDisplayName(proposal)}
                            />
                          ) : null}
                          <AvatarFallback className="rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold">
                            {getProposalCandidateDisplayName(proposal)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          className="text-base font-semibold text-slate-900 hover:underline text-left"
                          onClick={() => {
                            if (!proposal.internId) {
                              toast({
                                title: "Profile unavailable",
                                description: "This proposal is missing intern id.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setLocation(
                              `/employer/intern/${encodeURIComponent(String(proposal.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                            );
                          }}
                        >
                          {getProposalCandidateDisplayName(proposal)}
                        </button>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColorMap[proposal.status]}`}
                        >
                          {statusLabelMap[proposal.status]}
                        </Badge>
                        {proposal.isFullTimeOffer ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700"
                          >
                            Full Proposal
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-600 flex flex-wrap items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{proposal.projectName}</span>
                        <span className="mx-1 text-slate-400">·</span>
                        <span>{proposal.location}</span>
                        <span className="mx-1 text-slate-400">·</span>
                        <span>{proposal.mode}</span>
                        <span className="mx-1 text-slate-400">·</span>
                        <span>{proposal.durationLabel}</span>
                      </p>
                    </div>
                      <div className="text-right text-xs">
                      {proposal.isFullTimeOffer ? (
                        <>
                          <p className="text-slate-500 mb-0.5">Annual CTC</p>
                          <p className="text-sm font-semibold text-slate-900">{annualCtc}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-500 mb-0.5">Monthly stipend</p>
                          <p className="text-sm font-semibold text-slate-900">{monthly}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 flex flex-wrap justify-between gap-2">
                    <div className="flex gap-1 text-[11px] text-slate-500 items-center">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>Project: {proposal.projectName}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-[11px] px-3 flex items-center gap-1.5"
                        onClick={() => {
                          if (proposal.status === "accepted") {
                            const projectParam = proposal.projectId
                              ? `&projectId=${encodeURIComponent(String(proposal.projectId))}`
                              : "";
                            setLocation(
                              `/employer/cart?tab=checkout&scroll=checkout&proposalId=${encodeURIComponent(
                                String(proposal.id ?? ""),
                              )}${projectParam}#checkout`,
                            );
                            return;
                          }
                          if (proposal.status === "hired") {
                            setLocation("/employer/orders");
                            return;
                          }
                          setLocation(`/employer/proposals/${proposal.id}`);
                        }}
                      >
                        {proposal.status === "accepted"
                          ? "Proceed to hire"
                          : proposal.status === "hired"
                            ? "View orders"
                            : "View proposal"}
                        <ArrowUpRight className="w-3 h-3" />
                      </Button>
                      {proposal.status !== "accepted" &&
                      proposal.status !== "rejected" &&
                      proposal.status !== "hired" &&
                      proposal.status !== "expired" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full text-[11px] px-3 border-slate-200"
                          onClick={() => {
                            setLocation(`/employer/proposals/${proposal.id}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-[11px] px-3 border-slate-200"
                        onClick={() => {
                          if (!proposal.internId) {
                            toast({
                              title: "Profile unavailable",
                              description: "This proposal is missing intern id.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setLocation(
                            `/employer/intern/${encodeURIComponent(String(proposal.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                          );
                        }}
                      >
                        Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
