

import { useEffect, useMemo, useRef, useState } from "react";

import {
  MapPin,
  Star,
  ChevronDown,
  X,
  ShoppingCart,
  Check,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Send,
  Receipt,
  CreditCard,
  Package,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Calendar,
  Briefcase,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  addDaysToDateString,
  formatTimeRangeInTimeZone,
  getIanaTimezonesCached,
  parseDateTimeInTimeZoneToUtc,
  type TimeZoneOption,
} from "@/lib/timezone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import {
  useToast,
} from "@/hooks/use-toast";

import {
  useLocation,
} from "wouter";
import {
  getEmployerAuth,
  inferEmployerIsIndia,
  saveEmployerAuth,
} from "@/lib/employerAuth";
import {
  apiRequest,
} from "@/lib/queryClient";
import { fetchPricingPlans, formatCurrencyMinor, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import {
  EmployerHeader,
} from "@/components/employer/EmployerHeader";
import cityStatePincode from "@/data/cityStatePincode.json";
import {
  timezones,
} from "@shared/schema";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  PolicyConfirmationDialog,
} from "@/components/employer/PolicyConfirmationDialog";

// Types
interface CartCandidate {
  id: string;
  projectId?: string;
  initials: string;
  name: string;
  fullName: string;
  firstName: string;
  lastName: string;
  location: string;
  state: string;
  findternScore: number;
  skills: string[];
  matchedSkills: string[];
  hasLaptop: boolean | null;
  locationTypes: string[];
  preferredLocations: string[];

  profilePhotoName?: string | null;

  aiRatings: {
    communication: number;
    coding: number;
    aptitude: number;
    interview: number;
  };
  experience: string;
  education: string;
  availability: string;
  expectedStipend: string;
  projectName: string;
}

type EmployerProject = {
  id: string;
  projectName?: string;
  project_name?: string;
  status?: string | null;
};

type AcceptedProposal = {
  id: string;
  internId: string;
  internName: string;
  projectName: string;
  projectId?: string;
  status?: string;
  createdAt?: string;
  currency?: string;
  offerDetails?: {
    duration?: string;
    monthlyAmount?: number;
    totalPrice?: number;
    mode?: string;
    location?: string;
    currency?: string;
    fullTimeOffer?: {
      annualCtc?: number;
      ctcCurrency?: string;
    };
  };
};

type ProposalMeta = {
  status: string;
  proposalId: string;
  projectId?: string;
  ts: number;
};

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

