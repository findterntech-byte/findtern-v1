import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { getEmployerAuth, inferEmployerIsIndia } from "@/lib/employerAuth";
import { queryClient } from "@/lib/queryClient";
import { fetchPricingPlans, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import {
  addDaysToDateString,
  fetchTimeApiZoneInfo,
  formatTimeRangeInTimeZone,
  getIanaTimezonesCached,
  parseDateTimeInTimeZoneToUtc,
  type TimeZoneOption,
} from "@/lib/timezone";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import cityStatePincode from "@/data/cityStatePincode.json";
import { timezones } from "@shared/schema";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthsFromDuration(duration: string | undefined) {
  switch (String(duration ?? "").toLowerCase()) {
    case "2m":
      return 2;
    case "3m":
      return 3;
    case "6m":
      return 6;
    default:
      return 1;
  }
}

function isProposalJdEmpty(html: string) {
  const text = String(html ?? "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text.length === 0;
}

function stripHtmlToText(html: string) {
  return String(html ?? "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatLocalDateInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeDateInput(raw: string) {
  const value = String(raw ?? "");
  const valid = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (valid) return value;
  const overflow = value.match(/^(\d{4})\d+-(\d{2})-(\d{2})$/);
  if (overflow) return `${overflow[1]}-${overflow[2]}-${overflow[3]}`;
  return value;
}

function getIndiaStateLowerSetFromCityStatePincode() {
  const raw: any = cityStatePincode as any;
  const districts: any[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.districts)
      ? raw.districts
      : [];

  const out = new Set<string>();
  for (const d of districts) {
    const stateLower = String(d?.state ?? "").trim().toLowerCase();
    if (stateLower) out.add(stateLower);
  }
  return out;
}

function getCandidateRegion(indiaStateLowerSet: Set<string>, candidate: { state?: string; location?: string }) {
  const stateLower = String(candidate.state ?? "").trim().toLowerCase();
  if (stateLower && indiaStateLowerSet.has(stateLower)) return "IN" as const;

  const locationLower = String(candidate.location ?? "").trim().toLowerCase();
  if (locationLower.includes(", india") || locationLower.endsWith(" india")) return "IN" as const;

  return "INTL" as const;
}

function getCandidateHourlyRate(
  indiaStateLowerSet: Set<string>,
  candidate: { findternScore?: number; state?: string; location?: string },
  expectedCurrency: "INR" | "USD",
  pricingPlans: CmsPlan[],
) {
  const score = Number(candidate.findternScore ?? 0);
  const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency });
  if (resolved && String(resolved.currency ?? "").trim().toUpperCase() === expectedCurrency) {
    const minor = Number(resolved.priceHourlyMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return 0;
    return minor / 100;
  }
  const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
  if (tier === "low") return 0;
  if (expectedCurrency === "INR") return tier === "mid" ? 100 : 200;
  return tier === "mid" ? 1 : 2;
}

function getCandidatePerHireChargeAmount(
  indiaStateLowerSet: Set<string>,
  candidate: { findternScore?: number; state?: string; location?: string },
  expectedCurrency: "INR" | "USD",
  pricingPlans: CmsPlan[],
) {
  const score = Number(candidate.findternScore ?? 0);
  const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
  if (tier !== "low") return 0;
  const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency });
  if (resolved && String(resolved.currency ?? "").trim().toUpperCase() === expectedCurrency) {
    const minor = Number(resolved.perHireChargeMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return 0;
    return minor / 100;
  }
  return expectedCurrency === "INR" ? 5000 : 50;
}

function normalizeProjectMode(value: unknown) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "";
  if (v === "remote" || v === "hybrid" || v === "onsite") return v;
  if (v.includes("remote")) return "remote";
  if (v.includes("hybrid")) return "hybrid";
  if (v.includes("on") && v.includes("site")) return "onsite";
  return "";
}

