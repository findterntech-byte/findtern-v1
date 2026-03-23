import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, MessageSquare, Building2, ShoppingCart, ArrowLeft, AlertCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import findternLogo from "@assets/logo.png";
import { timezones } from "@shared/schema";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  addDaysToDateString,
  fetchTimeApiZoneInfo,
  formatTimeRangeInTimeZone,
  getIanaTimezonesCached,
  parseDateTimeInTimeZoneToUtc,
  type TimeZoneOption,
} from "@/lib/timezone";
import { getEmployerAuth, inferEmployerIsIndia } from "@/lib/employerAuth";
import { fetchPricingPlans, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import cityStatePincode from "@/data/cityStatePincode.json";

type NotificationItem = {
  id: string;
  recipientType: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string | null;
};

 type EmployerProposal = {
  id: string;
  status?: string;
  employerId?: string;
  internId?: string;
  projectId?: string;
  flowType?: "direct" | "interview_first";
  offerDetails?: {
    roleTitle?: string;
    mode?: string;
    startDate?: string;
    duration?: string;
    monthlyAmount?: number;
    totalPrice?: number;
    monthlyHours?: number;
    timezone?: string;
    laptop?: string;
    location?: string;
  };
  aiRatings?: {
    communication?: number;
    coding?: number;
    aptitude?: number;
    overall?: number;
  };
  skills?: string[];
};

export default function EmployerProposalEditPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/employer/proposals/:id/edit");

  const proposalId = params?.id ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const unreadCount = 0;

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

  function normalizeDateInput(raw: string) {
    const value = String(raw ?? "");
    const valid = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (valid) return value;
    const overflow = value.match(/^(\d{4})\d+-(\d{2})-(\d{2})$/);
    if (overflow) return `${overflow[1]}-${overflow[2]}-${overflow[3]}`;
    return value;
  }

  const proposalStartDateMin = `${new Date(Date.now() + 24 * 60 * 60 * 1000).getFullYear()}-${String(
    new Date(Date.now() + 24 * 60 * 60 * 1000).getMonth() + 1,
  ).padStart(2, "0")}-${String(new Date(Date.now() + 24 * 60 * 60 * 1000).getDate()).padStart(2, "0")}`;

  function stripHtmlToText(html: string) {
    const text = String(html ?? "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text;
  }

  const escapeHtml = (value: string) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const toEditableJdHtml = (value: string) => {
    const v = String(value ?? "").trim();
    if (!v) return "";
    const looksLikeHtml = /<[^>]+>/.test(v);
    if (looksLikeHtml) return v;
    return escapeHtml(v).replace(/\r\n|\r|\n/g, "<br />");
  };

  const isProposalJdEmpty = (html: string) => stripHtmlToText(html).length === 0;

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/proposals", proposalId],
    enabled: !!proposalId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
  const internHasLaptop = (data as any)?.internOnboarding?.hasLaptop as boolean | null | undefined;

  const didHydrateRef = useRef(false);

  useEffect(() => {
    didHydrateRef.current = false;
  }, [proposalId]);

  const [pricingPlans, setPricingPlans] = useState<CmsPlan[]>([]);
  const [internPricingMeta, setInternPricingMeta] = useState<{
    findternScore: number;
    location: string;
    state: string;
  } | null>(null);
  const [internLocationTypes, setInternLocationTypes] = useState<string[] | null>(null);
  const [internPreferredLocations, setInternPreferredLocations] = useState<string[] | null>(null);

  const [formOffer, setFormOffer] = useState<NonNullable<EmployerProposal["offerDetails"]>>({});
  const [formStatus, setFormStatus] = useState<string>("sent");
  const [formFlowType, setFormFlowType] = useState<"direct" | "interview_first">("direct");
  const [formSkills, setFormSkills] = useState<string>("");
  const [formRatings, setFormRatings] = useState<NonNullable<EmployerProposal["aiRatings"]>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [proposalRoleTitle, setProposalRoleTitle] = useState("");
  const [proposalJD, setProposalJD] = useState("");
  const [proposalMode, setProposalMode] = useState("remote");
  const [proposalLocationState, setProposalLocationState] = useState("");
  const [proposalLocationCity, setProposalLocationCity] = useState("");
  const [proposalCityPopoverOpen, setProposalCityPopoverOpen] = useState(false);
  const [proposalCitySearchQuery, setProposalCitySearchQuery] = useState("");
  const [proposalManualCityState, setProposalManualCityState] = useState(false);
  const [proposalWorkFromHomeDays, setProposalWorkFromHomeDays] = useState("");
  const [proposalWorkFromOfficeDays, setProposalWorkFromOfficeDays] = useState("0");
  const [proposalCurrency, setProposalCurrency] = useState<"INR" | "USD">(() => {
    const auth = getEmployerAuth();
    return inferEmployerIsIndia(auth) ? "INR" : "USD";
  });
  const [viewerIsIndia] = useState(() => inferEmployerIsIndia(getEmployerAuth()));
  const [proposalStartDate, setProposalStartDate] = useState("");
  const [proposalDuration, setProposalDuration] = useState("1m");
  const [proposalDurationTouched, setProposalDurationTouched] = useState(false);
  const [proposalShiftFrom, setProposalShiftFrom] = useState("09:00");
  const [proposalShiftTo, setProposalShiftTo] = useState("18:00");
  const [proposalTimezone, setProposalTimezone] = useState("Asia/Kolkata");
  const [proposalLaptop, setProposalLaptop] = useState("candidate");
  const [proposalWeeklySchedule, setProposalWeeklySchedule] = useState("mon_fri");
  const [proposalPaidLeavesPerMonth, setProposalPaidLeavesPerMonth] = useState("2");
  const [proposalMonthlyHours, setProposalMonthlyHours] = useState("160");
  const [proposalMonthlyAmount, setProposalMonthlyAmount] = useState("");
  const [proposalCurrencyTouched, setProposalCurrencyTouched] = useState(false);
  const lastCurrencyRef = useRef<"INR" | "USD">(proposalCurrency);

  const initialOfferCurrency = useMemo(() => {
    const raw = String((proposal?.offerDetails as any)?.currency ?? "").trim().toUpperCase();
    return raw === "USD" || raw === "INR" ? (raw as "USD" | "INR") : null;
  }, [proposal]);

  const timeOptions = useMemo(
    () => Array.from({ length: 24 }, (_, h) => `${pad2(h)}:00`),
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

  const paidLeaveOptions = useMemo(
    () => ["0", "1", "1.5", "2", "2.5", "3"],
    [],
  );

  const weeklyDaysPerWeek = useMemo(() => {
    const schedule = String(proposalWeeklySchedule ?? "").trim().toLowerCase();
    return schedule === "mon_sat" ? 6 : 5;
  }, [proposalWeeklySchedule]);

  const proposalWfhDayOptions = useMemo(() => {
    const maxWfh = Math.max(0, weeklyDaysPerWeek - 1);
    return Array.from({ length: maxWfh }, (_, i) => String(i + 1));
  }, [weeklyDaysPerWeek]);

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
      const state = String(d?.state ?? "").trim();
      if (!state) continue;

      const cityCandidates = [d?.headquarters, d?.district, d?.city]
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);

      for (const city of cityCandidates) {
        const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ city, state });
      }
    }

    return out;
  }, []);

  const effectiveProposalCityStateOptions = useMemo(() => {
    if (String(proposalMode ?? "").trim().toLowerCase() === "remote") {
      return proposalCityStateOptions;
    }
    const preferred = Array.isArray(internPreferredLocations) ? internPreferredLocations : [];
    if (preferred.length === 0) return proposalCityStateOptions;

    const resolveState = (city: string) => {
      const c = String(city ?? "").trim().toLowerCase();
      if (!c) return "";
      const match = proposalCityStateOptions.find((item) => String(item.city ?? "").trim().toLowerCase() === c);
      return String(match?.state ?? "").trim();
    };

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];

    for (const rawValue of preferred) {
      const value = String(rawValue ?? "").trim();
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
  }, [internPreferredLocations, proposalCityStateOptions, proposalMode]);

  const proposalCityStateSearchResults = useMemo(() => {
    const q = proposalCitySearchQuery.trim().toLowerCase();

    return effectiveProposalCityStateOptions
      .filter((item) => {
        if (!q) return true;
        return item.city.toLowerCase().includes(q) || item.state.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const score = (x: { city: string; state: string }) => {
          if (!q) return 10;
          const city = (x.city || "").toLowerCase();
          const state = (x.state || "").toLowerCase();

          if (city === q) return 0;
          if (city.startsWith(q)) return 1;
          if (city.includes(q)) return 2;
          if (state === q) return 3;
          if (state.startsWith(q)) return 4;
          if (state.includes(q)) return 5;
          return 9;
        };

        const sa = score(a);
        const sb = score(b);
        if (sa !== sb) return sa - sb;
        return a.city.localeCompare(b.city);
      });
  }, [effectiveProposalCityStateOptions, proposalCitySearchQuery]);

  const hasPreferredLocationOptions = useMemo(() => {
    if (String(proposalMode ?? "").trim().toLowerCase() === "remote") return false;
    const preferred = Array.isArray(internPreferredLocations) ? internPreferredLocations : [];
    return preferred.length > 0;
  }, [internPreferredLocations, proposalMode]);

  const proposalIstShiftLabel = useMemo(() => {
    const datePart = normalizeDateInput(proposalStartDate) || "";
    if (!datePart || !proposalShiftFrom || !proposalShiftTo || !proposalTimezone) return "";

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

  const workingDaysBySchedule = useMemo(
    () => ({ mon_fri: 22, mon_sat: 26, sun_thu: 22 }) as Record<string, number>,
    [],
  );

  useEffect(() => {
    const [hh, mm] = String(proposalShiftFrom || "").split(":").map((v) => Number(v));
    if ([hh, mm].some((n) => Number.isNaN(n))) return;
    const d = new Date(2000, 0, 1, hh, mm, 0, 0);
    d.setHours(d.getHours() + 9);
    setProposalShiftTo(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
  }, [proposalShiftFrom]);

  useEffect(() => {
    const workingDays = workingDaysBySchedule[proposalWeeklySchedule] ?? 0;
    const leaves = Number(proposalPaidLeavesPerMonth || "0");
    const safeLeaves = Number.isFinite(leaves) ? leaves : 0;
    const hours = Math.max(0, (workingDays - safeLeaves) * 8);
    setProposalMonthlyHours(String(hours));
  }, [proposalWeeklySchedule, proposalPaidLeavesPerMonth, workingDaysBySchedule]);

  useEffect(() => {
    if (proposalMode !== "hybrid") {
      setProposalWorkFromOfficeDays("0");
      return;
    }
    const wfh = Number(proposalWorkFromHomeDays || "0");
    const wfhSafe = Number.isFinite(wfh) ? wfh : 0;
    const wfo = Math.max(0, weeklyDaysPerWeek - wfhSafe);
    setProposalWorkFromOfficeDays(String(wfo));
  }, [proposalMode, proposalWorkFromHomeDays, weeklyDaysPerWeek]);

  useEffect(() => {
    if (internHasLaptop === false && proposalLaptop === "candidate") {
      setProposalLaptop("company");
    }
  }, [internHasLaptop, proposalLaptop]);

  const proposalMonths = (() => {
    switch (proposalDuration) {
      case "2m":
        return 2;
      case "3m":
        return 3;
      case "6m":
        return 6;
      default:
        return 1;
    }
  })();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const plans = await fetchPricingPlans({ country: proposalCurrency === "INR" ? "IN" : "" });
      if (!cancelled) setPricingPlans(plans);
    })();
    return () => {
      cancelled = true;
    };
  }, [proposalCurrency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = getEmployerAuth();
        const employerId = String(auth?.id ?? "").trim();
        const internId = String(proposal?.internId ?? "").trim();
        const projectId = String(proposal?.projectId ?? "").trim();
        if (!employerId || !internId) {
          if (!cancelled) setInternPricingMeta(null);
          return;
        }

        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
        const res = await fetch(`/api/employer/${encodeURIComponent(employerId)}/interns${qs}`);
        if (!res.ok) {
          if (!cancelled) setInternPricingMeta(null);
          return;
        }

        const json = await res.json().catch(() => null);
        const list = (json?.interns ?? []) as any[];
        const match = list.find((row) => {
          const onboarding = row?.onboarding ?? {};
          const user = row?.user ?? {};
          const candidates = [user?.id, onboarding?.userId, onboarding?.id]
            .map((v) => String(v ?? "").trim())
            .filter(Boolean);
          return candidates.includes(internId);
        });

        if (!match) {
          if (!cancelled) setInternPricingMeta(null);
          return;
        }

        const onboarding = match?.onboarding ?? {};
        const extra = onboarding?.extraData ?? {};
        const locationTypesRaw = Array.isArray(onboarding?.locationTypes) ? onboarding.locationTypes : [];
        const normalizedLocationTypes = (Array.isArray(locationTypesRaw) ? locationTypesRaw : [])
          .map((v) => String(v ?? "").trim().toLowerCase())
          .filter(Boolean);

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
        const preferredLocations: string[] = (Array.isArray(rawPreferredLocations) ? rawPreferredLocations : [])
          .map((v: any) => (v == null ? "" : String(v)))
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
        const city = String(onboarding?.city ?? "").trim();
        const state = String(onboarding?.state ?? "").trim();
        const location = [city, state].filter(Boolean).join(", ");

        const score = Number(extra?.findternScore ?? 0);
        const safeScore = Number.isFinite(score) ? score : 0;

        if (!cancelled) {
          setInternPricingMeta({
            findternScore: safeScore,
            location,
            state,
          });
          setInternLocationTypes(normalizedLocationTypes);
          setInternPreferredLocations(preferredLocations);
        }
      } catch {
        if (!cancelled) setInternPricingMeta(null);
        if (!cancelled) setInternLocationTypes(null);
        if (!cancelled) setInternPreferredLocations(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [proposal?.internId, proposal?.projectId]);

  const allowedModes = useMemo(() => {
    const set = new Set((internLocationTypes ?? []).map((v) => String(v ?? "").trim().toLowerCase()));
    const hasOnsite = set.has("onsite");
    const hasHybrid = set.has("hybrid");
    const hasRemote = set.has("remote");

    if (hasOnsite) return ["remote", "hybrid", "onsite"] as const;
    if (hasHybrid) return ["remote", "hybrid"] as const;
    if (hasRemote) return ["remote"] as const;
    return ["remote", "hybrid", "onsite"] as const;
  }, [internLocationTypes]);

  useEffect(() => {
    if (!allowedModes.length) return;
    const current = String(proposalMode ?? "").trim().toLowerCase();
    if (!current || !(allowedModes as readonly string[]).includes(current)) {
      setProposalMode(String(allowedModes[0]));
    }
  }, [allowedModes, proposalMode]);

  const proposalHourlyRate = useMemo(() => {
    const score = Number(internPricingMeta?.findternScore ?? 0);
    const safeScore = Number.isFinite(score) ? score : 0;

    const resolved = resolvePricingForScore(safeScore, pricingPlans, {
      expectedCurrency: proposalCurrency,
    });
    if (resolved && String((resolved as any)?.currency ?? "").trim().toUpperCase() === proposalCurrency) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return 0;
      return minor / 100;
    }

    if (safeScore >= 8) return proposalCurrency === "USD" ? 2 : 200;
    if (safeScore >= 6) return proposalCurrency === "USD" ? 1 : 100;
    return 0;
  }, [internPricingMeta?.findternScore, pricingPlans, proposalCurrency]);

  const candidateScore = Number(internPricingMeta?.findternScore ?? 0);
  const isDurationRestricted = Number.isFinite(candidateScore) && candidateScore > 0 && candidateScore < 6;

  useEffect(() => {
    if (!isDurationRestricted) return;
    if (proposalDuration === "3m" || proposalDuration === "6m") setProposalDuration("2m");
  }, [isDurationRestricted, proposalDuration]);

  const proposalPerHireCharge = useMemo(() => {
    const score = Number(internPricingMeta?.findternScore ?? 0);
    const safeScore = Number.isFinite(score) ? score : 0;

    if (safeScore <= 0) return 0;

    if (safeScore >= 6) return 0;

    const resolved = resolvePricingForScore(safeScore, pricingPlans, {
      expectedCurrency: proposalCurrency,
    });
    if (resolved && String((resolved as any)?.currency ?? "").trim().toUpperCase() === proposalCurrency) {
      const minor = Number(resolved.perHireChargeMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return 0;
      return minor / 100;
    }

    if (safeScore < 6) return proposalCurrency === "USD" ? 50 : 5000;
    return 0;
  }, [internPricingMeta?.findternScore, pricingPlans, proposalCurrency]);

  const [proposalTotalPrice, setProposalTotalPrice] = useState("");

  useEffect(() => {
    if (!isDurationRestricted) return;
    setProposalMonthlyAmount("0");
    const fee = Number(proposalPerHireCharge ?? 0);
    const feeSafe = Number.isFinite(fee) ? Math.max(0, Math.round(fee)) : 0;
    setProposalTotalPrice(String(feeSafe));
  }, [isDurationRestricted, proposalPerHireCharge]);

  useEffect(() => {
    if (!proposalCurrencyTouched) {
      lastCurrencyRef.current = proposalCurrency;
      return;
    }
    const prev = lastCurrencyRef.current;
    const next = proposalCurrency;
    if (prev === next) return;

    const rate = 100;
    const convert = (value: string) => {
      const n = Number(String(value ?? "").trim());
      if (!Number.isFinite(n) || n <= 0) return value;
      if (prev === "INR" && next === "USD") return String(Math.max(0, Math.round(n / rate)));
      if (prev === "USD" && next === "INR") return String(Math.max(0, Math.round(n * rate)));
      return value;
    };

    setProposalMonthlyAmount((v) => convert(v));
    setProposalTotalPrice((v) => convert(v));
    lastCurrencyRef.current = next;
  }, [proposalCurrency]);

  useEffect(() => {
    const hours = Number(proposalMonthlyHours || "0");
    const hoursSafe = Number.isFinite(hours) ? hours : 0;
    if (!(proposalHourlyRate > 0)) return;
    const expectedMonthlyAmount = Math.max(0, Math.round(proposalHourlyRate * hoursSafe));

    const savedMonthlyAmount = proposal?.offerDetails?.monthlyAmount;
    const shouldPreserveSavedAmount =
      savedMonthlyAmount != null &&
      (initialOfferCurrency == null || initialOfferCurrency === proposalCurrency) &&
      String(savedMonthlyAmount) === String(expectedMonthlyAmount);

    if (shouldPreserveSavedAmount && String(proposalMonthlyAmount ?? "") === String(savedMonthlyAmount)) return;

    setProposalMonthlyAmount(String(expectedMonthlyAmount));
  }, [initialOfferCurrency, proposal, proposalCurrency, proposalHourlyRate, proposalMonthlyHours, proposalMonthlyAmount]);

  useEffect(() => {
    const offer = proposal?.offerDetails ?? null;
    const perHireCharge = Number(proposalPerHireCharge ?? 0);
    const perHireChargeSafe = Number.isFinite(perHireCharge) ? perHireCharge : 0;

    const rawMonthly = String(proposalMonthlyAmount ?? "").trim();
    const monthly = rawMonthly.length ? Number(rawMonthly) : NaN;
    const computedTotal = Number.isFinite(monthly)
      ? Math.max(0, Math.round(monthly * proposalMonths + perHireChargeSafe))
      : NaN;

    if (!Number.isFinite(monthly) || monthly < 0) {
      setProposalTotalPrice("");
      return;
    }

    const nextTotal = String(computedTotal);
    if (String(proposalTotalPrice ?? "") === nextTotal) return;
    setProposalTotalPrice(nextTotal);
  }, [proposal, proposalCurrency, proposalDuration, proposalMonthlyAmount, proposalMonths, proposalPerHireCharge, proposalTotalPrice]);

  useEffect(() => {
    if (!proposal) return;
    if (didHydrateRef.current) return;
    const offer = proposal.offerDetails ?? {};
    const ratings = proposal.aiRatings ?? {};
    const skillsArr = Array.isArray(proposal.skills) ? proposal.skills : [];

    setFormOffer(offer);
    setFormStatus(proposal.status || "sent");
    setFormFlowType((proposal.flowType || "direct") as "direct" | "interview_first");
    setFormSkills(skillsArr.join(", "));
    setFormRatings(ratings);

    setProposalRoleTitle((offer as any).roleTitle || "");
    setProposalJD(toEditableJdHtml(String((offer as any).jd ?? "")));
    setProposalMode((offer as any).mode || "remote");
    {
      const rawLocation = String((offer as any).location ?? "").trim();
      if (rawLocation && rawLocation.toLowerCase() !== "remote") {
        const parts = rawLocation.split(",").map((p) => p.trim()).filter(Boolean);
        setProposalLocationCity(String(parts[0] ?? ""));
        setProposalLocationState(String(parts[1] ?? ""));
      } else {
        setProposalLocationCity("");
        setProposalLocationState("");
      }
      setProposalCityPopoverOpen(false);
      setProposalCitySearchQuery("");
      setProposalManualCityState(false);
    }
    {
      const rawWfh = (offer as any).workFromHomeDays;
      const rawWfo = (offer as any).workFromOfficeDays;
      setProposalWorkFromHomeDays(rawWfh != null ? String(rawWfh) : "");
      setProposalWorkFromOfficeDays(rawWfo != null ? String(rawWfo) : "0");
    }
    {
      const rawCurrency = String((offer as any).currency ?? "").trim().toUpperCase();
      const normalized = rawCurrency === "USD" || rawCurrency === "INR" ? (rawCurrency as "USD" | "INR") : null;
      if (normalized) {
        setProposalCurrencyTouched(false);
        lastCurrencyRef.current = normalized;
        setProposalCurrency(normalized);
      }
    }
    setProposalStartDate((offer as any).startDate || "");
    {
      const rawDuration = String((offer as any).duration || "1m");
      const normalized = ["1m", "2m", "3m", "6m"].includes(rawDuration) ? rawDuration : "1m";
      if (!proposalDurationTouched) setProposalDuration(normalized);
    }
    setProposalShiftFrom((offer as any).shiftFrom || "09:00");
    setProposalShiftTo((offer as any).shiftTo || "18:00");
    setProposalTimezone((offer as any).timezone || "Asia/Kolkata");
    setProposalLaptop((offer as any).laptop || "candidate");
    setProposalWeeklySchedule((offer as any).weeklySchedule || "mon_fri");
    setProposalPaidLeavesPerMonth(
      (offer as any).paidLeavesPerMonth != null ? String((offer as any).paidLeavesPerMonth) : "2",
    );
    setProposalMonthlyHours(
      (offer as any).monthlyHours != null ? String((offer as any).monthlyHours) : "160",
    );
    setProposalMonthlyAmount(
      (offer as any).monthlyAmount != null ? String((offer as any).monthlyAmount) : "",
    );

    setProposalTotalPrice((offer as any).totalPrice != null ? String((offer as any).totalPrice) : "");

    didHydrateRef.current = true;
  }, [proposal]);

  useEffect(() => {
    if (internHasLaptop === false && proposalLaptop === "candidate") {
      setProposalLaptop("company");
    }
  }, [internHasLaptop, proposalLaptop]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl shadow-md border border-slate-100 bg-white p-6 text-center space-y-3">
          <p className="text-sm text-slate-500">Loading proposal...</p>
        </Card>
      </div>
    );
  }

  if (error instanceof Error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl shadow-md border border-red-50 bg-white p-6 text-center space-y-4">
          <p className="text-base font-semibold text-slate-900">Proposal not found</p>
          <Button onClick={() => setLocation("/employer/proposals")}>Back to proposals</Button>
        </Card>
      </div>
    );
  }

  const status = String(proposal.status || "sent").toLowerCase();
  const isFinalized = status === "accepted" || status === "rejected";

  if (isFinalized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4 md:px-6 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-3xl shadow-md border border-slate-100 bg-white p-6 text-center space-y-4">
          <p className="text-base font-semibold text-slate-900">Editing is disabled</p>
          <p className="text-sm text-slate-500">
            This proposal has already been {status} and can no longer be edited.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setLocation("/employer/proposals")}>Back</Button>
            <Button onClick={() => setLocation(`/employer/proposals/${proposalId}`)}>View proposal</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      {/* Header – same as employer proposals page */}
      <EmployerHeader active="proposals" />

      {false && (
        <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between px-2 md:px-6">
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

            <div className="flex items-center gap-2 md:gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                onClick={() => setLocation("/employer/proposals")}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                onClick={() => setLocation("/employer/account")}
              >
                <Building2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 relative"
                onClick={() => setLocation("/employer/cart")}
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg relative"
                onClick={() => setLocation("/employer/notifications")}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                N
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main content */}
      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-8 flex justify-center">
        <div className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-md border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="px-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
              onClick={() => setLocation("/employer/proposals")}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium">Back</span>
            </Button>
            <Badge
              variant="outline"
              className="text-[11px] px-2 py-0.5 rounded-full border-slate-200 text-slate-600"
            >
              Edit proposal
            </Badge>
          </div>

          <div className="space-y-1 mb-4">
            <h1 className="text-lg font-semibold text-slate-900">Edit Hiring Proposal</h1>
            <p className="text-sm text-slate-500">
              Update the internship offer details. Changes will be visible to the candidate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Role Title<span className="text-red-500">*</span></label>
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Design Intern"
                  value={proposalRoleTitle}
                  onChange={(e) => setProposalRoleTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span>Roles and Responsibilities / JD<span className="text-red-500">*</span></span>
                </label>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden [&_.ql-container]:min-h-[220px] [&_.ql-editor]:min-h-[220px]">
                  <ReactQuill
                    theme="snow"
                    value={proposalJD}
                    onChange={(html) => setProposalJD(html)}
                    placeholder="Briefly describe the role, responsibilities, and expectations."
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link"],
                        ["clean"],
                      ],
                    }}
                    formats={["header", "bold", "italic", "underline", "list", "bullet", "link"]}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Mode<span className="text-red-500">*</span></label>
                <Select
                  value={proposalMode}
                  onValueChange={(value) => setProposalMode(value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {(allowedModes as readonly string[]).map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode === "onsite" ? "Onsite" : mode === "hybrid" ? "Hybrid" : "Remote"}
                      </SelectItem>
                    ))}
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
                      />
                    ) : (
                      <Popover
                        open={proposalCityPopoverOpen}
                        onOpenChange={(open) => {
                          setProposalCityPopoverOpen(open);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-9 justify-between rounded-lg text-sm"
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
                    />
                  </div>
                </div>
              ) : null}

              {proposalMode === "hybrid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Work from home - days (weekly)<span className="text-red-500">*</span></label>
                    <Select
                      value={proposalWorkFromHomeDays}
                      onValueChange={(v) => setProposalWorkFromHomeDays(v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
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

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Start Date<span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={proposalStartDate}
                    min={proposalStartDateMin}
                    onChange={(e) => setProposalStartDate(normalizeDateInput(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Duration<span className="text-red-500">*</span></label>
                <Select
                  value={proposalDuration}
                  onValueChange={(value) => {
                    setProposalDurationTouched(true);
                    setProposalDuration(value);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 month</SelectItem>
                    <SelectItem value="2m">2 months</SelectItem>
                    <SelectItem value="3m" disabled={isDurationRestricted}>3 months</SelectItem>
                    <SelectItem value="6m" disabled={isDurationRestricted}>6 months</SelectItem>
                  </SelectContent>
                </Select>
                {isDurationRestricted && (
                                  <p className="text-[11px] text-amber-600 flex items-start gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                                    <span>For candidates with Findtern score below 6, duration is limited to 1–2 months.</span>
                                  </p>
                                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Shift Timings<span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={proposalShiftFrom}
                    onValueChange={(value) => setProposalShiftFrom(value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
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
                  <Select
                    value={proposalShiftTo}
                    onValueChange={(value) => setProposalShiftTo(value)}
                  >
                    <SelectTrigger className="h-9 text-sm">
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
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Time Zone<span className="text-red-500">*</span></label>
                <Select
                  value={proposalTimezone}
                  onValueChange={(value) => setProposalTimezone(value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableTimezones || timezones).map((tz) => (
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
                <Select
                  value={proposalLaptop}
                  onValueChange={(value) => setProposalLaptop(value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate" disabled={internHasLaptop === false}>Candidate's Own Laptop</SelectItem>
                    <SelectItem value="company">Company Provided</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Weekly working schedule<span className="text-red-500">*</span></label>
                <Select
                  value={proposalWeeklySchedule}
                  onValueChange={(value) => setProposalWeeklySchedule(value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mon_fri">Monday - Friday</SelectItem>
                    <SelectItem value="mon_sat">Monday - Saturday</SelectItem>
                    <SelectItem value="sun_thu">Sunday - Thursday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Currency<span className="text-red-500">*</span></label>
                <Select
                  value={proposalCurrency}
                  onValueChange={(value) => {
                    setProposalCurrencyTouched(true);
                    setProposalCurrency(value as "INR" | "USD");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
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
                >
                  <SelectTrigger className="h-9 text-sm">
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
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-9 text-sm"
                  value={proposalMonthlyHours}
                  readOnly
                />
                <p className="text-[11px] text-amber-600 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  <span>Auto-calculated: (working days - paid leaves) × 8 hours.</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Monthly Payable Amount<span className="text-red-500">*</span>
                  {proposalCurrency === "INR" && (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">(includes GST)</span>
                  )}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-9 text-sm bg-slate-50"
                  placeholder="0"
                  value={proposalMonthlyAmount}
                  readOnly
                />
                <p className="text-[11px] text-slate-500">Monthly payable amount.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Total Payable Amount<span className="text-red-500">*</span></label>
                 {proposalCurrency === "INR" && (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">(includes GST)</span>
                  )}
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-9 text-sm bg-slate-50"
                  placeholder="0"
                  value={proposalTotalPrice}
                  readOnly
                />
                <p className="text-[11px] text-slate-500">Total amount for the internship.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex-1">
              You can update this proposal and the candidate will see the latest version.
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSaving}
              onClick={async () => {
                const monthlyHoursNum = Number(proposalMonthlyHours || "0");
                const monthlyAmountNum = Number(proposalMonthlyAmount || "0");

                if (isDurationRestricted && (proposalDuration === "3m" || proposalDuration === "6m")) {
                  toast({
                    title: "Duration restricted",
                    description: "Monthly payable is not available for ratings below 6.",
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

                if (!proposalStartDate) {
                  toast({
                    title: "Start date is required",
                    description: "Please select a start date for the internship.",
                    variant: "destructive",
                  });
                  return;
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
                  setIsSaving(true);

                  const tzInfo = await fetchTimeApiZoneInfo(proposalTimezone).catch(() => null);

                  const payloadOffer = {
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
                    startDate: proposalStartDate,
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
                    totalPrice: Number(proposalTotalPrice || monthlyAmountNum * proposalMonths + proposalPerHireCharge),
                  } as Record<string, any>;

                  const res = await fetch(`/api/proposals/${proposalId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      status: formStatus,
                      flowType: formFlowType,
                      currency: proposalCurrency,
                      offerDetails: payloadOffer,
                      aiRatings: formRatings,
                      skills: formSkills
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0),
                    }),
                  });

                  if (!res.ok) {
                    const errJson = await res.json().catch(() => null);
                    const message = errJson?.message || "Failed to update proposal";
                    throw new Error(message);
                  }

                  await queryClient.invalidateQueries({ queryKey: ["/api/proposals", proposalId] });

                  toast({
                    title: "Proposal updated",
                    description: "Your changes have been saved.",
                  });

                  setLocation(`/employer/proposals/${proposalId}`);
                } catch (error: any) {
                  console.error("Update proposal error", error);
                  toast({
                    title: "Failed to update proposal",
                    description: error?.message || "Something went wrong while updating proposal.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