function durationLabelFromDuration(duration: string | undefined) {
  switch (String(duration ?? "").toLowerCase()) {
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
}

export default function EmployerCartPage() {
  const [currentLocation, setLocation] = useLocation();
  const {
    toast,
  } = useToast();

  type EmployerCheckoutPaymentMode = "monthly" | "total";

  const normalizeCurrency = (value: unknown): "INR" | "USD" => {
    const v = String(value ?? "").trim().toUpperCase();
    return v === "USD" ? "USD" : "INR";
  };

  const auth = getEmployerAuth();
  const employerId = auth?.id as string | undefined;

  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const selectedProjectIdsStorageKey = "employerSelectedProjectIds";

  const readSelectedProjectIds = () => {
    if (typeof window === "undefined") return [] as string[];
    try {
      const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const out: string[] = [];
      const seen = new Set<string>();
      for (const item of list) {
        const v = String(item ?? "").trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v);
      }
      return out;
    } catch {
      return [] as string[];
    }
  };

  const readSelectedProjectId = () => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
    } catch {
      return "";
    }
  };

  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => readSelectedProjectId());

  const [projects, setProjects] = useState<EmployerProject[]>([]);
  const [projectFilterId, setProjectFilterId] = useState<string>("all");
  const [includedProjectIds, setIncludedProjectIds] = useState<string[]>(() => readSelectedProjectIds());

  const resolveProjectName = (p: any) =>
    String(p?.projectName ?? p?.project_name ?? "").trim();

  const isProjectActive = (p: any) => {
    const statusLower = String(p?.status ?? "active").trim().toLowerCase();
    return statusLower !== "inactive";
  };

  const visibleProjects = useMemo(() => {
    const includedSet = new Set(includedProjectIds.map((id) => String(id ?? "").trim().toLowerCase()).filter(Boolean));
    return projects.filter((p) => {
      if (!p?.id) return false;
      if (!isProjectActive(p)) return false;
      if (includedSet.size === 0) return false;
      return includedSet.has(String(p.id).trim().toLowerCase());
    });
  }, [includedProjectIds, projects]);

  useEffect(() => {
    setProjectFilterId((prev) => {
      const current = String(prev ?? "").trim() || "all";
      if (current === "all") return "all";
      if (visibleProjects.some((p) => String(p.id) === current)) return current;
      return "all";
    });
  }, [visibleProjects]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => setIncludedProjectIds(readSelectedProjectIds());
    sync();

    window.addEventListener("employerProjectsUpdated", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("employerProjectsUpdated", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const getEmployerCartStorageKey = (id: string | undefined, projectId: string | null | undefined) => {
    const e = String(id ?? "").trim();
    const p = String(projectId ?? "").trim();
    if (!e || !p) return "";
    return `employerCartIds:${e}:${p}`;
  };
  const getEmployerCheckoutStorageKey = (id: string | undefined, projectId: string | null | undefined) => {
    const e = String(id ?? "").trim();
    const p = String(projectId ?? "").trim();
    if (!e || !p) return "";
    return `employerCheckoutIds:${e}:${p}`;
  };

  const [internPricingMetaById, setInternPricingMetaById] = useState<
    Record<string, {
      findternScore: number;
      location: string;
      state: string;
    }>
  >({});

  const [acceptedInternIds, setAcceptedInternIds] = useState<Set<string>>(new Set());
  const [acceptedProposals, setAcceptedProposals] = useState<AcceptedProposal[]>([]);
  const [activeTab, setActiveTab] = useState<"cart" | "checkout">("cart");
  const checkoutSectionRef = useRef<HTMLDivElement | null>(null);
  const [shouldScrollToCheckout, setShouldScrollToCheckout] = useState(false);
  const checkoutScrollAttemptRef = useRef(0);

  const acceptedProposalInternIdSet = useMemo(() => {
    const out = new Set<string>();
    for (const p of acceptedProposals) {
      const internId = String(p?.internId ?? "").trim();
      const projectId = String((p as any)?.projectId ?? "").trim();
      if (internId && projectId) out.add(`${projectId}:${internId}`);
    }
    return out;
  }, [acceptedProposals]);

  const [selectedHireProposalIds, setSelectedHireProposalIds] = useState<string[]>([]);
  const [hasInitializedHireSelection, setHasInitializedHireSelection] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const [pendingProposalCandidateId, setPendingProposalCandidateId] = useState<string>("");

  const [cartItems, setCartItems] = useState<CartCandidate[]>([]);
  const [checkoutCartItems, setCheckoutCartItems] = useState<CartCandidate[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCandidate, setDeletingCandidate] = useState<CartCandidate | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<CartCandidate | null>(null);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [meetingTimezone, setMeetingTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [meetingSlots, setMeetingSlots] = useState<{
    slot1: string;
    slot2: string;
    slot3: string;
  }>({
    slot1: "",
    slot2: "",
    slot3: "",
  });

  const [isSendingSlots, setIsSendingSlots] = useState(false);
  const [proposalRoleTitle, setProposalRoleTitle] = useState("");
  const [proposalJD, setProposalJD] = useState("");
  const [proposalMode, setProposalMode] = useState("remote");
  const [proposalLocation, setProposalLocation] = useState("");
  const [proposalLocationState, setProposalLocationState] = useState("");
  const [proposalLocationCity, setProposalLocationCity] = useState("");
  const [proposalCityPopoverOpen, setProposalCityPopoverOpen] = useState(false);
  const [proposalCitySearchQuery, setProposalCitySearchQuery] = useState("");
  const [proposalManualCityState, setProposalManualCityState] = useState(false);
  const [proposalWorkFromHomeDays, setProposalWorkFromHomeDays] = useState("");
  const [proposalWorkFromOfficeDays, setProposalWorkFromOfficeDays] = useState("0");
  const [proposalStartDate, setProposalStartDate] = useState("");
  const [proposalDuration, setProposalDuration] = useState("1m");
  const [proposalShiftFrom, setProposalShiftFrom] = useState("09:00");
  const [proposalShiftTo, setProposalShiftTo] = useState("18:00");
  const [proposalTimezone, setProposalTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [proposalLaptop, setProposalLaptop] = useState("candidate");
  const [proposalWeeklySchedule, setProposalWeeklySchedule] = useState("mon_fri");
  const [proposalPaidLeavesPerMonth, setProposalPaidLeavesPerMonth] = useState("2");
  const [proposalMonthlyHours, setProposalMonthlyHours] = useState("160");

  const weeklyDaysPerWeek = useMemo(() => {
    const scheduleKey = String(proposalWeeklySchedule ?? "").trim().toLowerCase();
    return scheduleKey === "mon_sat" ? 6 : 5;
  }, [proposalWeeklySchedule]);

  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string>("");
  const [photoPreviewAlt, setPhotoPreviewAlt] = useState<string>("");

  const openPhotoPreview = (photoName?: string | null, alt?: string) => {
    const name = String(photoName ?? "").trim();
    if (!name) return;
    setPhotoPreviewSrc(`/uploads/${name}`);
    setPhotoPreviewAlt(String(alt ?? "").trim());
    setIsPhotoPreviewOpen(true);
  };

  const [proposalMonthlyAmount, setProposalMonthlyAmount] = useState("");
  const [proposalTotalPrice, setProposalTotalPrice] = useState("");
  const [proposalJdImages, setProposalJdImages] = useState<string[]>([]);
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [latestInterviewByInternId, setLatestInterviewByInternId] = useState<Record<string, any>>({});
  const [proposalStatusByInternId, setProposalStatusByInternId] = useState<Record<string, string>>({});
  const [hasAnyProposalByInternId, setHasAnyProposalByInternId] = useState<Record<string, boolean>>({});
  const [proposalMetaByInternId, setProposalMetaByInternId] = useState<Record<string, ProposalMeta>>({});
  const [fullTimeOfferProjectByInternId, setFullTimeOfferProjectByInternId] = useState<Record<string, string>>({});

  const hiredProposalInternKeySet = useMemo(() => {
    const out = new Set<string>();
    for (const [key, status] of Object.entries(proposalStatusByInternId)) {
      const s = String(status ?? "").trim().toLowerCase();
      if (s === "hired") out.add(String(key ?? "").trim());
    }
    return out;
  }, [proposalStatusByInternId]);

  const blockedCartInternKeySet = useMemo(() => {
    const out = new Set<string>();
    for (const k of acceptedProposalInternIdSet) out.add(k);
    for (const k of hiredProposalInternKeySet) out.add(k);
    return out;
  }, [acceptedProposalInternIdSet, hiredProposalInternKeySet]);

  const [meetingEligibilityTick, setMeetingEligibilityTick] = useState(0);

  const [viewerIsIndia, setViewerIsIndia] = useState(() => inferEmployerIsIndia(getEmployerAuth()));
  const expectedCurrency: "INR" | "USD" = viewerIsIndia ? "INR" : "USD";
  const [proposalCurrency, setProposalCurrency] = useState<"INR" | "USD">(viewerIsIndia ? "INR" : "USD");
  const [pricingPlans, setPricingPlans] = useState<CmsPlan[]>([]);

  const removeInternIdsFromAllCompareLists = (internIds: string[]) => {
    const ids = (Array.isArray(internIds) ? internIds : [])
      .map((v) => String(v ?? "").trim())
      .filter(Boolean);
    if (ids.length === 0) return;

    try {
      const prefix = "employerCompareIds:";
      const changedKeys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (!key.startsWith(prefix) && key !== "employerCompareIds") continue;

        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const stored = Array.isArray(parsed) ? parsed.map((v) => String(v ?? "").trim()).filter(Boolean) : [];
        const next = stored.filter((id) => !ids.includes(String(id ?? "").trim()));
        if (next.length === stored.length) continue;
        window.localStorage.setItem(key, JSON.stringify(next.slice(0, 5)));
        changedKeys.push(key);
      }
      if (changedKeys.length > 0) {
        window.dispatchEvent(new Event("employerCompareUpdated"));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isProposalDialogOpen) return;
    setProposalCurrency(expectedCurrency);
  }, [expectedCurrency, isProposalDialogOpen]);

  useEffect(() => {
    if (employerId) return;
    setLocation("/employer/login");
  }, [employerId, setLocation]);

  const persistCartState = async (projectId: string, cartIds: string[], checkoutIds: string[]) => {
    if (!employerId) return;
    const pid = String(projectId ?? "").trim();
    if (!pid) return;
    await apiRequest("POST", `/api/employer/${encodeURIComponent(String(employerId))}/cart/sync`, {
      projectId: pid,
      cartIds,
      checkoutIds,
    });
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setMeetingEligibilityTick((v) => v + 1);
    }, 60_000);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const isMeetingBlockingProposal = (interview: any) => {
    void meetingEligibilityTick;
    if (!interview || typeof interview !== "object") return false;
    const status = String(interview?.status ?? "").trim().toLowerCase();
    if (status === "pending") return true;
    if (status !== "scheduled") return false;

    const selectedSlot = Number(interview?.selectedSlot);
    if (!Number.isFinite(selectedSlot) || (selectedSlot !== 1 && selectedSlot !== 2 && selectedSlot !== 3)) {
      return true;
    }

    const slotKey = `slot${selectedSlot}`;
    const rawValue = interview?.[slotKey];
    const d = rawValue ? new Date(rawValue) : null;
    if (!d || Number.isNaN(d.getTime())) return true;

    const unlockAt = d.getTime() + 30 * 60 * 1000;
    return Date.now() < unlockAt;
  };

  const isMeetingBookingDisabled = (interview: any) => {
    if (!interview || typeof interview !== "object") return false;
    const status = String(interview?.status ?? "").trim().toLowerCase();
    if (!status) return false;
    if (status === "expired") return false;
    if (status === "rejected") return false;
    return status === "pending" || status === "scheduled" || status === "completed";
  };

  useEffect(() => {
    if (isProposalDialogOpen) {
      setProposalCurrency(expectedCurrency);
    }
  }, [isProposalDialogOpen, expectedCurrency]);

  useEffect(() => {
    if (activeCandidate?.hasLaptop === false && proposalLaptop === "candidate") {
      setProposalLaptop("company");
    }
  }, [activeCandidate?.hasLaptop, proposalLaptop]);

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

  useEffect(() => {
    const onUpdate = () => {
      const next = readSelectedProjectId();
      setSelectedProjectId((prev) => {
        if (prev === next) return prev;
        setAcceptedInternIds(new Set());
        setAcceptedProposals([]);
        setProposalStatusByInternId({});
        return next;
      });
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
  }, []);

  useEffect(() => {
    if (!employerId) {
      setAcceptedInternIds(new Set());
      setAcceptedProposals([]);
      setProposalStatusByInternId({});
      setFullTimeOfferProjectByInternId({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/proposals`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.proposals ?? []) as any[];

        const unlocked = new Set<string>();
        const acceptedList: AcceptedProposal[] = [];
        const statusByInternKey: Record<string, string> = {};
        const statusTimestampByInternKey: Record<string, number> = {};
        const anyByInternId: Record<string, boolean> = {};
        const nextMetaByInternId: Record<string, ProposalMeta> = {};
        const fullTimeByInternId: Record<string, string> = {};
        const hiredInternIds = new Set<string>();
        for (const p of list) {
          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
          const statusLower = String(p?.status ?? "sent").trim().toLowerCase();
          if (internId && Boolean(p?.isNameUnlocked)) unlocked.add(internId);

          if (
            internId &&
            statusLower &&
            statusLower !== "rejected" &&
            statusLower !== "expired" &&
            statusLower !== "withdrawn"
          ) {
            anyByInternId[internId] = true;
          }

          if (internId && statusLower !== "rejected" && statusLower !== "expired" && statusLower !== "withdrawn") {
            const proposalId = String(p?.id ?? "").trim();
            if (proposalId) {
              const rawTime = p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? null;
              const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
              const ts = Number.isFinite(parsed) ? parsed : 0;
              const prev = nextMetaByInternId[internId];
              if (!prev || ts >= (prev.ts ?? 0)) {
                nextMetaByInternId[internId] = {
                  status: String(p?.status ?? "sent").trim() || "sent",
                  proposalId,
                  projectId: projectId || undefined,
                  ts,
                };
              }
            }
          }

          if (internId && projectId) {
            const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
            const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
            const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
            if (hasFullTimeOffer && !fullTimeByInternId[internId]) {
              fullTimeByInternId[internId] = projectId;
            }
          }

          if (internId && projectId) {
            const status = String(p?.status ?? "sent").trim();
            const key = `${projectId}:${internId}`;
            const rawTime = p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? null;
            const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
            const ts = Number.isFinite(parsed) ? parsed : 0;
            const prevTs = statusTimestampByInternKey[key];
            if (typeof prevTs !== "number" || ts >= prevTs) {
              statusTimestampByInternKey[key] = ts;
              statusByInternKey[key] = status || "sent";
            }

            if (String(status ?? "").trim().toLowerCase() === "hired") {
              hiredInternIds.add(internId);
            }
          }

          if (String(p?.status ?? "").toLowerCase() === "accepted" && !hiredInternIds.has(internId)) {
            acceptedList.push({
              id: String(p?.id ?? ""),
              internId,
              internName: String(p?.internName ?? "Intern"),
              projectName: String(p?.projectName ?? "Project"),
              projectId: String(p?.projectId ?? p?.project_id ?? "").trim() || undefined,
              status: String(p?.status ?? ""),
              createdAt: p?.createdAt,
              currency: String(p?.currency ?? p?.offerDetails?.currency ?? "").trim() || undefined,
              offerDetails: p?.offerDetails ?? {},
            });
          }
        }

        if (cancelled) return;
        setAcceptedInternIds(unlocked);
        setAcceptedProposals(acceptedList.filter((p) => p.id && p.internId));
        setProposalStatusByInternId(statusByInternKey);
        setHasAnyProposalByInternId(anyByInternId);
        setProposalMetaByInternId(nextMetaByInternId);
        setFullTimeOfferProjectByInternId(fullTimeByInternId);
      } catch {
        if (cancelled) return;
        setAcceptedInternIds(new Set());
        setAcceptedProposals([]);
        setProposalStatusByInternId({});
        setHasAnyProposalByInternId({});
        setProposalMetaByInternId({});
        setFullTimeOfferProjectByInternId({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId, projectFilterId]);

  function pad2(value: number) {
    return String(value).padStart(2, "0");
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

  const proposalStartDateMin = formatLocalDateInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const proposalMonths = useMemo(() => monthsFromDuration(proposalDuration), [proposalDuration]);

  const proposalWfhDayOptions = useMemo(() => {
    const maxWfh = Math.max(0, weeklyDaysPerWeek - 1);
    return Array.from({ length: maxWfh }, (_, i) => String(i + 1));
  }, [weeklyDaysPerWeek]);

  function isProposalJdEmpty(html: string) {
    const text = String(html ?? "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
    return text.length === 0;
  }

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

  const removeProposalJdImageAtIndex = (idx: number) => {
    setProposalJdImages((prev) => prev.filter((_, i) => i !== idx));
  };

  function parseDateTimeLocal(value: string) {
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return null;
    const [y, m, d] = datePart.split("-").map((v) => Number(v));
    const [hh, mm] = timePart.split(":").map((v) => Number(v));

    if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  function formatDateTimeLocal(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
      date.getHours(),
    )}:${pad2(date.getMinutes())}`;
  }

  function ceilToMinutes(date: Date, intervalMinutes: number) {
    const ms = date.getTime();
    const intervalMs = intervalMinutes * 60 * 1000;
    const rounded = Math.ceil(ms / intervalMs) * intervalMs;
    return new Date(rounded);
  }

  function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  function clampDate(date: Date, min: Date, max: Date) {
    const t = date.getTime();
    if (t < min.getTime()) return new Date(min.getTime());
    if (t > max.getTime()) return new Date(max.getTime());
    return date;
  }

  const meetingWindowMin = (() => {
    const d = new Date();
    const plus6h = addMinutes(d, 6 * 60);
    return ceilToMinutes(plus6h, 30);
  })();
  const meetingWindowMax = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(23, 59, 0, 0);
    return d;
  })();

  const meetingInputMin = formatDateTimeLocal(meetingWindowMin);
  const meetingInputMax = formatDateTimeLocal(meetingWindowMax);

  const normalizeMeetingSlotValue = (rawValue: string) => {
    const parsed = parseDateTimeLocal(rawValue);
    if (!parsed) return rawValue;

    const snapped = ceilToMinutes(parsed, 30);
    const clamped = clampDate(snapped, meetingWindowMin, meetingWindowMax);
    return formatDateTimeLocal(clamped);
  };

  const buildDefaultMeetingSlots = () => {
    const base = meetingWindowMin;
    return {
      slot1: normalizeMeetingSlotValue(formatDateTimeLocal(base)),
      slot2: normalizeMeetingSlotValue(formatDateTimeLocal(addMinutes(base, 30))),
      slot3: normalizeMeetingSlotValue(formatDateTimeLocal(addMinutes(base, 60))),
    };
  };

  const getMeetingSlotParts = (value: string) => {
    const [datePart, timePart] = value.split("T");
    return {
      date: datePart || "",
      time: timePart || "",
    };
  };

  const combineMeetingSlotParts = (datePart: string, timePart: string) => {
    if (!datePart || !timePart) return "";
    return normalizeMeetingSlotValue(`${datePart}T${timePart}`);
  };

  const isTimeDisabledForDate = (datePart: string, timePart: string) => {
    if (!datePart || !timePart) return true;
    const dt = parseDateTimeLocal(`${datePart}T${timePart}`);
    if (!dt) return true;
    return dt.getTime() < meetingWindowMin.getTime() || dt.getTime() > meetingWindowMax.getTime();
  };

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

  const paidLeaveOptions = useMemo(
    () => ["0", "1", "1.5", "2", "2.5", "3"],
    [],
  );

  const workingDaysBySchedule = useMemo(
    () => ({ mon_fri: 22, mon_sat: 26, sun_thu: 22, hybrid: 22 }) as Record<string, number>,
    [],
  );

  const proposalCityStateOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];
    const seen = new Set<string>(); // declare 'seen' Set here
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
    const preferred = Array.isArray(activeCandidate?.preferredLocations) ? activeCandidate.preferredLocations : [];
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

    return out.length > 0 ? out : proposalCityStateOptions;
  }, [activeCandidate, proposalCityStateOptions]);

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

  const indiaStateLowerSet = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];
    const out = new Set<string>();
    for (const d of districts) {
      const state = String(d?.state ?? "").trim().toLowerCase();
      if (state) out.add(state);
    }
    return out;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const plans = await fetchPricingPlans({
          country: expectedCurrency === "INR" ? "IN" : "",
        });
        if (!cancelled) setPricingPlans(plans);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expectedCurrency]);

  useEffect(() => {
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
  }, [employerId]);

  useEffect(() => {
    if (!employerId) {
      setProjects([]);
      setProjectFilterId("all");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/employer/${encodeURIComponent(String(employerId))}/projects`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.projects ?? []) as any[];
        const mapped = list
          .map((p) => ({
            id: String(p?.id ?? "").trim(),
            projectName: resolveProjectName(p),
            status: p?.status ?? null,
          }))
          .filter((p) => p.id);

        if (cancelled) return;
        setProjects(mapped);

        setProjectFilterId((prev) => {
          if (prev !== "all") return prev;

          const stored = readSelectedProjectId();
          if (stored && mapped.some((p) => p.id === stored)) return stored;
          return prev;
        });
      } catch {
        if (cancelled) return;
        setProjects([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId]);

  const getCandidateRegion = (candidate: { state?: string; location?: string }): "IN" | "INTL" => {
    const stateLower = String(candidate.state ?? "").trim().toLowerCase();
    if (stateLower && indiaStateLowerSet.has(stateLower)) return "IN";

    const locLower = String(candidate.location ?? "").trim().toLowerCase();
    if (locLower.includes(", india") || locLower.endsWith(" india")) return "IN";

    return "INTL";
  };

  const getCandidateHourlyPriceLabel = (
    candidate: { findternScore?: number; state?: string; location?: string },
    currency?: "INR" | "USD",
  ) => {
    const score = Number(candidate.findternScore ?? 0);
    const effectiveCurrency = currency ?? expectedCurrency;
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency: effectiveCurrency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return "Free";
      return `${formatCurrencyMinor(minor, resolved.currency)}/hr`;
    }

    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
    if (effectiveCurrency === "INR") {
      if (tier === "low") return "Free";
      if (tier === "mid") return "₹100/hr";
      return "₹200/hr";
    }
    if (tier === "low") return "Free";
    if (tier === "mid") return "$1/hr";
    return "$2/hr";
  };

  const getCandidateHourlyRate = (
    candidate: { findternScore?: number; state?: string; location?: string },
    currency?: "INR" | "USD",
  ) => {
    const score = Number(candidate.findternScore ?? 0);
    const effectiveCurrency = currency ?? expectedCurrency;
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency: effectiveCurrency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return 0;
      return minor / 100;
    }

    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
    if (tier === "low") return 0;
    if (effectiveCurrency === "INR") return tier === "mid" ? 100 : 200;
    return tier === "mid" ? 1 : 2;
  };

  const getCandidatePerHireChargeAmount = (
    candidate: { findternScore?: number; state?: string; location?: string },
    currency?: "INR" | "USD",
  ) => {
    const score = Number(candidate.findternScore ?? 0);
    const effectiveCurrency = currency ?? expectedCurrency;
    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
    if (tier !== "low") return 0;

    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency: effectiveCurrency });
    if (resolved) {
      const minor = Number(resolved.perHireChargeMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return 0;
      return minor / 100;
    }

    return effectiveCurrency === "INR" ? 5000 : 50;
  };

  const getCandidatePerHireChargeLabel = (
    candidate: { findternScore?: number; state?: string; location?: string },
    currency?: "INR" | "USD",
  ) => {
    const score = Number(candidate.findternScore ?? 0);
    const effectiveCurrency = currency ?? expectedCurrency;
    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
    if (tier !== "low") {
      return effectiveCurrency === "INR" ? "INR 0" : "$0";
    }

    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency: effectiveCurrency });
    if (resolved) {
      const minor = Number(resolved.perHireChargeMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return formatCurrencyMinor(0, resolved.currency);
      return formatCurrencyMinor(minor, resolved.currency);
    }

    const amount = getCandidatePerHireChargeAmount(candidate, effectiveCurrency);
    if (effectiveCurrency === "INR") {
      return amount > 0 ? `INR ${new Intl.NumberFormat("en-IN").format(amount)}` : "INR 0";
    }
    return amount > 0 ? `$${new Intl.NumberFormat("en-US").format(amount)}` : "$0";
  };

  const proposalHourlyRate = useMemo(() => {
    if (!activeCandidate) return 0;
    const meta = internPricingMetaById[String(activeCandidate.id ?? "").trim()];
    return getCandidateHourlyRate({
      findternScore: meta?.findternScore ?? activeCandidate.findternScore ?? 0,
      location: meta?.location ?? activeCandidate.location ?? "",
      state: meta?.state ?? activeCandidate.state ?? "",
    }, proposalCurrency);
  }, [activeCandidate, internPricingMetaById, pricingPlans, proposalCurrency]);

  const activeCandidateFindternScore = useMemo(() => {
    if (!activeCandidate) return 0;
    const meta = internPricingMetaById[String(activeCandidate.id ?? "").trim()];
    const score = Number(meta?.findternScore ?? activeCandidate.findternScore ?? 0);
    return Number.isFinite(score) ? score : 0;
  }, [activeCandidate, internPricingMetaById]);

  const isDurationRestricted = activeCandidateFindternScore < 6;

  useEffect(() => {
    if (!isProposalDialogOpen) return;
    if (!isDurationRestricted) return;
    if (proposalDuration === "3m" || proposalDuration === "6m") {
      setProposalDuration("2m");
    }
  }, [isDurationRestricted, isProposalDialogOpen, proposalDuration]);

  useEffect(() => {
    if (!isProposalDialogOpen) return;
    if (!activeCandidate) return;

    const meta = internPricingMetaById[String(activeCandidate.id ?? "").trim()];
    const score = Number(meta?.findternScore ?? activeCandidate.findternScore ?? 0);
    const location = meta?.location ?? activeCandidate.location ?? "";
    const state = meta?.state ?? activeCandidate.state ?? "";
    const perHire = getCandidatePerHireChargeAmount({ findternScore: score, location, state }, proposalCurrency);

    const hours = Number(proposalMonthlyHours || "0");
    const hoursSafe = Number.isFinite(hours) ? hours : 0;
    const monthlyAmount = proposalHourlyRate > 0 ? Math.max(0, Math.round(proposalHourlyRate * hoursSafe)) : 0;
    const total = Math.max(0, Math.round(monthlyAmount * proposalMonths + perHire));

    setProposalMonthlyAmount(String(monthlyAmount));
    setProposalTotalPrice(String(total));
  }, [
    activeCandidate,
    internPricingMetaById,
    isProposalDialogOpen,
    proposalHourlyRate,
    proposalCurrency,
    proposalMonthlyHours,
    proposalMonths,
  ]);

  useEffect(() => {
    if (!isProposalDialogOpen) return;

    const scheduleKey = String(proposalWeeklySchedule || "mon_fri");
    const workingDays = Number(workingDaysBySchedule[scheduleKey] ?? 22);
    const paidLeaves = Number(proposalPaidLeavesPerMonth || "0");
    const days = Math.max(0, workingDays - (Number.isFinite(paidLeaves) ? paidLeaves : 0));
    const hours = Math.max(0, Math.round(days * 8));
    setProposalMonthlyHours(String(hours));

    if (proposalMode === "hybrid") {
      const wfh = Number(proposalWorkFromHomeDays || "0");
      const wfhSafe = Number.isFinite(wfh) ? wfh : 0;
      const wfo = Math.max(0, weeklyDaysPerWeek - wfhSafe);
      setProposalWorkFromOfficeDays(String(wfo));
    }
  }, [
    isProposalDialogOpen,
    proposalMode,
    proposalPaidLeavesPerMonth,
    proposalWorkFromHomeDays,
    proposalWeeklySchedule,
    weeklyDaysPerWeek,
    workingDaysBySchedule,
  ]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!employerId) {
          if (!cancelled) setInternPricingMetaById({});
          return;
        }

        const projectId = (() => {
          try {
            return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          } catch {
            return "";
          }
        })();
        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`,
        );
        const json = await res.json().catch(() => null);
        const list = (json?.interns || []) as any[];

        const next: Record<string, {
          findternScore: number;
          location: string;
          state: string;
        }> = {};
        for (const row of list) {
          const onboarding = row?.onboarding ?? {};
          const user = row?.user ?? {};
          const id = String(user?.id ?? onboarding?.userId ?? onboarding?.id ?? "").trim();
          if (!id) continue;

          const extra = onboarding?.extraData ?? {};

          const city = String(onboarding?.city ?? "").trim();
          const state = String(onboarding?.state ?? "").trim();
          const location = [city, state].filter(Boolean).join(", ");

          next[id] = {
            findternScore: typeof extra?.findternScore === "number" ? extra.findternScore : 0,
            location,
            state,
          };
        }

        if (!cancelled) setInternPricingMetaById(next);
      } catch {
        if (!cancelled) setInternPricingMetaById({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const toCartCandidate = (item: any, fallbackId: string): CartCandidate | null => {
      const onboarding = item?.onboarding ?? {};
      const user = item?.user ?? {};
      const documents = item?.documents ?? {};

      const id = String(user?.id ?? onboarding?.userId ?? onboarding?.id ?? fallbackId ?? "").trim();
      if (!id) return null;

      const extra = onboarding?.extraData ?? {};

      const userFirst = String(user?.firstName ?? "").trim();
      const userLast = String(user?.lastName ?? "").trim();
      const fullFromUser = `${userFirst} ${userLast}`.trim();

      const fullName = String(extra?.fullName ?? extra?.name ?? fullFromUser ?? "Intern").trim() || "Intern";
      const initials =
        fullName
          .split(/\s+/)
          .filter(Boolean)
          .map((p: string) => p.replace(/[^A-Za-z]/g, ""))
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0]?.toUpperCase() ?? "")
          .join("") || "IN";

      const locationCity = String(onboarding?.city ?? "").trim();
      const locationState = String(onboarding?.state ?? "").trim();
      const location = [locationCity, locationState].filter(Boolean).join(", ");

      const rawSkills = Array.isArray(onboarding?.skills) ? onboarding.skills : [];
      const skills: string[] = rawSkills
        .map((s: any) => (typeof s === "string" ? s : typeof s?.name === "string" ? s.name : ""))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const hasLaptopRaw = onboarding?.hasLaptop;
      const hasLaptop = typeof hasLaptopRaw === "boolean" ? hasLaptopRaw : null;

      const preferences = onboarding?.preferences ?? onboarding?.preference ?? extra?.preferences ?? extra?.preference ?? {};

      const locationTypesRaw = Array.isArray(onboarding?.locationTypes)
        ? onboarding.locationTypes
        : Array.isArray(preferences?.locationTypes)
          ? preferences.locationTypes
          : Array.isArray((onboarding as any)?.location_types)
            ? (onboarding as any).location_types
            : Array.isArray(extra?.locationTypes)
              ? extra.locationTypes
              : Array.isArray((extra as any)?.location_types)
                ? (extra as any).location_types
                : [];
      const locationTypes = Array.isArray(locationTypesRaw)
        ? locationTypesRaw.map((v: any) => String(v ?? "").trim()).filter(Boolean)
        : [];

      const preferredLocationsRaw = Array.isArray(onboarding?.preferredLocations)
        ? onboarding.preferredLocations
        : Array.isArray(preferences?.preferredLocations)
          ? preferences.preferredLocations
          : Array.isArray((onboarding as any)?.preferred_locations)
            ? (onboarding as any).preferred_locations
            : Array.isArray(extra?.preferredLocations)
              ? extra.preferredLocations
              : Array.isArray((extra as any)?.preferred_locations)
                ? (extra as any).preferred_locations
                : [];
      const preferredLocations = Array.isArray(preferredLocationsRaw)
        ? preferredLocationsRaw
            .map((v: any) => {
              if (typeof v === "string") return v;
              if (v && typeof v === "object") {
                const fromCity = typeof v.city === "string" ? v.city : "";
                const fromDistrict = typeof v.district === "string" ? v.district : "";
                const fromState = typeof v.state === "string" ? v.state : "";
                const city = (fromCity || fromDistrict).trim();
                const state = String(fromState ?? "").trim();
                return [city, state].filter(Boolean).join(", ");
              }
              return "";
            })
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

      const experience = String(extra?.experience ?? "").trim();
      const education = String(extra?.education ?? "").trim();
      const availability = String(extra?.availability ?? "").trim();
      const expectedStipend = String(extra?.expectedStipend ?? extra?.stipend ?? "").trim();

      return {
        id,
        initials,
        name: fullName,
        fullName,
        firstName: userFirst,
        lastName: userLast,
        location,
        state: locationState,
        findternScore: typeof extra?.findternScore === "number" ? extra.findternScore : 0,
        skills,
        matchedSkills: skills,
        hasLaptop,
        locationTypes,
        preferredLocations,
        profilePhotoName: documents?.profilePhotoName ?? null,
        aiRatings: {
          communication: Number(extra?.ratings?.communication ?? 0) || 0,
          coding: Number(extra?.ratings?.coding ?? 0) || 0,
          aptitude: Number(extra?.ratings?.aptitude ?? 0) || 0,
          interview: Number(extra?.ratings?.interview ?? 0) || 0,
        },
        experience,
        education,
        availability,
        expectedStipend,
        projectName: "",
      };
    };

    const load = async () => {
      setIsCartLoading(true);
      if (!employerId) {
        if (!cancelled) {
          setCartItems([]);
          setCheckoutCartItems([]);
          setSelectedItems([]);
          setLatestInterviewByInternId({});
          setIsCartLoading(false);
        }
        return;
      }

      let stored: string[] = [];
      let storedCheckout: string[] = [];

      const selectedFilter = String(projectFilterId ?? "").trim();
      const projectIdFromStorage = (() => {
        try {
          return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
        } catch {
          return "";
        }
      })();

      const projectsToLoad = (() => {
        if (selectedFilter === "all") {
          const mapped = visibleProjects.map((p) => ({ id: String(p.id), name: String(p.projectName ?? "").trim() }));
          return mapped;
        }

        return [
          {
            id: selectedFilter || projectIdFromStorage,
            name: String(projects.find((p) => String(p.id) === String(selectedFilter || projectIdFromStorage))?.projectName ?? "").trim(),
          },
        ].filter((p) => p.id);
      })();

      if (selectedFilter === "all") {
        setSelectedItems([]);
      }

      const cartRefs: Array<{ projectId: string; projectName: string; internId: string }> = [];
      const checkoutRefs: Array<{ projectId: string; projectName: string; internId: string }> = [];
      const cartRefKeys = new Set<string>();
      const checkoutRefKeys = new Set<string>();

      for (const p of projectsToLoad) {
        const pid = String(p.id ?? "").trim();
        if (!pid) continue;

        let cartIds: string[] = [];
        let checkoutIds: string[] = [];

        try {
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart?projectId=${encodeURIComponent(pid)}`,
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
            const scopedCartKey = getEmployerCartStorageKey(employerId, pid);
            const scopedCheckoutKey = getEmployerCheckoutStorageKey(employerId, pid);

            const legacyCartRaw = scopedCartKey ? window.localStorage.getItem(scopedCartKey) : null;
            const legacyCheckoutRaw = scopedCheckoutKey ? window.localStorage.getItem(scopedCheckoutKey) : null;

            const legacyCart = legacyCartRaw ? JSON.parse(legacyCartRaw) : [];
            const legacyCheckout = legacyCheckoutRaw ? JSON.parse(legacyCheckoutRaw) : [];

            const legacyCartIds = Array.isArray(legacyCart)
              ? legacyCart.map((v) => String(v).trim()).filter(Boolean)
              : [];
            const legacyCheckoutIds = Array.isArray(legacyCheckout)
              ? legacyCheckout.map((v) => String(v).trim()).filter(Boolean)
              : [];

            if (legacyCartIds.length > 0 || legacyCheckoutIds.length > 0) {
              await persistCartState(pid, legacyCartIds, legacyCheckoutIds);
              cartIds = legacyCartIds;
              checkoutIds = legacyCheckoutIds;
              if (scopedCartKey) window.localStorage.removeItem(scopedCartKey);
              if (scopedCheckoutKey) window.localStorage.removeItem(scopedCheckoutKey);
            }
          } catch {
            // ignore
          }
        }

        for (const id of cartIds) {
          const k = `${pid}:${id}`;
          if (cartRefKeys.has(k)) continue;
          cartRefKeys.add(k);
          cartRefs.push({ projectId: pid, projectName: String(p.name ?? "").trim(), internId: id });
        }
        for (const id of checkoutIds) {
          const k = `${pid}:${id}`;
          if (checkoutRefKeys.has(k)) continue;
          checkoutRefKeys.add(k);
          checkoutRefs.push({ projectId: pid, projectName: String(p.name ?? "").trim(), internId: id });
        }
      }

      const ids = cartRefs.map((r) => r.internId);
      const checkoutIds = checkoutRefs.map((r) => r.internId);
      if (ids.length === 0 && checkoutIds.length === 0) {
        if (!cancelled) {
          setCartItems([]);
          setCheckoutCartItems([]);
          setSelectedItems([]);
          setLatestInterviewByInternId({});
          setIsCartLoading(false);
        }
        return;
      }

      const filteredCartRefs = cartRefs.filter((r) => !blockedCartInternKeySet.has(`${r.projectId}:${r.internId}`));
      const filteredCheckoutRefs = checkoutRefs.filter((r) => !blockedCartInternKeySet.has(`${r.projectId}:${r.internId}`));

      if (filteredCartRefs.length === 0 && filteredCheckoutRefs.length === 0) {
        if (!cancelled) {
          setCartItems([]);
          setCheckoutCartItems([]);
          setSelectedItems([]);
          setLatestInterviewByInternId({});
          setIsCartLoading(false);
        }
        return;
      }

      try {
        const interviewsPromise = fetch(`/api/employer/${encodeURIComponent(String(employerId))}/interviews`);

        const byProjectAndInternId = new Map<string, any>();
        const byInternId = new Map<string, any>();

        const projectsToFetch = projectsToLoad.length > 0 ? projectsToLoad : [];
        for (const p of projectsToFetch) {
          const pid = String(p.id ?? "").trim();
          if (!pid) continue;

          const qs = `?projectId=${encodeURIComponent(pid)}`;
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/interns${qs}`,
          );
          const json = await res.json().catch(() => null);
          const list = (json?.interns || []) as any[];

          for (const row of list) {
            const user = row?.user ?? {};
            const onboarding = row?.onboarding ?? {};
            const candidates = [user?.id, onboarding?.userId, onboarding?.id]
              .map((v) => (v == null ? "" : String(v).trim()))
              .filter(Boolean);
            for (const cid of candidates) {
              const k = `${pid}:${cid}`;
              if (!byProjectAndInternId.has(k)) byProjectAndInternId.set(k, row);
              if (!byInternId.has(cid)) byInternId.set(cid, row);
            }
          }
        }

        const toCandidateWithProject = (ref: { projectId: string; projectName: string; internId: string }) => {
          const k = `${ref.projectId}:${ref.internId}`;
          const row = byProjectAndInternId.get(k) ?? byInternId.get(ref.internId);
          const base = toCartCandidate(row, ref.internId);
          if (!base) return null;
          return {
            ...base,
            projectId: ref.projectId,
            projectName: ref.projectName || base.projectName,
          } as CartCandidate;
        };

        const removedByProject: Record<string, { cart: string[]; checkout: string[] }> = {};
        const remainingCartRefs = filteredCartRefs.filter((ref) => {
          const k = `${ref.projectId}:${ref.internId}`;
          const row = byProjectAndInternId.get(k) ?? byInternId.get(ref.internId);
          const ok = Boolean(row);
          if (!ok) {
            const pid = String(ref.projectId ?? "").trim();
            if (!pid) return false;
            if (!removedByProject[pid]) removedByProject[pid] = { cart: [], checkout: [] };
            removedByProject[pid].cart.push(String(ref.internId ?? "").trim());
          }
          return ok;
        });

        const remainingCheckoutRefs = filteredCheckoutRefs.filter((ref) => {
          const k = `${ref.projectId}:${ref.internId}`;
          const row = byProjectAndInternId.get(k) ?? byInternId.get(ref.internId);
          const ok = Boolean(row);
          if (!ok) {
            const pid = String(ref.projectId ?? "").trim();
            if (!pid) return false;
            if (!removedByProject[pid]) removedByProject[pid] = { cart: [], checkout: [] };
            removedByProject[pid].checkout.push(String(ref.internId ?? "").trim());
          }
          return ok;
        });

        const nextItems = remainingCartRefs
          .map((ref) => toCandidateWithProject(ref))
          .filter(Boolean) as CartCandidate[];

        const nextCheckoutItems = remainingCheckoutRefs
          .map((ref) => toCandidateWithProject(ref))
          .filter(Boolean) as CartCandidate[];

        const removedInternIds = Object.values(removedByProject)
          .flatMap((v) => [...(v?.cart ?? []), ...(v?.checkout ?? [])])
          .map((v) => String(v ?? "").trim())
          .filter(Boolean);

        if (removedInternIds.length > 0) {
          removeInternIdsFromAllCompareLists(removedInternIds);
          void (async () => {
            try {
              for (const [pid, v] of Object.entries(removedByProject)) {
                const projectId = String(pid ?? "").trim();
                if (!projectId) continue;
                const removeCartSet = new Set((v?.cart ?? []).map((x) => String(x ?? "").trim()).filter(Boolean));
                const removeCheckoutSet = new Set((v?.checkout ?? []).map((x) => String(x ?? "").trim()).filter(Boolean));
                const nextCartIds = remainingCartRefs
                  .filter((r) => String(r.projectId) === projectId)
                  .map((r) => String(r.internId ?? "").trim())
                  .filter((id) => id && !removeCartSet.has(id));
                const nextCheckoutIds = remainingCheckoutRefs
                  .filter((r) => String(r.projectId) === projectId)
                  .map((r) => String(r.internId ?? "").trim())
                  .filter((id) => id && !removeCheckoutSet.has(id));
                await persistCartState(projectId, nextCartIds, nextCheckoutIds);
              }
              window.dispatchEvent(new Event("employerCartUpdated"));
            } catch {
              // ignore
            }
          })();
        }

        let nextLatestInterviews: Record<string, any> | null = null;
        try {
          const interviewsRes = await interviewsPromise;
          if (interviewsRes.ok) {
            const interviewsJson = await interviewsRes.json().catch(() => null);
            const interviewsList = (interviewsJson?.interviews ?? []) as any[];
            const out: Record<string, any> = {};
            const latestTsByKey: Record<string, number> = {};
            for (const interview of interviewsList) {
              const internId = String(interview?.internId ?? "").trim();
              if (!internId) continue;

              const interviewProjectId = String(interview?.projectId ?? "").trim();
              if (!interviewProjectId) continue;
              const selectedFilter = String(projectFilterId ?? "").trim();
              if (selectedFilter !== "all") {
                const activeProjectId = selectedFilter || projectIdFromStorage;
                if (activeProjectId && interviewProjectId !== activeProjectId) continue;
              }

              const rawTime =
                interview?.createdAt ?? interview?.created_at ?? interview?.updatedAt ?? interview?.updated_at ?? null;
              const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
              const ts = Number.isFinite(parsed) ? parsed : 0;

              const key = `${interviewProjectId}:${internId}`;
              const prevTs = latestTsByKey[key];
              if (typeof prevTs === "number" && ts <= prevTs) continue;
              latestTsByKey[key] = ts;
              out[key] = interview;
            }
            nextLatestInterviews = out;
          }
        } catch {
          // ignore
        }

        if (cancelled) return;
        setCartItems(nextItems);
        setCheckoutCartItems(nextCheckoutItems);
        setSelectedItems((prev) => {
          const allowed = new Set(nextItems.map((c) => c.id));
          const filtered = prev.filter((id) => allowed.has(id));
          return filtered.length > 0 ? filtered : nextItems.map((c) => c.id);
        });

        if (nextLatestInterviews) {
          setLatestInterviewByInternId(nextLatestInterviews);
        }

        setIsCartLoading(false);
      } catch (error) {
        console.error("Failed to load employer cart items", error);
        if (!cancelled) {
          setCartItems([]);
          setCheckoutCartItems([]);
          setSelectedItems([]);
          setLatestInterviewByInternId({});
          setIsCartLoading(false);
        }
      }
    };

    void load();
    const onUpdate = () => void load();
    window.addEventListener("employerCartUpdated", onUpdate);
    window.addEventListener("employerProjectChanged", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener("employerCartUpdated", onUpdate);
      window.removeEventListener("employerProjectChanged", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [blockedCartInternKeySet, employerId, projectFilterId, visibleProjects, projects]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const projectIdParam = String(params.get("projectId") ?? "").trim();
    const tab = String(params.get("tab") ?? "").toLowerCase();
    const scroll = String(params.get("scroll") ?? "").toLowerCase();
    const hash = String(window.location.hash ?? "").toLowerCase();

    if (projectIdParam) {
      try {
        window.localStorage.setItem(selectedProjectIdStorageKey, projectIdParam);
      } catch {
        // ignore
      }
      setProjectFilterId(projectIdParam);
      try {
        window.dispatchEvent(new Event("employerProjectChanged"));
      } catch {
        // ignore
      }
    }

    if (tab === "checkout" || scroll === "checkout" || hash === "#checkout") {
      setActiveTab("checkout");
      setShouldScrollToCheckout(true);
    }
  }, [currentLocation]);

  useEffect(() => {
    if (!shouldScrollToCheckout) return;
    if (activeTab !== "checkout") return;

    if (typeof window === "undefined") return;

    let cancelled = false;
    let timer: number | null = null;
    checkoutScrollAttemptRef.current = 0;

    const tryScroll = () => {
      if (cancelled) return;

      const el = checkoutSectionRef.current ?? document.getElementById("checkout");
      if (el) {
        setShouldScrollToCheckout(false);
        requestAnimationFrame(() => {
          try {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch {
            // ignore
          }
        });

        if (timer != null) window.clearInterval(timer);
        return;
      }

      checkoutScrollAttemptRef.current += 1;
      if (checkoutScrollAttemptRef.current > 20) {
        setShouldScrollToCheckout(false);
        if (timer != null) window.clearInterval(timer);
      }
    };

    timer = window.setInterval(tryScroll, 50);
    tryScroll();

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
    };
  }, [activeTab, shouldScrollToCheckout]);

  const getShortNameFromFullName = (name: string) => {
    const cleaned = String(name ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";

    const parts = cleaned
      .split(" ")
      .filter(Boolean)
      .map((p: string) => p.replace(/[^A-Za-z]/g, ""))
      .filter(Boolean);

    if (parts.length === 0) return "";
    if (parts.length === 1) return String(parts[0][0] ?? "").toUpperCase();

    const firstInitial = String(parts[0][0] ?? "").toUpperCase();
    const last = parts[parts.length - 1];
    const lastInitial = String(last?.[0] ?? "").toUpperCase();
    return `${firstInitial}${lastInitial}`;
  };

  const getCandidateDisplayName = (candidate: Pick<CartCandidate, "id" | "name" | "initials">) => {
    const rawName = String(candidate.name ?? "").trim();
    const short = getShortNameFromFullName(rawName);
    return short || candidate.initials;
  };

  const getCandidateUnlockedFullName = (candidate: Pick<CartCandidate, "firstName" | "lastName" | "fullName">) => {
    const titleCaseWord = (value: string) => {
      const v = String(value ?? "").trim();
      if (!v) return "";
      return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
    };

    const titleCaseName = (value: string) => {
      const raw = String(value ?? "").trim();
      if (!raw) return "";
      return raw
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => titleCaseWord(p))
        .join(" ");
    };

    const first = String(candidate.firstName ?? "").trim();
    const last = String(candidate.lastName ?? "").trim();
    const full = `${first} ${last}`.trim();
    return titleCaseName(full || candidate.fullName);
  };

  const resolveProjectIdForCandidate = (candidate: CartCandidate) => {
    const direct = String((candidate as any)?.projectId ?? candidate?.projectId ?? "").trim();
    if (direct) return direct;
    const filter = String(projectFilterId ?? "").trim();
    if (filter && filter !== "all") return filter;
    try {
      return String(window.localStorage.getItem(selectedProjectIdStorageKey) ?? "").trim();
    } catch {
      return "";
    }
  };

  const openMeetingDialogForCandidate = (candidate: CartCandidate) => {
    const projectId = resolveProjectIdForCandidate(candidate);
    const key = `${projectId}:${candidate.id}`;
    const latestInterview = latestInterviewByInternId[key];
    const meetingBlocked = isMeetingBookingDisabled(latestInterview);
    if (meetingBlocked) {
      toast({
        title: "Interview already in progress",
        description:
          "You already sent interview slots for this intern. Please wait for the intern to select a slot.",
        variant: "destructive",
      });
      return;
    }

    setActiveCandidate(candidate);
    setMeetingSlots(buildDefaultMeetingSlots());
    setIsMeetingDialogOpen(true);
  };

  const moveCheckoutCandidateToCartAndOpenProposal = (candidate: CartCandidate) => {
    if (!employerId) return;

    setCheckoutCartItems((prev) => prev.filter((c) => c.id !== candidate.id));
    setCartItems((prev) => {
      if (prev.some((c) => c.id === candidate.id)) return prev;
      return [candidate, ...prev];
    });

    void (async () => {
      try {
        const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
        const nextCart = Array.from(new Set([candidate.id, ...cartItems.map((c) => c.id)]));
        const nextCheckout = checkoutCartItems.map((c) => c.id).filter((id) => String(id) !== candidate.id);
        await persistCartState(projectId, nextCart, nextCheckout);
        window.dispatchEvent(new Event("employerCartUpdated"));
      } catch (error) {
        console.error("Failed to move candidate back to cart", error);
      }
    })();

    setPendingProposalCandidateId(candidate.id);
    setActiveTab("cart");
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((c) => c.id));
    }
  };

  const openDeleteDialog = (candidate: CartCandidate) => {
    setDeletingCandidate(candidate);
    setIsDeleteDialogOpen(true);
  };

  const handleRemoveFromCart = () => {
    if (!deletingCandidate) return;
    if (!employerId) return;

    const targetProjectId = resolveProjectIdForCandidate(deletingCandidate);
    if (!targetProjectId) {
      toast({
        title: "Could not remove",
        description: "Project id is missing for this candidate. Please re-open cart from a specific project and try again.",
        variant: "destructive",
      });
      return;
    }

    setCartItems((prev) => {
      const updated = prev.filter((c) => c.id !== deletingCandidate.id);

      void (async () => {
        try {
          await apiRequest(
            "DELETE",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart/items`,
            {
              projectId: targetProjectId,
              listType: "cart",
              internId: String(deletingCandidate.id),
            },
          );

          window.dispatchEvent(new Event("employerCartUpdated"));
        } catch (error) {
          console.error("Failed to persist employer cart", error);
          toast({
            title: "Remove failed",
            description: "Could not remove candidate from cart. Please try again.",
            variant: "destructive",
          });
          window.dispatchEvent(new Event("employerCartUpdated"));
        }
      })();

      return updated;
    });

    setSelectedItems((prev) => prev.filter((id) => id !== deletingCandidate.id));
    setIsDeleteDialogOpen(false);
    setDeletingCandidate(null);

    toast({
      title: "Removed from cart",
      description: "The candidate has been removed from your cart.",
    });
  };

  const handleCheckout = async () => {
    if (!employerId) return;
    const idsToMove = selectedItems.length > 0 ? selectedItems : cartItems.map((c) => c.id);
    if (idsToMove.length === 0) {
      toast({
        title: "No candidates selected",
        description: "Please select at least one candidate to proceed.",
        variant: "destructive",
      });
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
      toast({
        title: "No project selected",
        description: "Please select a project before checking out.",
        variant: "destructive",
      });
      return;
    }

    const moveSet = new Set(idsToMove);
    const movingItems = cartItems.filter((c) => moveSet.has(c.id));
    const remainingItems = cartItems.filter((c) => !moveSet.has(c.id));

    setCartItems(remainingItems);
    setSelectedItems(remainingItems.map((c) => c.id));

    setCheckoutCartItems((prev) => {
      const out: CartCandidate[] = [];
      const seen = new Set<string>();
      for (const c of [...prev, ...movingItems]) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
      }
      return out;
    });

    try {
      const nextCartIds = remainingItems.map((c) => c.id);
      const nextCheckoutIds = Array.from(new Set([...checkoutCartItems.map((c) => c.id), ...idsToMove]));
      await persistCartState(projectId, nextCartIds, nextCheckoutIds);
      window.dispatchEvent(new Event("employerCartUpdated"));
    } catch (error) {
      console.error("Failed to persist checkout move", error);
    }

    setActiveTab("checkout");
    setShouldScrollToCheckout(true);
  };

  const selectedCandidates = cartItems.filter((c) => selectedItems.includes(c.id));

  const parseMoney = (value: string) => {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const normalized = raw.replace(/,/g, "");
    const match = normalized.match(/\d+(?:\.\d+)?/);
    if (!match) return 0;
    const num = Number(match[0]);
    return Number.isFinite(num) ? num : 0;
  };

  const selectedEstimatedMonthlyStipend = selectedCandidates.reduce(
    (sum, c) => sum + parseMoney(c.expectedStipend),
    0,
  );

  const checkoutItems = useMemo(() => {
    return acceptedProposals.map((p) => {
      const offer = p.offerDetails ?? {};
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const months = monthsFromDuration(offer.duration);

      const currency = normalizeCurrency(offer.currency ?? p.currency ?? expectedCurrency);

      const meta = internPricingMetaById[String(p.internId ?? "").trim()];
      const findternScoreRaw = Number(meta?.findternScore ?? 0);
      const findternScore = Number.isFinite(findternScoreRaw) ? findternScoreRaw : 0;
      const monthlyFromOffer = typeof offer.monthlyAmount === "number" ? offer.monthlyAmount : 0;
      const monthly = monthlyFromOffer > 0 ? monthlyFromOffer : 0;
      const totalFromOffer = typeof offer.totalPrice === "number" ? offer.totalPrice : 0;

      const perHire = (() => {
        if (hasFullTimeOffer) {
          const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
          if (!Number.isFinite(annualCtc) || annualCtc <= 0) return 0;
          return Math.max(0, (annualCtc * 8.33) / 100);
        }
        return getCandidatePerHireChargeAmount(
          {
            findternScore,
            location: meta?.location ?? "",
            state: meta?.state ?? "",
          },
          currency,
        );
      })();
      const total = totalFromOffer > 0 ? totalFromOffer : (hasFullTimeOffer ? perHire : monthly * months + perHire);

      const hourlyPriceLabel = getCandidateHourlyPriceLabel({
        findternScore,
        location: meta?.location ?? "",
        state: meta?.state ?? "",
      }, currency);

      const perHireChargeLabel = (() => {
        if (hasFullTimeOffer) {
          const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
          const fee = Number.isFinite(annualCtc) && annualCtc > 0 ? Math.max(0, (annualCtc * 8.33) / 100) : 0;
          const curRaw = String((fullTimeOffer as any)?.ctcCurrency ?? "").trim().toUpperCase();
          const cur = curRaw === "USD" ? "USD" : "INR";
          return new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: cur,
            maximumFractionDigits: 0,
          }).format(fee);
        }
        return getCandidatePerHireChargeLabel(
          {
            findternScore,
            location: meta?.location ?? "",
            state: meta?.state ?? "",
          },
          currency,
        );
      })();

      return {
        proposalId: p.id,
        internId: p.internId,
        candidateName: p.internName,
        projectName: p.projectName,
        durationLabel: durationLabelFromDuration(offer.duration),
        monthlyAmount: hasFullTimeOffer ? 0 : monthly,
        totalPrice: total,
        months,
        findternScore,
        perHireAmount: perHire,
        currency,
        hourlyPriceLabel,
        perHireChargeLabel,
        mode: String(offer.mode ?? "Remote"),
        location: String(offer.location ?? "Location not specified"),
        isFullTimeOffer: hasFullTimeOffer,
        annualCtc: hasFullTimeOffer ? Number((fullTimeOffer as any)?.annualCtc ?? 0) : 0,
        annualCtcCurrency: (() => {
          if (!hasFullTimeOffer) return null;
          const raw = String((fullTimeOffer as any)?.ctcCurrency ?? "").trim().toUpperCase();
          return raw === "USD" ? "USD" : "INR";
        })(),
      };
    });
  }, [acceptedProposals, internPricingMetaById]);

  const getCheckoutItemDiscountedTotal = (item: (typeof checkoutItems)[number] | undefined | null) => {
    if (!item) return 0;
    const score = Number(item.findternScore ?? 0);
    const safeScore = Number.isFinite(score) ? score : 0;
    const months = Number(item.months ?? 1);
    const safeMonths = Number.isFinite(months) && months > 0 ? months : 1;

    const baseTotal = Number(item.totalPrice ?? 0) || 0;
    if (safeScore < 6) return baseTotal;
    if (safeMonths <= 1) return baseTotal;
    return baseTotal;
  };

  const getCheckoutItemUpfrontTotal = (item: (typeof checkoutItems)[number] | undefined | null) => {
    if (!item) return 0;
    const isFullTimeOffer = Boolean((item as any)?.isFullTimeOffer);
    if (isFullTimeOffer) return Number(item.totalPrice ?? 0) || 0;

    const score = Number(item.findternScore ?? 0);
    const safeScore = Number.isFinite(score) ? score : 0;
    const months = Number(item.months ?? 1);
    const safeMonths = Number.isFinite(months) && months > 0 ? months : 1;

    const baseTotal = Number(item.totalPrice ?? 0) || 0;
    if (safeScore < 6) return baseTotal;
    if (safeMonths <= 1) return baseTotal;

    return Math.max(0, Math.round(baseTotal * 0.9));
  };

  const checkoutItemById = useMemo(() => {
    const map = new Map<string, (typeof checkoutItems)[number]>();
    for (const item of checkoutItems) map.set(item.proposalId, item);
    return map;
  }, [checkoutItems]);

  useEffect(() => {
    const allowed = new Set(checkoutItems.map((i) => i.proposalId));
    setSelectedHireProposalIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [checkoutItems]);

  useEffect(() => {
    if (hasInitializedHireSelection) return;
    if (checkoutItems.length === 0) return;
    setSelectedHireProposalIds([checkoutItems[0].proposalId]);
    setHasInitializedHireSelection(true);
  }, [checkoutItems, hasInitializedHireSelection]);

  const toggleSelectHireProposal = (proposalId: string) => {
    setSelectedHireProposalIds((prev) => {
      if (prev.includes(proposalId)) return [];
      return [proposalId];
    });
  };

  const selectedHireTotal = useMemo(() => {
    let total = 0;
    for (const id of selectedHireProposalIds) {
      total += getCheckoutItemDiscountedTotal(checkoutItemById.get(id));
    }
    return total;
  }, [checkoutItemById, selectedHireProposalIds]);

  const selectedHireBaseTotal = useMemo(() => {
    let total = 0;
    for (const id of selectedHireProposalIds) {
      const item = checkoutItemById.get(id) as any;
      total += Number(item?.totalPrice ?? 0) || 0;
    }
    return total;
  }, [checkoutItemById, selectedHireProposalIds]);

  const selectedHireCurrency = useMemo(() => {
    const set = new Set<string>();
    for (const id of selectedHireProposalIds) {
      const c = checkoutItemById.get(id)?.currency;
      if (c) set.add(c);
    }
    if (set.size === 1) return (Array.from(set)[0] as "INR" | "USD");
    if (set.size === 0) return null;
    return null;
  }, [checkoutItemById, selectedHireProposalIds]);

  const isMixedCheckoutCurrency = selectedHireProposalIds.length > 0 && !selectedHireCurrency;

  const checkoutPayTotalLabel = useMemo(() => {
    if (!selectedHireCurrency) return "—";
    const currencyLocale = selectedHireCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: selectedHireCurrency,
      maximumFractionDigits: 0,
    }).format(selectedHireTotal || 0);
  }, [selectedHireCurrency, selectedHireTotal]);

  const checkoutBaseTotalLabel = useMemo(() => {
    if (!selectedHireCurrency) return "—";
    const currencyLocale = selectedHireCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: selectedHireCurrency,
      maximumFractionDigits: 0,
    }).format(selectedHireBaseTotal || 0);
  }, [selectedHireBaseTotal, selectedHireCurrency]);

  const checkoutDiscountAmount = useMemo(() => {
    const discount = Math.max(0, (selectedHireBaseTotal || 0) - (selectedHireTotal || 0));
    return discount;
  }, [selectedHireBaseTotal, selectedHireTotal]);

  const checkoutDiscountLabel = useMemo(() => {
    if (!selectedHireCurrency) return "—";
    const currencyLocale = selectedHireCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: selectedHireCurrency,
      maximumFractionDigits: 0,
    }).format(checkoutDiscountAmount || 0);
  }, [checkoutDiscountAmount, selectedHireCurrency]);

  const loadRazorpayScript = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if ((window as any).Razorpay) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const paySelectedHire = (
    ids: string[],
    paymentMode: EmployerCheckoutPaymentMode,
    opts?: {
      customMonthlyAmountMajor?: number;
    },
  ) => {
    if (ids.length === 0) {
      toast({
        title: "Select a candidate",
        description: "Please select an accepted candidate to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMode === "monthly") {
      const hasRestricted = ids.some((id) => {
        const item = checkoutItemById.get(id) as any;
        const score = Number(item?.findternScore ?? 0);
        return Number.isFinite(score) && score < 6;
      });
      if (hasRestricted) {
        toast({
          title: "Monthly payment unavailable",
          description: "Monthly payable is not available for ratings below 6.",
          variant: "destructive",
        });
        return;
      }
    }

    const currency = (() => {
      const set = new Set<string>();
      for (const id of ids) {
        const c = checkoutItemById.get(id)?.currency;
        if (c) set.add(c);
      }
      if (set.size === 1) return Array.from(set)[0] as "INR" | "USD";
      return null;
    })();

    if (!currency) {
      toast({
        title: "Select same currency",
        description: "Please select candidates with the same currency (INR or USD) for a single payment.",
        variant: "destructive",
      });
      return;
    }

    if (!employerId) {
      toast({
        title: "Please login",
        description: "You need to be logged in to pay.",
        variant: "destructive",
      });
      return setLocation("/employer/login");
    }

    if (isPaying) return;

    void (async () => {
      let navigated = false;
      try {
        setIsPaying(true);

        const ok = await loadRazorpayScript();
        if (!ok) throw new Error("Failed to load payment gateway");

        const customMonthly = Number(opts?.customMonthlyAmountMajor ?? 0);
        const amountMajor =
          paymentMode === "monthly"
            ? Number.isFinite(customMonthly) && customMonthly > 0
              ? customMonthly
              : ids.reduce((sum, id) => {
                  const item = checkoutItemById.get(id);
                  if (!item) return sum;
                  const isFullTimeOffer = Boolean((item as any)?.isFullTimeOffer);
                  const monthly = Number(item.monthlyAmount ?? 0) || 0;
                  const perHire = Number((item as any)?.perHireAmount ?? 0) || 0;
                  return sum + monthly + (isFullTimeOffer ? 0 : perHire);
                }, 0)
            : ids.reduce((sum, id) => {
                const item = checkoutItemById.get(id);
                if (!item) return sum;
                return sum + getCheckoutItemUpfrontTotal(item as any);
              }, 0);

        const amountMinor = Math.round(amountMajor * 100);
        if (!Number.isFinite(amountMinor) || amountMinor <= 0) throw new Error("Invalid amount");

        const orderRes = await apiRequest(
          "POST",
          `/api/employer/${encodeURIComponent(String(employerId))}/payment/razorpay/order`,
          {
            amountMinor,
            currency,
            proposalIds: ids,
            paymentMode,
            customMonthlyAmountMinor:
              paymentMode === "monthly" && Number.isFinite(customMonthly) && customMonthly > 0
                ? Math.round(customMonthly * 100)
                : undefined,
          },
        );

        const orderJson = await orderRes.json().catch(() => null);

        const keyId = String(orderJson?.keyId ?? "");
        const orderId = String(orderJson?.orderId ?? "");
        const gatewayAmount = Number(orderJson?.amountMinor ?? 0);
        const gatewayCurrency = String(orderJson?.currency ?? currency);

        if (!keyId || !orderId || !Number.isFinite(gatewayAmount) || gatewayAmount <= 0) {
          throw new Error("Invalid payment order response");
        }

        await new Promise<void>((resolve, reject) => {
          const RazorpayCtor = (window as any).Razorpay;
          if (!RazorpayCtor) {
            reject(new Error("Payment gateway unavailable"));
            return;
          }

          const options: any = {
            key: keyId,
            amount: gatewayAmount,
            currency: gatewayCurrency,
            name: "Findtern",
            description: paymentMode === "monthly" ? "Employer checkout (Monthly)" : "Employer checkout (Total)",
            order_id: orderId,
            handler: async (response: any) => {
              try {
                const verifyRes = await apiRequest(
                  "POST",
                  `/api/employer/${encodeURIComponent(String(employerId))}/payment/razorpay/verify`,
                  response,
                );

                const verifyJson = await verifyRes.json().catch(() => null);
                const updatedProposalIds = Array.isArray(verifyJson?.updatedProposalIds)
                  ? (verifyJson.updatedProposalIds as string[])
                  : ids;

                if (updatedProposalIds.length > 0) {
                  setAcceptedProposals((prev) => prev.filter((p) => !updatedProposalIds.includes(String(p?.id ?? ""))));
                  setSelectedHireProposalIds((prev) => prev.filter((id) => !updatedProposalIds.includes(String(id ?? ""))));
                }

                window.dispatchEvent(new Event("employerCartUpdated"));

                resolve();
              } catch (e) {
                reject(e instanceof Error ? e : new Error("Payment verification failed"));
              }
            },
            modal: {
              ondismiss: () => {
                reject(new Error("Payment cancelled"));
              },
            },
          };

          const rzp = new RazorpayCtor(options);
          rzp.on("payment.failed", (resp: any) => {
            const msg = resp?.error?.description || "Payment failed";
            reject(new Error(msg));
          });

          try {
            rzp.open();
          } catch {
            reject(new Error("Failed to open payment gateway"));
          }
        });

        toast({
          title: "Payment successful",
          description: "Your hire has been confirmed.",
        });

        try {
          const internIds = ids
            .map((pid) => String(checkoutItemById.get(pid)?.internId ?? "").trim())
            .filter(Boolean);
          removeInternIdsFromAllCompareLists(internIds);
        } catch {
          // ignore
        }
        setActiveTab("checkout");
        navigated = true;
        setLocation("/employer/orders");
      } catch (e) {
        const msg = (e as any)?.message || "Payment failed";
        toast({
          title: "Payment not completed",
          description: msg,
          variant: "destructive",
        });
      } finally {
        if (!navigated) setIsPaying(false);
      }
    })();
  };

  const [isPaymentChoiceOpen, setIsPaymentChoiceOpen] = useState(false);
  const [pendingPayProposalIds, setPendingPayProposalIds] = useState<string[]>([]);

  const pendingPayCurrency = useMemo(() => {
    const set = new Set<string>();
    for (const id of pendingPayProposalIds) {
      const c = checkoutItemById.get(id)?.currency;
      if (c) set.add(c);
    }
    if (set.size === 1) return Array.from(set)[0] as "INR" | "USD";
    return null;
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayBaseTotalAmount = useMemo(() => {
    return pendingPayProposalIds.reduce((sum, id) => {
      const item = checkoutItemById.get(id);
      if (!item) return sum;
      return sum + (Number((item as any)?.totalPrice ?? 0) || 0);
    }, 0);
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayTotalAmount = useMemo(() => {
    return pendingPayProposalIds.reduce((sum, id) => {
      const item = checkoutItemById.get(id);
      if (!item) return sum;
      return sum + getCheckoutItemUpfrontTotal(item);
    }, 0);
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayMonthlyAmount = useMemo(() => {
    return pendingPayProposalIds.reduce((sum, id) => {
      const item = checkoutItemById.get(id);
      if (!item) return sum;
      const isFullTimeOffer = Boolean((item as any)?.isFullTimeOffer);
      const monthly = Number(item.monthlyAmount ?? 0) || 0;
      const perHire = Number((item as any)?.perHireAmount ?? 0) || 0;
      return sum + monthly + (isFullTimeOffer ? 0 : perHire);
    }, 0);
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayHasFullTimeOffer = useMemo(() => {
    return pendingPayProposalIds.some((id) => {
      const item = checkoutItemById.get(id) as any;
      return Boolean(item?.isFullTimeOffer);
    });
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayHasScoreRestricted = useMemo(() => {
    return pendingPayProposalIds.some((id) => {
      const item = checkoutItemById.get(id) as any;
      const score = Number(item?.findternScore ?? 0);
      return Number.isFinite(score) && score < 6;
    });
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayHasDiscount = useMemo(() => {
    return pendingPayProposalIds.some((id) => {
      const item = checkoutItemById.get(id) as any;
      if (!item) return false;
      const score = Number(item?.findternScore ?? 0);
      const months = Number(item?.months ?? 1);
      return Number.isFinite(score) && score >= 6 && Number.isFinite(months) && months > 1;
    });
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayAllOneMonth = useMemo(() => {
    if (pendingPayProposalIds.length === 0) return false;
    return pendingPayProposalIds.every((id) => {
      const item = checkoutItemById.get(id) as any;
      if (item?.isFullTimeOffer) return false;
      const months = Number(item?.months ?? 1);
      return Number.isFinite(months) && months <= 1;
    });
  }, [checkoutItemById, pendingPayProposalIds]);

  const pendingPayTotalLabel = useMemo(() => {
    if (!pendingPayCurrency) return "—";
    const currencyLocale = pendingPayCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: pendingPayCurrency,
      maximumFractionDigits: 0,
    }).format(pendingPayTotalAmount || 0);
  }, [pendingPayCurrency, pendingPayTotalAmount]);

  const pendingPayMonthlyLabel = useMemo(() => {
    if (!pendingPayCurrency) return "—";
    const currencyLocale = pendingPayCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: pendingPayCurrency,
      maximumFractionDigits: 0,
    }).format(pendingPayMonthlyAmount || 0);
  }, [pendingPayCurrency, pendingPayMonthlyAmount]);

  const pendingPayMonthlyDisplayLabel = useMemo(() => {
    if (!pendingPayCurrency) return "—";
    if (pendingPayHasFullTimeOffer) {
      const currencyLocale = pendingPayCurrency === "INR" ? "en-IN" : "en-US";
      return new Intl.NumberFormat(currencyLocale, {
        style: "currency",
        currency: pendingPayCurrency,
        maximumFractionDigits: 0,
      }).format(0);
    }
    if (!pendingPayHasScoreRestricted) return pendingPayMonthlyLabel;
    const currencyLocale = pendingPayCurrency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(currencyLocale, {
      style: "currency",
      currency: pendingPayCurrency,
      maximumFractionDigits: 0,
    }).format(0);
  }, [pendingPayCurrency, pendingPayHasFullTimeOffer, pendingPayHasScoreRestricted, pendingPayMonthlyLabel]);

  const handlePaySelectedHire = (proposalIds?: string[]) => {
    const ids = Array.isArray(proposalIds) ? proposalIds : selectedHireProposalIds;
    if (ids.length === 0) {
      toast({
        title: "No candidates selected",
        description: "Select at least one candidate to pay.",
        variant: "destructive",
      });
      return;
    }

    if (String(projectFilterId ?? "").trim() === "all") {
      const projects = new Set<string>();
      for (const id of ids) {
        const name = String((checkoutItemById.get(id) as any)?.projectName ?? "").trim();
        if (name) projects.add(name);
      }
      if (projects.size > 1) {
        toast({
          title: "Select a project",
          description: "Payment is available only when a single project is selected.",
          variant: "destructive",
        });
        return;
      }
    }

    const currency = (() => {
      const set = new Set<string>();
      for (const id of ids) {
        const c = checkoutItemById.get(id)?.currency;
        if (c) set.add(c);
      }
      if (set.size === 1) return Array.from(set)[0] as "INR" | "USD";
      return null;
    })();

    if (!currency) {
      toast({
        title: "Select same currency",
        description: "Please select candidates with the same currency (INR or USD) for a single payment.",
        variant: "destructive",
      });
      return;
    }

    if (!employerId) {
      toast({
        title: "Please login",
        description: "You need to be logged in to pay.",
        variant: "destructive",
      });
      setLocation("/employer/login");
      return;
    }

    if (isPaying) return;

    setPendingPayProposalIds(ids);
    setIsPaymentChoiceOpen(true);
  };

  const checkoutBadgeCount = checkoutCartItems.length + checkoutItems.length;

  const resolveStateFromCity = (city: string) => {
    const c = String(city ?? "").trim().toLowerCase();
    if (!c) return "";
    const match = proposalCityStateOptions.find((item) => String(item.city ?? "").trim().toLowerCase() === c);
    return String(match?.state ?? "").trim();
  };

  const candidateLockedCityState = useMemo(() => {
    if (!activeCandidate) return { city: "", state: "" };

    const preferred = Array.isArray(activeCandidate.preferredLocations) ? activeCandidate.preferredLocations : [];
    const preferredFirst = String(preferred[0] ?? "").trim();
    if (preferredFirst) {
      const parts = preferredFirst
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const city = String(parts[0] ?? "").trim();
      const explicitState = String(parts[1] ?? "").trim();
      return { city, state: explicitState || resolveStateFromCity(city) };
    }

    const loc = String(activeCandidate.location ?? "").trim();
    const parts = loc
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const city = String(parts[0] ?? "").trim();
    const state = String(activeCandidate.state ?? parts[1] ?? "").trim();
    return { city, state };
  }, [activeCandidate, resolveStateFromCity]);

  const candidatePreferredMode = useMemo(() => {
    const raw = Array.isArray(activeCandidate?.locationTypes) ? activeCandidate?.locationTypes : [];
    const types = raw
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter((v) => v === "remote" || v === "onsite" || v === "hybrid");

    const set = new Set(types);
    if (set.has("onsite")) return "onsite";
    if (set.has("hybrid")) return "hybrid";
    if (set.has("remote")) return "remote";
    return "";
  }, [activeCandidate]);

  const allowedProposalModes = useMemo(() => {
    if (candidatePreferredMode === "remote") return ["remote"];
    if (candidatePreferredMode === "hybrid") return ["remote", "hybrid"];
    if (candidatePreferredMode === "onsite") return ["remote", "hybrid", "onsite"];
    return ["remote", "hybrid", "onsite"];
  }, [candidatePreferredMode]);

  const isCandidateModeLocked = allowedProposalModes.length === 1;
  const isCandidateLaptopLocked = false;
  const shouldPrefillCityState =
    proposalMode !== "remote" &&
    Boolean(candidateLockedCityState.city) &&
    Boolean(candidateLockedCityState.state);

  useEffect(() => {
    if (!isProposalDialogOpen) return;
    if (!activeCandidate) return;

    if (candidatePreferredMode && proposalMode && !allowedProposalModes.includes(proposalMode)) {
      setProposalMode(candidatePreferredMode);
    }

    if (shouldPrefillCityState && !proposalLocationCity.trim() && !proposalLocationState.trim()) {
      const { city, state } = candidateLockedCityState;
      if (city && state) {
        setProposalManualCityState(false);
        setProposalCityPopoverOpen(false);
        setProposalCitySearchQuery("");
        setProposalLocationCity(city);
        setProposalLocationState(state);
      }
    }
  }, [
    activeCandidate,
    candidateLockedCityState,
    candidatePreferredMode,
    allowedProposalModes,
    isProposalDialogOpen,
    proposalLocationCity,
    proposalLocationState,
    proposalMode,
    shouldPrefillCityState,
  ]);

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

  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const policyConfirmActionRef = useRef<null | (() => void | Promise<void>)>(null);
  const requestPolicyConfirmation = (action: () => void | Promise<void>) => {
    policyConfirmActionRef.current = action;
    setIsPolicyDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 overflow-x-hidden">
      <EmployerHeader active="cart" />

      <PolicyConfirmationDialog
        open={isPolicyDialogOpen}
        onOpenChange={setIsPolicyDialogOpen}
        confirmLabel="Continue"
        onConfirm={async () => {
          setIsPolicyDialogOpen(false);
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

      <Dialog
        open={isPaymentChoiceOpen}
        onOpenChange={(open) => {
          setIsPaymentChoiceOpen(open);
          if (!open) {
            setPendingPayProposalIds([]);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose payment option</DialogTitle>
            <DialogDescription>
              Select how you want to pay for the selected candidate{pendingPayProposalIds.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-auto py-4 px-4 rounded-xl justify-between"
              disabled={
                isPaying ||
                pendingPayProposalIds.length === 0 ||
                pendingPayHasScoreRestricted ||
                pendingPayHasFullTimeOffer
              }
              onClick={() => {
                const ids = pendingPayProposalIds;
                setIsPaymentChoiceOpen(false);
                setPendingPayProposalIds([]);
                paySelectedHire(ids, "monthly");
              }}
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900">Monthly payable (first month)</div>
                <div className="text-xs text-slate-500 mt-1">
                  {pendingPayHasFullTimeOffer
                    ? "Not available for full-time offers"
                    : pendingPayHasScoreRestricted
                      ? "Not available for ratings below 6"
                      : " Pay monthly"}
                </div>
              </div>
              <div className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{pendingPayMonthlyDisplayLabel}</div>
            </Button>

            {(() => {
              const allowTotalForOneMonth5000 =
                pendingPayCurrency === "INR" && pendingPayAllOneMonth && Number(pendingPayBaseTotalAmount || 0) === 5000;

              return (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-auto py-4 px-4 rounded-xl justify-between"
                  disabled={isPaying || pendingPayProposalIds.length === 0}
                  onClick={() => {
                    const ids = pendingPayProposalIds;
                    setIsPaymentChoiceOpen(false);
                    setPendingPayProposalIds([]);
                    paySelectedHire(ids, "total");
                  }}
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-900">Total amount</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {pendingPayHasFullTimeOffer
                        ? "Pay one-time hiring fee"
                        : pendingPayAllOneMonth
                          ? "Pay for 1 month duration"
                          : pendingPayHasDiscount
                            ? "Pay full duration upfront (10% discount)"
                            : "Pay full duration upfront"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{pendingPayTotalLabel}</div>
                </Button>
              );
            })()}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setIsPaymentChoiceOpen(false)}
              disabled={isPaying}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Your Cart</h1>
              <p className="text-slate-500 text-sm">
                {isCartLoading
                  ? "Loading candidates..."
                  : `${cartItems.length} candidate${cartItems.length !== 1 ? "s" : ""} in your cart`}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="text-xs font-medium text-slate-600">Project</div>
            <Select
              value={projectFilterId}
              onValueChange={(value) => {
                const v = String(value ?? "").trim();
                setProjectFilterId(v || "all");
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[320px] bg-white">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {visibleProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {resolveProjectName(p) || `Project ${String(p.id)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="mb-6 p-2 border-0 shadow-md rounded-2xl bg-white">
          <div className="relative flex items-center gap-1 rounded-2xl bg-slate-50 p-1">
            <div
              className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-emerald-600 shadow-sm transition-transform duration-300 ease-out ${
                activeTab === "checkout" ? "translate-x-full" : "translate-x-0"
              }`}
            />

            <button
              type="button"
              aria-selected={activeTab === "cart"}
              onClick={() => {
                setShouldScrollToCheckout(false);
                setActiveTab("cart");
              }}
              className={`relative z-10 inline-flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                activeTab === "cart" ? "text-white" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
            </button>

            <button
              type="button"
              aria-selected={activeTab === "checkout"}
              onClick={() => {
                setShouldScrollToCheckout(false);
                setActiveTab("checkout");
              }}
              className={`relative z-10 inline-flex h-9 flex-1 items-center justify-center rounded-xl text-xs font-medium transition-colors ${
                activeTab === "checkout" ? "text-white" : "text-slate-700 hover:text-slate-900"
              }`}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Checkout
              {checkoutBadgeCount > 0 ? (
                <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                  {checkoutBadgeCount}
                </span>
              ) : null}
            </button>
          </div>
        </Card>

        {activeTab === "checkout" ? (
          <div id="checkout" ref={checkoutSectionRef} className="space-y-4">
            {isCartLoading ? (
              <Card className="p-10 rounded-3xl border-dashed border-slate-200 bg-white/80 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-semibold">Loading...</span>
                </div>
              </Card>
            ) : checkoutCartItems.length === 0 && checkoutItems.length === 0 ? (
              <Card className="p-10 rounded-3xl border-dashed border-slate-200 bg-white/80 text-center">
                <p className="text-base font-semibold text-slate-800">No candidates in checkout</p>
                <p className="text-sm text-slate-500 mt-1">Select candidates from your cart and proceed to checkout.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  {checkoutCartItems.length > 0 ? (
                    <div className="space-y-3">
                      {checkoutCartItems.map((candidate) => (
                        <Card
                          key={`${resolveProjectIdForCandidate(candidate)}:${candidate.id}`}
                          className="p-5 border border-slate-100 shadow-sm rounded-2xl bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-slate-900 truncate">{getCandidateDisplayName(candidate)}</p>
                              {projectFilterId === "all" && String((candidate as any)?.projectName ?? "").trim() ? (
                                <div className="mt-1">
                                  <Badge variant="secondary" className="text-[11px]">
                                    {String((candidate as any)?.projectName ?? "").trim()}
                                  </Badge>
                                </div>
                              ) : null}
                              <p className="text-xs text-slate-600 mt-1">
                                {(() => {
                                  const raw = String((candidate as any)?.location ?? "").trim();
                                  if (!raw) return "Location not specified";
                                  const first = raw.split(",")[0]?.trim();
                                  return first || raw;
                                })()}
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-xl text-xs"
                                onClick={() =>
                                  setLocation(
                                    `/employer/intern/${encodeURIComponent(candidate.id)}?returnTo=${encodeURIComponent(currentLocation)}`,
                                  )
                                }
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                View Profile
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:blur-[1px] disabled:pointer-events-none"
                                disabled={(() => {
                                  const key = `${resolveProjectIdForCandidate(candidate)}:${candidate.id}`;
                                  const latestInterview = latestInterviewByInternId[key];
                                  return isMeetingBookingDisabled(latestInterview);
                                })()}
                                onClick={() => openMeetingDialogForCandidate(candidate)}
                              >
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                Book Meeting
                              </Button>
                              <Button
                                type="button"
                                className="h-9 rounded-xl text-xs bg-emerald-600 enabled:hover:bg-emerald-700"
                                disabled={(() => {
                                  const key = `${resolveProjectIdForCandidate(candidate)}:${candidate.id}`;
                                  const statusLower = String(proposalStatusByInternId[key] ?? "").trim().toLowerCase();
                                  const proposalSent =
                                    statusLower.length > 0 &&
                                    statusLower !== "rejected" &&
                                    statusLower !== "expired" &&
                                    statusLower !== "withdrawn";
                                  const anyProposalSent = Boolean(hasAnyProposalByInternId[String(candidate.id ?? "").trim()]);
                                  const meta = proposalMetaByInternId[String(candidate.id ?? "").trim()];
                                  const metaStatusLower = String(meta?.status ?? "").trim().toLowerCase();
                                  const canViewExisting =
                                    metaStatusLower.length > 0 &&
                                    metaStatusLower !== "rejected" &&
                                    metaStatusLower !== "expired" &&
                                    metaStatusLower !== "withdrawn" &&
                                    !!String(meta?.proposalId ?? "").trim();
                                  const latestInterview = latestInterviewByInternId[key];
                                  if (canViewExisting) return false;
                                  return proposalSent || anyProposalSent || isMeetingBlockingProposal(latestInterview);
                                })()}
                                onClick={() =>
                                  requestPolicyConfirmation(() => {
                                    const key = `${resolveProjectIdForCandidate(candidate)}:${candidate.id}`;
                                    const statusLower = String(proposalStatusByInternId[key] ?? "").trim().toLowerCase();
                                    const proposalSent =
                                      statusLower.length > 0 &&
                                      statusLower !== "rejected" &&
                                      statusLower !== "expired" &&
                                      statusLower !== "withdrawn";
                                    const anyProposalSent = Boolean(hasAnyProposalByInternId[String(candidate.id ?? "").trim()]);
                                    const meta = proposalMetaByInternId[String(candidate.id ?? "").trim()];
                                    const metaStatusLower = String(meta?.status ?? "").trim().toLowerCase();
                                    const proposalId = String(meta?.proposalId ?? "").trim();
                                    if (
                                      metaStatusLower &&
                                      metaStatusLower !== "rejected" &&
                                      metaStatusLower !== "expired" &&
                                      metaStatusLower !== "withdrawn" &&
                                      proposalId
                                    ) {
                                      setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`);
                                      return;
                                    }
                                    const latestInterview = latestInterviewByInternId[key];
                                    const blocked = isMeetingBlockingProposal(latestInterview);
                                    if (blocked) {
                                      toast({
                                        title: "Cannot send proposal",
                                        description: "The proposal cannot be sent until the meeting/interview is completed.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    if (
                                      proposalSent ||
                                      anyProposalSent ||
                                      (metaStatusLower &&
                                        metaStatusLower !== "rejected" &&
                                        metaStatusLower !== "expired" &&
                                        metaStatusLower !== "withdrawn")
                                    ) {
                                      toast({
                                        title: "Proposal already sent",
                                        description: "Proposal has been sent, please check proposal page for candidate status.",
                                      });
                                      return;
                                    }
                                    moveCheckoutCandidateToCartAndOpenProposal(candidate);
                                  })
                                }
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
                                {(() => {
                                  const meta = proposalMetaByInternId[String(candidate.id ?? "").trim()];
                                  const statusLower = String(meta?.status ?? "").trim().toLowerCase();
                                  const proposalId = String(meta?.proposalId ?? "").trim();
                                  if (
                                    statusLower &&
                                    statusLower !== "rejected" &&
                                    statusLower !== "expired" &&
                                    statusLower !== "withdrawn" &&
                                    proposalId
                                  ) {
                                    return "View Sent Proposal";
                                  }
                                  return "Send Proposal";
                                })()}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : null}

                  {checkoutItems.length > 0 ? (
                    <div className="space-y-3">
                      {checkoutItems.map((item) => {
                        const currencyLocale = item.currency === "INR" ? "en-IN" : "en-US";
                        const monthlyLabel = new Intl.NumberFormat(currencyLocale, {
                          style: "currency",
                          currency: item.currency,
                          maximumFractionDigits: 0,
                        }).format(item.monthlyAmount || 0);

                        const annualCtcLabel = (() => {
                          if (!(item as any)?.isFullTimeOffer) return "";
                          const cur =
                            String((item as any)?.annualCtcCurrency ?? item.currency).toUpperCase() === "USD"
                              ? "USD"
                              : "INR";
                          const locale = cur === "INR" ? "en-IN" : "en-US";
                          return new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: cur,
                            maximumFractionDigits: 0,
                          }).format(Number((item as any)?.annualCtc ?? 0) || 0);
                        })();

                        const discountedTotal = getCheckoutItemDiscountedTotal(item);
                        const totalLabel = new Intl.NumberFormat(currencyLocale, {
                          style: "currency",
                          currency: item.currency,
                          maximumFractionDigits: 0,
                        }).format(discountedTotal || 0);

                        return (
                          <Card
                            key={item.proposalId}
                            className="p-5 border border-slate-100 shadow-sm rounded-2xl bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div className="pt-1">
                                <Checkbox
                                  checked={selectedHireProposalIds.includes(item.proposalId)}
                                  onCheckedChange={() => toggleSelectHireProposal(item.proposalId)}
                                  className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-base font-semibold text-slate-900 truncate">
                                        {getShortNameFromFullName(item.candidateName) || item.candidateName}
                                      </p>
                                      <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">
                                        Accepted
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1">
                                      <span className="font-medium text-slate-700">Project:</span> {item.projectName}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                      {(() => {
                                        const raw = String((item as any)?.location ?? "").trim();
                                        if (!raw) return "-";
                                        const first = raw.split(",")[0]?.trim();
                                        return first || raw;
                                      })()}
                                      · {item.mode} · {item.durationLabel}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-700"
                                      >
                                        {(item as any)?.isFullTimeOffer ? "Annual CTC" : "Monthly"}: {(item as any)?.isFullTimeOffer
                                          ? annualCtcLabel
                                          : monthlyLabel}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-2 py-0.5 rounded-full border-emerald-200 text-emerald-700 bg-emerald-50"
                                      >
                                        Total: {totalLabel}
                                      </Badge>
                                      {!(item as any)?.isFullTimeOffer ? (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-700"
                                        >
                                          Price: {item.hourlyPriceLabel}
                                        </Badge>
                                      ) : null}
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-700"
                                      >
                                        {(item as any)?.isFullTimeOffer
                                          ? `One-time hiring fee (8.33%): ${item.perHireChargeLabel}`
                                          : `Per hire: ${item.perHireChargeLabel}`}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-9 rounded-xl text-xs"
                                      onClick={() =>
                                        setLocation(
                                          `/employer/intern/${encodeURIComponent(item.internId)}?returnTo=${encodeURIComponent(currentLocation)}`,
                                        )
                                      }
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                      View Profile
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-9 rounded-xl text-xs bg-emerald-600 enabled:hover:bg-emerald-700"
                                      disabled={isPaying}
                                      onClick={() => handlePaySelectedHire([item.proposalId])}
                                    >
                                      {isPaying ? (
                                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                      ) : (
                                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                                      )}
                                      {isPaying ? "Processing..." : "Proceed to Hire"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-1">
                  <Card className="p-6 border-0 shadow-xl rounded-3xl bg-white lg:sticky lg:top-24">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      Order Summary
                    </h2>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Selected Candidates</span>
                        <span className="font-semibold text-slate-800">{selectedHireProposalIds.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total in Checkout</span>
                        <span className="text-slate-800">{checkoutItems.length}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Total</span>
                        <span className="font-semibold text-slate-800">{checkoutBaseTotalLabel}</span>
                      </div>

                      {/* <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Discount</span>
                        <span className="font-semibold text-emerald-700">-{checkoutDiscountLabel}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Final Payable</span>
                        <span className="font-semibold text-slate-800">{checkoutPayTotalLabel}</span>
                      </div> */}
                      <Separator />
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                      <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-emerald-800 mb-1">What happens next?</p>
                          <p className="text-emerald-700 text-xs">
                            After checkout, our team will reach out to confirm details and connect you with the selected candidates.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setLocation("/employer/dashboard")}
                      className="w-full text-slate-600 hover:text-emerald-600"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Continue Browsing
                    </Button>

                    <Button
                      type="button"
                      className="w-full h-11 rounded-xl bg-emerald-600 enabled:hover:bg-emerald-700 mt-3"
                      disabled={!selectedHireProposalIds.length || isPaying || isMixedCheckoutCurrency}
                      onClick={() => handlePaySelectedHire()}
                    >
                      {isPaying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {isPaying ? "Processing..." : "Pay"}
                    </Button>
                  </Card>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Select All Header */}
              {/* <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedItems.length === cartItems.length}
                    onCheckedChange={toggleSelectAll}
                    className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                  />
                  <span className="text-sm text-slate-700">Select all</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                  className="text-sm text-emerald-600 enabled:hover:text-emerald-700"
                >
                  Checkout
                </Button>
              </div> */}

              {/* Candidate Cards */}
              {isCartLoading ? (
                <Card className="p-10 rounded-3xl border-dashed border-slate-200 bg-white/80 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-semibold">Loading...</span>
                  </div>
                </Card>
              ) : cartItems.length === 0 ? (
                <Card className="p-10 rounded-3xl border-dashed border-slate-200 bg-white/80 text-center">
                  <p className="text-base font-semibold text-slate-800">No candidates in your cart</p>
                  <p className="text-sm text-slate-500 mt-1">Add candidates from the dashboard to see them here.</p>
                </Card>
              ) : (
                cartItems.map((candidate) => (
                <Card
                  key={`${String((candidate as any)?.projectId ?? "").trim()}:${candidate.id}`}
                  className={`p-5 border-2 shadow-lg rounded-2xl bg-white transition-all ${
                    selectedItems.includes(candidate.id)
                      ? "border-emerald-300 shadow-emerald-100"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="pt-1">
                      {/* <Checkbox
                        checked={selectedItems.includes(candidate.id)}
                        onCheckedChange={() => toggleSelectItem(candidate.id)}
                        className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                      /> */}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <Avatar
                            className={`w-16 h-16 rounded-2xl${candidate.profilePhotoName ? " cursor-pointer" : ""}`}
                            onClick={() => openPhotoPreview(candidate.profilePhotoName, getCandidateDisplayName(candidate))}
                          >
                            {candidate.profilePhotoName ? (
                              <AvatarImage src={`/uploads/${candidate.profilePhotoName}`} alt={getCandidateDisplayName(candidate)} />
                            ) : null}
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl font-bold text-white">
                              {candidate.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-800 truncate">{getCandidateDisplayName(candidate)}</h3>
                          {projectFilterId === "all" && String((candidate as any)?.projectName ?? "").trim() ? (
                            <div className="mt-1">
                              {/* <Badge variant="secondary" className="text-[11px]">
                                {String((candidate as any)?.projectName ?? "").trim()}
                              </Badge> */}
                            </div>
                          ) : null}
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span className="truncate">
                              {(() => {
                                const raw = String((candidate as any)?.location ?? "").trim();
                                if (!raw) return "-";
                                const first = raw.split(",")[0]?.trim();
                                return first || raw;
                              })()}
                            </span>
                          </p>
                        </div>

                        <div className="hidden sm:flex flex-wrap items-center gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setLocation(
                                `/employer/intern/${encodeURIComponent(candidate.id)}?returnTo=${encodeURIComponent(currentLocation)}`,
                              )
                            }
                            className="h-9 px-3 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span className="text-xs font-semibold">View Profile</span>
                          </Button>
                          {(() => {
                            const key = `${resolveProjectIdForCandidate(candidate)}:${candidate.id}`;
                            const latestInterview = latestInterviewByInternId[key];
                            const meetingDisabled = isMeetingBookingDisabled(latestInterview);

                            const button = (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={meetingDisabled}
                                onClick={() => {
                                  if (meetingDisabled) {
                                    toast({
                                      title: "Interview already in progress",
                                      description:
                                        "You already sent interview slots for this intern. Please wait for the intern to select a slot.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  setActiveCandidate(candidate);
                                  setMeetingSlots(buildDefaultMeetingSlots());
                                  setMeetingTimezone(() => {
                                    try {
                                      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
                                    } catch {
                                      return "UTC";
                                    }
                                  });
                                  void (async () => {
                                    try {
                                      const auth = getEmployerAuth();
                                      const employerId = auth?.id as string | undefined;
                                      if (!employerId) return;

                                      const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
                                      if (!projectsRes.ok) return;
                                      const projectsJson = await projectsRes.json().catch(() => null);
                                      const projectsList = (projectsJson?.projects ?? []) as any[];

                                      const resolvedProjectId = resolveProjectIdForCandidate(candidate);
                                      const projectToUse = resolvedProjectId
                                        ? projectsList.find((p) => String(p?.id ?? "") === String(resolvedProjectId)) ?? projectsList[0]
                                        : projectsList[0];

                                      const tz = String(projectToUse?.timezone ?? "").trim();
                                      if (tz) setMeetingTimezone(tz);
                                    } catch {
                                      // ignore
                                    } finally {
                                      setIsMeetingDialogOpen(true);
                                    }
                                  })();
                                  // setIsMeetingDialogOpen(true);
                                }}
                                className="h-9 px-3 rounded-full bg-emerald-900 text-white enabled:hover:bg-emerald-800 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:blur-[1px] disabled:pointer-events-none"
                              >
                                <Calendar className="w-4 h-4" />
                                <span className="text-xs font-semibold">Book Meeting</span>
                              </Button>
                            );

                            if (!meetingDisabled) return button;

                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">{button}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Meeting has been scheduled, please check schedule page for candidate status.
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                          {(() => {
                            const key = `${resolveProjectIdForCandidate(candidate)}:${candidate.id}`;
                            const statusLower = String(proposalStatusByInternId[key] ?? "").trim().toLowerCase();
                            const proposalSent =
                              statusLower.length > 0 &&
                              statusLower !== "rejected" &&
                              statusLower !== "expired" &&
                              statusLower !== "withdrawn";
                            const anyProposalSent = Boolean(hasAnyProposalByInternId[String(candidate.id ?? "").trim()]);
                            const fullTimeOfferProjectId = String(fullTimeOfferProjectByInternId[String(candidate.id ?? "").trim()] ?? "").trim();
                            const candidateProjectId = resolveProjectIdForCandidate(candidate);
                            const fullTimeBlocked = Boolean(fullTimeOfferProjectId && candidateProjectId && fullTimeOfferProjectId !== candidateProjectId);
                            const meetingDisabled = isMeetingBlockingProposal(latestInterviewByInternId[key]);
                            const proposalDisabled = proposalSent || anyProposalSent || meetingDisabled || fullTimeBlocked;

                            const button = (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={proposalDisabled}
                                onClick={() => {
                                  requestPolicyConfirmation(async () => {
                                    if (meetingDisabled) {
                                      toast({
                                        title: "Cannot send proposal",
                                        description: "The proposal cannot be sent until the meeting/interview is completed.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    if (fullTimeBlocked) {
                                      toast({
                                        title: "Cannot send internship proposal",
                                        description: "Candidate already has a full-time offer from another project.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    if (proposalSent) {
                                      toast({
                                        title: "Proposal already sent",
                                        description: "Proposal has been sent, please check proposal page for candidate status.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    if (anyProposalSent) {
                                      toast({
                                        title: "Proposal already sent",
                                        description: "Proposal has already been sent to this candidate. Please check proposal page for candidate status.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    setActiveCandidate(candidate);
                                    setProposalTimezone(() => {
                                      try {
                                        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
                                      } catch {
                                        return "UTC";
                                      }
                                    });
                                    await (async () => {
                                      try {
                                        const auth = getEmployerAuth();
                                        const employerId = auth?.id as string | undefined;
                                        if (!employerId) return;

                                        const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
                                        if (!projectsRes.ok) return;
                                        const projectsJson = await projectsRes.json().catch(() => null);
                                        const projectsList = (projectsJson?.projects ?? []) as any[];

                                        const resolvedProjectId = resolveProjectIdForCandidate(candidate);
                                        const projectToUse = resolvedProjectId
                                          ? projectsList.find((p) => String(p?.id ?? "") === String(resolvedProjectId)) ?? projectsList[0]
                                          : projectsList[0];

                                        const tz = String(projectToUse?.timezone ?? "").trim();
                                        if (tz) setProposalTimezone(tz);

                                        const mode = String(projectToUse?.locationType ?? projectToUse?.location_type ?? "")
                                          .trim()
                                          .toLowerCase();
                                        if (mode === "remote" || mode === "hybrid" || mode === "onsite") {
                                          setProposalMode(mode);
                                        }
                                      } catch (error) {
                                        // ignore
                                      }
                                    })();
                                    setIsProposalDialogOpen(true);
                                  });
                                }}
                                className="h-9 px-3 rounded-full bg-emerald-600 text-white enabled:hover:bg-emerald-500 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:blur-[1px] disabled:pointer-events-none"
                              >
                                <Send className="w-4 h-4" />
                                <span className="text-xs font-semibold">Send Proposal</span>
                              </Button>
                            );

                            if (!proposalDisabled) return button;

                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">{button}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {meetingDisabled
                                    ? "The proposal cannot be sent until the meeting/interview is completed."
                                    : fullTimeBlocked
                                      ? "Candidate already has a full-time offer from another project."
                                      : "Proposal has been sent, please check proposal page for candidate status."}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                          {(() => {
                            const meta = internPricingMetaById[String(candidate.id ?? "").trim()];
                            const score = Number(meta?.findternScore ?? candidate.findternScore ?? 0);
                            const hourlyLabel = getCandidateHourlyPriceLabel({
                              findternScore: score,
                              location: meta?.location ?? candidate.location ?? "",
                              state: meta?.state ?? candidate.state ?? "",
                            });
                            return (
                              <>
                                <Badge className="bg-slate-100 text-slate-800 text-[10px] font-semibold rounded-full">
                                  Price: {hourlyLabel}
                                </Badge>
                              </>
                            );
                          })()}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(candidate)}
                            className="h-9 px-3 rounded-xl border-slate-200 text-slate-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span className="text-xs font-semibold">Remove</span>
                          </Button>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {(candidate.experience && candidate.experience.trim()) ||
                      (candidate.education && candidate.education.trim()) ||
                      (candidate.availability && candidate.availability.trim()) ? (
                        <div className="flex flex-wrap gap-4 text-xs">
                          {candidate.experience && candidate.experience.trim() ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                              {candidate.experience}
                            </span>
                          ) : null}
                          {candidate.education && candidate.education.trim() ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <GraduationCap className="w-3.5 h-3.5 text-primary" />
                              {candidate.education}
                            </span>
                          ) : null}
                          {candidate.availability && candidate.availability.trim() ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-purple-500" />
                              {candidate.availability}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Project Tag */}
                      {candidate.projectName && candidate.projectName.trim() ? (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <span className="text-xs text-slate-400">
                            Project: <span className="text-emerald-600 font-medium">{candidate.projectName}</span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
                ))
              )}
            </div>

            {/* Order Summary */}
            {/* <div className="lg:col-span-1">
              <Card className="p-6 border-0 shadow-xl rounded-3xl bg-white lg:sticky lg:top-24">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Selected Candidates</span>
                    <span className="font-semibold text-slate-800">{selectedItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total in Cart</span>
                    <span className="text-slate-800">{cartItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Estimated Monthly Stipend</span>
                    <span className="font-semibold text-slate-800">
                      {new Intl.NumberFormat(expectedCurrency === "INR" ? "en-IN" : "en-US", {
                        style: "currency",
                        currency: expectedCurrency,
                        maximumFractionDigits: 0,
                      }).format(selectedEstimatedMonthlyStipend || 0)}
                    </span>
                  </div>
                  <Separator />
                </div>

                <Button
                  type="button"
                  className="w-full h-11 rounded-xl bg-emerald-600 enabled:hover:bg-emerald-700"
                  disabled={selectedItems.length === 0}
                  onClick={handleCheckout}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Checkout
                </Button>
              </Card>
            </div> */}
          </div>
        )}
      </div>

      {/* Book Meeting Dialog */}
      <Dialog open={isMeetingDialogOpen} onOpenChange={(open) => {
        setIsMeetingDialogOpen(open);
        if (open) {
          setMeetingSlots(buildDefaultMeetingSlots());
          setMeetingTimezone(() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            } catch {
              return "UTC";
            }
          });
          void (async () => {
            try {
              const auth = getEmployerAuth();
              const employerId = auth?.id as string | undefined;
              if (!employerId) return;

              const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
              if (!projectsRes.ok) return;
              const projectsJson = await projectsRes.json().catch(() => null);
              const projectsList = (projectsJson?.projects ?? []) as any[];

              const resolvedProjectId = activeCandidate ? resolveProjectIdForCandidate(activeCandidate) : readSelectedProjectId();
              const projectToUse = resolvedProjectId
                ? projectsList.find((p) => String(p?.id ?? "") === String(resolvedProjectId)) ?? projectsList[0]
                : projectsList[0];

              const tz = String(projectToUse?.timezone ?? "").trim();
              if (tz) setMeetingTimezone(tz);
            } catch {
              // ignore
            } finally {
              setIsMeetingDialogOpen(true);
            }
          })();
        } else {
          setActiveCandidate(null);
          setMeetingSlots({ slot1: "", slot2: "", slot3: "" });
          setMeetingTimezone(() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            } catch {
              return "UTC";
            }
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeCandidate ? `Book Meeting with ${getCandidateDisplayName(activeCandidate)}` : "Book Meeting"}
            </DialogTitle>
            <DialogDescription>
              Select up to 3 preferred time slots for the next few days. The candidate will pick one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {([1, 2, 3] as const).map((slot) => (
              <div key={slot} className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span>Slot {slot}</span>
                  <span className="text-[10px] text-slate-400">Next 14 days</span>
                </label>
                <div className="relative">
                  {(() => {
                    const slotValue =
                      slot === 1
                        ? meetingSlots.slot1
                        : slot === 2
                        ? meetingSlots.slot2
                        : meetingSlots.slot3;
                    const parts = getMeetingSlotParts(slotValue);

                    const otherSlotValues = [meetingSlots.slot1, meetingSlots.slot2, meetingSlots.slot3].filter(
                      (v) => v && v !== slotValue,
                    );

                    const setSlotValue = (next: string) => {
                      setMeetingSlots((prev) =>
                        slot === 1
                          ? { ...prev, slot1: next }
                          : slot === 2
                          ? { ...prev, slot2: next }
                          : { ...prev, slot3: next },
                      );
                    };

                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input
                            type="date"
                            className="h-10 text-sm"
                            min={meetingInputMin.split("T")[0]}
                            max={meetingInputMax.split("T")[0]}
                            value={parts.date}
                            onChange={(e) => {
                              const nextDate = e.target.value;
                              const next = combineMeetingSlotParts(nextDate, parts.time || "00:00");
                              setSlotValue(next);
                            }}
                          />
                        </div>

                        <Select
                          value={parts.time}
                          onValueChange={(nextTime) => {
                            const next = combineMeetingSlotParts(parts.date, nextTime);
                            setSlotValue(next);
                          }}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions
                              .filter((t) => !isTimeDisabledForDate(parts.date, t))
                              .map((t) => (
                              <SelectItem
                                key={t}
                                value={t}
                                disabled={
                                  otherSlotValues.includes(combineMeetingSlotParts(parts.date, t))
                                }
                              >
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}

            <div className="space-y-1 text-xs">
              <p className="font-medium text-slate-700">Time Zone</p>
              <p className="text-slate-500">Slots will be sent in your organization time zone: {meetingTimezone}.</p>
              <p className="text-[11px] text-amber-600 flex items-start gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                <span>The candidate will see the same time slots converted to their local time zone.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              className="w-full bg-emerald-600 enabled:hover:bg-emerald-700"
              disabled={isSendingSlots}
              onClick={async () => {
                if (!meetingSlots.slot1 || !meetingSlots.slot2 || !meetingSlots.slot3) {
                  toast({
                    title: "Add all 3 slots",
                    description: "Please select all three meeting slots before sending.",
                    variant: "destructive",
                  });
                  return;
                }

                if (new Set([meetingSlots.slot1, meetingSlots.slot2, meetingSlots.slot3]).size !== 3) {
                  toast({
                    title: "Choose different time slots",
                    description: "All 3 meeting slots must be different.",
                    variant: "destructive",
                  });
                  return;
                }

                if (!activeCandidate) {
                  toast({
                    title: "No candidate selected",
                    description: "Please select a candidate to book a meeting with.",
                    variant: "destructive",
                  });
                  return;
                }

                const auth = getEmployerAuth();
                const employerId = auth?.id as string | undefined;

                if (!employerId) {
                  toast({
                    title: "Employer not found",
                    description: "Please log in again as employer to schedule interviews.",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  setIsSendingSlots(true);

                  const slots = [meetingSlots.slot1, meetingSlots.slot2, meetingSlots.slot3];

                  const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
                  if (!projectsRes.ok) {
                    throw new Error("Failed to load employer projects");
                  }
                  const projectsJson = await projectsRes.json();
                  const projectsList = (projectsJson?.projects ?? []) as any[];

                  const targetProjectId = resolveProjectIdForCandidate(activeCandidate);
                  const projectToUse = targetProjectId
                    ? projectsList.find((p) => String(p?.id ?? "") === String(targetProjectId)) ?? projectsList[0]
                    : projectsList[0];

                  if (!projectToUse?.id) {
                    throw new Error("No project found");
                  }

                  const res = await fetch(`/api/employer/${employerId}/interviews`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      internId: activeCandidate.id,
                      projectId: projectToUse.id,
                      timezone: meetingTimezone,
                      slots,
                    }),
                  });

                  if (!res.ok) {
                    const errJson = await res.json().catch(() => null);
                    const message = errJson?.message || "Failed to create interview slots";
                    throw new Error(message);
                  }

                  const json = await res.json().catch(() => null);
                  const createdInterview = json?.interview;
                  const meet = json?.meet as
                    | {
                        created?: boolean;
                        warning?: string | null;
                        connectUrl?: string | null;
                      }
                    | undefined;

                  if (createdInterview) {
                    setLatestInterviewByInternId((prev) => ({
                      ...prev,
                      [`${String((activeCandidate as any)?.projectId ?? "").trim()}:${activeCandidate.id}`]: createdInterview,
                    }));
                  }

                  toast({
                    title: "Slots sent",
                    description: `Your meeting slots have been shared with ${getCandidateDisplayName(activeCandidate)}. The Google Meet link will be created when the candidate selects a slot.`,
                  });

                  setIsMeetingDialogOpen(false);
                  setActiveCandidate(null);
                  setMeetingSlots({ slot1: "", slot2: "", slot3: "" });
                } catch (error: any) {
                  console.error("Create interview error", error);
                  toast({
                    title: "Could not send slots",
                    description: error?.message || "Something went wrong while creating interview slots.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSendingSlots(false);
                }
              }}
            >
              {isSendingSlots ? "Sending..." : "Save & Send Slots"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Hiring Proposal Dialog */}
      <Dialog open={isProposalDialogOpen} onOpenChange={(open) => {
        setIsProposalDialogOpen(open);
        if (open) {
          setProposalTimezone(() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            } catch {
              return "UTC";
            }
          });
          setProposalCurrency(expectedCurrency);
          void (async () => {
            try {
              const auth = getEmployerAuth();
              const employerId = auth?.id as string | undefined;
              if (!employerId) return;

              const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
              if (!projectsRes.ok) return;
              const projectsJson = await projectsRes.json().catch(() => null);
              const projectsList = (projectsJson?.projects ?? []) as any[];

              const resolvedProjectId = activeCandidate ? resolveProjectIdForCandidate(activeCandidate) : readSelectedProjectId();
              const projectToUse = resolvedProjectId
                ? projectsList.find((p) => String(p?.id ?? "") === String(resolvedProjectId)) ?? projectsList[0]
                : projectsList[0];

              const tz = String(projectToUse?.timezone ?? "").trim();
              if (tz) setProposalTimezone(tz);

              const mode = String(projectToUse?.locationType ?? projectToUse?.location_type ?? "")
                .trim()
                .toLowerCase();
              if (mode === "remote" || mode === "hybrid" || mode === "onsite") {
                setProposalMode(mode);
              }
            } catch {
              // ignore
            }
          })();
        } else {
          setActiveCandidate(null);
          setProposalRoleTitle("");
          setProposalJD("");
          setProposalMode("remote");
          setProposalLocation("");
          setProposalLocationState("");
          setProposalLocationCity("");
          setProposalCityPopoverOpen(false);
          setProposalCitySearchQuery("");
          setProposalManualCityState(false);
          setProposalWorkFromHomeDays("");
          setProposalStartDate("");
          setProposalDuration("1m");
          setProposalShiftFrom("09:00");
          setProposalShiftTo("18:00");
          setProposalTimezone(() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            } catch {
              return "UTC";
            }
          });
          setProposalLaptop("candidate");
          setProposalWeeklySchedule("mon_fri");
          setProposalPaidLeavesPerMonth("2");
          setProposalMonthlyHours("160");
          setProposalMonthlyAmount("");
          setProposalCurrency(expectedCurrency);
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {activeCandidate ? `Send Hiring Proposal to ${getCandidateDisplayName(activeCandidate)}` : "Send Hiring Proposal"}
            </DialogTitle>
            <DialogDescription>
              Share the final internship offer details. The candidate can accept and join directly.
            </DialogDescription>
          </DialogHeader>

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
                <label className="text-xs font-medium text-slate-700">Roles and Responsibilities / JD<span className="text-red-500">*</span></label>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden [&_.ql-container]:min-h-[220px] [&_.ql-container]:max-h-[260px] [&_.ql-container]:overflow-y-auto [&_.ql-editor]:min-h-[220px]">
                  <ReactQuill
                    theme="snow"
                    value={proposalJD}
                    onChange={(html) => setProposalJD(html)}
                    modules={proposalJdQuillModules}
                    formats={proposalJdQuillFormats}
                    placeholder="Briefly describe the role, responsibilities, and expectations."
                  />
                </div>
                {proposalJdImages.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-[11px] text-slate-500">Attached images</div>
                    <div className="grid grid-cols-3 gap-2">
                      {proposalJdImages.map((src, idx) => (
                        <div key={`${src}-${idx}`} className="relative rounded-lg border border-slate-200 overflow-hidden bg-white">
                          <img src={src} alt="JD attachment" className="h-16 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeProposalJdImageAtIndex(idx)}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Mode<span className="text-red-500">*</span></label>
                <Select
                  value={proposalMode}
                  onValueChange={(value) => {
                    if (isCandidateModeLocked) return;
                    if (!allowedProposalModes.includes(value)) return;
                    setProposalMode(value);
                  }}
                  disabled={isCandidateModeLocked}
                >
                  <SelectTrigger className="h-9 text-sm" disabled={isCandidateModeLocked}>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedProposalModes.includes("remote") ? <SelectItem value="remote">Remote</SelectItem> : null}
                    {allowedProposalModes.includes("onsite") ? <SelectItem value="onsite">Onsite</SelectItem> : null}
                    {allowedProposalModes.includes("hybrid") ? <SelectItem value="hybrid">Hybrid</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>

              {proposalMode !== "remote" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">City<span className="text-red-500">*</span></label>
                    {proposalManualCityState ? (
                      <Input
                        className="h-9 text-sm"
                        placeholder="Enter your city"
                        value={proposalLocationCity}
                        onChange={(e) => setProposalLocationCity(e.target.value)}
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
                              <CommandEmpty>
                                <div className="px-2 py-2 text-xs text-muted-foreground">
                                  No city found.
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="px-1"
                                    onClick={() => {
                                      setProposalManualCityState(true);
                                      setProposalCityPopoverOpen(false);
                                      setProposalCitySearchQuery("");
                                      setProposalLocationCity("");
                                      setProposalLocationState("");
                                    }}
                                  >
                                    Enter manually
                                  </Button>
                                </div>
                              </CommandEmpty>
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
                      className={`h-9 text-sm ${proposalManualCityState ? "" : "bg-slate-50"}`}
                      value={proposalLocationState}
                      onChange={(e) => setProposalLocationState(e.target.value)}
                      placeholder={proposalManualCityState ? "Enter state" : "Auto-filled from city"}
                    />
                  </div>
                </div>
              )}

              {proposalMode === "hybrid" && (
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
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Start Date<span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={normalizeDateInput(proposalStartDate)}
                    min={proposalStartDateMin}
                    onChange={(e) => setProposalStartDate(normalizeDateInput(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Internship Duration<span className="text-red-500">*</span></label>
                <Select
                  value={proposalDuration}
                  onValueChange={(value) => setProposalDuration(value)}
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
                  onValueChange={(value) => {
                    setProposalLaptop(value);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate" disabled={activeCandidate?.hasLaptop === false}>Candidate's Own Laptop</SelectItem>
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
                <Select value={proposalCurrency} onValueChange={(value) => setProposalCurrency(value as "INR" | "USD")}>
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
                <p className="text-[11px] text-slate-500">Amount billed each month.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Total Price (auto-filled)<span className="text-red-500">*</span></label>
                 {proposalCurrency === "INR" && (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">(includes GST)</span>
                  )}
                <Input
                  type="number"
                  className="h-9 text-sm bg-slate-50"
                  value={proposalTotalPrice}
                  readOnly
                />
                <p className="text-[11px] text-slate-500">
                  Total amount for the internship. Final charges may vary based on your plan.
                  <button
                    type="button"
                    className="underline ml-1"
                    onClick={() => window.open("/pricing", "_blank", "noopener,noreferrer")}
                  >
                    See pricing
                  </button>
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex-1">
              You can either send this proposal directly (without interview) or share it after the interview is completed.
            </div>
            <Button
              className="bg-emerald-600 enabled:hover:bg-emerald-700"
              disabled={isSendingProposal}
              onClick={async () => {
                const monthlyHoursNum = Number(proposalMonthlyHours || "0");
                const monthlyAmountNum = Number(proposalMonthlyAmount || "0");

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

                if (proposalStartDate < proposalStartDateMin) {
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

                if (!activeCandidate) {
                  toast({
                    title: "No candidate selected",
                    description: "Please select a candidate to send proposal.",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  setIsSendingProposal(true);

                  const auth = getEmployerAuth();
                  const employerId = auth?.id as string | undefined;

                  if (!employerId) {
                    toast({
                      title: "Employer not found",
                      description: "Please log in again as employer to send proposals.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const projectsRes = await fetch(`/api/employer/${employerId}/projects`);
                  if (!projectsRes.ok) {
                    throw new Error("Failed to load employer projects");
                  }
                  const projectsJson = await projectsRes.json();
                  const projectsList = (projectsJson?.projects ?? []) as any[];

                  const targetProjectId = resolveProjectIdForCandidate(activeCandidate);
                  const projectToUse = targetProjectId
                    ? projectsList.find((p) => String(p?.id ?? "") === String(targetProjectId)) ?? projectsList[0]
                    : projectsList[0];

                  if (!projectToUse?.id) {
                    throw new Error("No project found");
                  }

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
                    startDate: proposalStartDate,
                    duration: proposalDuration,
                    shiftFrom: proposalShiftFrom,
                    shiftTo: proposalShiftTo,
                    timezone: proposalTimezone,
                    laptop: proposalLaptop,
                    weeklySchedule: proposalWeeklySchedule,
                    paidLeavesPerMonth: Number(proposalPaidLeavesPerMonth || "0"),
                    monthlyHours: monthlyHoursNum,
                    monthlyAmount: monthlyAmountNum,
                    totalPrice: Number(proposalTotalPrice || 0),
                  };

                  const res = await fetch(`/api/employer/${employerId}/proposals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      internId: activeCandidate.id,
                      projectId: projectToUse.id,
                      flowType: "direct",
                      currency: proposalCurrency,
                      offerDetails,
                      aiRatings: {
                        communication: activeCandidate.aiRatings.communication,
                        coding: activeCandidate.aiRatings.coding,
                        aptitude: activeCandidate.aiRatings.aptitude,
                        overall: activeCandidate.aiRatings.interview,
                      },
                      skills: activeCandidate.skills,
                    }),
                  });

                  if (!res.ok) {
                    const errJson = await res.json().catch(() => null);
                    if (res.status === 409) {
                      const existingId = String(errJson?.proposalId ?? "").trim();
                      if (existingId) {
                        toast({
                          title: "Proposal already exists",
                          description: "Opening the existing proposal.",
                        });
                        setIsProposalDialogOpen(false);
                        setLocation(`/employer/proposals/${encodeURIComponent(existingId)}`);
                        return;
                      }
                    }
                    const message = errJson?.message || "Failed to send proposal";
                    throw new Error(message);
                  }

                  toast({
                    title: "Proposal sent",
                    description: `Your hiring proposal has been sent to ${getCandidateDisplayName(activeCandidate)}.`,
                  });

                  setProposalStatusByInternId((prev) => ({
                    ...prev,
                    [`${String(projectToUse?.id ?? "").trim()}:${activeCandidate.id}`]: "sent",
                  }));

                  setHasAnyProposalByInternId((prev) => ({
                    ...prev,
                    [String(activeCandidate.id ?? "").trim()]: true,
                  }));

                  setIsProposalDialogOpen(false);
                  setActiveCandidate(null);
                  setProposalRoleTitle("");
                  setProposalJD("");
                  setProposalMode("remote");
                  setProposalLocation("");
                  setProposalWorkFromHomeDays("");
                  setProposalStartDate("");
                  setProposalDuration("1m");
                  setProposalShiftFrom("09:00");
                  setProposalShiftTo("18:00");
                  setProposalTimezone(() => {
                    try {
                      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
                    } catch {
                      return "UTC";
                    }
                  });
                  setProposalLaptop("candidate");
                  setProposalWeeklySchedule("mon_fri");
                  setProposalPaidLeavesPerMonth("2");
                  setProposalMonthlyHours("160");
                  setProposalMonthlyAmount("");
                } catch (error: any) {
                  console.error("Send proposal error", error);
                  toast({
                    title: "Failed to send proposal",
                    description: error?.message || "Something went wrong while sending proposal.",
                    variant: "destructive",
                  });
                } finally {
                  setIsSendingProposal(false);
                }
              }}
            >
              {isSendingProposal ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Remove from Cart
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this candidate from your cart? You can add them back later from the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingCandidate(null);
              }}
              className="rounded-lg"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFromCart}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
