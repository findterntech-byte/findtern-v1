import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { useQueryClient } from "@tanstack/react-query";

import { useLocation, useRoute } from "wouter";

import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {

  ArrowLeft,

  Briefcase,

  Sparkles,

  MapPin,

  Clock,

  MessageSquare,

  GraduationCap,

  Languages,

  ExternalLink,

  Download,

  ShieldAlert,

  EyeOff,

  PhoneOff,

  Ban,

  Video,

  Scale,

} from "lucide-react";

import { getEmployerAuth, inferEmployerIsIndia } from "@/lib/employerAuth";

import { useToast } from "@/hooks/use-toast";

import DOMPurify from "dompurify";



type EmployerProposal = {

  id: string;

  status?: string;

  employerId?: string;

  internId?: string;

  projectId?: string;

  flowType?: "direct" | "interview_first";

  offerDetails?: {

    roleTitle?: string;

    jd?: string;

    mode?: string;

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

  };

  aiRatings?: {

    communication?: number;

    coding?: number;

    aptitude?: number;

    overall?: number;

  };

  skills?: string[];

};



export default function EmployerProposalDetailPage() {

  const [currentLocation, setLocation] = useLocation();

  const [, params] = useRoute<{ id: string }>("/employer/proposals/:id");

  const queryClient = useQueryClient();

  const { toast } = useToast();

  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);



  const proposalId = params?.id ?? "";



  const { data, isLoading, error } = useQuery({

    queryKey: ["/api/proposals", proposalId],

    enabled: !!proposalId,

    queryFn: async () => {

      const res = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}`);

      if (!res.ok) {

        const errJson = await res.json().catch(() => null);

        const message = errJson?.message || "Failed to fetch proposal";

        throw new Error(message);

      }

      return res.json();

    },

  });



  const proposal = (data?.proposal ?? null) as EmployerProposal | null;



  const escapeHtml = (value: string) =>

    String(value ?? "")

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/\"/g, "&quot;")

      .replace(/'/g, "&#39;");



  const jd = String(((proposal?.offerDetails ?? {}) as any)?.jd ?? "").trim();

  const jdHtml = useMemo(() => {

    if (!jd) return "";

    const looksLikeHtml = /<[^>]+>/.test(jd);

    if (looksLikeHtml) return jd;

    return escapeHtml(jd).replace(/\r\n|\r|\n/g, "<br />");

  }, [jd]);

  const jdSafeHtml = useMemo(

    () => (jdHtml ? DOMPurify.sanitize(jdHtml, { USE_PROFILES: { html: true } }) : ""),

    [jdHtml],

  );



  const auth = getEmployerAuth();

  const employerId = auth?.id ?? null;



  const selectedProjectIdStorageKey = "employerSelectedProjectId";

  const projectId = useMemo(() => {

    if (typeof window === "undefined") return "";

    try {

      return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";

    } catch {

      return "";

    }

  }, []);



  const internId = proposal?.internId ? String(proposal.internId) : "";

  const { data: internsData } = useQuery({

    queryKey: ["/api/employer", employerId, "interns", "proposal_detail", internId, projectId],

    enabled: !!internId && !!employerId,

    queryFn: async () => {

      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

      const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`);

      if (!res.ok) return { interns: [] } as any;

      return res.json();

    },

  });



  const internMeta = (() => {

    const list = (internsData?.interns ?? []) as any[];

    const match = list.find((item) => {

      const onboarding = item?.onboarding ?? {};

      const user = item?.user ?? {};

      const candidates = [user.id, onboarding.userId, onboarding.id]

        .map((v) => (v == null ? "" : String(v)))

        .filter((v) => v.trim().length > 0);

      return candidates.includes(String(internId));

    });

    if (!match) return null;

    const onboarding = match?.onboarding ?? {};

    const user = match?.user ?? {};

    const documents = match?.documents ?? {};

    const extra = onboarding?.extraData ?? {};



    const userFirst = user?.firstName ?? "";

    const userLast = user?.lastName ?? "";

    const fullFromUser = `${userFirst} ${userLast}`.trim();



    const name = String(extra?.fullName || extra?.name || fullFromUser || "Intern");

    const initials = (name || "IN")

      .split(" ")

      .filter(Boolean)

      .slice(0, 2)

      .map((p: string) => p[0]?.toUpperCase() ?? "")

      .join("") || "IN";



    const location = [onboarding?.city, onboarding?.state].filter(Boolean).join(", ");



    const rawSkills = Array.isArray(onboarding?.skills) ? onboarding.skills : [];

    const skills: string[] = rawSkills

      .map((s: any) =>

        typeof s === "string"

          ? s

          : typeof s?.name === "string"

            ? s.name

            : "",

      )

      .filter((s: string) => s.trim().length > 0);



    const rawExperience = Array.isArray(onboarding?.experienceJson) ? onboarding.experienceJson : [];

    const experienceItems: string[] = rawExperience

      .map((e: any) => {

        if (!e || typeof e !== "object") return "";

        const role = typeof e.role === "string" ? e.role.trim() : "";

        const company = typeof e.company === "string" ? e.company.trim() : "";

        const from = typeof e.from === "string" ? e.from.trim() : "";

        const to = typeof e.to === "string" ? e.to.trim() : "";

        const title = [role, company].filter(Boolean).join(" @ ");

        const period = [from, to].filter(Boolean).join(" - ");

        const parts = [title, period ? `(${period})` : ""].filter(Boolean);

        return parts.join(" ");

      })

      .filter((v: string) => v.trim().length > 0);



    const experienceSummary = experienceItems[0] ?? "";



    const acad: any = extra?.academics ?? {};

    const college = String(acad.institution ?? acad.college ?? "").trim();

    const degree = String(acad.degree ?? acad.level ?? "").trim();

    const educationSummary = [degree, college].filter(Boolean).join(" · ");



    const languages: string[] = Array.isArray(extra.languages)

      ? extra.languages

          .map((lang: any) => {

            if (typeof lang === "string") return lang;

            if (!lang || typeof lang !== "object") return "";

            const langName = String(lang.language ?? "").trim();

            const level = String(lang.level ?? "").trim();

            if (!langName && !level) return "";

            if (langName && level) return `${langName} (${level})`;

            return langName || level;

          })

          .filter((v: string) => v && v.trim().length > 0)

      : [];



    const locationTypesRaw = Array.isArray(onboarding?.locationTypes)

      ? onboarding.locationTypes

      : Array.isArray(extra.locationTypes)

        ? extra.locationTypes

        : [];

    const locationTypes: string[] = Array.isArray(locationTypesRaw)

      ? locationTypesRaw.map((v: any) => String(v)).filter(Boolean)

      : [];

    const hasLaptop =

      typeof onboarding?.hasLaptop === "boolean"

        ? onboarding.hasLaptop

        : typeof extra.hasLaptop === "boolean"

          ? extra.hasLaptop

          : null;

    return {

      name,

      initials,

      location,

      experienceSummary,

      educationSummary,

      skills,

      languages,

      profilePhotoName: documents?.profilePhotoName ?? null,

      preferredWorkMode: locationTypes,

      hasLaptop,

    };

  })();



  if (isLoading) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex items-center justify-center">

        <Card className="w-full max-w-md rounded-3xl shadow-md border border-slate-100 bg-white p-6 text-center space-y-3">

          <p className="text-sm text-slate-500">Loading proposal details...</p>

        </Card>

      </div>

    );

  }



  if (error instanceof Error || !proposal) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex items-center justify-center">

        <Card className="w-full max-w-md rounded-3xl shadow-md border border-red-50 bg-white p-6 text-center space-y-4">

          <p className="text-base font-semibold text-slate-900">Proposal not found</p>

          <p className="text-sm text-slate-500">

            The proposal you are trying to view doesn't exist or may have been removed.

          </p>

          <Button onClick={() => setLocation("/employer/proposals")}>Back to proposals</Button>

        </Card>

      </div>

    );

  }



  const offer = proposal.offerDetails ?? {};

  const fullTimeOffer = ((offer as any)?.fullTimeOffer ?? null) as any;

  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";

  const skills = Array.isArray(proposal.skills) ? proposal.skills : [];

  const ratings = proposal.aiRatings ?? {};



  const expectedCurrency = (() => {

    const raw = String((offer as any)?.currency ?? "").trim().toUpperCase();

    if (raw === "USD" || raw === "INR") return raw;

    return inferEmployerIsIndia(auth) ? "INR" : "USD";

  })();

  const moneyLocale = expectedCurrency === "INR" ? "en-IN" : "en-US";

  const formatMoney = (amount: number) => {

    const n = Number(amount ?? 0);

    if (!Number.isFinite(n) || n <= 0) return "";

    return new Intl.NumberFormat(moneyLocale, {

      style: "currency",

      currency: expectedCurrency,

      maximumFractionDigits: 0,

    }).format(n);

  };



  const roleTitle = hasFullTimeOffer

    ? (String(fullTimeOffer?.jobTitle ?? "").trim() || "Full Proposal")

    : offer.roleTitle || "Internship Proposal";



  const mode = hasFullTimeOffer

    ? (String(fullTimeOffer?.jobMode ?? "remote").trim() || "remote")

    : offer.mode || "remote";



  const location = hasFullTimeOffer

    ? (() => {

        const m = String(fullTimeOffer?.jobMode ?? "").trim().toLowerCase();

        if (m === "remote") return "Remote";

        const city = String(fullTimeOffer?.jobLocationCity ?? "").trim();

        const state = String(fullTimeOffer?.jobLocationState ?? "").trim();

        const loc = [city, state].filter(Boolean).join(", ");

        return loc || "Location not specified";

      })()

    : offer.location || "Location not specified";

  const startDate = (() => {

    const raw = String(offer.startDate ?? "").trim();

    if (!raw) return "Not specified";

    try {

      const d = new Date(raw);

      if (!Number.isFinite(d.getTime())) return "Not specified";

      return d.toLocaleDateString(moneyLocale, {

        day: "2-digit",

        month: "short",

        year: "numeric",

      });

    } catch {

      return "Not specified";

    }

  })();



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



  const stipendLabel =

    typeof offer.monthlyAmount === "number" && offer.monthlyAmount > 0

      ? `${formatMoney(offer.monthlyAmount)} / month`

      : "- NA";



  const monthlyHoursLabel =

    typeof offer.monthlyHours === "number" && offer.monthlyHours > 0

      ? `${offer.monthlyHours} hrs / month`

      : "Approx. 160 hrs / month";



  const timezoneLabel = hasFullTimeOffer

    ? (String(fullTimeOffer?.timezone ?? "").trim() || "Asia/Kolkata")

    : offer.timezone || "Asia/Kolkata";

  const laptopLabel = offer.laptop === "company" ? "Company laptop" : "Candidate's own laptop";



  const shiftLabelIst = (() => {

    const from = hasFullTimeOffer

      ? String(fullTimeOffer?.shiftFrom ?? "").trim()

      : String((offer as any)?.shiftFrom ?? (offer as any)?.shift_from ?? "").trim();

    const to = hasFullTimeOffer

      ? String(fullTimeOffer?.shiftTo ?? "").trim()

      : String((offer as any)?.shiftTo ?? (offer as any)?.shift_to ?? "").trim();

    if (!from || !to) return "Not specified";

    return `${from} - ${to} `;

  })();



  const scheduleLabel = (() => {

    const raw = String((offer as any)?.weeklySchedule ?? (offer as any)?.weekly_schedule ?? "").trim().toLowerCase();

    if (!raw) return "Not specified";

    if (raw === "mon_fri") return "Monday - Friday";

    if (raw === "mon_sat") return "Monday - Saturday";

    if (raw === "tue_sat") return "Tuesday - Saturday";

    if (raw === "sat_sun") return "Saturday - Sunday";

    return raw

      .replace(/_/g, " ")

      .split(" ")

      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))

      .join(" ");

  })();



  const paidLeavesLabel = (() => {

    const raw = (offer as any)?.paidLeavesPerMonth ?? (offer as any)?.paid_leaves_per_month ?? "";

    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());

    if (!Number.isFinite(n) || n < 0) return "Not specified";

    return `${n} / month`;

  })();



  const internshipLocationLabel = (() => {

    const m = String(mode ?? "").trim().toLowerCase();

    if (m === "remote") return "Remote";

    const loc = String((offer as any)?.location ?? "").trim();

    return loc || location;

  })();



  const laptopShortLabel = offer.laptop === "company" ? "Company" : "Candidate";



  const wfhDays = (() => {

    const raw = (offer as any)?.workFromHomeDays ?? (offer as any)?.work_from_home_days ?? 0;

    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());

    return Number.isFinite(n) ? n : 0;

  })();

  const wfoDays = (() => {

    const raw = (offer as any)?.workFromOfficeDays ?? (offer as any)?.work_from_office_days ?? 0;

    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());

    return Number.isFinite(n) ? n : 0;

  })();



  const status = proposal.status || "sent";

  const statusLower = String(status).toLowerCase();

  const isFinalized =
    statusLower === "accepted" ||
    statusLower === "rejected" ||
    statusLower === "hired" ||
    statusLower === "expired";

  const canProceedToHire = statusLower === "accepted";

  const canWithdraw = statusLower !== "rejected" && statusLower !== "hired" && statusLower !== "expired";

  const statusLabel = (() => {
    if (statusLower === "expired") return "withdrawn";
    return status;
  })();

  const canRevealCandidate = statusLower === "hired" || hasFullTimeOffer;

  const candidateDisplayName = internMeta

    ? canRevealCandidate

      ? internMeta.name

      : internMeta.initials

    : "Candidate";



  const statusBadgeClasses = (() => {

    switch (status) {

      case "accepted":

        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "hired":

        return "border-emerald-700 bg-emerald-600 text-white";

      case "rejected":

        return "border-red-200 bg-red-50 text-red-700";

      case "sent":

      case "expired":

      default:

        return "border-amber-200 bg-amber-50 text-amber-700";

    }

  })();



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex justify-center">

      <Card className="w-full max-w-6xl rounded-3xl shadow-lg border border-slate-100 bg-white p-5 md:p-6 space-y-5 md:space-y-6">

        <div className="flex items-center justify-between gap-3">

          <div className="flex items-center gap-3">

            <Button

              variant="ghost"

              size="icon"

              className="h-9 w-9 rounded-full border border-slate-200"

              onClick={() => setLocation("/employer/proposals")}

            >

              <ArrowLeft className="w-4 h-4" />

            </Button>

            <div>

              <h1 className="text-base md:text-lg font-semibold text-slate-900">

                {hasFullTimeOffer ? "Full Proposal" : "Proposal"} — {roleTitle}

              </h1>

              <p className="text-[11px] md:text-xs text-slate-500">

                Review all offer details for this candidate before final confirmation.

              </p>

            </div>
          </div>



          <div className="flex items-center gap-2">

            <Badge variant="outline" className={statusBadgeClasses + " text-[11px] px-2 py-0.5"}>

              Status: {statusLabel}

            </Badge>

            {canProceedToHire ? (

              <Button

                type="button"

                className="h-9 px-4 text-xs rounded-full bg-emerald-600 text-white hover:bg-emerald-700"

                onClick={() => {

                  const projectParam = proposal?.projectId

                    ? `&projectId=${encodeURIComponent(String(proposal.projectId))}`

                    : "";

                  setLocation(

                    `/employer/cart?tab=checkout&scroll=checkout&proposalId=${encodeURIComponent(

                      String(proposalId),

                    )}${projectParam}#checkout`,

                  );

                }}

              >

                Proceed to Hire

              </Button>

            ) : null}

            {canWithdraw ? (

              <Button

                type="button"

                variant="outline"

                className="h-9 px-4 text-xs rounded-full border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50"

                disabled={isWithdrawing}

                onClick={() => {
                  if (isWithdrawing) return;
                  setIsWithdrawDialogOpen(true);
                }}

              >

                Withdraw

              </Button>

            ) : null}

            {!isFinalized && !hasFullTimeOffer ? (

              <Button

                className="h-9 px-4 text-xs rounded-full bg-emerald-600 text-white hover:bg-emerald-700"

                onClick={() => setLocation(`/employer/proposals/${proposalId}/edit`)}

              >

                Edit proposal

              </Button>

            ) : null}

          </div>

        </div>

        <AlertDialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">Withdraw proposal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark the proposal as expired. You can still view the proposal later, but you won't be able to proceed with it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isWithdrawing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={isWithdrawing}
                onClick={() => {
                  if (isWithdrawing) return;
                  setIsWithdrawing(true);
                  void (async () => {
                    try {
                      const res = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ status: "expired" }),
                      });

                      if (!res.ok) {
                        const errJson = await res.json().catch(() => null);
                        const msg = String(errJson?.message ?? "Failed to withdraw proposal");
                        toast({
                          title: "Withdraw failed",
                          description: msg,
                          variant: "destructive",
                        });
                        return;
                      }

                      toast({
                        title: "Proposal withdrawn",
                        description: "The proposal has been withdrawn.",
                      });
                      setIsWithdrawDialogOpen(false);
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["/api/proposals", proposalId] }),
                        employerId
                          ? queryClient.invalidateQueries({
                              queryKey: ["/api/employer", employerId, "proposals"],
                            })
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
                  })();
                }}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        {hasFullTimeOffer ? (

          <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5">

            <div className="flex items-start justify-between gap-3">

              <div className="min-w-0">

                <p className="text-sm font-semibold text-slate-900">Full-time offer details</p>

                <p className="text-xs text-slate-600 mt-0.5">This is the full-time offer you sent to the candidate.</p>

              </div>



              {String(fullTimeOffer?.offerLetterUrl ?? "").trim() ? (

                <Button

                  type="button"

                  className="h-9 px-3 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md ring-1 ring-emerald-200 flex items-center gap-2"

                  onClick={() => {

                    const url = String(fullTimeOffer?.offerLetterUrl ?? "").trim();

                    if (!url) return;

                    window.open(url, "_blank", "noopener,noreferrer");

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

                <span className="font-medium text-slate-800 text-right">{location}</span>

              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">

                <span className="text-slate-500">Timezone</span>

                <span className="font-medium text-slate-800 text-right">{String(fullTimeOffer?.timezone ?? "").trim() || "—"}</span>

              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">

                <span className="text-slate-500">Shift</span>

                <span className="font-medium text-slate-800 text-right">{shiftLabelIst || "—"}</span>

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



        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

          <Card className="col-span-1 md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 md:p-5 flex items-center gap-4">

            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-lg">

              {roleTitle[0]?.toUpperCase() || "P"}

            </div>

            <div className="flex-1">

              <h2 className="text-sm md:text-base font-semibold text-slate-900">{roleTitle}</h2>

              <p className="text-xs md:text-sm text-slate-600 flex flex-wrap items-center gap-1.5">

                <MapPin className="w-3.5 h-3.5 text-red-400" />

                <span className="capitalize">{mode}</span>

                <span className="text-slate-300">•</span>

                <span>{location}</span>

                <span className="text-slate-300">•</span>

                <span>{timezoneLabel}</span>

              </p>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">

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

                    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">

                      Stipend: {stipendLabel}

                    </Badge>

                  </>

                )}

              </div>

            </div>

          </Card>



          <Card className="col-span-1 md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 md:p-5">

            <div className="flex items-start gap-4">

              <Avatar className="w-12 h-12 rounded-2xl">

                {canRevealCandidate && internMeta?.profilePhotoName ? (

                  <AvatarImage

                    src={`/uploads/${internMeta.profilePhotoName}`}

                    alt={candidateDisplayName}

                  />

                ) : null}

                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold">

                  {internMeta?.initials || "IN"}

                </AvatarFallback>

              </Avatar>



              <div className="flex-1">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <div>

                    <div className="text-sm font-semibold text-slate-900">Candidate</div>

                    <div className="text-xs text-slate-600 mt-0.5">{candidateDisplayName}</div>

                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">

                    {internMeta?.location ? (

                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">

                        <MapPin className="w-3.5 h-3.5 mr-1 text-red-400" />

                        {internMeta.location}

                      </Badge>

                    ) : null}

                    <Button

                      type="button"

                      size="sm"

                      variant="outline"

                      className="h-8 rounded-full text-[11px] px-3 border-slate-200"

                      disabled={!internId}

                      onClick={() => {

                        if (!internId) return;

                        setLocation(

                          `/employer/intern/${encodeURIComponent(String(internId))}?returnTo=${encodeURIComponent(currentLocation)}`,

                        );

                      }}

                    >

                      <ExternalLink className="w-3.5 h-3.5 mr-1" />

                      View Profile

                    </Button>

                  </div>

                </div>



                <div className="mt-3 flex flex-wrap gap-2">

                  {internMeta?.experienceSummary ? (

                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">

                      <Briefcase className="w-3.5 h-3.5 mr-1 text-emerald-600" />

                      {internMeta.experienceSummary}

                    </Badge>

                  ) : null}

                  {internMeta?.educationSummary ? (

                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">

                      <GraduationCap className="w-3.5 h-3.5 mr-1 text-indigo-600" />

                      {internMeta.educationSummary}

                    </Badge>

                  ) : null}

                  {internMeta?.languages?.length ? (

                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">

                      <Languages className="w-3.5 h-3.5 mr-1 text-slate-600" />

                      {internMeta.languages.slice(0, 2).join(", ")}

                      {internMeta.languages.length > 2 ? ` +${internMeta.languages.length - 2} more` : ""}

                    </Badge>

                  ) : null}

                </div>



                {internMeta?.skills?.length ? (

                  <div className="mt-3 flex flex-wrap gap-1.5">

                    {internMeta.skills.slice(0, 10).map((s: string) => (

                      <Badge

                        key={s}

                        variant="outline"

                        className="text-[11px] px-2.5 py-1 rounded-full border-slate-200 bg-white"

                      >

                        {s}

                      </Badge>

                    ))}

                  </div>

                ) : null}

              </div>

            </div>

          </Card>



          {!hasFullTimeOffer ? (

            <>

              <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-3">

                <div className="flex items-center gap-2 mb-1">

                  <Briefcase className="w-4 h-4 text-emerald-600" />

                  <h3 className="text-sm md:text-base font-semibold text-slate-900">Internship details</h3>

                </div>



                <div className="grid grid-cols-1 gap-2 text-[12px] md:text-sm text-slate-700">

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Start date</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{startDate}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Monthly hours</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{monthlyHoursLabel}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Shift timings</span>

                    <span className="font-medium text-right flex flex-wrap items-center justify-end gap-1 break-words [overflow-wrap:anywhere]">

                      <Clock className="w-4 h-4 text-slate-400" />

                      <span className="break-words [overflow-wrap:anywhere]">{shiftLabelIst}</span>

                    </span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Weekly working schedule</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{scheduleLabel}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Leave per month</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{paidLeavesLabel}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Work mode</span>

                    <span className="font-medium text-right capitalize break-words [overflow-wrap:anywhere]">{mode}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Location</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{internshipLocationLabel}</span>

                  </div>

                  <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                    <span className="text-slate-500">Laptop</span>

                    <span className="font-medium text-right break-words [overflow-wrap:anywhere]">{laptopShortLabel}</span>

                  </div>

                  {String(mode).toLowerCase() === "hybrid" && (wfhDays > 0 || wfoDays > 0) && (

                    <div className="grid grid-cols-[170px_1fr] items-start gap-3">

                      <span className="text-slate-500">Hybrid schedule</span>

                      <span className="font-medium text-right break-words [overflow-wrap:anywhere]">

                        WFH {wfhDays} days · WFO {wfoDays} days

                      </span>

                    </div>

                  )}

                </div>

              </Card>



              <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-3">

                <div className="flex items-center gap-2 mb-1">

                  <Clock className="w-4 h-4 text-emerald-600" />

                  <h3 className="text-sm md:text-base font-semibold text-slate-900">Compensation</h3>

                </div>

                <div className="space-y-1.5 text-[12px] md:text-sm text-slate-700">

                  <div className="flex items-center justify-between">

                    <span className="text-slate-500">Monthly pay</span>

                    <span className="font-semibold text-emerald-700">{stipendLabel}</span>

                  </div>

                  <p className="text-[11px] text-slate-500">

                    Final payout and compliance will be handled via Findtern as per agreed terms.

                  </p>

                </div>

              </Card>

            </>

          ) : null}

        </div>



        {!hasFullTimeOffer ? (

          <>

            <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-2">

              <h3 className="text-sm md:text-base font-semibold text-slate-900">Important Instructions</h3>

              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4 md:p-5">

                <div className="flex items-start gap-3">

                  <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">

                    <ShieldAlert className="w-5 h-5" />

                  </div>

                  <div className="flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <h4 className="text-sm md:text-base font-semibold text-slate-900">Mandatory Rules While Joining Meetings</h4>

                      <Badge

                        variant="outline"

                        className="text-[10px] rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"

                      >

                        Applies to you

                      </Badge>

                    </div>

                    <p className="mt-1 text-xs md:text-sm text-slate-600 leading-relaxed">

                      By joining any meeting scheduled through Findtern, you must comply with the following conduct policy.

                    </p>

                  </div>

                </div>



                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">

                  <div className="rounded-2xl border border-slate-100 bg-white p-3 md:p-4">

                    <div className="flex items-start gap-2">

                      <EyeOff className="w-4 h-4 text-slate-700 mt-0.5" />

                      <div>

                        <p className="text-xs md:text-sm font-semibold text-slate-900">Do Not Reveal Company or Personal Identity</p>

                        <p className="mt-1 text-[11px] md:text-xs text-slate-600 leading-relaxed">

                          Do not disclose company name, employee identity, direct contact information, office location, or organizational identifiers during the meeting.

                          <span className="block mt-1 text-slate-500">

                            Employer details will be officially disclosed through Findtern only after completion of platform requirements.

                          </span>

                        </p>

                      </div>

                    </div>

                  </div>



                  <div className="rounded-2xl border border-slate-100 bg-white p-3 md:p-4">

                    <div className="flex items-start gap-2">

                      <PhoneOff className="w-4 h-4 text-slate-700 mt-0.5" />

                      <div>

                        <p className="text-xs md:text-sm font-semibold text-slate-900">Do Not Request Intern Personal Contact Information</p>

                        <p className="mt-1 text-[11px] md:text-xs text-slate-600 leading-relaxed">

                          Do not ask interns to share phone numbers, email addresses, social media handles, or personal contact channels during meetings.

                          <span className="block mt-1 text-slate-500">

                            All communication must remain within Findtern unless authorized by the platform.

                          </span>

                        </p>

                      </div>

                    </div>

                  </div>



                  <div className="rounded-2xl border border-slate-100 bg-white p-3 md:p-4">

                    <div className="flex items-start gap-2">

                      <Ban className="w-4 h-4 text-slate-700 mt-0.5" />

                      <div>

                        <p className="text-xs md:text-sm font-semibold text-slate-900">Do Not Initiate Off-Platform Hiring or Negotiation</p>

                        <p className="mt-1 text-[11px] md:text-xs text-slate-600 leading-relaxed">

                          Do not attempt to conduct hiring discussions, internship confirmations, or employment negotiations outside the Findtern platform.

                        </p>

                      </div>

                    </div>

                  </div>



                  <div className="rounded-2xl border border-slate-100 bg-white p-3 md:p-4">

                    <div className="flex items-start gap-2">

                      <Video className="w-4 h-4 text-slate-700 mt-0.5" />

                      <div>

                        <p className="text-xs md:text-sm font-semibold text-slate-900">Meeting Monitoring and Recording Consent</p>

                        <p className="mt-1 text-[11px] md:text-xs text-slate-600 leading-relaxed">

                          Meetings are monitored by Findtern’s automated moderation system and recorded for compliance verification, platform security, and dispute resolution.

                          <span className="block mt-1 font-medium text-slate-700">

                            Joining the meeting confirms your consent to monitoring and recording.

                          </span>

                        </p>

                      </div>

                    </div>

                  </div>

                </div>



                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 md:p-4">

                  <div className="flex items-start gap-2">

                    <Scale className="w-4 h-4 text-amber-700 mt-0.5" />

                    <div className="flex-1">

                      <p className="text-xs md:text-sm font-semibold text-slate-900">Violation Consequences</p>

                      <p className="mt-1 text-[11px] md:text-xs text-slate-700 leading-relaxed">

                        Failure to follow meeting conduct policies may result in:

                      </p>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] md:text-xs text-slate-700">

                        <div className="flex items-center gap-2">

                          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />

                          Monetary penalties

                        </div>

                        <div className="flex items-center gap-2">

                          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />

                          Employer account suspension or access restrictions

                        </div>

                        <div className="flex items-center gap-2">

                          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />

                          Reduced platform visibility

                        </div>

                        <div className="flex items-center gap-2">

                          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />

                          Blacklisting from candidate access

                        </div>

                        <div className="flex items-center gap-2 md:col-span-2">

                          <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />

                          Additional contractual or legal action in serious violations

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </Card>



            <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-2">

              <h3 className="text-sm md:text-base font-semibold text-slate-900">Roles &amp; responsibilities</h3>

              {jdSafeHtml ? (

                <div

                  className="prose prose-slate prose-sm max-w-none break-words [overflow-wrap:anywhere]"

                  dangerouslySetInnerHTML={{ __html: jdSafeHtml }}

                />

              ) : (

                <p className="text-xs md:text-sm text-slate-700 leading-relaxed">

                  Use this space to review the expectations you have communicated to the candidate. Ensure that

                  the scope of work, timelines, and communication expectations are aligned with your internal

                  team before sending or confirming the offer.

                </p>

              )}

            </Card>

          </>

        ) : null}



        {!hasFullTimeOffer ? (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

            <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-3">

              <div className="flex items-center gap-2 mb-1">

                <Sparkles className="w-4 h-4 text-amber-400" />

                <h3 className="text-sm md:text-base font-semibold text-slate-900">AI interview ratings</h3>

              </div>

              <div className="space-y-1.5 text-xs md:text-sm text-slate-700">

                {(["communication", "coding", "aptitude", "overall"] as const).map((key) => {

                  const label = key === "overall" ? "Overall" : key.charAt(0).toUpperCase() + key.slice(1);

                  const value = (ratings as any)[key] ?? "-";

                  return (

                    <div key={key} className="flex items-center justify-between">

                      <span className="text-slate-500">{label}</span>

                      <span className="font-semibold text-emerald-700">{value === "-" ? "-" : `${value}/10`}</span>

                    </div>

                  );

                })}

              </div>

            </Card>



            <Card className="rounded-2xl border border-slate-100 bg-white p-4 md:p-5 space-y-3">

              <h3 className="text-sm md:text-base font-semibold text-slate-900">Skills highlighted</h3>

              <div className="flex flex-wrap gap-1.5">

                {skills.length === 0 && (

                  <span className="text-[11px] text-slate-500">No skills data available for this proposal.</span>

                )}

                {skills.map((skill) => (

                  <Badge

                    key={skill}

                    variant="outline"

                    className="text-[11px] px-2.5 py-1 rounded-full border-emerald-200 bg-emerald-50/60 text-emerald-700"

                  >

                    {skill}

                  </Badge>

                ))}

              </div>

            </Card>

          </div>

        ) : null}



        <div className="flex justify-end pt-1">

          <Button

            variant="outline"

            className="rounded-full px-6 text-xs md:text-sm"

            onClick={() => setLocation("/employer/proposals")}

          >

            Close

          </Button>

        </div>

      </Card>

    </div>

  );

}

