import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { ArrowLeft, Users, Sparkles, Star, MapPin, ShoppingCart, ExternalLink, X, Hand, Search, Receipt } from "lucide-react";
import findternLogo from "@assets/logo.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getEmployerAuth } from "@/lib/employerAuth";
import skillsData from "@/data/skills.json";
import { fetchPricingPlans, formatCurrencyMinor, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";

type AiRatings = {
  communication: number;
  coding: number | null;
  aptitude: number;
  interview: number;
};

type CompareCandidate = {
  id: string;
  initials: string;
  title: string;
  profilePhotoUrl: string | null;
  hasProfile: boolean;
  location: string;
  findternScore: number;
  matchPercentage: number;
  experience?: string;
  education?: string;
  availability?: string;
  stipend?: string;
  skills: string[];
  aiRatings: AiRatings;
};

type ExtendedCompareCandidate = CompareCandidate & {
  strongMatchSkills: string[];
  computedMatchPercentage: number;
};

type ProposalMeta = {
  status: string;
  proposalId: string;
  projectId?: string;
  ts: number;
};

export default function EmployerComparePage() {
  const [currentLocation, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<CompareCandidate[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [acceptedInternIds, setAcceptedInternIds] = useState<Set<string>>(new Set());
  const [proposalMetaByInternId, setProposalMetaByInternId] = useState<Record<string, ProposalMeta>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [roleSkills, setRoleSkills] = useState<string[]>([]);
  const [roleSkillSearch, setRoleSkillSearch] = useState("");
  const [isRoleSkillDropdownOpen, setIsRoleSkillDropdownOpen] = useState(false);
  const roleSkillDropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const getSelectedSkillsStorageKey = (projectId: string | null | undefined) => {
    const pid = String(projectId ?? "").trim();
    return pid ? `employerSelectedSkills:${pid}` : "employerSelectedSkills";
  };
  const getCompareStorageKey = (projectId: string | null | undefined) => {
    const pid = String(projectId ?? "").trim();
    return pid ? `employerCompareIds:${pid}` : "employerCompareIds";
  };

  const readCurrentProjectId = () => {
    try {
      return String(window.localStorage.getItem(selectedProjectIdStorageKey) ?? "").trim();
    } catch {
      return "";
    }
  };

  const auth = getEmployerAuth();
  const employerId = auth?.id as string | undefined;

  const [companyCountry, setCompanyCountry] = useState<string>("");

  const viewerIsIndia = useMemo(() => {
    try {
      const cc = String(companyCountry ?? "").trim().toLowerCase();
      if (cc) {
        if (cc === "india" || cc === "in" || cc.includes("india")) return true;
        return false;
      }
    } catch {
      // ignore
    }

    return false;
  }, [companyCountry]);

  const expectedCurrency = viewerIsIndia ? "INR" : "USD";
  const [pricingPlans, setPricingPlans] = useState<CmsPlan[]>([]);

  useEffect(() => {
    if (!employerId) return;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(String(employerId))}`);
        const json = await res.json().catch(() => null);
        const employer = json?.employer as any;
        setCompanyCountry(String(employer?.country ?? ""));
      } catch {
        setCompanyCountry("");
      }
    })();
  }, [employerId]);

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
  const getEmployerCartStorageKey = (id: string | undefined, projectId: string | null | undefined) => {
    const e = String(id ?? "").trim();
    const p = String(projectId ?? "").trim();
    if (!e || !p) return "";
    return `employerCartIds:${e}:${p}`;
  };

  const allSkills = useMemo(
    () => (skillsData as unknown as string[]).slice().sort((a, b) => a.localeCompare(b)),
    [],
  );

  const normalizedRoleSkills = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of Array.isArray(roleSkills) ? roleSkills : []) {
      const v = String(s ?? "").trim();
      if (!v) continue;
      const k = v.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
    return out;
  }, [roleSkills]);

  const roleSkillLowerSet = useMemo(() => {
    return new Set(normalizedRoleSkills.map((s) => s.toLowerCase()));
  }, [normalizedRoleSkills]);

  const filteredRoleSkillOptions = useMemo(() => {
    const lowerSelected = normalizedRoleSkills.map((s) => s.toLowerCase());
    const pool = allSkills.filter((s) => !lowerSelected.includes(s.toLowerCase()));
    if (!roleSkillSearch.trim()) return pool;
    const q = roleSkillSearch.toLowerCase();
    return pool.filter((s) => s.toLowerCase().includes(q));
  }, [allSkills, normalizedRoleSkills, roleSkillSearch]);

  useEffect(() => {
    if (!isRoleSkillDropdownOpen) return;

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const root = roleSkillDropdownRef.current;
      if (!root) return;
      if (root.contains(target)) return;
      setIsRoleSkillDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isRoleSkillDropdownOpen]);

  const getStrongMatchSkills = (candidateSkills: string[]) => {
    const list = Array.isArray(candidateSkills) ? candidateSkills : [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of list) {
      const v = String(s ?? "").trim();
      if (!v) continue;
      const k = v.toLowerCase();
      if (!roleSkillLowerSet.has(k)) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
    return out;
  };

  const getFindternScoreBucketLabel = (findternScore: number) => {
    const score = Number(findternScore);
    if (!Number.isFinite(score)) return "Less than 6/10";
    if (score >= 8) return "8+/10 (Top Rated)";
    if (score >= 6) return "6-8/10";
    return "Less than 6/10";
  };

  const getCandidateHourlyPriceLabel = (findternScore: number) => {
    const score = Number(findternScore ?? 0);
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return "Free";
      return `${formatCurrencyMinor(minor, resolved.currency)}/hr`;
    }

    if (!Number.isFinite(score) || score < 6) return "Free";
    if (score < 8) return expectedCurrency === "INR" ? "₹100/hr" : "$1/hr";
    return expectedCurrency === "INR" ? "₹200/hr" : "$2/hr";
  };

  const getExpectedStipendLabel = (findternScore: number) => {
    const score = Number.isFinite(findternScore) ? findternScore : 0;
    if (viewerIsIndia) {
      if (score >= 9) return "₹15,000 / month";
      if (score >= 8) return "₹12,000 / month";
      if (score >= 7) return "₹10,000 / month";
      if (score >= 6) return "₹8,000 / month";
      if (score >= 5) return "₹6,000 / month";
      if (score >= 4) return "₹5,000 / month";
      if (score >= 3) return "₹4,000 / month";
      return "₹3,000 / month";
    }

    if (score >= 9) return "$180 / month";
    if (score >= 8) return "$150 / month";
    if (score >= 7) return "$120 / month";
    if (score >= 6) return "$100 / month";
    if (score >= 5) return "$80 / month";
    if (score >= 4) return "$65 / month";
    if (score >= 3) return "$50 / month";
    return "$40 / month";
  };

  const getCandidateDisplayName = (candidate: Pick<CompareCandidate, "id" | "title" | "initials">) => {
    if (acceptedInternIds.has(candidate.id)) return candidate.title;
    return candidate.initials;
  };

  useEffect(() => {
    try {
      const projectId = readCurrentProjectId();
      if (!projectId) {
        setCompareIds([]);
        return;
      }
      const storedRaw = window.localStorage.getItem(getCompareStorageKey(projectId));
      const stored: string[] = storedRaw ? JSON.parse(storedRaw) : [];
      setCompareIds(Array.isArray(stored) ? stored.slice(0, 5) : []);
    } catch {
      setCompareIds([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const projectId = readCurrentProjectId();

      const storedSkills = (() => {
        try {
          if (!projectId) return [];
          const raw = window.localStorage.getItem(getSelectedSkillsStorageKey(projectId));
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      const normalizedStored: string[] = storedSkills
        .map((s: any) => String(s ?? "").trim())
        .filter((s: string) => s.length > 0);

      if (normalizedStored.length > 0) {
        setRoleSkills(normalizedStored);
        return;
      }

      if (!employerId || !projectId) return;

      try {
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(String(employerId))}/projects`);
        const json = await res.json().catch(() => null);
        const projects = (json?.projects ?? []) as any[];
        const match = projects.find((p) => String(p?.id ?? "") === String(projectId));
        const skillsRaw = Array.isArray(match?.skills) ? match.skills : [];
        const skills: string[] = skillsRaw
          .map((s: any) => (typeof s === "string" ? s : typeof s?.name === "string" ? s.name : ""))
          .map((s: string) => String(s ?? "").trim())
          .filter((s: string) => s.length > 0);
        if (skills.length > 0) setRoleSkills(skills);
      } catch {
        
      }
    })();
  }, [employerId]);

  // Load existing cart ids from localStorage
  useEffect(() => {
    void (async () => {
      try {
        const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
        if (!employerId || !String(projectId ?? "").trim()) {
          setCartIds([]);
          return;
        }

        let cartIds: string[] = [];
        let checkoutIds: string[] = [];
        try {
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
          );
          const json = await res.json().catch(() => null);
          cartIds = Array.isArray(json?.cartIds) ? json.cartIds.map((v: any) => String(v).trim()).filter(Boolean) : [];
          checkoutIds = Array.isArray(json?.checkoutIds)
            ? json.checkoutIds.map((v: any) => String(v).trim()).filter(Boolean)
            : [];
        } catch {
          cartIds = [];
          checkoutIds = [];
        }

        const shouldTryMigrate = cartIds.length === 0 && checkoutIds.length === 0;
        if (shouldTryMigrate) {
          try {
            const scopedKey = getEmployerCartStorageKey(employerId, projectId);
            const legacyRaw = scopedKey ? window.localStorage.getItem(scopedKey) : null;
            const legacyParsed = legacyRaw ? JSON.parse(legacyRaw) : [];
            const legacyIds = Array.isArray(legacyParsed)
              ? legacyParsed.map((v) => String(v).trim()).filter(Boolean)
              : [];
            if (legacyIds.length > 0) {
              await apiRequest("POST", `/api/employer/${encodeURIComponent(String(employerId))}/cart/sync`, {
                projectId,
                cartIds: legacyIds,
                checkoutIds: [],
              });
              cartIds = legacyIds;
              if (scopedKey) window.localStorage.removeItem(scopedKey);
            }
          } catch {
            // ignore
          }
        }

        setCartIds(cartIds);
      } catch {
        setCartIds([]);
      }
    })();
  }, [employerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      void (async () => {
        try {
          const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          if (!employerId || !String(projectId ?? "").trim()) {
            setCartIds([]);
            return;
          }
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
          );
          const json = await res.json().catch(() => null);
          const ids = Array.isArray(json?.cartIds) ? json.cartIds.map((v: any) => String(v).trim()).filter(Boolean) : [];
          setCartIds(ids);
        } catch {
          setCartIds([]);
        }
      })();
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
  }, [employerId]);

  useEffect(() => {
    (async () => {
      try {
        if (!employerId) return;

        const res = await fetch(`/api/employer/${employerId}/proposals`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.proposals ?? []) as any[];
        const accepted = new Set<string>();
        const nextMetaById: Record<string, ProposalMeta> = {};
        for (const p of list) {
          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (internId) {
            const rawTime = p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? null;
            const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
            const ts = Number.isFinite(parsed) ? parsed : 0;

            const status = String(p?.status ?? "sent").trim();
            const statusLower = status.toLowerCase();
            if (statusLower !== "rejected") {
              const proposalId = String(p?.id ?? "").trim();
              const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
              const prev = nextMetaById[internId];
              if (proposalId && (!prev || ts >= (prev.ts ?? 0))) {
                nextMetaById[internId] = {
                  status: status || "sent",
                  proposalId,
                  projectId: projectId || undefined,
                  ts,
                };
              }
            }
          }
          if (Boolean(p?.isNameUnlocked)) {
            if (internId) accepted.add(internId);
          }
          if (String(p?.status ?? "").trim().toLowerCase() === "hired") {
            if (internId) accepted.add(internId);
          }
        }
        setAcceptedInternIds(accepted);
        setProposalMetaByInternId(nextMetaById);
      } catch {
        return;
      }
    })();
  }, [employerId]);

  const handleAddToCart = (candidateId: string) => {
    const meta = proposalMetaByInternId[String(candidateId ?? "").trim()];
    const statusLower = String(meta?.status ?? "").trim().toLowerCase();
    const proposalId = String(meta?.proposalId ?? "").trim();
    if (statusLower && statusLower !== "rejected" && statusLower !== "expired" && statusLower !== "withdrawn") {
      toast({
        title: "Proposal already exists",
        description: "You already have a proposal for this intern. Redirecting you to the latest proposal.",
      });
      if (proposalId) setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`);
      return;
    }
    if (statusLower === "hired") {
      toast({
        title: "Already hired",
        description: "This candidate is already hired for your selected project.",
        variant: "destructive",
      });
      return;
    }

    setCartIds((prev) => {
      if (prev.includes(candidateId)) return prev;
      const updated = [...prev, candidateId];
      void (async () => {
        try {
          const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          if (!employerId || !String(projectId ?? "").trim()) return;
          await apiRequest("POST", `/api/employer/${encodeURIComponent(String(employerId))}/cart/items`, {
            projectId,
            listType: "cart",
            internId: String(candidateId),
          });
        } catch {
          // ignore
        }
      })();
      window.dispatchEvent(new Event("employerCartUpdated"));
      toast({
        title: "Candidate added",
        description: "Intern has been added to your cart.",
      });
      return updated;
    });
  };

  const persistCompareIds = (next: string[]) => {
    const capped = next.slice(0, 5);
    setCompareIds(capped);
    try {
      const projectId = readCurrentProjectId();
      if (!projectId) return;
      window.localStorage.setItem(getCompareStorageKey(projectId), JSON.stringify(capped));
    } catch (e) {
      console.error("Failed to persist employerCompareIds", e);
    }
  };

  const removeFromCompare = (candidateId: string) => {
    persistCompareIds(compareIds.filter((id) => id !== candidateId));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncCompare = () => {
      try {
        const projectId = readCurrentProjectId();
        if (!projectId) {
          setCompareIds([]);
          return;
        }
        const storedRaw = window.localStorage.getItem(getCompareStorageKey(projectId));
        const stored: string[] = storedRaw ? JSON.parse(storedRaw) : [];
        setCompareIds(Array.isArray(stored) ? stored.slice(0, 5) : []);
      } catch {
        setCompareIds([]);
      }
    };

    syncCompare();
    window.addEventListener("employerCompareUpdated", syncCompare);
    window.addEventListener("employerProjectChanged", syncCompare);
    window.addEventListener("storage", syncCompare);
    window.addEventListener("focus", syncCompare);
    return () => {
      window.removeEventListener("employerCompareUpdated", syncCompare);
      window.removeEventListener("employerProjectChanged", syncCompare);
      window.removeEventListener("storage", syncCompare);
      window.removeEventListener("focus", syncCompare);
    };
  }, []);

  useEffect(() => {
    const hiredIds = new Set<string>();
    for (const [internId, meta] of Object.entries(proposalMetaByInternId)) {
      if (String(meta?.status ?? "").trim().toLowerCase() === "hired") {
        const key = String(internId ?? "").trim();
        if (key) hiredIds.add(key);
      }
    }

    if (hiredIds.size === 0) return;
    if (compareIds.length === 0) return;

    const next = compareIds.filter((id) => !hiredIds.has(String(id ?? "").trim()));
    if (next.length === compareIds.length) return;
    persistCompareIds(next);
  }, [compareIds, proposalMetaByInternId]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, candidateId: string) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-no-drag="true"]')) {
      e.preventDefault();
      return;
    }

    setDraggingId(candidateId);
    setDragOverId(candidateId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", candidateId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, candidateId: string) => {
    e.preventDefault();
    if (candidateId !== dragOverId) setDragOverId(candidateId);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, overCandidateId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggingId;
    if (!sourceId || sourceId === overCandidateId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = compareIds.indexOf(sourceId);
    const toIndex = compareIds.indexOf(overCandidateId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const next = [...compareIds];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, sourceId);
    persistCompareIds(next);
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // Fetch interns and map to compare candidates
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!employerId) {
          setCandidates([]);
          return;
        }

        const projectId = (() => {
          try {
            return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          } catch {
            return "";
          }
        })();

        if (!projectId) {
          setCandidates([]);
          return;
        }
        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`,
        );
        const json = await response.json();
        const list = (json?.interns || []) as any[];

        const mapped: CompareCandidate[] = list.map((item) => {
          const onboarding = item.onboarding ?? {};
          const user = item.user ?? {};
          const documents = item.documents ?? null;

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
          const userFirst = user.firstName ?? "";
          const userLast = user.lastName ?? "";
          const fullFromUser = `${userFirst} ${userLast}`.trim();
          const title = onboarding.extraData?.fullName || onboarding.extraData?.name || fullFromUser || "Intern";
          const initials = (title || "I")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p: string) => p[0]?.toUpperCase() ?? "")
            .join("") || "IN";

          const extra = onboarding.extraData ?? {};
          const ratings = extra.ratings ?? {};

          const hasCodingRating = Object.prototype.hasOwnProperty.call(ratings, "coding");
          const codingRaw = (ratings as any)?.coding;
          const codingRating = (() => {
            if (!hasCodingRating) return null;
            const n = Number(codingRaw);
            return Number.isFinite(n) ? n : null;
          })();

          const profilePhotoName = String((documents as any)?.profilePhotoName ?? "").trim();
          const profilePhotoUrl = profilePhotoName
            ? `/uploads/${encodeURIComponent(profilePhotoName)}`
            : null;

          return {
            id: user.id ?? onboarding.userId ?? onboarding.id ?? "",
            initials,
            title,
            profilePhotoUrl,
            hasProfile: Boolean(profilePhotoUrl),
            location: locationParts || "",
            findternScore: extra.findternScore ?? 0,
            matchPercentage: extra.matchPercentage ?? 0,
            experience: extra.experience,
            education: extra.education,
            availability: extra.availability,
            stipend: extra.stipend,
            skills,
            aiRatings: {
              communication: ratings.communication ?? 0,
              coding: codingRating,
              aptitude: ratings.aptitude ?? 0,
              interview: ratings.interview ?? 0,
            },
          };
        });

        setCandidates(mapped);
      } catch (error) {
        console.error("Failed to load interns for compare page", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employerId]);

  useEffect(() => {
    if (candidates.length === 0) return;
    if (compareIds.length === 0) return;
    const allowed = new Set(candidates.map((c) => String(c.id ?? "").trim()).filter(Boolean));
    const next = compareIds.filter((id) => allowed.has(String(id ?? "").trim()));
    if (next.length === compareIds.length) return;
    persistCompareIds(next);
  }, [candidates, compareIds]);

  const selectedCandidates = useMemo((): ExtendedCompareCandidate[] => {
    const byId = new Map(candidates.map((c) => [c.id, c] as const));
    const list = compareIds
      .map((id) => byId.get(id))
      .filter((c): c is CompareCandidate => Boolean(c))
      .slice(0, 5);
    return list.map((candidate) => {
      const strongMatchSkills = getStrongMatchSkills(candidate.skills);
      const computedMatchPercentage = normalizedRoleSkills.length
        ? Math.round((strongMatchSkills.length / normalizedRoleSkills.length) * 100)
        : Number(candidate.matchPercentage ?? 0);
      return {
        ...candidate,
        strongMatchSkills,
        computedMatchPercentage,
      };
    });
  }, [candidates, compareIds, normalizedRoleSkills.length, roleSkillLowerSet]);

  const topMatchId = selectedCandidates.length
    ? selectedCandidates.reduce((best, current) =>
        current.computedMatchPercentage > best.computedMatchPercentage ? current : best,
      selectedCandidates[0]).id
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-2 md:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setLocation("/employer/dashboard")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <button
              type="button"
              className="flex items-center gap-2"
              onClick={() => setLocation("/employer/dashboard")}
              aria-label="Go to Employer Dashboard"
            >
              <img src={findternLogo} alt="Findtern" className="inner_logo__img"  />
              {/* <div className="hidden sm:block">
                <span className="text-lg font-bold text-emerald-700">FINDTERN</span>
                <span className="text-xs text-slate-400 ml-1.5">INTERNSHIP SIMPLIFIED</span>
              </div> */}
            </button>
          </div>

          {/* <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span>Employer</span>
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-700">Compare Profiles</span>
          </div> */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <Card className="border-0 shadow-lg rounded-3xl bg-white/90 p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Role skills</div>
              <div className="mt-1 text-xs text-slate-500">Used to calculate strong match skills</div>
            </div>

            <div ref={roleSkillDropdownRef} className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={roleSkillSearch}
                onChange={(e) => {
                  setRoleSkillSearch(e.target.value);
                  setIsRoleSkillDropdownOpen(true);
                }}
                placeholder="Search & add skills..."
                className="h-9 rounded-full pl-9"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const v = roleSkillSearch.trim();
                  if (!v) return;
                  if (filteredRoleSkillOptions.length > 0) return;
                  e.preventDefault();
                  const key = v.toLowerCase();
                  if (roleSkillLowerSet.has(key)) return;
                  setRoleSkills((prev) => [...prev, v]);
                  setRoleSkillSearch("");
                  setIsRoleSkillDropdownOpen(false);
                  try {
                    const projectId = readCurrentProjectId();
                    if (!projectId) return;
                    window.localStorage.setItem(
                      getSelectedSkillsStorageKey(projectId),
                      JSON.stringify([...normalizedRoleSkills, v]),
                    );
                  } catch {

                  }
                }}
                onFocus={() => setIsRoleSkillDropdownOpen(true)}
              />
              {isRoleSkillDropdownOpen && (roleSkillSearch || filteredRoleSkillOptions.length > 0) && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto ring-1 ring-slate-900/5">
                  {filteredRoleSkillOptions.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        const v = String(skill ?? "").trim();
                        if (!v) return;
                        const key = v.toLowerCase();
                        if (roleSkillLowerSet.has(key)) return;
                        setRoleSkills((prev) => [...prev, v]);
                        setRoleSkillSearch("");
                        setIsRoleSkillDropdownOpen(false);
                        try {
                          const projectId = readCurrentProjectId();
                          if (!projectId) return;
                          window.localStorage.setItem(
                            getSelectedSkillsStorageKey(projectId),
                            JSON.stringify([...normalizedRoleSkills, v]),
                          );
                        } catch {

                        }
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {skill}
                    </button>
                  ))}
                  {filteredRoleSkillOptions.length === 0 && (
                    roleSkillSearch.trim() ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const v = roleSkillSearch.trim();
                          if (!v) return;
                          const key = v.toLowerCase();
                          if (roleSkillLowerSet.has(key)) return;
                          setRoleSkills((prev) => [...prev, v]);
                          setRoleSkillSearch("");
                          setIsRoleSkillDropdownOpen(false);
                          try {
                            const projectId = readCurrentProjectId();
                            if (!projectId) return;
                            window.localStorage.setItem(
                              getSelectedSkillsStorageKey(projectId),
                              JSON.stringify([...normalizedRoleSkills, v]),
                            );
                          } catch {

                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        Add "{roleSkillSearch.trim()}"
                        <span className="ml-2 text-xs text-slate-500">(Press Enter)</span>
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-xs text-slate-500">No skills found. Try another keyword.</div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {normalizedRoleSkills.length === 0 ? (
              <span className="text-xs text-slate-500">No role skills selected yet.</span>
            ) : (
              normalizedRoleSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-xs bg-emerald-50 border-emerald-200 text-emerald-700"
                >
                  <span className="mr-2">{skill}</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center"
                    onClick={() => {
                      const key = skill.toLowerCase();
                      const next = normalizedRoleSkills.filter((s) => s.toLowerCase() !== key);
                      setRoleSkills(next);
                      try {
                        const projectId = readCurrentProjectId();
                        if (!projectId) return;
                        window.localStorage.setItem(getSelectedSkillsStorageKey(projectId), JSON.stringify(next));
                      } catch {

                      }
                    }}
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </Card>

        {/* Page Title */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                Compare Profiles
              
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Side-by-side view of shortlisted candidates you selected from the dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Area - dynamic side-by-side layout */}
        <Card className="p-4 md:p-6 border-0 shadow-lg rounded-3xl bg-white/90">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>
                {selectedCandidates.length > 0
                  ? `Comparing ${selectedCandidates.length} profile${selectedCandidates.length > 1 ? "s" : ""}`
                  : "No profiles selected for comparison yet"}
              </span>
            </div>
            <Badge variant="outline" className="hidden md:inline-flex rounded-full text-xs px-3 py-1 border-emerald-200 text-emerald-700 bg-emerald-50">
              Up to 5 profiles can be compared in production
            </Badge>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[720px] grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {selectedCandidates.map((candidate) => {
                const isTopMatch = topMatchId && candidate.id === topMatchId;
                const meta = proposalMetaByInternId[String(candidate.id ?? "").trim()];
                const statusLower = String(meta?.status ?? "").trim().toLowerCase();
                const isHired = statusLower === "hired";
                const isInCart = cartIds.includes(String(candidate.id ?? ""));
                const proposalId = String(meta?.proposalId ?? "").trim();
                const hasAnyProposalSent =
                  statusLower.length > 0 &&
                  statusLower !== "rejected" &&
                  statusLower !== "expired" &&
                  statusLower !== "withdrawn";
                const strongMatchSkills = candidate.strongMatchSkills;
                const strongMatchLower = new Set(strongMatchSkills.map((s) => s.toLowerCase()));
                const orderedSkills = (Array.isArray(candidate.skills) ? candidate.skills : [])
                  .map((skill, idx) => {
                    const normalized = String(skill ?? "").trim().toLowerCase();
                    return {
                      skill,
                      idx,
                      isStrongMatch: normalized ? strongMatchLower.has(normalized) : false,
                    };
                  })
                  .sort((a, b) => {
                    if (a.isStrongMatch === b.isStrongMatch) return a.idx - b.idx;
                    return a.isStrongMatch ? -1 : 1;
                  })
                  .map((item) => item.skill);
                return (
                <div
                  key={candidate.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, candidate.id)}
                  onDragOver={(e) => handleDragOver(e, candidate.id)}
                  onDrop={(e) => handleDrop(e, candidate.id)}
                  onDragEnd={handleDragEnd}
                  className={`relative rounded-2xl border bg-gradient-to-b from-slate-50/80 to-white transition-all flex flex-col ${
                    isTopMatch
                      ? "border-emerald-300 shadow-md"
                      : "border-slate-100 shadow-md"
                  } ${
                    draggingId === candidate.id
                      ? "opacity-70"
                      : dragOverId === candidate.id && draggingId
                      ? "ring-2 ring-emerald-300"
                      : ""
                  } group cursor-grab active:cursor-grabbing`}
                >
                  <div
                    className="pointer-events-none absolute left-1/2 top-2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm"
                    title="Drag & drop to reorder"
                  >
                    <Hand className="h-3 w-3" />
                    <span className="hidden sm:inline">Drag to reorder</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -right-0 -top-0 z-10 h-6 w-6 rounded-full text-red"
                    onClick={() => removeFromCompare(candidate.id)}
                    aria-label="Remove from compare"
                    data-no-drag="true"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                  {/* Header */}
                  <div className="pt-10 px-4 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center text-lg font-bold bg-slate-100 text-slate-700">
                        {candidate.hasProfile ? (
                          <>
                            <div
                              className="absolute inset-0 hidden items-center justify-center"
                              data-fallback="true"
                            >
                              <span>{candidate.initials}</span>
                            </div>
                            <img
                              src={candidate.profilePhotoUrl ?? ""}
                              alt={candidate.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.classList.add("hidden");
                                const parent = e.currentTarget.parentElement;
                                const fallback = parent?.querySelector('[data-fallback="true"]') as HTMLElement | null;
                                fallback?.classList.remove("hidden");
                                fallback?.classList.add("flex");
                              }}
                            />
                          </>
                        ) : (
                          <span>{candidate.initials}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {getCandidateDisplayName(candidate)}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-red-400" />
                          {(() => {
                            const raw = String((candidate as any)?.location ?? "").trim();
                            if (!raw) return "-";
                            const first = raw.split(",")[0]?.trim();
                            return first || raw;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        {/* <Star className="h-4 w-4 text-amber-500" /> */}
                        <span className="font-semibold">Findtern Score</span>
                        <span className="text-slate-300">|</span>
                        <span>{Number.isFinite(candidate.findternScore) ? candidate.findternScore.toFixed(1) : "0.0"}</span>
                      </div>
                      <div className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                          {getCandidateHourlyPriceLabel(candidate.findternScore)}
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                        {candidate.computedMatchPercentage}% role match
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 px-4 pt-4 text-xs">
                    {/* <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-slate-100 mt-1"> */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-full text-emerald-700 hover:bg-emerald-50 text-[11px] font-medium"
                      onClick={() =>
                        setLocation(
                          `/employer/intern/${candidate.id}?from=compare&returnTo=${encodeURIComponent(currentLocation)}`,
                        )
                      }
                      data-no-drag="true"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 rounded-full border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 text-[11px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isHired ? false : isInCart && !hasAnyProposalSent}
                      onClick={() => {
                        if (isHired) {
                          setLocation("/employer/orders");
                          return;
                        }
                        if (hasAnyProposalSent && proposalId) {
                          setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`);
                          return;
                        }
                        handleAddToCart(candidate.id);
                      }}
                      data-no-drag="true"
                    >
                      {isHired ? (
                        <Receipt className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                      )}
                      {isHired
                        ? "Send full-time offer"
                        : hasAnyProposalSent
                        ? "View Sent Proposal"
                        : isInCart
                        ? "Added"
                        : "Add to Cart"}
                    </Button>
                  {/* </div> */}
                  </div>

                  {/* Skills */}
                  <div className="px-4 pt-4">
                    <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1.5">
                      <Star className="w-3 h-3 text-amber-400" />
                      Skills overview
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {orderedSkills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 rounded-full border-slate-200 ${
                            strongMatchLower.has(String(skill ?? "").trim().toLowerCase())
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      {strongMatchSkills.length} strong match skill
                      {strongMatchSkills.length > 1 ? "s" : ""} for this role
                    </p>
                  </div>

                  {/* AI Ratings */}
                  <div className="px-4 pt-4 pb-3 mt-2 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-700 mb-2">
                      AI interview ratings (out of 10)
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span>Communication</span>
                        <span className="font-semibold text-emerald-700">{candidate.aiRatings.communication}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span>Coding</span>
                        <span className="font-semibold text-emerald-700">{candidate.aiRatings.coding ?? "NA"}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span>Aptitude</span>
                        <span className="font-semibold text-emerald-700">{candidate.aiRatings.aptitude}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span>Overall interview</span>
                        <span className="font-semibold text-emerald-700">{candidate.aiRatings.interview}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions - static for now */}
                  
                </div>
              );
            })}
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[11px] md:text-xs text-slate-500 text-center md:text-left">
              Profiles you select from the dashboard appear here for side-by-side comparison.
            </p>
            <Button
              variant="outline"
              className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-9 px-4 text-xs md:text-sm"
              onClick={() => setLocation("/employer/dashboard")}
            >
              Back to candidates
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
