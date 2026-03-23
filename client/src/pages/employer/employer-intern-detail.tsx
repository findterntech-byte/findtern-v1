import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation, useRoute } from "wouter";
import { MapPin, ArrowLeft, Laptop, Globe, Star, ExternalLink, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getEmployerAuth, inferEmployerIsIndia, saveEmployerAuth } from "@/lib/employerAuth";
import { fetchPricingPlans, formatCurrencyMinor, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import { useToast } from "@/hooks/use-toast";
import { PolicyConfirmationDialog } from "@/components/employer/PolicyConfirmationDialog";

type InternProfile = {
  id: string;
  initials: string;
  name: string;
  location: string;
  state?: string;
  findternScore: number;
  ratings?: {
    communication: number;
    coding: number;
    aptitude: number;
    interview: number;
  };
  experience?: string;
  education?: string;
  availability?: string;
  stipend?: string;
  bio?: string;
  skills: string[];
  academics?: {
    level?: string;
    degree?: string;
    specialization?: string;
    status?: string;
    institution?: string;
    startYear?: string;
    endYear?: string;
    scoreType?: string;
    score?: string;
    professionalCourses?: any[];
    certifications?: any[];
  };
  experienceItems: Array<{
    id: string;
    role: string;
    company: string;
    from: string;
    to: string;
    location: string;
    description: string;
  }>;
  extracurricular: Array<{ activity: string; level?: string }>;
  preferences: {
    locationTypes: string[];
    preferredLocations: string[];
    hasLaptop: boolean;
  };
  languages: string[];
  profilePhotoName?: string | null;
};

type AiInterviewLinks = {
  meetingLink?: string | null;
  feedbackLink?: string | null;
  recordingLink?: string | null;
  status?: string | null;
};

export default function EmployerInternDetailPage() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/employer/intern/:id");
  const routeInternId = params?.id;
  const [loading, setLoading] = useState(true);
  const [intern, setIntern] = useState<InternProfile | null>(null);
  const [isNameRevealed, setIsNameRevealed] = useState(false);
  const [hasMeetingBooked, setHasMeetingBooked] = useState(false);
  const [proposalStatus, setProposalStatus] = useState<string>("");
  const [hasAnyProposalSent, setHasAnyProposalSent] = useState(false);
  const [latestProposalId, setLatestProposalId] = useState<string>("");
  const [isHiredAnywhere, setIsHiredAnywhere] = useState(false);
  const [hasFullTimeOfferSent, setHasFullTimeOfferSent] = useState(false);
  const [isFullTimeAccepted, setIsFullTimeAccepted] = useState(false);
  const { toast } = useToast();

  const preferredLocationsDisplay = useMemo(() => {
    const list = (intern?.preferences?.preferredLocations ?? []) as any[];

    const formatPreferredLocation = (raw: any) => {
      const value = String(raw ?? "").trim();
      if (!value) return "";

      const city = value.split(",")[0]?.trim() ?? "";
      return city;
    };

    return list.map(formatPreferredLocation).filter((x) => String(x ?? "").trim().length > 0);
  }, [intern?.preferences?.preferredLocations]);

  const [viewerIsIndia, setViewerIsIndia] = useState(() => inferEmployerIsIndia(getEmployerAuth()));
  const expectedCurrency = viewerIsIndia ? "INR" : "USD";
  const [pricingPlans, setPricingPlans] = useState<CmsPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plans = await fetchPricingPlans({ country: viewerIsIndia ? "IN" : "" });
      if (!cancelled) setPricingPlans(plans);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerIsIndia]);

  useEffect(() => {
    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    if (!employerId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(String(employerId))}`);
        const json = await res.json().catch(() => null);
        const employer = json?.employer as any;
        if (!employer) return;
        saveEmployerAuth(employer);
        if (!cancelled) setViewerIsIndia(inferEmployerIsIndia(employer));
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const getFindternScoreLabel = (score: number) => {
    const s = Number(score);
    if (!Number.isFinite(s)) return "⭐ Less than 6/10";
    if (s >= 8) return "⭐ 8+/10 (Top Rated)";
    if (s >= 6) return "⭐ 6-8/10";
    return "⭐ Less than 6/10";
  };

  const getCandidateHourlyPriceLabel = (profile: Pick<InternProfile, "findternScore" | "location" | "state">) => {
    const score = Number(profile.findternScore ?? 0);
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return "Free";
      return `${formatCurrencyMinor(minor, resolved.currency)}/hr`;
    }

    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";

    if (expectedCurrency === "INR") {
      if (tier === "low") return "Free";
      if (tier === "mid") return "₹100/hr";
      return "₹200/hr";
    }

    if (tier === "low") return "Free";
    if (tier === "mid") return "$1/hr";
    return "$2/hr";
  };

  const fromCompare = (() => {
    const query = String(location ?? "").split("?")[1] ?? "";
    const from = new URLSearchParams(query).get("from");
    return from === "compare";
  })();

  const returnTo = (() => {
    const query = String(location ?? "").split("?")[1] ?? "";
    const raw = new URLSearchParams(query).get("returnTo");
    const value = String(raw ?? "").trim();
    if (!value) return "";
    if (!value.startsWith("/")) return "";
    return value;
  })();

  const backPath = returnTo || (fromCompare ? "/employer/compare" : "/employer/dashboard");

  const handleBack = () => {
    if (returnTo) {
      setLocation(returnTo);
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }

    setLocation(fromCompare ? "/employer/compare" : "/employer/dashboard");
  };

  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const getCompareStorageKey = (projectId: string | null | undefined) =>
    projectId ? `employerCompareIds:${projectId}` : "employerCompareIds";

  const readSelectedProjectId = () => {
    try {
      return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
    } catch {
      return "";
    }
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => readSelectedProjectId());
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");

  useEffect(() => {
    const onUpdate = () => setSelectedProjectId(readSelectedProjectId());
    onUpdate();

    window.addEventListener("employerProjectChanged", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("employerProjectChanged", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, []);

  useEffect(() => {
    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    const pid = String(selectedProjectId ?? "").trim();
    if (!employerId || !pid) {
      setSelectedProjectName("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/projects`,
        );
        if (!res.ok) throw new Error("Failed to load projects");
        const json = await res.json().catch(() => null);
        const list = (json?.projects ?? json) as any[];
        const projects = Array.isArray(list) ? list : [];

        const match = projects.find((p) => String(p?.id ?? "").trim() === pid);
        const name = String(match?.name ?? match?.projectName ?? match?.project_name ?? "").trim();
        if (!cancelled) setSelectedProjectName(name);
      } catch {
        if (!cancelled) setSelectedProjectName("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const hasExistingProposalForThisProject = useMemo(() => {
    const s = String(proposalStatus ?? "").trim().toLowerCase();
    return s.length > 0 && s !== "rejected" && s !== "expired" && s !== "withdrawn";
  }, [proposalStatus]);

  const hasAnyExistingProposal = useMemo(() => {
    return Boolean(hasAnyProposalSent) && !!String(latestProposalId ?? "").trim();
  }, [hasAnyProposalSent, latestProposalId]);

  const getEmployerCartStorageKey = (id: string | undefined, projectId: string | null | undefined) => {
    const e = String(id ?? "").trim();
    const p = String(projectId ?? "").trim();
    if (!e || !p) return "";
    return `employerCartIds:${e}:${p}`;
  };

  const [latestInterviewLinks, setLatestInterviewLinks] = useState<AiInterviewLinks | null>(null);
  const [aiInterviewLinks, setAiInterviewLinks] = useState<AiInterviewLinks | null>(null);

  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string>("");
  const [photoPreviewAlt, setPhotoPreviewAlt] = useState<string>("");

  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const policyConfirmActionRef = useRef<null | (() => void | Promise<void>)>(null);

  const requestPolicyConfirmation = (action: () => void | Promise<void>) => {
    policyConfirmActionRef.current = action;
    setIsPolicyDialogOpen(true);
  };

  const openPhotoPreview = (photoName?: string | null, alt?: string) => {
    const name = String(photoName ?? "").trim();
    if (!name) return;
    setPhotoPreviewSrc(`/uploads/${name}`);
    setPhotoPreviewAlt(String(alt ?? "").trim());
    setIsPhotoPreviewOpen(true);
  };

  const [isInCart, setIsInCart] = useState(false);
  const [isInCompare, setIsInCompare] = useState(false);

  const isAcceptedProposal = useMemo(() => {
    return String(proposalStatus ?? "").trim().toLowerCase() === "accepted";
  }, [proposalStatus]);

  const isHiredProposal = useMemo(() => {
    return String(proposalStatus ?? "").trim().toLowerCase() === "hired";
  }, [proposalStatus]);

  const isHiredLike = isHiredProposal || isHiredAnywhere;
  const isFullTime = Boolean(hasFullTimeOfferSent);
  const shouldShowSendFullTimeOffer = isHiredLike && !hasFullTimeOfferSent;
  const shouldShowOrders = Boolean(hasFullTimeOfferSent);

  const isFindternScoreRestricted = useMemo(() => {
    const score = Number(intern?.findternScore ?? 0);
    return Number.isFinite(score) && score < 6;
  }, [intern?.findternScore]);

  const getInitialsFromName = (name: string, fallback?: string) => {
    const cleaned = String(name ?? "").trim().replace(/\s+/g, " ");
    if (!cleaned) return String(fallback ?? "");

    const parts = cleaned.split(" ").filter(Boolean);
    const first = parts[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1] : "";

    const a = first ? first[0] : "";
    const b = last ? last[0] : first.length > 1 ? first[1] : "";
    return (a + b).toUpperCase();
  };

  const getDisplayName = (profile: Pick<InternProfile, "name" | "initials">) => {
    if (isNameRevealed) return profile.name;
    return profile.initials;
  };

  const getAcademicsLabel = (level: string) => {
    const v = String(level ?? "").trim().toLowerCase();
    if (!v) return "Academics";
    if (v.includes("diploma")) return "Diploma";
    if (v.includes("graduation") || v.includes("undergraduate") || v.includes("bachelor")) return "Graduation";
    if (v.includes("post") || v.includes("master")) return "Post Graduation";
    return "Academics";
  };

  const formatAcademicsLevel = (level: string) => {
    const v = String(level ?? "").trim();
    const lower = v.toLowerCase();
    if (!lower) return "";
    if (lower === "phd" || lower === "ph.d" || lower === "ph.d.") return "Ph.D";
    if (lower === "diploma") return "Diploma";
    if (lower === "bachelors" || lower === "bachelor") return "Bachelor's";
    if (lower === "masters" || lower === "master") return "Master's";
    return v;
  };

  useEffect(() => {
    const load = async () => {
      if (!routeInternId) {
        setLoading(false);
        return;
      }

      try {
        const auth = getEmployerAuth();
        const employerId = auth?.id as string | undefined;
        if (!employerId) {
          setIntern(null);
          return;
        }

        const qs = selectedProjectId ? `?projectId=${encodeURIComponent(selectedProjectId)}` : "";
        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`,
        );
        const json = await response.json();
        const list = (json?.interns || []) as any[];

        const match = list.find((item) => {
          const onboarding = item.onboarding ?? {};
          const user = item.user ?? {};
          const candidates = [
            user.id,
            onboarding.userId,
            onboarding.id,
          ]
            .map((v) => (v == null ? "" : String(v)))
            .filter((v) => v.trim().length > 0);
          return candidates.includes(String(routeInternId));
        });

        if (!match) {
          setIntern(null);
          setLatestInterviewLinks(null);
          return;
        }

        const onboarding = match.onboarding ?? {};
        const user = match.user ?? {};
        const documents = match.documents ?? {};

        const parseNotesLink = (notes: string, label: string) => {
          const lines = String(notes ?? "")
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
          const prefix = `${label.toLowerCase()}:`;
          const match = lines.find((l) => l.toLowerCase().startsWith(prefix));
          if (!match) return null;
          const raw = match.slice(prefix.length).trim();
          if (!raw) return null;
          if (!/^https?:\/\//i.test(raw)) return null;
          return raw;
        };

        const latestInterview = match.latestInterview ?? match.latest_interview ?? null;
        const latestNotes = String(latestInterview?.notes ?? "");
        const latestMeetingLinkRaw = String(latestInterview?.meet_link ?? latestInterview?.meetingLink ?? "").trim();
        const latestMeetingLink = /^https?:\/\//i.test(latestMeetingLinkRaw) ? latestMeetingLinkRaw : null;
        const latestFeedbackLinkRaw = String(latestInterview?.feedback_link ?? latestInterview?.feedbackLink ?? "").trim();
        const latestFeedbackLink = /^https?:\/\//i.test(latestFeedbackLinkRaw)
          ? latestFeedbackLinkRaw
          : latestNotes
            ? parseNotesLink(latestNotes, "feedback")
            : null;
        const latestRecordingLinkRaw = String(
          latestInterview?.recording_link ?? latestInterview?.recordingLink ?? "",
        ).trim();
        const latestRecordingLink = /^https?:\/\//i.test(latestRecordingLinkRaw)
          ? latestRecordingLinkRaw
          : latestNotes
            ? parseNotesLink(latestNotes, "recording")
            : null;
        setLatestInterviewLinks(
          latestMeetingLink || latestFeedbackLink || latestRecordingLink || latestInterview?.status
            ? {
                meetingLink: latestMeetingLink,
                feedbackLink: latestFeedbackLink,
                recordingLink: latestRecordingLink,
                status: String(latestInterview?.status ?? "") || null,
              }
            : null,
        );

        const rawSkills = Array.isArray(onboarding.skills) ? onboarding.skills : [];
        const skills: string[] = rawSkills
          .map((s: any) =>
            typeof s === "string"
              ? s
              : typeof s?.name === "string"
              ? s.name
              : "",
          )
          .filter((s: string) => s.trim().length > 0);

        const locationParts = [onboarding.city, onboarding.state].filter(Boolean).join(", ");
        const state = typeof onboarding.state === "string" ? onboarding.state : "";
        const userFirst = user.firstName ?? "";
        const userLast = user.lastName ?? "";
        const fullFromUser = `${userFirst} ${userLast}`.trim();

        const name = onboarding.extraData?.fullName || onboarding.extraData?.name || fullFromUser || "Intern";
        const initials = getInitialsFromName(name, "IN") || "IN";

        const extra = onboarding.extraData ?? {};
        const rawExperience = Array.isArray(onboarding.experienceJson) ? onboarding.experienceJson : [];
        const experienceItems: InternProfile["experienceItems"] = rawExperience
          .map((e: any, idx: number) => {
            if (!e || typeof e !== "object") return null;
            const role = typeof e.role === "string" ? e.role.trim() : "";
            const company = typeof e.company === "string" ? e.company.trim() : "";
            const from = typeof e.from === "string" ? e.from.trim() : "";
            const to = typeof e.to === "string" ? e.to.trim() : "";
            const location = typeof e.location === "string" ? e.location.trim() : "";

            const bullets = Array.isArray((e as any).bullets)
              ? (e as any).bullets.filter((b: any) => typeof b === "string" && b.trim())
              : [];
            const rawDescription = typeof (e as any).description === "string" ? (e as any).description : "";
            const description = (rawDescription || (bullets.length > 0 ? bullets.join("\n") : "")).trim();

            const id = typeof (e as any).id === "string" ? (e as any).id : `exp-${idx}-${Date.now()}`;

            const hasAny = Boolean(role || company || from || to || location || description);
            if (!hasAny) return null;

            return {
              id,
              role,
              company,
              from,
              to,
              location,
              description,
            };
          })
          .filter(Boolean) as InternProfile["experienceItems"];

        const acad: any = extra.academics ?? {};
        const level = String(acad.level ?? acad.degreeLevel ?? "").trim();
        const degree = String(acad.degree ?? "").trim();
        const specialization = String(acad.specialization ?? "").trim();
        const status = String(acad.status ?? "").trim();
        const institution = String(acad.institution ?? acad.college ?? "").trim();
        const startYear = acad.startYear == null ? "" : String(acad.startYear).trim();
        const endYear = acad.endYear == null ? "" : String(acad.endYear).trim();
        const scoreType = String(acad.scoreType ?? "").trim();
        const score = String(acad.score ?? "").trim();

        const resolvedId = String(user.id ?? onboarding.userId ?? onboarding.id ?? routeInternId);

        const experienceSummary = experienceItems[0]
          ? [experienceItems[0].role, experienceItems[0].company].filter(Boolean).join(" @ ")
          : "";
        const educationSummary = [degree || specialization, institution].filter(Boolean).join(" · ");

        const ratingsRaw = extra?.ratings ?? {};
        const ratings = {
          communication: Number(ratingsRaw.communication ?? 0) || 0,
          coding: Number(ratingsRaw.coding ?? 0) || 0,
          aptitude: Number(ratingsRaw.aptitude ?? 0) || 0,
          interview: Number(ratingsRaw.interview ?? 0) || 0,
        };

        const extracurricularRaw = extra?.extracurricular;
        const extracurricular: InternProfile["extracurricular"] = Array.isArray(extracurricularRaw)
          ? extracurricularRaw
              .map((x: any) => {
                if (!x || typeof x !== "object") return null;
                const activity = String(x.activity ?? "").trim();
                const level = String(x.level ?? "").trim();
                if (!activity) return null;
                return { activity, level: level || undefined };
              })
              .filter(Boolean) as InternProfile["extracurricular"]
          : [];

        const profile: InternProfile = {
          id: resolvedId,
          initials,
          name,
          location: locationParts || "",
          state,
          findternScore: typeof extra.findternScore === "number" ? extra.findternScore : 0,
          ratings,
          experience: (typeof extra.experience === "string" && extra.experience.trim()) || experienceSummary,
          education: (typeof extra.education === "string" && extra.education.trim()) || educationSummary,
          availability: extra.availability,
          stipend: extra.stipend,
          bio: extra.bio,
          skills,
          academics: {
            level,
            degree,
            specialization,
            status,
            institution,
            startYear: startYear || undefined,
            endYear: endYear || undefined,
            scoreType: scoreType || undefined,
            score: score || undefined,
            professionalCourses: Array.isArray(acad.professionalCourses) ? acad.professionalCourses : [],
            certifications: Array.isArray(acad.certifications) ? acad.certifications : [],
          },
          experienceItems,
          extracurricular,
          preferences: {
            locationTypes: Array.isArray(onboarding?.locationTypes)
              ? onboarding.locationTypes
              : Array.isArray(extra.locationTypes)
                ? extra.locationTypes
                : [],
            preferredLocations: Array.isArray(onboarding?.preferredLocations)
              ? onboarding.preferredLocations
              : Array.isArray(extra.preferredLocations)
                ? extra.preferredLocations
                : [],
            hasLaptop: typeof onboarding?.hasLaptop === "boolean" ? onboarding.hasLaptop : !!extra.hasLaptop,
          },
          languages: (() => {
            const raw = Array.isArray(onboarding?.languages)
              ? onboarding.languages
              : Array.isArray(extra.languages)
                ? extra.languages
                : [];

            const isYes = (v: any) => {
              if (v === true) return true;
              const s = String(v ?? "").trim().toLowerCase();
              return s === "yes" || s === "true" || s === "1";
            };

            const isNo = (v: any) => {
              if (v === false) return true;
              const s = String(v ?? "").trim().toLowerCase();
              return s === "no" || s === "false" || s === "0";
            };

            const yesNo = (v: any) => {
              if (isYes(v)) return "Yes";
              if (isNo(v)) return "No";
              return "";
            };

            return raw
              .map((lang: any) => {
                if (typeof lang === "string") return lang;
                if (!lang || typeof lang !== "object") return "";

                const name = String(lang.language ?? "").trim();
                const level = String(lang.level ?? "").trim();
                const read = yesNo(lang.read);
                const write = yesNo(lang.write);
                const speak = yesNo(lang.speak);

                const modes = [
                  `Read: ${read || "-"}`,
                  `Write: ${write || "-"}`,
                  `Speak: ${speak || "-"}`,
                ].join("/");

                if (!name && !level) return "";

                let label = name || level;
                if (level && name) {
                  label = `${name} (${level})`;
                }

                label = `${label} [${modes}]`;

                return label;
              })
              .filter((v: string) => v && v.trim().length > 0);
          })(),
          profilePhotoName: documents.profilePhotoName ?? null,
        };

        setIntern(profile);
      } catch (error) {
        console.error("Failed to load intern detail", error);
        setIntern(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [routeInternId, selectedProjectId]);

  useEffect(() => {
    const key = intern?.id ?? routeInternId;
    if (!key) return;

    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    const projectId = (() => {
      try {
        return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
      } catch {
        return "";
      }
    })();
    const sync = () => {
      void (async () => {
        try {
          const pid = (() => {
            try {
              return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
            } catch {
              return "";
            }
          })();
          if (!employerId || !pid || !key) {
            setIsInCart(false);
            return;
          }
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart?projectId=${encodeURIComponent(String(pid))}`,
          );
          const json = await res.json().catch(() => null);
          const ids = Array.isArray(json?.cartIds) ? json.cartIds.map((v: any) => String(v).trim()).filter(Boolean) : [];
          setIsInCart(ids.includes(String(key)));
        } catch {
          setIsInCart(false);
        }
      })();

      try {
        const projectId = window.localStorage.getItem(selectedProjectIdStorageKey);
        const storedCompareRaw = window.localStorage.getItem(getCompareStorageKey(projectId));
        const storedCompare: string[] = storedCompareRaw ? JSON.parse(storedCompareRaw) : [];
        setIsInCompare(Array.isArray(storedCompare) && storedCompare.includes(key));
      } catch {
        setIsInCompare(false);
      }
    };

    sync();
    window.addEventListener("employerCartUpdated", sync);
    window.addEventListener("employerProjectChanged", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("employerCartUpdated", sync);
      window.removeEventListener("employerProjectChanged", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [routeInternId, intern?.id]);

  useEffect(() => {
    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    const key = intern?.id ?? routeInternId;
    if (!employerId || !key) {
      setIsHiredAnywhere(false);
      setHasFullTimeOfferSent(false);
      setHasAnyProposalSent(false);
      setLatestProposalId("");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/employer/${employerId}/proposals`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.proposals ?? []) as any[];
        const internKey = String(key);

        let latestId = "";
        let latestTs = 0;
        let anySent = false;
        for (const p of list) {
          const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (pid !== internKey) continue;
          const statusLower = String(p?.status ?? "").trim().toLowerCase();
          if (
            !statusLower ||
            statusLower === "rejected" ||
            statusLower === "expired" ||
            statusLower === "withdrawn"
          ) {
            continue;
          }
          anySent = true;

          const proposalId = String(p?.id ?? "").trim();
          if (!proposalId) continue;
          const rawTime = p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? null;
          const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
          const ts = Number.isFinite(parsed) ? parsed : 0;
          if (ts >= latestTs) {
            latestTs = ts;
            latestId = proposalId;
          }
        }
        setHasAnyProposalSent(anySent);
        setLatestProposalId(latestId);

        const hired = list.some((p) => {
          const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (pid !== internKey) return false;
          return String(p?.status ?? "").trim().toLowerCase() === "hired";
        });
        setIsHiredAnywhere(hired);

        let hasFteAnyProject = false;
        let hasFteAccepted = false;
        for (const p of list) {
          const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (pid !== internKey) continue;
          const statusLower = String(p?.status ?? "").trim().toLowerCase();
          const offer = (p?.offerDetails ?? {}) as any;
          const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
          const isFte = !!fullTimeOffer && typeof fullTimeOffer === "object";
          if (!isFte) continue;

          if (
            statusLower !== "rejected" &&
            statusLower !== "expired" &&
            statusLower !== "withdrawn"
          ) {
            hasFteAnyProject = true;
          }
          if (statusLower === "accepted") {
            hasFteAccepted = true;
          }
        }
        setHasFullTimeOfferSent(hasFteAnyProject);
        setIsFullTimeAccepted(hasFteAccepted);

        if (!selectedProjectId) {
          const unlocked = hired || hasFteAnyProject;
          setIsNameRevealed(unlocked);
          setProposalStatus("");
          return;
        }

        const match = list.find((p) => {
          const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (pid !== internKey) return false;
          const prj = String(p?.projectId ?? p?.project_id ?? "").trim();
          if (prj !== String(selectedProjectId)) return false;
          return true;
        });
        const status = String(match?.status ?? "").trim();
        const unlocked =
          Boolean(match?.isNameUnlocked) ||
          String(status).trim().toLowerCase() === "hired" ||
          hired ||
          hasFteAnyProject;
        setIsNameRevealed(unlocked);
        setProposalStatus(status);
      } catch {
        return;
      }
    })();
  }, [routeInternId, intern?.id, selectedProjectId]);

  useEffect(() => {
    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    const key = intern?.id ?? routeInternId;
    if (!employerId || !key) {
      setHasMeetingBooked(false);
      return;
    }

    if (!selectedProjectId) {
      setHasMeetingBooked(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/interviews`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.interviews ?? []) as any[];

        const match = list
          .filter((i) => {
            const iid = String(i?.internId ?? i?.intern_id ?? "").trim();
            if (iid !== String(key)) return false;
            const pid = String(i?.projectId ?? i?.project_id ?? "").trim();
            return pid === String(selectedProjectId);
          })
          .sort((a, b) => {
            const ta = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
            const tb = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
            return tb - ta;
          })[0];

        const status = String(match?.status ?? "").toLowerCase();
        setHasMeetingBooked(status === "pending" || status === "scheduled");
      } catch {
        setHasMeetingBooked(false);
      }
    })();
  }, [routeInternId, intern?.id, selectedProjectId]);

  useEffect(() => {
    const key = intern?.id ?? routeInternId;
    if (!key) return;

    const parseNotesLink = (notes: string, label: string) => {
      const lines = String(notes ?? "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const prefix = `${label.toLowerCase()}:`;
      const match = lines.find((l) => l.toLowerCase().startsWith(prefix));
      if (!match) return null;
      const raw = match.slice(prefix.length).trim();
      if (!raw) return null;
      if (!/^https?:\/\//i.test(raw)) return null;
      return raw;
    };

    (async () => {
      try {
        const res = await fetch(`/api/intern/${encodeURIComponent(String(key))}/interviews`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.interviews ?? []) as any[];
        const aiList = list
          .filter((i) => String(i?.employerId ?? "").toLowerCase() === "admin")
          .sort((a, b) => {
            const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tb - ta;
          });
        const ai = aiList[0] ?? null;
        if (!ai) {
          setAiInterviewLinks(null);
          return;
        }

        const notes = String(ai?.notes ?? "");
        const meetingLinkRaw = String(ai?.meet_link ?? ai?.meetingLink ?? "").trim();
        const meetingLink = /^https?:\/\//i.test(meetingLinkRaw) ? meetingLinkRaw : null;

        const feedbackLinkRaw = String(ai?.feedback_link ?? ai?.feedbackLink ?? "").trim();
        const feedbackLink = /^https?:\/\//i.test(feedbackLinkRaw)
          ? feedbackLinkRaw
          : notes
            ? parseNotesLink(notes, "feedback")
            : null;

        const recordingLinkRaw = String(ai?.recording_link ?? ai?.recordingLink ?? "").trim();
        const recordingLink = /^https?:\/\//i.test(recordingLinkRaw)
          ? recordingLinkRaw
          : notes
            ? parseNotesLink(notes, "recording")
            : null;

        setAiInterviewLinks({
          meetingLink,
          feedbackLink,
          recordingLink,
          status: String(ai?.status ?? "") || null,
        });
      } catch {
        return;
      }
    })();
  }, [routeInternId, intern?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-lg font-semibold">Loading intern profile...</p>
        </Card>
      </div>
    );
  }

  if (!intern) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <p className="text-lg font-semibold">Intern profile not found</p>
          <Button onClick={handleBack}>
            {fromCompare ? "Back to compare" : "Back to candidates"}
          </Button>
        </Card>
      </div>
    );
  }

  const certifications = (Array.isArray(intern.academics?.certifications) ? intern.academics?.certifications : [])
    .map((c: any) => {
      const name = String(c?.certificateName ?? c?.name ?? "").trim();
      const institution = String(c?.institution ?? "").trim();
      const start = String(c?.startDate ?? "").trim();
      const end = String(c?.endDate ?? "").trim();
      const line = [name, institution].filter(Boolean).join(" · ");
      const period = [start, end].filter(Boolean).join(" - ");
      if (!line && !period) return null;
      return {
        key: String(c?.id ?? "") || undefined,
        line,
        period,
      };
    })
    .filter(Boolean) as Array<{ key?: string; line: string; period: string }>;

  return (
    <div className="min-h-screen bg-slate-50">
      <PolicyConfirmationDialog
        open={isPolicyDialogOpen}
        onOpenChange={setIsPolicyDialogOpen}
        confirmLabel="Continue"
        onConfirm={async () => {
          await policyConfirmActionRef.current?.();
        }}
      />

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

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="rounded-xl" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {selectedProjectName ? (
              <p className="text-xs text-emerald-700">
                <span className="font-medium text-emerald-800">Project:</span>{" "}
                <span className="font-semibold text-emerald-700">{selectedProjectName}</span>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasAnyExistingProposal ? (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const pid = String(latestProposalId ?? "").trim();
                  if (!pid) return;
                  setLocation(`/employer/proposals/${encodeURIComponent(pid)}`);
                }}
              >
                View Sent Proposal
              </Button>
            ) : (
              <Button
                className="rounded-xl"
                disabled={hasExistingProposalForThisProject || isFullTime || hasMeetingBooked || isHiredLike}
                onClick={() => {
                  requestPolicyConfirmation(() => {
                    if (isHiredLike) {
                      toast({
                        title: "Cannot send proposal",
                        description: "This candidate is already hired. Please check Orders.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (hasMeetingBooked) {
                      toast({
                        title: "Cannot send proposal",
                        description: "The proposal cannot be sent until the meeting/interview is completed.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (isFullTime) {
                      toast({
                        title: "Cannot send internship proposal",
                        description: "A full-time offer has already been sent for this candidate. Please check Orders.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const key = intern?.id ?? routeInternId;
                    if (!key) return;

                    try {
                      const auth = getEmployerAuth();
                      const employerId = auth?.id as string | undefined;
                      if (!employerId) return;

                      const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
                      if (projectId) {
                        void (async () => {
                          try {
                            await apiRequest(
                              "POST",
                              `/api/employer/${encodeURIComponent(String(employerId))}/cart/items`,
                              {
                                projectId,
                                listType: "cart",
                                internId: String(key),
                              },
                            );
                            window.dispatchEvent(new Event("employerCartUpdated"));
                          } catch {
                            // ignore
                          }
                        })();
                      }
                      window.localStorage.setItem("employerCartOpenProposalForInternId", String(key));
                    } catch {
                      return;
                    }

                    const nextQuery = (() => {
                      const q: string[] = [];
                      if (fromCompare) q.push("from=compare");
                      if (returnTo) q.push(`returnTo=${encodeURIComponent(returnTo)}`);
                      return q.length > 0 ? `?${q.join("&")}` : "";
                    })();

                    setLocation(`/employer/intern/${encodeURIComponent(String(key))}/proposal${nextQuery}`);
                  });
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Proposal
              </Button>
            )}

            <Button
              variant="outline"
              className="rounded-xl"
              disabled={isInCompare || isHiredProposal || isHiredAnywhere || isFullTime}
              onClick={() => {
                const key = intern?.id ?? routeInternId;
                if (!key) return;
                if (isFullTime) return;
                try {
                  const projectId = window.localStorage.getItem(selectedProjectIdStorageKey);
                  const storedRaw = window.localStorage.getItem(getCompareStorageKey(projectId));
                  const stored: string[] = storedRaw ? JSON.parse(storedRaw) : [];
                  const next = Array.isArray(stored) ? stored.slice(0, 5) : [];
                  if (!next.includes(key)) {
                    if (next.length >= 5) {
                      toast({
                        title: "Compare list full",
                        description: "You can compare up to 5 candidates.",
                        variant: "destructive",
                      });
                      return;
                    }
                    next.push(key);
                    window.localStorage.setItem(getCompareStorageKey(projectId), JSON.stringify(next));
                  }
                  setIsInCompare(true);
                  toast({
                    title: "Added to compare",
                    description: "Candidate added to compare list.",
                  });
                } catch (e) {
                  console.error("Failed to update employerCompareIds", e);
                }
              }}
            >
              {isInCompare ? "In Compare" : "Add to Compare"}
            </Button>

            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={(() => {
                if (isFullTimeAccepted) return false;
                if (isFullTime) return true;
                if (shouldShowSendFullTimeOffer) return false;
                if (isAcceptedProposal) return false;
                return hasAnyExistingProposal || (!isAcceptedProposal && !isHiredLike && isInCart);
              })()}
              onClick={() => {
                if (shouldShowSendFullTimeOffer) {
                  const key = intern?.id ?? routeInternId;
                  if (!key) return;
                  setLocation(`/employer/orders?ftInternId=${encodeURIComponent(String(key).trim())}`);
                  return;
                }
                if (isFullTimeAccepted) {
                  setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                  return;
                }
                if (isFullTime) {
                  return;
                }
                if (isAcceptedProposal) {
                  setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                  return;
                }
                if (hasAnyExistingProposal) {
                  const pid = String(latestProposalId ?? "").trim();
                  if (pid) setLocation(`/employer/proposals/${encodeURIComponent(pid)}`);
                  return;
                }
                if (isHiredLike) {
                  return;
                }
                if (hasFullTimeOfferSent) {
                  setLocation("/employer/orders");
                  return;
                }
                if (isAcceptedProposal) {
                  setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                  return;
                }
                const key = intern?.id ?? routeInternId;
                if (!key) return;
                const statusLower = String(proposalStatus ?? "").trim().toLowerCase();
                if (statusLower === "hired") {
                  toast({
                    title: "Already hired",
                    description: "This candidate is already hired for your selected project.",
                    variant: "destructive",
                  });
                  return;
                }
                const auth = getEmployerAuth();
                const employerId = auth?.id as string | undefined;
                if (!employerId) {
                  toast({
                    title: "Not signed in",
                    description: "Please sign in again to add candidates to your cart.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
                  if (projectId) {
                    void (async () => {
                      try {
                        await apiRequest(
                          "POST",
                          `/api/employer/${encodeURIComponent(String(employerId))}/cart/items`,
                          {
                            projectId,
                            listType: "cart",
                            internId: String(key),
                          },
                        );
                        window.dispatchEvent(new Event("employerCartUpdated"));
                        setIsInCart(true);
                        toast({
                          title: "Added to cart",
                          description: "Candidate added to your cart.",
                        });
                      } catch (e) {
                        console.error("Failed to update employer cart", e);
                      }
                    })();
                  }
                } catch (e) {
                  console.error("Failed to update employerCartIds", e);
                }
              }}
            >
              {shouldShowSendFullTimeOffer
                ? "Send full-time offer"
                : isFullTimeAccepted
                  ? "Proceed to Hire"
                  : shouldShowOrders
                    ? "Full-time"
                    : isAcceptedProposal
                      ? "Proceed to Hire"
                      : isInCart
                        ? "In Cart"
                        : isFullTime
                          ? "Full-time"
                          : "Add to Cart"}
            </Button>
          </div>
        </div>

        {/* Summary header */}
        <Card className="p-6 md:p-8 rounded-2xl shadow-sm bg-white">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-16 h-16">
              <Avatar
                className={`w-16 h-16 rounded-2xl${intern.profilePhotoName ? " cursor-pointer" : ""}`}
                onClick={() => openPhotoPreview(intern.profilePhotoName, getDisplayName(intern))}
              >
                {intern.profilePhotoName ? (
                  <AvatarImage
                    src={`/uploads/${intern.profilePhotoName}`}
                    alt={getDisplayName(intern)}
                  />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl font-bold">
                  {getInitialsFromName(intern.name, intern.initials)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900">{getDisplayName(intern)}</h1>
              <p className="flex items-center gap-1 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-red-400" />
                {(() => {
                  const raw = String((intern as any)?.location ?? "").trim();
                  if (!raw) return "-";
                  const first = raw.split(",")[0]?.trim();
                  return first || raw;
                })()}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                  <Star className="w-3.5 h-3.5 mr-1" />
                  Findtern score: {Number.isFinite(intern.findternScore) ? intern.findternScore.toFixed(1) : "0.0"}
                </Badge>
                <Badge variant="outline" className="border-slate-900 bg-slate-900 text-white">
                  Price: {getCandidateHourlyPriceLabel(intern)}
                </Badge>
                {intern.experience && (
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    {intern.experience}
                  </Badge>
                )}
                {intern.education && (
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    {intern.education}
                  </Badge>
                )}
                {intern.availability && (
                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                    Availability: {intern.availability}
                  </Badge>
                )}
                {intern.stipend && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                    Expected stipend: {intern.stipend}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Main profile sections */}
        <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1.1fr] gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
           

            {(intern.ratings && (intern.ratings.communication > 0 || intern.ratings.coding > 0 || intern.ratings.aptitude > 0 || intern.ratings.interview > 0)) ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl mt-4">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Ratings</h2>
                <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    AI Interview: {intern.ratings.interview}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    Communication: {intern.ratings.communication}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    Coding: {intern.ratings.coding}
                  </Badge>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50">
                    Aptitude: {intern.ratings.aptitude}
                  </Badge>
                </div>
              </Card>
            ) : null}

            {/* Skills */}
            {intern.skills.length > 0 ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">Skills & Tools</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {intern.skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="text-xs px-2.5 py-1 rounded-full border-slate-200 bg-slate-50 text-slate-700"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Academics */}
            {(intern.academics?.institution || intern.academics?.degree || intern.academics?.level || intern.academics?.startYear || intern.academics?.endYear || intern.academics?.score) ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Academics</h2>
                {intern.academics ? (
                  <>
                    {intern.academics.degree ? (
                      <p className="text-sm font-medium text-slate-800">
                        {getAcademicsLabel(intern.academics.level || "")}: {intern.academics.degree}
                      </p>
                    ) : null}
                    {intern.academics.specialization ? (
                      <p className="text-xs text-slate-600 mt-0.5">{intern.academics.specialization}</p>
                    ) : null}
                    {intern.academics.institution ? (
                      <p className="text-xs text-slate-600 mt-0.5">{intern.academics.institution}</p>
                    ) : null}
                  </>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {intern.academics?.level ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50">
                      Level: {formatAcademicsLevel(intern.academics.level)}
                    </Badge>
                  ) : null}
                  {(intern.academics?.startYear || intern.academics?.endYear) ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50">
                      {[intern.academics.startYear, intern.academics.endYear].filter(Boolean).join(" - ")}
                    </Badge>
                  ) : null}
                  {intern.academics?.status ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50">
                      {intern.academics.status}
                    </Badge>
                  ) : null}
                  {intern.academics?.score ? (
                    <Badge variant="outline" className="border-slate-200 bg-slate-50">
                      {(intern.academics.scoreType || "Score")}: {intern.academics.score}
                    </Badge>
                  ) : null}
                </div>
              </Card>
            ) : null}

            {(Array.isArray(intern.academics?.professionalCourses) && intern.academics?.professionalCourses.length > 0) ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Professional Courses</h2>
                <div className="space-y-3">
                  {intern.academics.professionalCourses.map((c: any, idx: number) => {
                    const preset = String(c?.courseNamePreset ?? "").trim();
                    const presetNorm = preset.toLowerCase();
                    const otherName = String(c?.courseNameOther ?? c?.courseNameCustom ?? "").trim();
                    const fallbackName = String(c?.title ?? "").trim();
                    const name = (() => {
                      if (preset && presetNorm !== "other" && presetNorm !== "others") return preset;
                      return otherName || preset || fallbackName;
                    })();
                    const level = String(c?.level ?? "").trim();
                    const institution = String(c?.institution ?? "").trim();
                    const completionDate = String(c?.completionDate ?? c?.endDate ?? "").trim();
                    const scoreType = String(c?.scoreType ?? "").trim();
                    const score = String(c?.score ?? "").trim();
                    const line = [name, institution].filter(Boolean).join(" · ");
                    const meta = [level, completionDate, score ? `${scoreType || "Score"}: ${score}` : ""].filter(Boolean).join(" · ");
                    if (!line && !meta) return null;
                    return (
                      <div key={String(c?.id ?? idx)} className="text-sm text-slate-700">
                        {line ? <div className="font-medium text-slate-800">{line}</div> : null}
                        {meta ? <div className="text-xs text-slate-600 mt-0.5">{meta}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {certifications.length > 0 ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Certifications</h2>
                <div className="space-y-3">
                  {certifications.map((c, idx: number) => {
                    return (
                      <div key={String(c.key ?? idx)} className="text-sm text-slate-700">
                        {c.line ? <div className="font-medium text-slate-800">{c.line}</div> : null}
                        {c.period ? <div className="text-xs text-slate-600 mt-0.5">{c.period}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {/* Experience */}
            {intern.experienceItems.length > 0 ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Experience & Projects</h2>
                <div className="space-y-4">
                  {intern.experienceItems.map((item) => {
                    const title = [item.role, item.company].filter(Boolean).join(" @ ");
                    const period = [item.from, item.to].filter(Boolean).join(" - ");
                    return (
                      <div key={item.id} className="text-sm text-slate-700">
                        <div className="font-medium text-slate-800">{title || "Experience"}</div>
                        {(period || item.location) ? (
                          <div className="text-xs text-slate-600 mt-0.5">
                            {[period, item.location].filter(Boolean).join(" · ")}
                          </div>
                        ) : null}
                        {item.description ? (
                          <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            {intern.extracurricular.length > 0 ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Extra-Curricular Activities</h2>
                <div className="space-y-1.5 text-sm text-slate-700">
                  {intern.extracurricular.map((act, idx) => (
                    <div key={`${act.activity}-${idx}`}>
                      {act.activity} {act.level ? `(${act.level})` : ""}
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>

          {/* Right column: preferences / languages */}
          <div className="space-y-4 md:space-y-6 mt-4">
            {/* Location & work preferences */}
            <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
              <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-3">Location & Work Preferences</h2>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <Globe className="w-4 h-4 mt-0.5 text-emerald-500" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Preferred work mode</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {intern.preferences.locationTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="text-xs px-2 py-1 rounded-full border-slate-200 bg-slate-50"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {preferredLocationsDisplay.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-red-400" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Preferred locations</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {preferredLocationsDisplay.join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Laptop className="w-4 h-4 mt-0.5 text-emerald-500" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Device</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {intern.preferences.hasLaptop ? "Has personal laptop" : "Doesn't have a laptop, will require laptop/desktop to work"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Languages */}
            {intern.languages.length > 0 ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <h2 className="text-sm md:text-base font-semibold text-slate-900 mb-2">Languages</h2>
                <ul className="space-y-1 text-sm text-slate-700">
                  {intern.languages.map((lang) => (
                    <li key={lang}>{lang}</li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {(aiInterviewLinks?.feedbackLink || aiInterviewLinks?.recordingLink || aiInterviewLinks?.meetingLink) ? (
              <Card className="p-4 md:p-5 bg-white/90 rounded-2xl">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm md:text-base font-semibold text-slate-900">AI Interview Results</h2>
                  {aiInterviewLinks?.status ? (
                    <Badge variant="outline" className="text-[11px] border-slate-200 bg-slate-50 text-slate-700">
                      {aiInterviewLinks.status}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {aiInterviewLinks?.feedbackLink ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => window.open(String(aiInterviewLinks.feedbackLink), "_blank")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View feedback report
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