export default function EmployerSendProposalPage() {
  const [currentLocation, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/employer/intern/:id/proposal");
  const internId = String(params?.id ?? "").trim();

  const { toast } = useToast();
  const auth = getEmployerAuth();
  const employerId = auth?.id ?? null;

  const viewerIsIndia = inferEmployerIsIndia(auth);
  const expectedCurrency: "INR" | "USD" = viewerIsIndia ? "INR" : "USD";
  const [proposalCurrency, setProposalCurrency] = useState<"INR" | "USD">(expectedCurrency);

  const [pricingPlans, setPricingPlans] = useState<CmsPlan[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plans = viewerIsIndia
        ? await Promise.all([fetchPricingPlans({ country: "IN" }), fetchPricingPlans({ country: "" })]).then((parts) =>
            parts.flat(),
          )
        : await fetchPricingPlans({ country: "" });

      if (cancelled) return;
      const uniqKey = (p: CmsPlan) => {
        const slug = String(p?.slug ?? p?.name ?? "").trim().toLowerCase();
        const cur = String(p?.currency ?? "").trim().toUpperCase();
        return `${slug}__${cur}`;
      };
      const seen = new Set<string>();
      const merged: CmsPlan[] = [];
      for (const p of Array.isArray(plans) ? plans : []) {
        const k = uniqKey(p);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        merged.push(p);
      }
      setPricingPlans(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerIsIndia]);

  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const readSelectedProjectId = () => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
    } catch {
      return "";
    }
  };

  const [projectId, setProjectId] = useState<string>(() => readSelectedProjectId());
  const [projectLocked, setProjectLocked] = useState(false);

  const fromCompare = (() => {
    const query = String(currentLocation ?? "").split("?")[1] ?? "";
    const from = new URLSearchParams(query).get("from");
    return from === "compare";
  })();

  const returnTo = (() => {
    const query = String(currentLocation ?? "").split("?")[1] ?? "";
    const raw = new URLSearchParams(query).get("returnTo");
    const value = String(raw ?? "").trim();
    if (!value) return "";
    if (!value.startsWith("/")) return "";
    return value;
  })();

  useEffect(() => {
    const onUpdate = () => {
      if (projectLocked) return;
      setProjectId(readSelectedProjectId());
    };
    onUpdate();

    window.addEventListener("employerProjectChanged", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("employerProjectChanged", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [projectLocked]);

  const { data: internsData } = useQuery({
    queryKey: ["/api/employer", employerId, "interns", "proposal_send", projectId],
    enabled: !!internId && !!employerId,
    queryFn: async () => {
      const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
      const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`);
      if (!res.ok) return { interns: [] } as any;
      return res.json();
    },
  });

  const internMeta = useMemo(() => {
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
    const extra = onboarding?.extraData ?? {};
    const score = typeof extra?.findternScore === "number" ? extra.findternScore : Number(extra?.findternScore ?? 0);
    const hasLaptop = typeof onboarding?.hasLaptop === "boolean" ? onboarding.hasLaptop : null;
    const user = match?.user ?? {};
    const firstName = String(user?.firstName ?? "").trim();
    const lastName = String(user?.lastName ?? "").trim();
    const name = `${firstName} ${lastName}`.trim() || "Candidate";
    const initials = `${firstName ? firstName[0] : ""}${lastName ? lastName[0] : ""}`.toUpperCase() || "C";

    const city = String(onboarding?.city ?? "").trim();
    const state = String(onboarding?.state ?? "").trim();
    const location = [city, state].filter(Boolean).join(", ");

    const rawPreferredLocations = Array.isArray(onboarding?.preferredLocations)
      ? onboarding.preferredLocations
      : Array.isArray(onboarding?.preferred_locations)
        ? onboarding.preferred_locations
        : Array.isArray(onboarding?.extraData?.preferredLocations)
          ? onboarding.extraData.preferredLocations
          : Array.isArray(onboarding?.extraData?.preferred_locations)
            ? onboarding.extraData.preferred_locations
            : Array.isArray(onboarding?.extraData?.preferences?.preferredLocations)
              ? onboarding.extraData.preferences.preferredLocations
              : Array.isArray(onboarding?.extraData?.preferences?.preferred_locations)
                ? onboarding.extraData.preferences.preferred_locations
                : Array.isArray((match as any)?.preferences?.preferredLocations)
                  ? (match as any).preferences.preferredLocations
                  : [];
    const preferredLocations: string[] = rawPreferredLocations
      .map((v: any) => (v == null ? "" : String(v)))
      .map((v: string) => v.trim())
      .filter((v: string) => v.length > 0);

    const rawSkills = Array.isArray(onboarding?.skills) ? onboarding.skills : [];
    const skills: string[] = rawSkills
      .map((s: any) => (typeof s === "string" ? s : typeof s?.name === "string" ? s.name : ""))
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    const rawLocationTypes = Array.isArray(onboarding?.locationTypes)
      ? onboarding.locationTypes
      : Array.isArray(onboarding?.location_types)
        ? onboarding.location_types
        : Array.isArray(extra?.locationTypes)
          ? extra.locationTypes
          : Array.isArray(extra?.location_types)
            ? extra.location_types
            : Array.isArray(extra?.preferences?.locationTypes)
              ? extra.preferences.locationTypes
              : Array.isArray(extra?.preferences?.location_types)
                ? extra.preferences.location_types
                : Array.isArray((match as any)?.preferences?.locationTypes)
                  ? (match as any).preferences.locationTypes
                  : Array.isArray((match as any)?.preferences?.location_types)
                    ? (match as any).preferences.location_types
                    : [];
    const locationTypes: string[] = (Array.isArray(rawLocationTypes) ? rawLocationTypes : [])
      .map((v: any) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean);

    const ratings = extra?.ratings ?? {};
    const aiRatings = {
      communication: Number(ratings?.communication ?? 0) || 0,
      coding: Number(ratings?.coding ?? 0) || 0,
      aptitude: Number(ratings?.aptitude ?? 0) || 0,
      interview: Number(ratings?.interview ?? 0) || 0,
    };

    return {
      score: Number.isFinite(score) ? score : 0,
      hasLaptop,
      name,
      initials,
      city,
      state,
      location,
      preferredLocations,
      locationTypes,
      skills,
      aiRatings,
    };
  }, [internId, internsData?.interns]);

  const { data: employerProposalsData } = useQuery({
    queryKey: employerId ? ["/api/employer", employerId, "proposals"] : ["/api/employer", "proposals", "noauth"],
    enabled: !!employerId,
    queryFn: async () => {
      if (!employerId) return { proposals: [] } as any;
      const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/proposals`);
      if (!res.ok) return { proposals: [] } as any;
      return res.json();
    },
  });

  const existingProposalForThisProject = useMemo(() => {
    if (!employerId || !internId || !projectId) return null;
    const list = (employerProposalsData?.proposals ?? []) as any[];
    const matches = list
      .filter((p) => {
        const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
        const prj = String(p?.projectId ?? p?.project_id ?? "").trim();
        if (pid !== String(internId)) return false;
        if (prj !== String(projectId)) return false;
        const statusLower = String(p?.status ?? "").trim().toLowerCase();
        return statusLower !== "rejected" && statusLower !== "expired" && statusLower !== "withdrawn";
      })
      .sort((a, b) => {
        const ta = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
        const tb = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
        return tb - ta;
      });
    return matches[0] ?? null;
  }, [employerId, employerProposalsData?.proposals, internId, projectId]);

  const existingProposalForInternAnyProject = useMemo(() => {
    if (!employerId || !internId) return null;
    const list = (employerProposalsData?.proposals ?? []) as any[];
    const matches = list
      .filter((p) => {
        const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
        if (pid !== String(internId)) return false;
        const statusLower = String(p?.status ?? "").trim().toLowerCase();
        return statusLower !== "rejected" && statusLower !== "expired" && statusLower !== "withdrawn";
      })
      .sort((a, b) => {
        const ta = new Date(a?.updatedAt ?? a?.createdAt ?? 0).getTime();
        const tb = new Date(b?.updatedAt ?? b?.createdAt ?? 0).getTime();
        return tb - ta;
      });
    return matches[0] ?? null;
  }, [employerId, employerProposalsData?.proposals, internId]);

  useEffect(() => {
    const statusLower = String((existingProposalForThisProject as any)?.status ?? "").trim().toLowerCase();
    const isActive =
      Boolean(existingProposalForThisProject) &&
      statusLower.length > 0 &&
      statusLower !== "rejected" &&
      statusLower !== "expired" &&
      statusLower !== "withdrawn";
    setProjectLocked(isActive);
  }, [existingProposalForThisProject]);

  const [proposalRoleTitle, setProposalRoleTitle] = useState("");
  const [proposalJD, setProposalJD] = useState("");
  const [proposalMode, setProposalMode] = useState("remote");
  const [proposalModeTouched, setProposalModeTouched] = useState(false);
  const [proposalLocationCity, setProposalLocationCity] = useState("");
  const [proposalLocationState, setProposalLocationState] = useState("");
  const [proposalCityPopoverOpen, setProposalCityPopoverOpen] = useState(false);
  const [proposalCitySearchQuery, setProposalCitySearchQuery] = useState("");
  const [proposalManualCityState, setProposalManualCityState] = useState(false);
  const [proposalWorkFromHomeDays, setProposalWorkFromHomeDays] = useState("");
  const [proposalWorkFromOfficeDays, setProposalWorkFromOfficeDays] = useState("0");
  const [proposalStartDate, setProposalStartDate] = useState("");
  const [proposalDuration, setProposalDuration] = useState("1m");
  const [proposalShiftFrom, setProposalShiftFrom] = useState("09:00");
  const [proposalShiftTo, setProposalShiftTo] = useState("18:00");
  const [proposalTimezone, setProposalTimezone] = useState("Asia/Kolkata");
  const [proposalTimezoneTouched, setProposalTimezoneTouched] = useState(false);
  const [proposalLaptop, setProposalLaptop] = useState("candidate");
  const [proposalWeeklySchedule, setProposalWeeklySchedule] = useState("mon_fri");
  const [proposalPaidLeavesPerMonth, setProposalPaidLeavesPerMonth] = useState("2");
  const [proposalMonthlyHours, setProposalMonthlyHours] = useState("160");
  const [proposalMonthlyAmount, setProposalMonthlyAmount] = useState("");
  const [proposalTotalPrice, setProposalTotalPrice] = useState("");
  const [proposalSkills, setProposalSkills] = useState<string[]>([]);

  const allowedModes = useMemo(() => {
    const set = new Set((internMeta?.locationTypes ?? []).map((v) => String(v ?? "").trim().toLowerCase()));
    const hasOnsite = set.has("onsite");
    const hasHybrid = set.has("hybrid");
    const hasRemote = set.has("remote");

    if (hasOnsite) return ["remote", "hybrid", "onsite"] as const;
    if (hasHybrid) return ["remote", "hybrid"] as const;
    if (hasRemote) return ["remote"] as const;
    return ["remote", "hybrid", "onsite"] as const;
  }, [internMeta?.locationTypes]);

  useEffect(() => {
    if (!allowedModes.length) return;
    const current = String(proposalMode ?? "").trim().toLowerCase();
    if (!current || !(allowedModes as readonly string[]).includes(current)) {
      setProposalMode(String(allowedModes[0]));
    }
  }, [allowedModes, proposalMode]);

  useEffect(() => {
    setProposalModeTouched(false);
  }, [projectId]);

  const timeOptions = useMemo(
    () => {
      const result: string[] = [];
      for (let h = 0; h < 24; h += 1) {
        result.push(`${pad2(h)}:00`);
        result.push(`${pad2(h)}:30`);
      }
      return result;
    },
    [],
  );

  const [availableTimezones, setAvailableTimezones] = useState<TimeZoneOption[]>(() =>
    (timezones as unknown as TimeZoneOption[]).slice(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getIanaTimezonesCached(timezones as unknown as TimeZoneOption[]);
        if (!cancelled && Array.isArray(list) && list.length > 0) setAvailableTimezones(list);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const proposalStartDateMin = useMemo(
    () => formatLocalDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    [],
  );

  const proposalIstShiftLabel = useMemo(() => {
    const datePart = normalizeDateInput(proposalStartDate) || formatLocalDateInput(new Date());
    if (!proposalShiftFrom || !proposalShiftTo || !proposalTimezone) return "";

    const startUtc = parseDateTimeInTimeZoneToUtc(datePart, proposalShiftFrom, proposalTimezone);
    if (!startUtc) return "";

    let endUtc = parseDateTimeInTimeZoneToUtc(datePart, proposalShiftTo, proposalTimezone);
    if (!endUtc) return "";

    if (endUtc.getTime() <= startUtc.getTime()) {
      const nextDate = addDaysToDateString(datePart, 1);
      if (nextDate) {
        const nextEnd = parseDateTimeInTimeZoneToUtc(nextDate, proposalShiftTo, proposalTimezone);
        if (nextEnd) endUtc = nextEnd;
      }
    }

    return formatTimeRangeInTimeZone(startUtc, endUtc, "Asia/Kolkata");
  }, [proposalShiftFrom, proposalShiftTo, proposalStartDate, proposalTimezone]);

  const weeklyDaysPerWeek = useMemo(() => {
    const schedule = String(proposalWeeklySchedule ?? "").trim().toLowerCase();
    return schedule === "mon_sat" ? 6 : 5;
  }, [proposalWeeklySchedule]);

  const proposalWfhDayOptions = useMemo(() => {
    const maxWfh = Math.max(0, weeklyDaysPerWeek - 1);
    return Array.from({ length: maxWfh }, (_, i) => String(i + 1));
  }, [weeklyDaysPerWeek]);
  const paidLeaveOptions = useMemo(() => ["0", "1", "1.5", "2", "2.5", "3"], []);

  const workingDaysBySchedule = useMemo(
    () => ({ mon_fri: 22, mon_sat: 26, sun_thu: 22 }) as Record<string, number>,
    [],
  );

  const indiaStateLowerSet = useMemo(() => getIndiaStateLowerSetFromCityStatePincode(), []);

  const proposalCityStateOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];

    for (const d of districts) {
      const city = String(d?.district ?? d?.city ?? "").trim();
      const state = String(d?.state ?? "").trim();
      if (!city || !state) continue;
      const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ city, state });
    }

    return out;
  }, []);

  const effectiveProposalCityStateOptions = useMemo(() => {
    if (String(proposalMode ?? "").trim().toLowerCase() === "remote") {
      return proposalCityStateOptions;
    }
    const preferred = Array.isArray(internMeta?.preferredLocations) ? internMeta?.preferredLocations : [];
    if (preferred.length === 0) return proposalCityStateOptions;

    const resolveState = (city: string) => {
      const c = String(city ?? "").trim().toLowerCase();
      if (!c) return "";
      const match = proposalCityStateOptions.find((item) => String(item.city ?? "").trim().toLowerCase() === c);
      return String(match?.state ?? "").trim();
    };

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];

    for (const raw of preferred) {
      const value = String(raw ?? "").trim();
      if (!value) continue;

      const parts = value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const city = String(parts[0] ?? "").trim();
      const explicitState = String(parts[1] ?? "").trim();
      const state = explicitState || resolveState(city);
      if (!city || !state) continue;

      const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ city, state });
    }

    return out;
  }, [internMeta?.preferredLocations, proposalCityStateOptions, proposalMode]);

  const proposalCityStateSearchResults = useMemo(() => {
    const q = proposalCitySearchQuery.trim().toLowerCase();
    return effectiveProposalCityStateOptions
      .filter((item) => {
        if (!q) return true;
        return item.city.toLowerCase().includes(q) || item.state.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const score = (x: { city: string; state: string }) => {
          const qLower = q;
          const cityLower = x.city.toLowerCase();
          const stateLower = x.state.toLowerCase();
          const isCityExact = qLower && cityLower === qLower;
          const isCityPrefix = qLower && cityLower.startsWith(qLower);
          const isStatePrefix = qLower && stateLower.startsWith(qLower);
          return (isCityExact ? 0 : isCityPrefix ? 1 : isStatePrefix ? 2 : 3) * 1000 + cityLower.length;
        };
        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        return a.city.localeCompare(b.city);
      });
  }, [effectiveProposalCityStateOptions, proposalCitySearchQuery]);

  const hasPreferredLocationOptions = useMemo(() => {
    if (String(proposalMode ?? "").trim().toLowerCase() === "remote") return false;
    const preferred = Array.isArray(internMeta?.preferredLocations) ? internMeta?.preferredLocations : [];
    return preferred.length > 0;
  }, [internMeta?.preferredLocations, proposalMode]);

  const candidateScore = internMeta?.score ?? 0;
  const isDurationRestricted = candidateScore > 0 && candidateScore < 6;

  useEffect(() => {
    if (!isDurationRestricted) return;
    if (proposalDuration === "3m" || proposalDuration === "6m") setProposalDuration("2m");
  }, [isDurationRestricted, proposalDuration]);

  useEffect(() => {
    if (proposalMode === "hybrid") {
      const wfhNum = Number(proposalWorkFromHomeDays || "0");
      const safe = Number.isFinite(wfhNum) ? wfhNum : 0;
      const wfo = Math.max(0, weeklyDaysPerWeek - safe);
      setProposalWorkFromOfficeDays(String(wfo));
    } else {
      setProposalWorkFromHomeDays("");
      setProposalWorkFromOfficeDays("0");
    }
  }, [proposalMode, proposalWorkFromHomeDays, weeklyDaysPerWeek]);

  useEffect(() => {
    const workingDays = Number(workingDaysBySchedule[proposalWeeklySchedule] ?? 22);
    const leaves = Number(proposalPaidLeavesPerMonth || "0");
    const safeLeaves = Number.isFinite(leaves) ? leaves : 0;
    const hours = Math.max(0, Math.round(Math.max(0, workingDays - safeLeaves) * 8));
    setProposalMonthlyHours(String(hours));
  }, [proposalPaidLeavesPerMonth, proposalWeeklySchedule, workingDaysBySchedule]);

  const proposalMonths = useMemo(() => monthsFromDuration(proposalDuration), [proposalDuration]);

  const proposalHourlyRate = useMemo(() => {
    return getCandidateHourlyRate(indiaStateLowerSet, {
      findternScore: candidateScore,
      state: internMeta?.state ?? "",
      location: internMeta?.location ?? "",
    }, proposalCurrency, pricingPlans);
  }, [candidateScore, indiaStateLowerSet, internMeta?.location, internMeta?.state, pricingPlans, proposalCurrency]);

  const proposalPerHireCharge = useMemo(() => {
    return getCandidatePerHireChargeAmount(indiaStateLowerSet, {
      findternScore: candidateScore,
      state: internMeta?.state ?? "",
      location: internMeta?.location ?? "",
    }, proposalCurrency, pricingPlans);
  }, [candidateScore, indiaStateLowerSet, internMeta?.location, internMeta?.state, pricingPlans, proposalCurrency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!employerId || !projectId) return;
      if (proposalModeTouched) return;
      try {
        const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/projects`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const projects = (json?.projects ?? []) as any[];
        const match = projects.find((p) => String(p?.id ?? "") === String(projectId));
        const mode = normalizeProjectMode(match?.locationType ?? match?.location_type);
        if (!cancelled && mode) setProposalMode(mode);

        const tz = String(match?.timezone ?? "").trim();
        if (!cancelled && tz && !proposalTimezoneTouched) {
          setProposalTimezone(tz);
        }

        const skills = Array.isArray(match?.skills) ? match.skills : [];
        if (!cancelled && skills.length > 0) setProposalSkills(skills);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employerId, projectId, proposalModeTouched, proposalTimezoneTouched]);

  useEffect(() => {
    const hours = Number(proposalMonthlyHours || "0");
    const safeHours = Number.isFinite(hours) ? hours : 0;
    const monthlyAmount = proposalHourlyRate > 0 ? Math.max(0, Math.round(proposalHourlyRate * safeHours)) : 0;
    const total = Math.max(0, Math.round(monthlyAmount * proposalMonths + proposalPerHireCharge));
    setProposalMonthlyAmount(String(monthlyAmount));
    setProposalTotalPrice(String(total));
  }, [proposalHourlyRate, proposalMonthlyHours, proposalMonths, proposalPerHireCharge]);

  useEffect(() => {
    if (internMeta?.hasLaptop === false && proposalLaptop === "candidate") {
      setProposalLaptop("company");
    }
  }, [internMeta?.hasLaptop, proposalLaptop]);

  const isLocationRequired = proposalMode === "hybrid" || proposalMode === "onsite";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const formLocked = projectLocked || isSubmitting;

  const proposalJdQuillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  const proposalJdQuillFormats = useMemo(
    () => ["header", "bold", "italic", "underline", "list", "bullet", "link"],
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="proposals" />

      <div className="container max-w-5xl mx-auto px-4 md:px-6 py-8">
        <Card className="p-5 md:p-6 rounded-3xl border-slate-100 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Send Hiring Proposal</h1>
              <p className="text-sm text-slate-500 mt-1">
                Fill the offer details and send it to {internMeta?.initials ?? "the candidate"}.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                const nextQuery = (() => {
                  const q: string[] = [];
                  if (fromCompare) q.push("from=compare");
                  if (returnTo) q.push(`returnTo=${encodeURIComponent(returnTo)}`);
                  return q.length > 0 ? `?${q.join("&")}` : "";
                })();
                setLocation(`/employer/intern/${encodeURIComponent(internId)}${nextQuery}`);
              }}
            >
              Back
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Role Title<span className="text-red-500">*</span></label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Design Intern"
                  value={proposalRoleTitle}
                  onChange={(e) => setProposalRoleTitle(e.target.value)}
                  disabled={formLocked}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Roles and Responsibilities / JD<span className="text-red-500">*</span></label>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden [&_.ql-container]:min-h-[220px] [&_.ql-editor]:min-h-[220px]">
                  <ReactQuill
                    theme="snow"
                    value={proposalJD}
                    onChange={(html) => setProposalJD(html)}
                    readOnly={formLocked}
                    modules={proposalJdQuillModules}
                    formats={proposalJdQuillFormats}
                    placeholder="Briefly describe the role, responsibilities, and expectations."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Mode<span className="text-red-500">*</span></label>
                <Select
                  value={proposalMode}
                  onValueChange={(value) => {
                    setProposalModeTouched(true);
                    setProposalMode(value);
                    if (value === "remote") {
                      setProposalLocationCity("");
                      setProposalLocationState("");
                      setProposalCityPopoverOpen(false);
                      setProposalCitySearchQuery("");
                      setProposalManualCityState(false);
                    }
                  }}
                  disabled={formLocked}
                >
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allowedModes as readonly string[]).includes("remote") ? <SelectItem value="remote">Remote</SelectItem> : null}
                    {(allowedModes as readonly string[]).includes("onsite") ? <SelectItem value="onsite">Onsite</SelectItem> : null}
                    {(allowedModes as readonly string[]).includes("hybrid") ? <SelectItem value="hybrid">Hybrid</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>

              {proposalMode !== "remote" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">City<span className="text-red-500">*</span></label>
                    {(!viewerIsIndia && !hasPreferredLocationOptions) || proposalManualCityState ? (
                      <Input
                        className="h-9 text-sm"
                        value={proposalLocationCity}
                        onChange={(e) => setProposalLocationCity(e.target.value)}
                        placeholder="Enter your city"
                        disabled={formLocked}
                      />
                    ) : (
                      <Popover
                        open={proposalCityPopoverOpen}
                        onOpenChange={(open) => {
                          if (formLocked) return;
                          setProposalCityPopoverOpen(open);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 justify-between rounded-lg text-sm"
                            disabled={formLocked}
                          >
                            <span className="truncate text-left">
                              {proposalLocationCity ? proposalLocationCity : "Select your city"}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search Indian cities..."
                              value={proposalCitySearchQuery}
                              onValueChange={setProposalCitySearchQuery}
                            />
                            <CommandList>
                              <CommandGroup>
                                {proposalCityStateSearchResults.map((item) => (
                                  <CommandItem
                                    key={`${item.city}-${item.state}`}
                                    value={item.city}
                                    onSelect={() => {
                                      setProposalManualCityState(false);
                                      setProposalLocationCity(item.city);
                                      setProposalLocationState(item.state);
                                      setProposalCityPopoverOpen(false);
                                      setProposalCitySearchQuery("");
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="truncate">{item.city}</span>
                                      <span className="text-xs text-muted-foreground ml-3 shrink-0">{item.state}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">State<span className="text-red-500">*</span></label>
                    <Input
                      className={`h-9 text-sm ${viewerIsIndia && !proposalManualCityState ? "bg-slate-50" : ""}`}
                      value={proposalLocationState}
                      onChange={(e) => setProposalLocationState(e.target.value)}
                      placeholder={viewerIsIndia && !proposalManualCityState ? "Auto-filled from city" : "Enter your state"}
                      readOnly={viewerIsIndia && !proposalManualCityState}
                      disabled={formLocked}
                    />
                  </div>
                </div>
              ) : null}
 <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Weekly working schedule<span className="text-red-500">*</span></label>
                <Select value={proposalWeeklySchedule} onValueChange={(value) => setProposalWeeklySchedule(value)} disabled={formLocked}>
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mon_fri">Monday - Friday</SelectItem>
                    <SelectItem value="mon_sat">Monday - Saturday</SelectItem>
                    <SelectItem value="sun_thu">Sunday - Thursday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {proposalMode === "hybrid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Work from home - days (weekly)<span className="text-red-500">*</span></label>
                    <Select
                      value={proposalWorkFromHomeDays}
                      onValueChange={(v) => setProposalWorkFromHomeDays(v)}
                      disabled={formLocked}
                    >
                      <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {proposalWfhDayOptions.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Work from office - days (weekly)<span className="text-red-500">*</span></label>
                    <Input className="h-9 text-sm bg-slate-50" value={proposalWorkFromOfficeDays} readOnly />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Start Date<span className="text-red-500">*</span></label>
                <Input
                  type="date"
                  className="h-9 text-sm"
                  value={normalizeDateInput(proposalStartDate)}
                  min={proposalStartDateMin}
                  onChange={(e) => setProposalStartDate(normalizeDateInput(e.target.value))}
                  disabled={formLocked}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Duration<span className="text-red-500">*</span></label>
                <Select value={proposalDuration} onValueChange={(v) => setProposalDuration(v)} disabled={formLocked}>
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 month</SelectItem>
                    <SelectItem value="2m">2 months</SelectItem>
                    <SelectItem value="3m" disabled={isDurationRestricted}>3 months</SelectItem>
                    <SelectItem value="6m" disabled={isDurationRestricted}>6 months</SelectItem>
                  </SelectContent>
                </Select>
                {isDurationRestricted ? (
                  <p className="text-[11px] text-amber-600 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                    <span>For candidates with Findtern score below 6, duration is limited to 1–2 months.</span>
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Shift Timings<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={proposalShiftFrom} onValueChange={(value) => setProposalShiftFrom(value)} disabled={formLocked}>
                    <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                      <SelectValue placeholder="From" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={proposalShiftTo} onValueChange={(value) => setProposalShiftTo(value)} disabled={formLocked}>
                    <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                      <SelectValue placeholder="To" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-slate-500">Local time for your organisation.</p>
                {proposalIstShiftLabel ? (
                  <p className="text-[11px] text-slate-500">IST (Asia/Kolkata): {proposalIstShiftLabel}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Time Zone<span className="text-red-500">*</span></label>
                <Select
                  value={proposalTimezone}
                  onValueChange={(value) => {
                    setProposalTimezoneTouched(true);
                    setProposalTimezone(value);
                  }}
                  disabled={formLocked}
                >
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  Shift timings are in your selected time zone. The candidate will see them converted to their local time zone.
                </p>
                <p className="text-[11px] text-amber-600 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  <span>Billing and availability are based on your selected time zone.</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Laptop<span className="text-red-500">*</span></label>
                <Select value={proposalLaptop} onValueChange={(value) => setProposalLaptop(value)} disabled={formLocked}>
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {internMeta?.hasLaptop !== false ? (
                      <SelectItem value="candidate">Candidate's Own Laptop</SelectItem>
                    ) : null}
                    <SelectItem value="company">Company Provided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

             

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Currency<span className="text-red-500">*</span></label>
                <Select
                  value={proposalCurrency}
                  onValueChange={(value) => setProposalCurrency(value as "INR" | "USD")}
                  disabled={formLocked}
                >
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Paid Leaves / Month<span className="text-red-500">*</span></label>
                <Select
                  value={proposalPaidLeavesPerMonth}
                  onValueChange={(value) => setProposalPaidLeavesPerMonth(value)}
                  disabled={formLocked}
                >
                  <SelectTrigger className="h-9 text-sm" disabled={formLocked}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paidLeaveOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Monthly Working Hours<span className="text-red-500">*</span></label>
                <Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-9 text-sm" value={proposalMonthlyHours} readOnly />
                <p className="text-[11px] text-amber-600 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  <span>Auto-calculated: (working days - paid leaves) × 8 hours.</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Monthly Payable Amount<span className="text-red-500">*</span></label>
                 {proposalCurrency === "INR" && (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">(includes GST)</span>
                  )}
                <Input type="text" inputMode="numeric" pattern="[0-9]*" className="h-9 text-sm bg-slate-50" placeholder="0" value={proposalMonthlyAmount} readOnly />
                <p className="text-[11px] text-slate-500">Amount billed each month.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Total Price (auto-filled)<span className="text-red-500">*</span></label>
                 {proposalCurrency === "INR" && (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">(includes GST)</span>
                  )}
                <Input type="number" className="h-9 text-sm bg-slate-50" value={proposalTotalPrice} readOnly />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting || Boolean(existingProposalForInternAnyProject)}
                  onClick={() =>
                    void (async () => {
                    const monthlyHoursNum = Number(proposalMonthlyHours || "0");
                    const monthlyAmountNum = Number(proposalMonthlyAmount || "0");

                    if (!employerId) {
                      toast({ title: "Not logged in", description: "Please login as employer.", variant: "destructive" });
                      return;
                    }
                    if (!internId) {
                      toast({ title: "Candidate missing", description: "No candidate selected.", variant: "destructive" });
                      return;
                    }
                    if (!projectId) {
                      toast({ title: "Project missing", description: "Please select a project first.", variant: "destructive" });
                      return;
                    }
                    if (existingProposalForInternAnyProject) {
                      const status = String(existingProposalForInternAnyProject?.status ?? "").trim().toLowerCase();
                      toast({
                        title: "Proposal already sent",
                        description: `A proposal already exists for this candidate (${status || "sent"}).`,
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!proposalRoleTitle.trim()) {
                      toast({
                        title: "Role title is required",
                        description: "Please enter the internship role title.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (isProposalJdEmpty(proposalJD)) {
                      toast({
                        title: "JD is required",
                        description: "Please describe the role and responsibilities.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!proposalStartDate) {
                      toast({
                        title: "Start date is required",
                        description: "Please select a start date for the internship.",
                        variant: "destructive",
                      });
                      return;
                    }

                    const startDateIso = normalizeDateInput(proposalStartDate);
                    if (startDateIso < proposalStartDateMin) {
                      toast({
                        title: "Start date invalid",
                        description: "Back date is not allowed. Please select a valid start date.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (proposalMode !== "remote" && (!proposalLocationCity.trim() || !proposalLocationState.trim())) {
                      toast({
                        title: "Location required",
                        description: "Please enter the internship city and state.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (proposalMode === "hybrid") {
                      const wfhNum = Number(proposalWorkFromHomeDays || "0");
                      const wfoNum = Number(proposalWorkFromOfficeDays || "0");
                      if (!wfhNum || !wfoNum) {
                        toast({
                          title: "Hybrid schedule required",
                          description: "Please select work from home days (weekly).",
                          variant: "destructive",
                        });
                        return;
                      }
                    }

                    if (!proposalShiftFrom || !proposalShiftTo) {
                      toast({
                        title: "Shift timings required",
                        description: "Please select both start and end times.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!proposalTimezone) {
                      toast({
                        title: "Time zone is required",
                        description: "Please select a time zone.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!proposalLaptop) {
                      toast({
                        title: "Laptop preference required",
                        description: "Please specify who will provide the laptop.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (!monthlyHoursNum || monthlyHoursNum <= 0) {
                      toast({
                        title: "Monthly hours invalid",
                        description: "Please enter a positive number of working hours.",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (proposalHourlyRate > 0 && (!monthlyAmountNum || monthlyAmountNum <= 0)) {
                      toast({
                        title: "Monthly amount invalid",
                        description: "Please enter a positive monthly payable amount.",
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      setIsSubmitting(true);

                      const tzInfo = await fetchTimeApiZoneInfo(proposalTimezone).catch(() => null);

                      const offerDetails = {
                        roleTitle: proposalRoleTitle,
                        jd: proposalJD,
                        mode: proposalMode,
                        currency: proposalCurrency,
                        location:
                          proposalMode === "remote"
                            ? "Remote"
                            : [proposalLocationCity.trim(), proposalLocationState.trim()].filter(Boolean).join(", "),
                        workFromHomeDays: proposalMode === "hybrid" ? Number(proposalWorkFromHomeDays || "0") : 0,
                        workFromOfficeDays: proposalMode === "hybrid" ? Number(proposalWorkFromOfficeDays || "0") : 0,
                        startDate: startDateIso,
                        duration: proposalDuration,
                        shiftFrom: proposalShiftFrom,
                        shiftTo: proposalShiftTo,
                        timezone: proposalTimezone,
                        dstActive: tzInfo?.dstActive ?? null,
                        timezoneResolvedAt: tzInfo?.dateTime ?? new Date().toISOString(),
                        laptop: proposalLaptop,
                        weeklySchedule: proposalWeeklySchedule,
                        paidLeavesPerMonth: Number(proposalPaidLeavesPerMonth || "0"),
                        monthlyHours: monthlyHoursNum,
                        monthlyAmount: monthlyAmountNum,
                        totalPrice: Number(proposalTotalPrice || 0),
                        hourlyRate: proposalHourlyRate,
                        perHireCharge: proposalPerHireCharge,
                        candidateScore,
                        projectSkills: proposalSkills,
                      };

                      const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/proposals`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          internId,
                          projectId,
                          flowType: "direct",
                          currency: proposalCurrency,
                          offerDetails,
                          aiRatings: {
                            communication: internMeta?.aiRatings?.communication ?? 0,
                            coding: internMeta?.aiRatings?.coding ?? 0,
                            aptitude: internMeta?.aiRatings?.aptitude ?? 0,
                            overall: internMeta?.score ?? 0,
                          },
                          skills: proposalSkills,
                        }),
                      });

                      if (!res.ok) {
                        const errJson = await res.json().catch(() => null);
                        const message = errJson?.message || "Failed to send proposal";
                        throw new Error(message);
                      }

                      const json = await res.json().catch(() => null);
                      const proposalId = String(json?.proposal?.id ?? "");

                      toast({ title: "Proposal sent", description: "Your hiring proposal has been sent." });

                      try {
                        queryClient.invalidateQueries({
                          queryKey: ["/api/employer/proposals", employerId],
                        });
                      } catch {
                        // ignore
                      }

                      if (proposalId) {
                        setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`);
                      } else {
                        setLocation("/employer/proposals");
                      }
                    } catch (e: any) {
                      console.error("Send proposal error:", e);
                      toast({
                        title: "Failed to send proposal",
                        description: e?.message ?? "An error occurred while sending the proposal.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  })()
                  }
                >
                  Send Proposal
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
