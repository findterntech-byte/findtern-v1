import { useState, useMemo, useEffect, useRef, useCallback } from "react";

import {
  Bell,
  Search,
  MapPin,
  Globe,
  Star,
  Sparkles,
  LayoutGrid,
  List,
  Table2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  RotateCcw,
  ShoppingCart,
  MessageSquare,
  Flag,
  Building2,
  Check,
  Edit,
  Laptop,
  Users,
  HelpCircle,
  CheckCircle,
  User,
  Trash2,
  Loader2,
  FolderPlus,
  ExternalLink,
  Shield,
  LogOut,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { clearEmployerAuth, getEmployerAuth, inferEmployerIsIndia, saveEmployerAuth } from "@/lib/employerAuth";
import { fetchPricingPlans, formatCurrencyMinor, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import skillsData from "@/data/skills.json";
import cityStatePincode from "@/data/cityStatePincode.json";
import { AnimatedEmptyStateCard } from "../not-found";

const TIMEZONES: { id: string; label: string; disabled?: boolean }[] = [
  { id: "group-utc", label: "🌍 UTC / Global", disabled: true },
  { id: "UTC", label: "UTC 🌐" },
  { id: "Etc/UTC", label: "Etc/UTC 🌐" },
  { id: "Etc/GMT", label: "Etc/GMT 🌐" },

  { id: "group-asia", label: "🇮🇳 Asia", disabled: true },
  { id: "Asia/Kolkata", label: "Asia/Kolkata 🇮🇳" },
  { id: "Asia/Karachi", label: "Asia/Karachi 🇵🇰" },
  { id: "Asia/Dhaka", label: "Asia/Dhaka 🇧🇩" },
  { id: "Asia/Kathmandu", label: "Asia/Kathmandu 🇳🇵" },
  { id: "Asia/Colombo", label: "Asia/Colombo 🇱🇰" },
  { id: "Asia/Dubai", label: "Asia/Dubai 🇦🇪" },
  { id: "Asia/Muscat", label: "Asia/Muscat 🇴🇲" },
  { id: "Asia/Riyadh", label: "Asia/Riyadh 🇸🇦" },
  { id: "Asia/Qatar", label: "Asia/Qatar 🇶🇦" },
  { id: "Asia/Kuwait", label: "Asia/Kuwait 🇰🇼" },
  { id: "Asia/Tehran", label: "Asia/Tehran 🇮🇷" },
  { id: "Asia/Baghdad", label: "Asia/Baghdad 🇮🇶" },
  { id: "Asia/Jerusalem", label: "Asia/Jerusalem 🇮🇱" },
  { id: "Asia/Amman", label: "Asia/Amman 🇯🇴" },
  { id: "Asia/Beirut", label: "Asia/Beirut 🇱🇧" },
  { id: "Asia/Damascus", label: "Asia/Damascus 🇸🇾" },
  { id: "Asia/Istanbul", label: "Asia/Istanbul 🇹🇷" },
  { id: "Asia/Tbilisi", label: "Asia/Tbilisi 🇬🇪" },
  { id: "Asia/Yerevan", label: "Asia/Yerevan 🇦🇲" },
  { id: "Asia/Baku", label: "Asia/Baku 🇦🇿" },
  { id: "Asia/Kabul", label: "Asia/Kabul 🇦🇫" },
  { id: "Asia/Tashkent", label: "Asia/Tashkent 🇺🇿" },
  { id: "Asia/Almaty", label: "Asia/Almaty 🇰🇿" },
  { id: "Asia/Tokyo", label: "Asia/Tokyo 🇯🇵" },
  { id: "Asia/Seoul", label: "Asia/Seoul 🇰🇷" },
  { id: "Asia/Shanghai", label: "Asia/Shanghai 🇨🇳" },
  { id: "Asia/Hong_Kong", label: "Asia/Hong_Kong 🇭🇰" },
  { id: "Asia/Taipei", label: "Asia/Taipei 🇹🇼" },
  { id: "Asia/Singapore", label: "Asia/Singapore 🇸🇬" },
  { id: "Asia/Kuala_Lumpur", label: "Asia/Kuala_Lumpur 🇲🇾" },
  { id: "Asia/Jakarta", label: "Asia/Jakarta 🇮🇩" },
  { id: "Asia/Bangkok", label: "Asia/Bangkok 🇹🇭" },
  { id: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh 🇻🇳" },
  { id: "Asia/Manila", label: "Asia/Manila 🇵🇭" },

  { id: "group-europe", label: "🇪🇺 Europe", disabled: true },
  { id: "Europe/London", label: "Europe/London 🇬🇧" },
  { id: "Europe/Paris", label: "Europe/Paris 🇫🇷" },
  { id: "Europe/Berlin", label: "Europe/Berlin 🇩🇪" },
  { id: "Europe/Rome", label: "Europe/Rome 🇮🇹" },
  { id: "Europe/Madrid", label: "Europe/Madrid 🇪🇸" },
  { id: "Europe/Amsterdam", label: "Europe/Amsterdam 🇳🇱" },
  { id: "Europe/Brussels", label: "Europe/Brussels 🇧🇪" },
  { id: "Europe/Vienna", label: "Europe/Vienna 🇦🇹" },
  { id: "Europe/Zurich", label: "Europe/Zurich 🇨🇭" },
  { id: "Europe/Stockholm", label: "Europe/Stockholm 🇸🇪" },
  { id: "Europe/Oslo", label: "Europe/Oslo 🇳🇴" },
  { id: "Europe/Copenhagen", label: "Europe/Copenhagen 🇩🇰" },
  { id: "Europe/Helsinki", label: "Europe/Helsinki 🇫🇮" },
  { id: "Europe/Warsaw", label: "Europe/Warsaw 🇵🇱" },
  { id: "Europe/Prague", label: "Europe/Prague 🇨🇿" },
  { id: "Europe/Budapest", label: "Europe/Budapest 🇭🇺" },
  { id: "Europe/Athens", label: "Europe/Athens 🇬🇷" },
  { id: "Europe/Bucharest", label: "Europe/Bucharest 🇷🇴" },
  { id: "Europe/Sofia", label: "Europe/Sofia 🇧🇬" },
  { id: "Europe/Kiev", label: "Europe/Kiev 🇺🇦" },
  { id: "Europe/Moscow", label: "Europe/Moscow 🇷🇺" },
  { id: "Europe/Lisbon", label: "Europe/Lisbon 🇵🇹" },
  { id: "Europe/Dublin", label: "Europe/Dublin 🇮🇪" },
  { id: "Europe/Reykjavik", label: "Europe/Reykjavik 🇮🇸" },

  { id: "group-america", label: "🇺🇸 America", disabled: true },
  { id: "America/New_York", label: "America/New_York 🇺🇸" },
  { id: "America/Chicago", label: "America/Chicago 🇺🇸" },
  { id: "America/Denver", label: "America/Denver 🇺🇸" },
  { id: "America/Los_Angeles", label: "America/Los_Angeles 🇺🇸" },
  { id: "America/Phoenix", label: "America/Phoenix 🇺🇸" },
  { id: "America/Anchorage", label: "America/Anchorage 🇺🇸" },
  { id: "America/Toronto", label: "America/Toronto 🇨🇦" },
  { id: "America/Vancouver", label: "America/Vancouver 🇨🇦" },
  { id: "America/Mexico_City", label: "America/Mexico_City 🇲🇽" },
  { id: "America/Bogota", label: "America/Bogota 🇨🇴" },
  { id: "America/Lima", label: "America/Lima 🇵🇪" },
  { id: "America/Santiago", label: "America/Santiago 🇨🇱" },
  { id: "America/Argentina/Buenos_Aires", label: "America/Argentina/Buenos_Aires 🇦🇷" },
  { id: "America/Sao_Paulo", label: "America/Sao_Paulo 🇧🇷" },
  { id: "America/Havana", label: "America/Havana 🇨🇺" },
  { id: "America/Panama", label: "America/Panama 🇵🇦" },
  { id: "America/Jamaica", label: "America/Jamaica 🇯🇲" },

  { id: "group-aus", label: "🇦🇺 Australia & Pacific", disabled: true },
  { id: "Australia/Sydney", label: "Australia/Sydney 🇦🇺" },
  { id: "Australia/Melbourne", label: "Australia/Melbourne 🇦🇺" },
  { id: "Australia/Brisbane", label: "Australia/Brisbane 🇦🇺" },
  { id: "Australia/Perth", label: "Australia/Perth 🇦🇺" },
  { id: "Australia/Adelaide", label: "Australia/Adelaide 🇦🇺" },
  { id: "Australia/Darwin", label: "Australia/Darwin 🇦🇺" },
  { id: "Pacific/Auckland", label: "Pacific/Auckland 🇳🇿" },
  { id: "Pacific/Fiji", label: "Pacific/Fiji 🇫🇯" },
  { id: "Pacific/Guam", label: "Pacific/Guam 🇬🇺" },
  { id: "Pacific/Honolulu", label: "Pacific/Honolulu 🇺🇸" },

  { id: "group-africa", label: "🌍 Africa", disabled: true },
  { id: "Africa/Cairo", label: "Africa/Cairo 🇪🇬" },
  { id: "Africa/Johannesburg", label: "Africa/Johannesburg 🇿🇦" },
  { id: "Africa/Nairobi", label: "Africa/Nairobi 🇰🇪" },
  { id: "Africa/Lagos", label: "Africa/Lagos 🇳🇬" },
  { id: "Africa/Accra", label: "Africa/Accra 🇬🇭" },
  { id: "Africa/Casablanca", label: "Africa/Casablanca 🇲🇦" },
  { id: "Africa/Algiers", label: "Africa/Algiers 🇩🇿" },
  { id: "Africa/Tunis", label: "Africa/Tunis 🇹🇳" },
];

// Types
interface Project {
  id: string;
  name: string;
  skills: string[];
  scopeOfWork?: string;
  fullTimeOffer?: boolean;
  locationType?: string | null;
  pincode?: string | null;
  city?: string | null;
  state?: string | null;
  timezone?: string | null;
  status?: string | null;
}

const initialProjects: Project[] = [];

type Candidate = {
  id: string;
  initials: string;
  name: string;
  profilePhotoUrl: string | null;
  location: string;
  city?: string;
  state?: string;
  findternScore: number;
  skills: string[];
  matchedSkills: string[];
  preferredLocations: string[];
  locationTypes: string[];
  aiRatings: {
    communication: number;
    coding: number;
    aptitude: number;
    interview: number;
  };
  hasProfile: boolean;
  isAdded: boolean;
  proposalStatus?: string;
  hasLaptop: boolean;
  openToWork: boolean;
  fullTimeOffer?: boolean;
};

type ProposalMeta = {
  status: string;
  proposalId: string;
  projectId?: string;
  ts: number;
};

function getPreferredLocationCities(raw: any) {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .map((v) => v.split(",")[0]?.trim() ?? "")
    .filter(Boolean);
}

export default function EmployerDashboardPage() {
  const viewModeStorageKey = "employerDashboardViewMode";
  const pageSizeStorageKey = "employerDashboardPageSize";

  const readQueryParam = (key: string) => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(window.location.search).get(key) ?? "";
    } catch {
      return "";
    }
  };

  const readStored = (key: string) => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(key) ?? "";
    } catch {
      return "";
    }
  };

  const readInitialViewMode = () => {
    const q = String(readQueryParam("view") || readQueryParam("mode") || "")
      .trim()
      .toLowerCase();
    if (q === "list" || q === "grid" || q === "table") return q;
    const stored = String(readStored(viewModeStorageKey)).trim().toLowerCase();
    if (stored === "list" || stored === "grid" || stored === "table") return stored;
    return "list";
  };

  const readInitialPageSize = () => {
    const q = Number(readQueryParam("pageSize") || readQueryParam("size") || "");
    if (Number.isFinite(q) && q > 0) return q;
    const stored = Number(readStored(pageSizeStorageKey));
    if (Number.isFinite(stored) && stored > 0) return stored;
    return 10;
  };

  const readInitialPage = () => {
    const q = Number(readQueryParam("page") || "");
    if (Number.isFinite(q) && q >= 1) return Math.floor(q);
    return 1;
  };

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid" | "table">(readInitialViewMode);
  const [pageSize, setPageSize] = useState(readInitialPageSize);
  const [currentPage, setCurrentPage] = useState(readInitialPage);
  const [resultsSearch, setResultsSearch] = useState("");
  const [currentLocation, setLocation] = useLocation();
  const { toast, dismiss } = useToast();
  const [acceptedInternIds, setAcceptedInternIds] = useState<Set<string>>(new Set());
  const [proposalMetaByInternId, setProposalMetaByInternId] = useState<Record<string, ProposalMeta>>({});
  const [hiredInternIdSet, setHiredInternIdSet] = useState<Set<string>>(new Set());
  const [fullTimeOfferInternIdSet, setFullTimeOfferInternIdSet] = useState<Set<string>>(() => new Set());
  const [fullTimeOfferSentInternIdSet, setFullTimeOfferSentInternIdSet] = useState<Set<string>>(() => new Set());
  const [fullTimeAcceptedInternIdSet, setFullTimeAcceptedInternIdSet] = useState<Set<string>>(() => new Set());

  const [filterAppliedPulse, setFilterAppliedPulse] = useState(false);

  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);
  const [photoPreviewSrc, setPhotoPreviewSrc] = useState<string>("");
  const [photoPreviewAlt, setPhotoPreviewAlt] = useState<string>("");

  const openPhotoPreview = (src?: string | null, alt?: string) => {
    const href = String(src ?? "").trim();
    if (!href) return;
    setPhotoPreviewSrc(href);
    setPhotoPreviewAlt(String(alt ?? "").trim());
    setIsPhotoPreviewOpen(true);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(viewModeStorageKey, viewMode);
    } catch {
      return;
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(pageSizeStorageKey, String(pageSize));
    } catch {
      return;
    }
  }, [pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const qs = new URLSearchParams(window.location.search);
      qs.set("view", viewMode);

      qs.set("page", String(currentPage));
      qs.set("pageSize", String(pageSize));

      const nextQuery = qs.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, "", nextUrl);
      }
    } catch {
      return;
    }
  }, [viewMode, currentPage, pageSize]);

  const normalizeCityLabel = (value: string) => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  };

  const normalizeCityOnlyLabel = (value: any) => {
    const raw = String(value ?? "").trim();
    const city = raw.split(",")[0] ?? "";
    return normalizeCityLabel(String(city));
  };

  const normalizeProjectLocationType = (value: string | null | undefined) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (!v) return "";
    if (v === "remote" || v === "hybrid" || v === "onsite") return v;
    if (v.includes("remote")) return "remote";
    if (v.includes("hybrid")) return "hybrid";
    if (v.includes("on") && v.includes("site")) return "onsite";
    return "";
  };

  const normalizeProjectScope = (value: string | null | undefined) => {
    const v = String(value ?? "").trim();
    if (!v) return "";
    const lower = v.toLowerCase();
    if (lower === "short" || lower === "short-term") return "short-term";
    if (lower === "medium" || lower === "medium-term") return "medium-term";
    if (lower === "long" || lower === "long-term") return "long-term";
    if (lower === "not_sure" || lower === "not-sure") return "not-sure";
    if (lower.includes("not sure") || lower.includes("not_sure") || lower.includes("unsure")) return "not-sure";
    if (lower.includes("short") || lower.includes("30") || lower.includes("60")) return "short-term";
    if (lower.includes("medium") || lower.includes("90")) return "medium-term";
    if (lower.includes("long") || lower.includes("90+") || lower.includes("90 +")) return "long-term";
    return v;
  };

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportKind, setSupportKind] = useState<"feedback" | "report">("feedback");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportVideo, setSupportVideo] = useState<File | null>(null);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const supportAttachmentsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("support");
    if (kind !== "feedback" && kind !== "report") return;

    setSupportKind(kind);
    setSupportOpen(true);

    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      // ignore
    }
  }, []);

  const SUPPORT_MAX_VIDEO_BYTES = 2 * 1024 * 1024;
  const SUPPORT_MAX_IMAGE_BYTES = 100 * 1024;

  const submitSupport = async () => {
    if (supportSubmitting) return;
    if (!supportMessage.trim() && !supportVideo && supportFiles.length === 0) {
      toast({
        title: "Please add details",
        description: "Write a message or attach a file/video.",
        variant: "destructive",
      });
      return;
    }

    if (supportVideo && supportVideo.size > SUPPORT_MAX_VIDEO_BYTES) {
      toast({
        title: "Video too large",
        description: "Max video size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    const tooLargeImage = supportFiles.find((f) => f.size > SUPPORT_MAX_IMAGE_BYTES);
    if (tooLargeImage) {
      toast({
        title: "Image too large",
        description: "Each image attachment must be 100KB or less.",
        variant: "destructive",
      });
      return;
    }

    setSupportSubmitting(true);
    try {
      const auth = getEmployerAuth();
      const employerId = auth?.id ? String(auth.id) : "";

      const fd = new FormData();
      fd.append("kind", supportKind);
      fd.append("userType", "employer");
      if (employerId) fd.append("userId", employerId);
      fd.append("message", supportMessage);
      if (typeof window !== "undefined") {
        fd.append("pageUrl", window.location.href);
      }
      if (supportVideo) fd.append("video", supportVideo);
      for (const f of supportFiles) {
        fd.append("attachments", f);
      }

      const res = await fetch("/api/support/feedback", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText || "Request failed");
      }

      toast({
        title: "Submitted",
        description: "Thanks! We received your message.",
      });
      setSupportOpen(false);
      setSupportMessage("");
      setSupportVideo(null);
      setSupportFiles([]);
      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to submit",
        variant: "destructive",
      });
      setSupportFiles([]);
      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
    } finally {
      setSupportSubmitting(false);
    }
  };

  // Projects state
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [authEmployerId, setAuthEmployerId] = useState<string | null>(null);

  // Project dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [projectScope, setProjectScope] = useState("");
  const [projectFullTimeOffer, setProjectFullTimeOffer] = useState(false);
  const [projectLocationType, setProjectLocationType] = useState<string>("");
  const [projectLocationTypeTouched, setProjectLocationTypeTouched] = useState(false);
  const [projectCityStateTouched, setProjectCityStateTouched] = useState(false);
  const [projectPincode, setProjectPincode] = useState("");
  const [projectCity, setProjectCity] = useState("");
  const [projectState, setProjectState] = useState("");
  const [projectTimezone, setProjectTimezone] = useState("Asia/Kolkata");
  const [projectStatus, setProjectStatus] = useState("active");
  const [projectSkillsInput, setProjectSkillsInput] = useState("");
  const [projectStep, setProjectStep] = useState(1); // 1: Name, 2: Skills, 3: Scope, 4: Location
  const [isLoading, setIsLoading] = useState(false);
  const [projectSkillSearch, setProjectSkillSearch] = useState("");
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);

  const [projectCityPopoverOpen, setProjectCityPopoverOpen] = useState(false);
  const [projectCitySearchQuery, setProjectCitySearchQuery] = useState("");
  const [projectManualCityState, setProjectManualCityState] = useState(false);

  const [companyCity, setCompanyCity] = useState<string>("");
  const [companyState, setCompanyState] = useState<string>("");

  const [companyCountry, setCompanyCountry] = useState<string>("");
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

  const allSkills = useMemo(
    () => (skillsData as unknown as string[]).slice().sort((a, b) => a.localeCompare(b)),
    [],
  );

  const projectSkillList = useMemo(
    () =>
      projectSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [projectSkillsInput],
  );

  const projectCityStateOptions = useMemo(() => {
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
      const key = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city, state });
    }

    return out.sort((a, b) => a.city.localeCompare(b.city));
  }, []);

  const getFirstCityForState = useCallback(
    (state: string) => {
      const s = String(state ?? "").trim().toLowerCase();
      if (!s) return "";
      const found = projectCityStateOptions.find(
        (opt) => String(opt.state ?? "").trim().toLowerCase() === s,
      );
      return found?.city ? String(found.city) : "";
    },
    [projectCityStateOptions],
  );

  const requiresProjectCityState = projectLocationType === "hybrid" || projectLocationType === "onsite";
  const hasProjectCityState = !!String(projectCity).trim() && !!String(projectState).trim();

  useEffect(() => {
    if (projectLocationType === "remote") {
      setProjectCity("");
      setProjectState("");
      setProjectCityStateTouched(false);
      setProjectManualCityState(false);
      setProjectCityPopoverOpen(false);
      setProjectCitySearchQuery("");
      return;
    }

    if (projectLocationType !== "hybrid" && projectLocationType !== "onsite") return;
    if (projectManualCityState) return;
    if (projectCityStateTouched) return;

    const city = String(projectCity ?? "").trim();
    const state = String(projectState ?? "").trim();
    const companyC = String(companyCity ?? "").trim();
    const companyS = String(companyState ?? "").trim();

    const effectiveState = state || companyS;

    if (!state && companyS) {
      setProjectState(companyS);
    }

    if (!city) {
      const companyMatchesState =
        !!companyC && !!companyS && !!effectiveState && companyS.toLowerCase() === effectiveState.toLowerCase();
      const picked = companyMatchesState ? companyC : getFirstCityForState(effectiveState);
      if (picked) {
        setProjectCity(picked);
        setProjectCitySearchQuery(picked);
      }
    }
  }, [companyCity, companyState, getFirstCityForState, projectCity, projectCityStateTouched, projectLocationType, projectManualCityState, projectState]);

  useEffect(() => {
    if (projectManualCityState) return;
    if (projectCityPopoverOpen) return;
    const city = String(projectCity ?? "");
    if (String(projectCitySearchQuery ?? "") !== city) {
      setProjectCitySearchQuery(city);
    }
  }, [projectCity, projectCityPopoverOpen, projectCitySearchQuery, projectManualCityState]);

  useEffect(() => {
    const city = String(projectCity ?? "").trim();
    const state = String(projectState ?? "").trim();
    if (!city || !state) return;

    const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
    const exists = projectCityStateOptions.some(
      (opt) => `${opt.city.toLowerCase()}__${opt.state.toLowerCase()}` === k,
    );
    if (!exists) setProjectManualCityState(true);
  }, [projectCity, projectState, projectCityStateOptions]);

  const projectFilteredSkillOptions = useMemo(() => {
    const lowerSelected = projectSkillList.map((s) => s.toLowerCase());
    const pool = allSkills.filter(
      (s) => !lowerSelected.includes(s.toLowerCase()),
    );
    if (!projectSkillSearch.trim()) return pool;
    const q = projectSkillSearch.toLowerCase();
    return pool.filter((s) => s.toLowerCase().includes(q));
  }, [allSkills, projectSkillList, projectSkillSearch]);

  // Filter states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [cart, setCart] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillsBackup, setSkillsBackup] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [isSkillDropdownOpen, setIsSkillDropdownOpen] = useState(false);
  const skillDropdownRef = useRef<HTMLDivElement | null>(null);
  const [includeRemote, setIncludeRemote] = useState(false);
  const [hasLaptop, setHasLaptop] = useState(false);
  const [filterBySkills, setFilterBySkills] = useState(true);
  const [skillPriorityEnabled, setSkillPriorityEnabled] = useState(true);
  const [priceFilter, setPriceFilter] = useState<string>("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [locationPopoverOpen, setLocationPopoverOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationManualCityState, setLocationManualCityState] = useState(false);
  const [minRatings, setMinRatings] = useState({
    communication: 0,
    coding: 0,
    aptitude: 0,
    interview: 0,
    findternScore: 0,
  });
  const [sortFields, setSortFields] = useState<("communication" | "coding" | "aptitude" | "interview" | "findternScore")[]>([]);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [appliedFilters, setAppliedFilters] = useState(() => ({
    includeRemote: false,
    hasLaptop: false,
    filterBySkills: true,
    skillPriorityEnabled: true,
    priceLabel: "" as string,
    selectedCities: [] as string[],
    selectedSkills: [] as string[],
    minRatings: {
      communication: 0,
      coding: 0,
      aptitude: 0,
      interview: 0,
      findternScore: 0,
    },
    sortFields: [] as ("communication" | "coding" | "aptitude" | "interview" | "findternScore")[],
    sortDirection: "desc" as "desc" | "asc",
  }));

  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const selectedProjectIdsStorageKey = "employerSelectedProjectIds";
  const legacyFiltersMigratedFlagKey = "employerLegacyFiltersMigrated";
  const getCompareStorageKey = (projectId: string | null | undefined) =>
    projectId ? `employerCompareIds:${projectId}` : "employerCompareIds";
  const getSelectedSkillsStorageKey = (projectId: string | null | undefined) =>
    projectId ? `employerSelectedSkills:${projectId}` : "employerSelectedSkills";
  const getSelectedCitiesStorageKey = (projectId: string | null | undefined) =>
    projectId ? `employerSelectedCities:${projectId}` : "employerSelectedCities";
  const getAppliedFiltersStorageKey = (projectId: string | null | undefined) =>
    projectId ? `employerAppliedFilters:${projectId}` : "employerAppliedFilters";

  const [includedProjectIds, setIncludedProjectIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.map((v) => String(v ?? "").trim()).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      try {
        const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        const list = Array.isArray(parsed)
          ? parsed.map((v) => String(v ?? "").trim()).filter(Boolean)
          : [];
        setIncludedProjectIds(list);
      } catch {
        setIncludedProjectIds([]);
      }
    };

    read();
    const onUpdate = () => read();
    window.addEventListener("employerProjectsUpdated", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("employerProjectsUpdated", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [selectedProjectIdsStorageKey]);

  const includedProjectIdsLowerSet = useMemo(
    () => new Set((includedProjectIds ?? []).map((id) => String(id ?? "").trim().toLowerCase()).filter(Boolean)),
    [includedProjectIds],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (includedProjectIdsLowerSet.size > 0) return;

    const activeIds = (projects ?? [])
      .filter((p) => String(p?.status ?? "active").trim().toLowerCase() !== "inactive")
      .slice(0, 5)
      .map((p) => String(p?.id ?? "").trim())
      .filter(Boolean);

    if (activeIds.length === 0) return;
    setIncludedProjectIds(activeIds);
    try {
      window.localStorage.setItem(selectedProjectIdsStorageKey, JSON.stringify(activeIds));
      window.dispatchEvent(new Event("employerProjectsUpdated"));
    } catch { }
  }, [includedProjectIdsLowerSet, projects, selectedProjectIdsStorageKey]);

  const visibleProjects = useMemo(() => {
    const active = (projects ?? []).filter(
      (p) => String(p?.status ?? "active").trim().toLowerCase() !== "inactive",
    );
    if (includedProjectIdsLowerSet.size === 0) return active;

    const includedOrder = new Map<string, number>();
    (includedProjectIds ?? []).forEach((id, idx) => {
      const key = String(id ?? "").trim().toLowerCase();
      if (!key) return;
      if (!includedOrder.has(key)) includedOrder.set(key, idx);
    });

    return active
      .filter((p) => includedProjectIdsLowerSet.has(String(p?.id ?? "").trim().toLowerCase()))
      .slice()
      .sort((a, b) => {
        const aKey = String(a?.id ?? "").trim().toLowerCase();
        const bKey = String(b?.id ?? "").trim().toLowerCase();
        const ai = includedOrder.get(aKey);
        const bi = includedOrder.get(bKey);
        if (ai == null && bi == null) return 0;
        if (ai == null) return 1;
        if (bi == null) return -1;
        return ai - bi;
      });
  }, [includedProjectIds, includedProjectIdsLowerSet, projects]);

  useEffect(() => {
    if (!selectedProject) {
      if (visibleProjects.length > 0) {
        let next = visibleProjects[0];
        try {
          const storedSelectedId = String(window.localStorage.getItem(selectedProjectIdStorageKey) ?? "").trim();
          if (storedSelectedId) {
            const stored = visibleProjects.find((p) => String(p?.id ?? "").trim() === storedSelectedId);
            if (stored) next = stored;
          }
        } catch { }
        setSelectedProject(next);
        try {
          window.localStorage.setItem(selectedProjectIdStorageKey, String(next.id));
          window.dispatchEvent(new Event("employerProjectChanged"));
        } catch { }
      }
      return;
    }

    const stillVisible = visibleProjects.some((p) => String(p?.id) === String(selectedProject?.id));
    if (stillVisible) return;

    let next = visibleProjects[0] ?? null;
    if (visibleProjects.length > 0) {
      try {
        const storedSelectedId = String(window.localStorage.getItem(selectedProjectIdStorageKey) ?? "").trim();
        if (storedSelectedId) {
          const stored = visibleProjects.find((p) => String(p?.id ?? "").trim() === storedSelectedId);
          if (stored) next = stored;
        }
      } catch { }
    }
    setSelectedProject(next);
    try {
      if (next) {
        window.localStorage.setItem(selectedProjectIdStorageKey, String(next.id));
      } else {
        window.localStorage.removeItem(selectedProjectIdStorageKey);
      }
      window.dispatchEvent(new Event("employerProjectChanged"));
    } catch { }
  }, [selectedProject, selectedProjectIdStorageKey, visibleProjects]);

  const migrateLegacyFilterStorageForProject = (projectId: string) => {
    try {
      const alreadyMigrated = window.localStorage.getItem(legacyFiltersMigratedFlagKey);
      if (alreadyMigrated === "1") return;

      try {
        const storedSelectedId = window.localStorage.getItem(selectedProjectIdStorageKey);
        if (storedSelectedId && String(storedSelectedId) !== String(projectId)) return;
      } catch {
        // ignore
      }

      const legacyCompareKey = getCompareStorageKey(null);
      const legacySkillsKey = getSelectedSkillsStorageKey(null);
      const legacyCitiesKey = getSelectedCitiesStorageKey(null);
      const legacyAppliedFiltersKey = getAppliedFiltersStorageKey(null);

      const compareKey = getCompareStorageKey(projectId);
      const skillsKey = getSelectedSkillsStorageKey(projectId);
      const citiesKey = getSelectedCitiesStorageKey(projectId);
      const appliedFiltersKey = getAppliedFiltersStorageKey(projectId);

      const hasAnyLegacyValues =
        !!window.localStorage.getItem(legacyCompareKey) ||
        !!window.localStorage.getItem(legacySkillsKey) ||
        !!window.localStorage.getItem(legacyCitiesKey) ||
        !!window.localStorage.getItem(legacyAppliedFiltersKey);

      if (!hasAnyLegacyValues) {
        window.localStorage.setItem(legacyFiltersMigratedFlagKey, "1");
        return;
      }

      let migratedAny = false;
      const maybeMigrate = (scopedKey: string, legacyKey: string) => {
        const scopedExisting = window.localStorage.getItem(scopedKey);
        const legacyExisting = window.localStorage.getItem(legacyKey);
        if (!scopedExisting && legacyExisting) {
          window.localStorage.setItem(scopedKey, legacyExisting);
          window.localStorage.removeItem(legacyKey);
          migratedAny = true;
        }
      };

      maybeMigrate(compareKey, legacyCompareKey);
      maybeMigrate(skillsKey, legacySkillsKey);
      maybeMigrate(citiesKey, legacyCitiesKey);
      maybeMigrate(appliedFiltersKey, legacyAppliedFiltersKey);

      if (migratedAny) {
        window.localStorage.setItem(legacyFiltersMigratedFlagKey, "1");
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const storedSelectedId = window.localStorage.getItem(selectedProjectIdStorageKey);
    if (storedSelectedId) {
      migrateLegacyFilterStorageForProject(storedSelectedId);
    }
  }, []);

  const filtersHydratedRef = useRef(false);

  const MAX_SELECTED_SKILLS = 7;

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

  const getCandidateRegion = (candidate: Candidate): "IN" | "INTL" => {
    const stateLower = String(candidate.state ?? "").trim().toLowerCase();
    if (stateLower && indiaStateLowerSet.has(stateLower)) return "IN";

    const locLower = String(candidate.location ?? "").trim().toLowerCase();
    if (locLower.includes(", india") || locLower.endsWith(" india")) return "IN";

    return "INTL";
  };

  const getCandidateHourlyPriceLabel = (candidate: Candidate) => {
    const score = Number(candidate.findternScore ?? 0);
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return "Free";
      return `${formatCurrencyMinor(minor, resolved.currency)}/hr`;
    }

    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";
    if (viewerIsIndia) {
      if (tier === "low") return "Free";
      if (tier === "mid") return "₹100/hr";
      return "₹200/hr";
    }
    if (tier === "low") return "Free";
    if (tier === "mid") return "$1/hr";
    return "$2/hr";
  };

  const priceFilterOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const p of pricingPlans) {
      const cur = String(p?.currency ?? "").trim().toUpperCase() || expectedCurrency;
      if (expectedCurrency && cur !== expectedCurrency) continue;
      const minor = Number(p?.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) continue;
      labels.add(`${formatCurrencyMinor(minor, cur)}/hr`);
    }

    const list = Array.from(labels);
    if (list.length > 0) return list.sort((a, b) => a.localeCompare(b));
    return viewerIsIndia ? ["₹100/hr", "₹200/hr"] : ["$1/hr", "$2/hr"];
  }, [expectedCurrency, pricingPlans, viewerIsIndia]);

  const allowedPriceLabels = useMemo(() => {
    return new Set(["Free", ...priceFilterOptions]);
  }, [priceFilterOptions]);

  useEffect(() => {
    if (!priceFilter) return;
    if (allowedPriceLabels.has(priceFilter)) return;
    const normalized = (() => {
      const raw = String(priceFilter ?? "").trim();
      if (!raw) return "";
      if (raw.toLowerCase() === "free") return "Free";
      if (raw.startsWith("USD ")) return raw.replace(/^USD\s+/, "$");
      if (raw.startsWith("US$")) return raw.replace(/^US\$/, "$");
      if (raw.startsWith("INR ")) return raw.replace(/^INR\s+/, "₹");
      return raw;
    })();
    if (normalized && allowedPriceLabels.has(normalized)) {
      setPriceFilter(normalized);
      return;
    }
  }, [allowedPriceLabels, priceFilter]);

  const normalizeSelectedSkills = (input: string[]) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of input) {
      const v = String(s ?? "").trim();
      if (!v) continue;
      const key = v.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out;
  };

  const removeSkill = (skill: string) => {
    const key = String(skill ?? "").trim().toLowerCase();
    if (!key) return;
    setSelectedSkills((prev) => prev.filter((s) => String(s ?? "").trim().toLowerCase() !== key));
  };

  const hasAnySkillOverlap = (a: string[], b: string[]) => {
    const aSet = new Set(
      (Array.isArray(a) ? a : [])
        .map((s) => String(s ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
    if (aSet.size === 0) return false;

    const bList = Array.isArray(b) ? b : [];
    for (const s of bList) {
      const key = String(s ?? "").trim().toLowerCase();
      if (!key) continue;
      if (aSet.has(key)) return true;
    }
    return false;
  };

  const addSelectedSkill = (skill: string) => {
    const value = String(skill ?? "").trim();
    if (!value) return;
    setSelectedSkills((prev) => {
      const prevLower = new Set(prev.map((s) => s.toLowerCase()));
      const key = value.toLowerCase();
      if (prevLower.has(key)) return prev;
      if (prev.length >= MAX_SELECTED_SKILLS) {
        toast({
          title: "Skill limit reached",
          description: `You can select up to ${MAX_SELECTED_SKILLS} skills.`,
        });
        return prev;
      }
      return [...prev, value];
    });
  };

  const selectedSkillsLowerSet = useMemo(
    () => new Set(selectedSkills.map((s) => s.toLowerCase())),
    [selectedSkills],
  );

  const getOrderedCandidateSkillsForDisplay = (skills: string[]) => {
    const list = Array.isArray(skills) ? skills : [];
    return list
      .map((skill, idx) => ({
        skill,
        idx,
        selected: selectedSkillsLowerSet.has(String(skill).toLowerCase()),
      }))
      .sort((a, b) => {
        if (a.selected !== b.selected) return a.selected ? -1 : 1;
        return a.idx - b.idx;
      })
      .map((x) => x.skill);
  };

  const selectedCitiesLowerSet = useMemo(
    () => new Set(selectedCities.map((s) => s.toLowerCase())),
    [selectedCities],
  );

  const locationFilterOptions = useMemo(() => {
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
      if (!city) continue;
      if (!state) continue;
      const key = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city, state });
    }

    return out.sort((a, b) => a.city.localeCompare(b.city));
  }, []);

  const filteredLocationFilterOptions = useMemo(() => {
    const q = locationSearchQuery.trim().toLowerCase();
    const list = locationFilterOptions
      .filter((item) => {
        if (!q) return true;
        return item.city.toLowerCase().includes(q) || (item.state || "").toLowerCase().includes(q);
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
      })
      .slice(0, 50);

    return list;
  }, [locationFilterOptions, locationSearchQuery]);

  useEffect(() => {
    const city = String(selectedCities?.[0] ?? "").trim();
    if (!city) return;

    const cityLower = city.toLowerCase();
    const exists = locationFilterOptions.some((opt) => String(opt.city ?? "").toLowerCase() === cityLower);
    if (!exists) setLocationManualCityState(true);
  }, [locationFilterOptions, selectedCities]);

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

  const getCandidateDisplayName = (candidate: Pick<Candidate, "id" | "name" | "initials">) => {
    if (acceptedInternIds.has(candidate.id)) return candidate.name;
    if ((fullTimeOfferInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim())) return candidate.name;
    if ((hiredInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim())) return candidate.name;
    const statusLower = String(proposalMetaByInternId[candidate.id]?.status ?? "").toLowerCase();
    if (statusLower === "hired") return candidate.name;
    return getInitialsFromName(candidate.name, candidate.initials);
  };

  useEffect(() => {
    let cancelled = false;
    const auth = getEmployerAuth();
    if (!auth) {
      setLocation("/employer/login");
      return;
    }
    setAuthEmployerId(auth.id);

    const mapProjects = (raw: any): Project[] => {
      const list = Array.isArray(raw?.projects) ? raw.projects : Array.isArray(raw) ? raw : [];
      return (list as any[])
        .map((p) => {
          const id = String(p?.id ?? "").trim();
          if (!id) return null;
          const skills = Array.isArray(p?.skills)
            ? p.skills
            : typeof p?.skills === "string"
              ? String(p.skills)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
              : [];
          return {
            id,
            name: String(p?.projectName ?? p?.project_name ?? p?.name ?? "Project").trim() || "Project",
            skills: skills.map((s: any) => String(s ?? "").trim()).filter(Boolean),
            scopeOfWork: p?.scopeOfWork ?? p?.scope_of_work ?? undefined,
            fullTimeOffer:
              typeof p?.fullTimeOffer === "boolean" ? p.fullTimeOffer : Boolean(p?.full_time_offer ?? false),
            locationType: p?.locationType ?? p?.location_type ?? null,
            pincode: p?.pincode ?? null,
            city: p?.city ?? null,
            state: p?.state ?? null,
            timezone: p?.timezone ?? null,
            status: p?.status ?? null,
          } as Project;
        })
        .filter(Boolean) as Project[];
    };

    const loadProjects = async () => {
      try {
        const effectiveEmployerId = auth.id ?? getEmployerAuth()?.id ?? null;

        if (!effectiveEmployerId) return;

        const res = await fetch(`/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/projects`, {
          credentials: "include",
        });
        if (!res.ok) return;

        const json = await res.json().catch(() => null);
        const nextProjects = mapProjects(json);
        if (cancelled) return;

        setProjects(nextProjects);

        try {
          const rawStored = window.localStorage.getItem(selectedProjectIdsStorageKey);
          const parsed = rawStored ? JSON.parse(rawStored) : [];
          const storedIds = Array.isArray(parsed)
            ? parsed.map((v) => String(v ?? "").trim()).filter(Boolean)
            : [];

          if (storedIds.length > 0) {
            setIncludedProjectIds(storedIds);
          } else {
            const activeProjects = (nextProjects ?? [])
              .filter((p) => String((p as any)?.status ?? "active").trim().toLowerCase() !== "inactive")
              .slice(0, 5)
              .map((p) => String(p?.id ?? "").trim())
              .filter(Boolean);

            if (activeProjects.length > 0) {
              setIncludedProjectIds(activeProjects);
              window.localStorage.setItem(selectedProjectIdsStorageKey, JSON.stringify(activeProjects));
              window.dispatchEvent(new Event("employerProjectsUpdated"));
            }
          }
        } catch { }
      } catch {
        // ignore
      }
    };

    loadProjects();

    const onProjectsUpdated = () => {
      loadProjects();
    };
    try {
      window.addEventListener("employerProjectsUpdated", onProjectsUpdated);
      window.addEventListener("focus", onProjectsUpdated);
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      try {
        window.removeEventListener("employerProjectsUpdated", onProjectsUpdated);
        window.removeEventListener("focus", onProjectsUpdated);
      } catch {
        // ignore
      }
    };
  }, [setLocation]);

  // Track hired interns across ALL projects so name stays unlocked everywhere
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;
        if (!effectiveEmployerId) return;

        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/proposals`,
        );
        const json = await response.json().catch(() => null);
        const list = (json?.proposals || []) as any[];

        const hired = new Set<string>();
        for (const p of list) {
          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (!internId) continue;
          const statusLower = String(p?.status ?? "").trim().toLowerCase();
          if (statusLower === "hired") hired.add(internId);
        }

        if (cancelled) return;
        setHiredInternIdSet(hired);
      } catch {
        if (cancelled) return;
        setHiredInternIdSet(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authEmployerId]);

  useEffect(() => {
    let cancelled = false;
    const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;
    if (!effectiveEmployerId) {
      setFullTimeOfferSentInternIdSet(new Set());
      setFullTimeOfferInternIdSet(new Set());
      setFullTimeAcceptedInternIdSet(new Set());
      return;
    }

    (async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/proposals`,
        );
        const json = await response.json().catch(() => null);
        const list = (json?.proposals || []) as any[];

        const sent = new Set<string>();
        const hired = new Set<string>();
        const accepted = new Set<string>();
        for (const p of list) {
          const statusLower = String(p?.status ?? "").trim().toLowerCase();

          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (!internId) continue;

          const offer = (p?.offerDetails ?? p?.offer_details ?? {}) as any;
          const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
          const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
          if (!hasFullTimeOffer) continue;

          if (statusLower !== "rejected" && statusLower !== "expired" && statusLower !== "withdrawn") {
            sent.add(internId);
          }
          if (statusLower === "accepted") {
            accepted.add(internId);
          }
          if (statusLower === "hired") {
            hired.add(internId);
          }
        }

        if (!cancelled) {
          setFullTimeOfferSentInternIdSet(sent);
          setFullTimeOfferInternIdSet(hired);
          setFullTimeAcceptedInternIdSet(accepted);
        }
      } catch {
        if (!cancelled) {
          setFullTimeOfferSentInternIdSet(new Set());
          setFullTimeOfferInternIdSet(new Set());
          setFullTimeAcceptedInternIdSet(new Set());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authEmployerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;
    const projectId = selectedProject?.id
      ? String(selectedProject.id)
      : (() => {
        try {
          return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
        } catch {
          return "";
        }
      })();

    if (!effectiveEmployerId || !projectId) return;

    const hiredIds = Object.keys(proposalMetaByInternId).filter((internId) => {
      const s = String(proposalMetaByInternId[internId]?.status ?? "").trim().toLowerCase();
      return s === "hired";
    });
    const blockedIds = Array.from(new Set([
      ...hiredIds,
      ...Array.from(fullTimeOfferInternIdSet ?? []),
    ].map((v) => String(v ?? "").trim()).filter(Boolean)));
    if (blockedIds.length === 0) return;

    const blockedSet = new Set(blockedIds);
    if (blockedSet.size === 0) return;

    void (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
        );
        const json = await res.json().catch(() => null);
        const stored: string[] = Array.isArray(json?.cartIds)
          ? json.cartIds.map((v: any) => String(v ?? "").trim()).filter(Boolean)
          : [];

        const nextCart = stored.filter((id: string) => !blockedSet.has(String(id ?? "").trim()));
        if (nextCart.length === stored.length) return;

        await apiRequest("POST", `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/cart/sync`, {
          projectId,
          cartIds: nextCart,
          checkoutIds: [],
        });

        setCart(nextCart);
        setCartCount(nextCart.length);
        setCandidates((prev) => prev.map((c) => (blockedSet.has(String(c.id ?? "").trim()) ? { ...c, isAdded: false } : c)));
        window.dispatchEvent(new Event("employerCartUpdated"));
      } catch {
        // ignore
      }
    })();
  }, [authEmployerId, fullTimeOfferInternIdSet, proposalMetaByInternId, selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    setSkillsBackup(selectedProject.skills);
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    try {
      window.localStorage.setItem(
        getSelectedSkillsStorageKey(selectedProject.id),
        JSON.stringify(Array.isArray(selectedSkills) ? selectedSkills : []),
      );
    } catch { }
  }, [selectedProject, selectedSkills]);

  useEffect(() => {
    if (!selectedProject) return;
    try {
      window.localStorage.setItem(
        getSelectedCitiesStorageKey(selectedProject.id),
        JSON.stringify(selectedCities),
      );
    } catch { }
  }, [selectedProject, selectedCities]);

  useEffect(() => {
    if (!selectedProject) return;

    filtersHydratedRef.current = false;

    const normalizedProjectLocationType = normalizeProjectLocationType(selectedProject.locationType);
    const isProjectRemote = normalizedProjectLocationType === "remote";

    const defaultIncludeRemote = isProjectRemote ? true : false;

    const defaultAppliedCity =
      isProjectRemote
        ? ""
        : normalizeCityOnlyLabel(String(selectedProject.city ?? "").trim());
    const defaultAppliedCities = defaultAppliedCity ? [defaultAppliedCity] : [];

    const readStoredSelectedCities = (): string[] => {
      if (isProjectRemote) return [];
      try {
        const storedCitiesRaw = window.localStorage.getItem(getSelectedCitiesStorageKey(selectedProject.id));
        const storedCities = storedCitiesRaw ? JSON.parse(storedCitiesRaw) : null;
        return Array.isArray(storedCities)
          ? (storedCities
              .map((v: any) => normalizeCityOnlyLabel(String(v ?? "")))
              .filter((v: string) => Boolean(v)) as string[])
          : [];
      } catch {
        return [];
      }
    };

    const storedSelectedCitiesFallback: string[] = (() => {
      const stored = readStoredSelectedCities();
      if (stored.length > 0) return stored;
      return defaultAppliedCities;
    })();

    const allowedSortFields = new Set([
      "communication",
      "coding",
      "aptitude",
      "interview",
      "findternScore",
    ]);

    try {
      const storedRaw = window.localStorage.getItem(getAppliedFiltersStorageKey(selectedProject.id));
      const stored = storedRaw ? JSON.parse(storedRaw) : null;

      if (!stored || typeof stored !== "object") {
        const effectiveSelectedCities: string[] = defaultIncludeRemote ? [] : storedSelectedCitiesFallback;
        const nextSelectedSkills = normalizeSelectedSkills(selectedProject.skills);

        setIncludeRemote(defaultIncludeRemote);
        setHasLaptop(false);
        setFilterBySkills(true);
        setSkillPriorityEnabled(true);
        setPriceFilter("");

        setSelectedCities(effectiveSelectedCities);
        setLocationSearchQuery(
          defaultIncludeRemote
            ? ""
            : effectiveSelectedCities.length > 0
              ? String(effectiveSelectedCities[0] ?? "")
              : "",
        );
        if (defaultIncludeRemote) {
          setLocationManualCityState(false);
        }

        setSelectedSkills(nextSelectedSkills);
        setMinRatings({
          communication: 0,
          coding: 0,
          aptitude: 0,
          interview: 0,
          findternScore: 0,
        });
        setSortFields([]);
        setSortDirection("desc");

        const nextAppliedFilters = {
          includeRemote: defaultIncludeRemote,
          hasLaptop: false,
          filterBySkills: true,
          skillPriorityEnabled: true,
          priceLabel: "" as string,
          selectedCities: effectiveSelectedCities,
          selectedSkills: nextSelectedSkills,
          minRatings: {
            communication: 0,
            coding: 0,
            aptitude: 0,
            interview: 0,
            findternScore: 0,
          },
          sortFields: [] as ("communication" | "coding" | "aptitude" | "interview" | "findternScore")[],
          sortDirection: "desc" as "desc" | "asc",
        };

        setAppliedFilters(nextAppliedFilters);
        try {
          window.localStorage.setItem(
            getAppliedFiltersStorageKey(selectedProject.id),
            JSON.stringify(nextAppliedFilters),
          );
        } catch { }
      } else {
        const storedAny = stored as any;

        const hasStoredIncludeRemote = Object.prototype.hasOwnProperty.call(storedAny, "includeRemote");
        const nextIncludeRemote = hasStoredIncludeRemote
          ? storedAny.includeRemote === true
          : defaultIncludeRemote;
        const nextHasLaptop = storedAny.hasLaptop === true;
        const nextFilterBySkills = storedAny.filterBySkills !== false;
        const nextSkillPriorityEnabled = storedAny.skillPriorityEnabled !== false;
        const nextPriceLabel = String(storedAny.priceLabel ?? "").trim();

        const nextSelectedCities: string[] = Array.isArray(storedAny.selectedCities)
          ? (storedAny.selectedCities
              .map((v: any) => normalizeCityOnlyLabel(String(v ?? "")))
              .filter((v: string) => Boolean(v)) as string[])
          : [];

        const storedSelectedSkills = Array.isArray(storedAny.selectedSkills)
          ? storedAny.selectedSkills
              .map((v: any) => String(v ?? "").trim())
              .filter(Boolean)
          : [];
        const nextSelectedSkills = normalizeSelectedSkills(storedSelectedSkills);

        const mr = storedAny.minRatings ?? {};
        const nextMinRatings = {
          communication: Number(mr.communication ?? 0) || 0,
          coding: Number(mr.coding ?? 0) || 0,
          aptitude: Number(mr.aptitude ?? 0) || 0,
          interview: Number(mr.interview ?? 0) || 0,
          findternScore: Number(mr.findternScore ?? 0) || 0,
        };

        const nextSortFields = Array.isArray(storedAny.sortFields)
          ? (storedAny.sortFields as any[])
              .map((v) => String(v ?? ""))
              .filter((v) => allowedSortFields.has(v))
          : [];
        const nextSortDirection: "asc" | "desc" = storedAny.sortDirection === "asc" ? "asc" : "desc";

        const effectiveSelectedCities: string[] = nextIncludeRemote
          ? []
          : nextSelectedCities.length > 0
            ? nextSelectedCities
            : storedSelectedCitiesFallback;

        setIncludeRemote(nextIncludeRemote);
        setSelectedCities(effectiveSelectedCities);
        setLocationSearchQuery(
          nextIncludeRemote
            ? ""
            : effectiveSelectedCities.length > 0
              ? String(effectiveSelectedCities[0] ?? "")
              : "",
        );
        if (nextIncludeRemote) {
          setLocationManualCityState(false);
        }

        setSelectedSkills(nextSelectedSkills);
        setMinRatings(nextMinRatings);
        setSortFields(nextSortFields as any);
        setSortDirection(nextSortDirection);

        const nextAppliedFilters: typeof appliedFilters = {
          ...prev,
          includeRemote: nextIncludeRemote,
          selectedCities: effectiveSelectedCities,
          selectedSkills: nextSelectedSkills,
          minRatings: nextMinRatings,
          sortFields: nextSortFields as any,
          sortDirection: nextSortDirection,
        };

        setAppliedFilters(nextAppliedFilters);
        try {
          window.localStorage.setItem(
            getAppliedFiltersStorageKey(selectedProject.id),
            JSON.stringify(nextAppliedFilters),
          );
        } catch { }
      }
    } catch {
      // ignore
    } finally {
      filtersHydratedRef.current = true;
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    if (!filtersHydratedRef.current) return;

    const appliedCities = Array.isArray(appliedFilters.selectedCities) ? appliedFilters.selectedCities : [];
    const uiCities = Array.isArray(selectedCities) ? selectedCities : [];
    const appliedMatchesUi =
      appliedFilters.includeRemote === includeRemote &&
      appliedCities.length === uiCities.length &&
      appliedCities.every((c, idx) => String(c ?? "") === String(uiCities[idx] ?? ""));
    if (!appliedMatchesUi) return;

    try {
      window.localStorage.setItem(
        getAppliedFiltersStorageKey(selectedProject.id),
        JSON.stringify(appliedFilters),
      );
    } catch { }
  }, [appliedFilters, includeRemote, selectedCities, selectedProject]);

  const isSelectedProjectRemote = useMemo(() => {
    if (!selectedProject) return false;
    return normalizeProjectLocationType(selectedProject.locationType) === "remote";
  }, [selectedProject]);

  // Load intern candidates dynamically from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;

        if (!effectiveEmployerId) {
          return;
        }

        const selectedProjectId = String(selectedProject?.id ?? "").trim();

        const qs = selectedProjectId ? `?projectId=${encodeURIComponent(String(selectedProjectId))}` : "";

        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/proposals`,
        );
        const json = await response.json().catch(() => null);
        const list = (json?.proposals || []) as any[];

        const unlocked = new Set<string>();
        const nextMetaById: Record<string, ProposalMeta> = {};

        for (const p of list) {
          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
          if (!internId) continue;

          const proposalProjectId = String(p?.projectId ?? p?.project_id ?? "").trim();
          const status = String(p?.status ?? "sent").trim();
          const statusLower = status.toLowerCase();
          if (statusLower === "rejected") continue;

          const proposalId = String(p?.id ?? "").trim();
          if (!proposalId) continue;

          const rawTime = p?.updatedAt ?? p?.updated_at ?? p?.createdAt ?? p?.created_at ?? null;
          const parsed = rawTime ? new Date(rawTime as any).getTime() : 0;
          const ts = Number.isFinite(parsed) ? parsed : 0;

          const prev = nextMetaById[internId];
          if (!prev || ts >= (prev.ts ?? 0)) {
            nextMetaById[internId] = {
              status: status || "sent",
              proposalId,
              projectId: proposalProjectId || undefined,
              ts,
            };
          }

          if (statusLower === "hired" || Boolean(p?.isNameUnlocked)) {
            unlocked.add(internId);
          }
        }

        if (cancelled) return;
        setAcceptedInternIds(unlocked);
        setProposalMetaByInternId(nextMetaById);
      } catch {
        if (cancelled) return;
        setAcceptedInternIds(new Set());
        setProposalMetaByInternId({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authEmployerId, selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    if (!filtersHydratedRef.current) return;

    const appliedCities = Array.isArray(appliedFilters.selectedCities) ? appliedFilters.selectedCities : [];
    const uiCities = Array.isArray(selectedCities) ? selectedCities : [];
    const appliedMatchesUi =
      appliedFilters.includeRemote === includeRemote &&
      appliedCities.length === uiCities.length &&
      appliedCities.every((c, idx) => String(c ?? "") === String(uiCities[idx] ?? ""));
    if (!appliedMatchesUi) return;

    try {
      window.localStorage.setItem(
        getAppliedFiltersStorageKey(selectedProject.id),
        JSON.stringify(appliedFilters),
      );
    } catch { }
  }, [appliedFilters, includeRemote, selectedCities, selectedProject]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;

        if (!effectiveEmployerId) {
          return;
        }

        const projectId = selectedProject?.id
          ? String(selectedProject.id)
          : (() => {
            try {
              return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
            } catch {
              return "";
            }
          })();

        if (!projectId) {
          if (cancelled) return;
          setCandidates([]);
          setCart([]);
          setCartCount(0);
          return;
        }

        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

        const response = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/interns${qs}`,
        );
        const json = await response.json();
        const list = (json?.interns || []) as any[];

        const mapped: Candidate[] = list.map((item) => {
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

          return {
            id: user.id ?? onboarding.userId ?? onboarding.id ?? "",
            initials: getInitialsFromName(onboarding.extraData?.fullName || onboarding.extraData?.name || user.firstName + " " + user.lastName, "IN"),
            name: onboarding.extraData?.fullName || onboarding.extraData?.name || user.firstName + " " + user.lastName,
            profilePhotoUrl: documents?.profilePhotoName
              ? `/uploads/${encodeURIComponent(documents.profilePhotoName)}`
              : null,
            location: onboarding.city + ", " + onboarding.state,
            city: onboarding.city,
            state: onboarding.state,
            findternScore: onboarding.extraData?.findternScore ?? 0,
            skills,
            matchedSkills: skills, // for now treat all skills as matched
            preferredLocations: onboarding.preferredLocations,
            locationTypes: onboarding.locationTypes,
            aiRatings: {
              communication: onboarding.extraData?.ratings?.communication ?? 0,
              coding: onboarding.extraData?.ratings?.coding ?? 0,
              aptitude: onboarding.extraData?.ratings?.aptitude ?? 0,
              interview: onboarding.extraData?.ratings?.interview ?? 0,
            },
            hasProfile: Boolean(documents?.profilePhotoName),
            isAdded: false,
            hasLaptop: ["yes", "true", "1"].includes(String(onboarding.hasLaptop ?? "").trim().toLowerCase()),
            openToWork: onboarding.extraData?.openToWork !== false,
            fullTimeOffer: onboarding.extraData?.fullTimeOffer ?? false,
          };
        });

        let storedCart: string[] = [];
        try {
          const cartRes = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
          );
          const cartJson = await cartRes.json().catch(() => null);
          storedCart = Array.isArray(cartJson?.cartIds)
            ? cartJson.cartIds.map((v: any) => String(v ?? "").trim()).filter(Boolean)
            : [];
        } catch {
          storedCart = [];
        }

        if (cancelled) return;

        setCart(storedCart);
        setCartCount(storedCart.length);

        const storedSet = new Set(storedCart.map((v) => String(v)));
        setCandidates(mapped.map((c) => ({ ...c, isAdded: storedSet.has(c.id) })));
      } catch (error) {
        console.error("Failed to load interns", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authEmployerId, selectedProject]);

  // Keep cart state scoped to the selected project
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCartForProject = () => {
      void (async () => {
        try {
          const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;
          const projectId = selectedProject?.id
            ? String(selectedProject.id)
            : window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";

          if (!effectiveEmployerId || !projectId) {
            setCart([]);
            setCartCount(0);
            setCandidates((prev) => prev.map((c) => ({ ...c, isAdded: false })));
            return;
          }

          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
          );
          const json = await res.json().catch(() => null);
          const stored: string[] = Array.isArray(json?.cartIds)
            ? json.cartIds.map((v: any) => String(v ?? "").trim()).filter(Boolean)
            : [];

          setCart(stored);
          setCartCount(stored.length);
          const storedSet = new Set(stored);
          setCandidates((prev) =>
            prev.map((c) =>
              storedSet.has(c.id) ? { ...c, isAdded: true } : { ...c, isAdded: false },
            ),
          );
        } catch {
          setCart([]);
          setCartCount(0);
          setCandidates((prev) => prev.map((c) => ({ ...c, isAdded: false })));
        }
      })();
    };

    loadCartForProject();
    const onUpdate = () => loadCartForProject();
    window.addEventListener("employerCartUpdated", onUpdate);
    window.addEventListener("employerProjectChanged", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("employerCartUpdated", onUpdate);
      window.removeEventListener("employerProjectChanged", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [authEmployerId, selectedProject]);

  // Keep compare list scoped to the selected project
  useEffect(() => {
    if (!selectedProject) return;
    try {
      const storedCompareRaw = window.localStorage.getItem(getCompareStorageKey(selectedProject.id));
      const storedCompare: string[] = storedCompareRaw ? JSON.parse(storedCompareRaw) : [];
      setCompareList(Array.isArray(storedCompare) ? storedCompare : []);
    } catch {
      setCompareList([]);
    }
  }, [selectedProject]);

  // Project CRUD handlers
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!projectLocationType.trim()) {
      setProjectLocationTypeTouched(true);
      toast({
        title: "Error",
        description: "Please select at least one location type",
        variant: "destructive",
      });
      return;
    }

    if (requiresProjectCityState && !hasProjectCityState) {
      setProjectCityStateTouched(true);
      toast({
        title: "Error",
        description: "City and state are required for Hybrid/Onsite internships.",
        variant: "destructive",
      });
      return;
    }

    if (!authEmployerId) return;
    setIsLoading(true);
    try {
      const newProjectNameTrimmed = newProjectName.trim();
      const skills = projectSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const normalizedProjectSkills = normalizeSelectedSkills(skills);

      const cityPayload = requiresProjectCityState ? (projectCity || companyCity) || undefined : undefined;
      const statePayload = requiresProjectCityState ? (projectState || companyState) || undefined : undefined;

      const response = await apiRequest("POST", `/api/employer/${authEmployerId}/projects`, {
        projectName: newProjectNameTrimmed,
        skills: normalizedProjectSkills,
        scopeOfWork: projectScope || undefined,
        fullTimeOffer: projectFullTimeOffer,
        locationType: projectLocationType || undefined,
        pincode: undefined,
        city: cityPayload,
        state: statePayload,
        timezone: projectTimezone || undefined,
        status: projectStatus || undefined,
      });

      const json = await response.json();
      const createdId = String(
        json?.project?.id ??
          json?.project?.projectId ??
          json?.project?.project_id ??
          json?.projectId ??
          json?.id ??
          Date.now(),
      );

      const created: Project = {
        id: createdId,
        name: newProjectNameTrimmed,
        skills: normalizedProjectSkills,
        scopeOfWork: projectScope,
        fullTimeOffer: projectFullTimeOffer,
        locationType: projectLocationType || null,
        pincode: null,
        city: cityPayload ?? null,
        state: statePayload ?? null,
        timezone: projectTimezone,
        status: projectStatus,
      };

      setProjects((prev) => [created, ...prev]);
      setCurrentPage(1);
      setSelectedProject(created);
      setSkillsBackup(normalizedProjectSkills);
      setSelectedSkills(normalizedProjectSkills);
      setCompareList([]);

      try {
        window.localStorage.setItem(selectedProjectIdStorageKey, String(created.id));
        try {
          const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          const seen = new Set<string>();
          const next: string[] = [];

          const push = (value: unknown) => {
            const v = String(value ?? "").trim();
            if (!v) return;
            const key = v.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            next.push(v);
          };

          push(created.id);
          for (const item of list) {
            push(item);
            if (next.length >= 5) break;
          }

          window.localStorage.setItem(selectedProjectIdsStorageKey, JSON.stringify(next));
        } catch { }
        window.dispatchEvent(new Event("employerProjectChanged"));
        window.dispatchEvent(new Event("employerProjectsUpdated"));
      } catch { }

      const nextSelectedLocationType = normalizeProjectLocationType(projectLocationType);
      const nextIncludeRemote = nextSelectedLocationType === "remote";
      const createdCity = nextIncludeRemote ? "" : normalizeCityOnlyLabel(String(created.city ?? "").trim());
      const nextCities = createdCity ? [createdCity] : [];

      setIncludeRemote(nextIncludeRemote);
      setSelectedCities(nextCities);
      setLocationSearchQuery(
        nextIncludeRemote
          ? ""
          : nextCities.length > 0
            ? String(nextCities[0] ?? "")
            : "",
      );
      if (nextIncludeRemote) {
        setLocationManualCityState(false);
      }

      setAppliedFilters((prev) => ({
        ...prev,
        includeRemote: nextIncludeRemote,
        selectedCities: nextCities,
        selectedSkills: normalizedProjectSkills,
      }));

      setNewProjectName("");
      setProjectScope("");
      setProjectFullTimeOffer(false);
      setProjectLocationType("");
      setProjectLocationTypeTouched(false);
      setProjectCityStateTouched(false);
      setProjectPincode("");
      const resetCity = companyCity || "";
      const resetState = companyState || "";
      setProjectCity(resetCity);
      setProjectState(resetState);
      setProjectManualCityState(!doesProjectCityStateExist(resetCity, resetState));
      setProjectTimezone("Asia/Kolkata");
      setProjectStatus("active");
      setProjectSkillsInput("");
      setProjectSkillSearch("");
      setProjectStep(1);
      setIsCreateDialogOpen(false);

      toast({
        title: "Project created",
        description: `"${newProjectNameTrimmed}" has been created successfully.`,
      });

      window.setTimeout(() => {
        try {
          dismiss();
        } catch { }
      }, 2500);
    } catch (error: any) {
      const status = Number(error?.status ?? 0);
      const message = error instanceof Error ? error.message : "Failed to create project. Please try again.";
      toast({
        title: status === 409 ? "Project name already exists" : "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProject = async () => {
    if (!editingProject || !newProjectName.trim()) {
      toast({
        title: "Error",
        description: "Project name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!projectLocationType.trim()) {
      setProjectLocationTypeTouched(true);
      toast({
        title: "Error",
        description: "Please select at least one location type",
        variant: "destructive",
      });
      return;
    }

    if (requiresProjectCityState && !hasProjectCityState) {
      setProjectCityStateTouched(true);
      toast({
        title: "Error",
        description: "City and state are required for Hybrid/Onsite internships.",
        variant: "destructive",
      });
      return;
    }

    if (!authEmployerId || !editingProject) return;
    setIsLoading(true);
    try {
      const editingProjectId = editingProject.id;
      const skills = projectSkillsInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const normalizedProjectSkills = normalizeSelectedSkills(skills);

      const cityPayload = requiresProjectCityState ? (projectCity || undefined) : undefined;
      const statePayload = requiresProjectCityState ? (projectState || undefined) : undefined;

      await apiRequest("PUT", `/api/projects/${editingProject.id}`, {
        projectName: newProjectName.trim(),
        skills: normalizedProjectSkills,
        scopeOfWork: projectScope || undefined,
        fullTimeOffer: projectFullTimeOffer,
        locationType: projectLocationType || undefined,
        pincode: undefined,
        city: cityPayload,
        state: statePayload,
        timezone: projectTimezone || undefined,
        status: projectStatus || undefined,
      });

      const updatedProject: Project = {
        ...editingProject,
        name: newProjectName.trim(),
        skills: normalizedProjectSkills,
        scopeOfWork: projectScope,
        fullTimeOffer: projectFullTimeOffer,
        locationType: projectLocationType || null,
        pincode: null,
        city: cityPayload ?? null,
        state: statePayload ?? null,
        timezone: projectTimezone,
        status: projectStatus,
      };

      setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? updatedProject : p)));

      if (selectedProject && selectedProject.id === editingProject.id) {
        const nextSelectedLocationType = normalizeProjectLocationType(projectLocationType);
        const nextIncludeRemote = nextSelectedLocationType === "remote";
        const nextCity = nextIncludeRemote ? "" : normalizeCityOnlyLabel(String(cityPayload ?? "").trim());
        const nextCities = nextCity ? [nextCity] : [];

        setSelectedProject(updatedProject);
        setSkillsBackup(normalizedProjectSkills);
        setSelectedSkills(normalizedProjectSkills);
        setIncludeRemote(nextIncludeRemote);
        setSelectedCities(nextCities);
        setLocationSearchQuery(
          nextIncludeRemote
            ? ""
            : nextCities.length > 0
              ? String(nextCities[0] ?? "")
              : "",
        );
        if (nextIncludeRemote) {
          setLocationManualCityState(false);
        }

        setAppliedFilters((prev) => ({
          ...prev,
          includeRemote: nextIncludeRemote,
          selectedCities: nextCities,
          selectedSkills: normalizedProjectSkills,
        }));
      }

      try {
        window.localStorage.setItem(
          getSelectedSkillsStorageKey(editingProjectId),
          JSON.stringify(normalizedProjectSkills),
        );
      } catch { }

      try {
        const key = getAppliedFiltersStorageKey(editingProjectId);
        const raw = window.localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : null;
        const prev = stored && typeof stored === "object" ? stored : {};
        const nextSelectedLocationType = normalizeProjectLocationType(projectLocationType);
        const nextIncludeRemote = nextSelectedLocationType === "remote";
        const nextCity = nextIncludeRemote ? "" : normalizeCityOnlyLabel(String(cityPayload ?? "").trim());
        const nextCities = nextCity ? [nextCity] : [];
        window.localStorage.setItem(
          key,
          JSON.stringify({
            ...prev,
            includeRemote: nextIncludeRemote,
            selectedCities: nextCities,
            selectedSkills: normalizedProjectSkills,
          }),
        );
      } catch { }

      setNewProjectName("");
      setProjectScope("");
      setProjectFullTimeOffer(false);
      setProjectLocationType("");
      setProjectLocationTypeTouched(false);
      setProjectCityStateTouched(false);
      setProjectPincode("");
      const resetCity = companyCity || "";
      const resetState = companyState || "";
      setProjectCity(resetCity);
      setProjectState(resetState);
      setProjectCitySearchQuery(resetCity);
      setProjectManualCityState(!doesProjectCityStateExist(resetCity, resetState));
      setProjectTimezone("Asia/Kolkata");
      setProjectStatus("active");
      setProjectSkillsInput("");
      setProjectSkillSearch("");
      setProjectStep(1);
      setIsEditMode(false);
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingProject(null);

      toast({
        title: "Project updated",
        description: `"${updatedProject.name}" has been updated successfully.`,
      });

      window.setTimeout(() => {
        try {
          dismiss();
        } catch { }
      }, 2500);
    } catch (error: any) {
      const status = Number(error?.status ?? 0);
      const message = error instanceof Error ? error.message : "Failed to update project. Please try again.";
      toast({
        title: status === 409 ? "Project name already exists" : "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!editingProject) return;
    setIsLoading(true);
    try {
      const remainingProjects = projects.filter(p => p.id !== editingProject.id);
      await apiRequest("DELETE", `/api/projects/${editingProject.id}`);
      setProjects(remainingProjects);

      // If deleted project was selected, select the first available
      if (selectedProject && selectedProject.id === editingProject.id && remainingProjects.length > 0) {
        setSelectedProject(remainingProjects[0]);
        setCurrentPage(1);
        try {
          window.localStorage.removeItem(selectedProjectIdStorageKey);
          window.dispatchEvent(new Event("employerProjectChanged"));
        } catch { }
      }

      setEditingProject(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      const err: any = error;
      const isBlocked = err?.status === 409 && String(err?.data?.code ?? "") === "PROJECT_DELETE_BLOCKED";
      toast({
        title: "Error",
        description: isBlocked
          ? "You can't delete this project because it already has proposals or meetings linked to it."
          : "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteDialog = (project: Project) => {
    setEditingProject(project);
    setIsDeleteDialogOpen(true);
  };

  const handleEditProjectClick = (project: Project) => {
    setEditingProject(project);
    setNewProjectName(project.name);
    setProjectScope(normalizeProjectScope(project.scopeOfWork));
    setProjectFullTimeOffer(!!project.fullTimeOffer);

    const normalizedLocationType = normalizeProjectLocationType(project.locationType);
    setProjectLocationType(normalizedLocationType);
    setProjectPincode(project.pincode ?? "");
    const nextCity = normalizedLocationType === "remote" ? "" : (project.city ?? "") || companyCity || "";
    const nextState = normalizedLocationType === "remote" ? "" : (project.state ?? "") || companyState || "";
    setProjectCity(nextCity);
    setProjectState(nextState);
    setProjectCitySearchQuery(nextCity);
    setProjectManualCityState(!doesProjectCityStateExist(nextCity, nextState));
    setProjectTimezone(project.timezone ?? "Asia/Kolkata");
    setProjectStatus(project.status ?? "active");
    const nextSkills = Array.isArray(project.skills) ? project.skills : [];
    setProjectSkillsInput(nextSkills.join(", "));
    setProjectSkillSearch("");

    setProjectStep(1);
    setIsEditMode(true);
    setIsCreateDialogOpen(true);
  };


  const toggleCompare = (candidateId: string) => {
    const id = String(candidateId ?? "").trim();
    if (id && (fullTimeOfferInternIdSet ?? new Set()).has(id)) {
      toast({
        title: "Cannot compare",
        description: "This candidate is already hired full-time.",
        variant: "destructive",
      });
      return;
    }
    setCompareList((prev) => {
      let next: string[];
      if (prev.includes(candidateId)) {
        next = prev.filter((id) => id !== candidateId);
      } else {
        if (prev.length >= 5) {
          toast({
            title: "Compare limit reached",
            description: "You can compare up to 5 profiles at a time.",
          });
          return prev;
        }
        next = [...prev, candidateId];
      }

      try {
        if (selectedProject?.id) {
          const key = getCompareStorageKey(selectedProject.id);
          window.localStorage.setItem(key, JSON.stringify(next));
        }
      } catch {
        // ignore
      }

      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectedProject?.id) return;

    const blocked = fullTimeOfferInternIdSet ?? new Set<string>();
    if (blocked.size === 0) return;

    setCompareList((prev) => {
      const next = (prev ?? []).filter((id) => !blocked.has(String(id ?? "").trim()));
      if (next.length === (prev ?? []).length) return prev;
      try {
        window.localStorage.setItem(getCompareStorageKey(selectedProject.id), JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [fullTimeOfferInternIdSet, selectedProject]);

  const handleAddToCart = (candidateId: string) => {
    const id = String(candidateId ?? "").trim();
    if (!id) return;

    if ((fullTimeOfferInternIdSet ?? new Set()).has(id)) {
      toast({
        title: "Cannot add candidate",
        description: "This candidate is already hired full-time and cannot be added to another project.",
        variant: "destructive",
      });
      return;
    }

    const statusLower = String(proposalMetaByInternId[id]?.status ?? "").trim().toLowerCase();
    const isHiredAnywhere = (hiredInternIdSet ?? new Set()).has(String(id ?? "").trim());
    if (statusLower === "hired" || isHiredAnywhere) {
      toast({
        title: "Already hired",
        description: "This candidate is already hired for your selected project.",
        variant: "destructive",
      });
      return;
    }

    const effectiveEmployerId = authEmployerId ?? getEmployerAuth()?.id ?? null;
    const projectId = selectedProject?.id
      ? String(selectedProject.id)
      : (() => {
        try {
          return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
        } catch {
          return "";
        }
      })();

    if (!effectiveEmployerId || !projectId) {
      toast({
        title: "Select a project",
        description: "Please select a project before adding to cart.",
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];

      setCartCount(next.length);
      setCandidates((cPrev) => cPrev.map((c) => (String(c.id) === id ? { ...c, isAdded: true } : c)));
      toast({
        title: "Candidate added",
        description: "Intern has been added to your cart.",
      });

      void (async () => {
        try {
          const res = await apiRequest(
            "POST",
            `/api/employer/${encodeURIComponent(String(effectiveEmployerId))}/cart/items`,
            {
              projectId,
              listType: "cart",
              internId: id,
            },
          );
          if (!res.ok) throw new Error("Failed to add to cart");

          try {
            window.dispatchEvent(new Event("employerCartUpdated"));
          } catch { }
        } catch {
          setCart((p) => {
            const filtered = p.filter((v) => String(v) !== id);
            setCartCount(filtered.length);
            return filtered;
          });
          setCandidates((cPrev) => cPrev.map((c) => (String(c.id) === id ? { ...c, isAdded: false } : c)));
          toast({
            title: "Error",
            description: "Could not add candidate to cart. Please try again.",
            variant: "destructive",
          });
        }
      })();
    });
  };

  const filteredSkillOptions = useMemo(() => {
    const lowerSelected = selectedSkills.map((s) => s.toLowerCase());
    const pool = allSkills.filter((s) => !lowerSelected.includes(s.toLowerCase()));
    if (!skillSearch.trim()) return pool;
    const q = skillSearch.toLowerCase();
    return pool.filter((s) => s.toLowerCase().includes(q));
  }, [allSkills, skillSearch, selectedSkills]);

  useEffect(() => {
    if (!isSkillDropdownOpen) return;

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const root = skillDropdownRef.current;
      if (!root) return;
      if (root.contains(target)) return;
      setIsSkillDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isSkillDropdownOpen]);

  const appliedSelectedCitiesLowerSet = useMemo(
    () => new Set(getPreferredLocationCities(appliedFilters.selectedCities).map((s) => s.toLowerCase())),
    [appliedFilters.selectedCities],
  );

  const appliedSelectedSkillsLowerSet = useMemo(
    () => new Set(appliedFilters.selectedSkills.map((s) => s.toLowerCase())),
    [appliedFilters.selectedSkills],
  );

  const getLocationMatchCount = (candidate: Pick<Candidate, "preferredLocations">) => {
    if (appliedSelectedCitiesLowerSet.size === 0) return 0;
    const candidatePrefsLower = new Set(
      getPreferredLocationCities(candidate.preferredLocations).map((l) => String(l ?? "").toLowerCase()),
    );

    let count = 0;
    for (const employerCityLower of Array.from(appliedSelectedCitiesLowerSet)) {
      if (candidatePrefsLower.has(employerCityLower)) {
        count += 1;
      }
    }
    return count;
  };

  const filteredCandidates = useMemo(() => {
    let list = [...candidates]
      .filter((c) => c.openToWork === true)
      .filter((c) => Number(c.findternScore ?? 0) > 0);

    if (resultsSearch.trim()) {
      const q = resultsSearch.trim().toLowerCase();
      list = list.filter((c) => {
        const name = (getCandidateDisplayName(c) ?? "").toLowerCase();
        const location = (c.location ?? "").toLowerCase();
        const skills = Array.isArray(c.skills) ? c.skills.join(" ").toLowerCase() : "";
        return name.includes(q) || location.includes(q) || skills.includes(q);
      });
    }

    if (appliedFilters.filterBySkills && appliedFilters.selectedSkills.length > 0) {
      list = list.filter((c) =>
        c.skills.some((skill) => appliedSelectedSkillsLowerSet.has(skill.toLowerCase())),
      );
    }

    if (appliedSelectedCitiesLowerSet.size > 0) {
      list = list.filter((c) => getLocationMatchCount(c) > 0);
    }

    if (!appliedFilters.includeRemote) {
      list = list.filter((c) => {
        const types = Array.isArray(c.locationTypes) ? c.locationTypes.map((t) => t.toLowerCase()) : [];
        const hasHybridOrOnsite = types.includes("hybrid") || types.includes("onsite");
        return hasHybridOrOnsite;
      });
    }

    if (appliedFilters.hasLaptop) {
      list = list.filter((c) => c.hasLaptop === true);
    }

    if (appliedFilters.minRatings.communication > 0) {
      list = list.filter((c) => (c.aiRatings.communication ?? 0) >= appliedFilters.minRatings.communication);
    }

    if (appliedFilters.minRatings.coding > 0) {
      list = list.filter((c) => (c.aiRatings.coding ?? 0) >= appliedFilters.minRatings.coding);
    }

    if (appliedFilters.minRatings.aptitude > 0) {
      list = list.filter((c) => (c.aiRatings.aptitude ?? 0) >= appliedFilters.minRatings.aptitude);
    }

    if (appliedFilters.minRatings.interview > 0) {
      list = list.filter((c) => (c.aiRatings.interview ?? 0) >= appliedFilters.minRatings.interview);
    }

    if (appliedFilters.minRatings.findternScore > 0) {
      list = list.filter((c) => (c.findternScore ?? 0) >= appliedFilters.minRatings.findternScore);
    }

    if (String(appliedFilters.priceLabel ?? "").trim()) {
      const label = String(appliedFilters.priceLabel ?? "").trim();
      list = list.filter((c) => getCandidateHourlyPriceLabel(c) === label);
    }

    const baseSkillMatchCount = (c: Candidate) =>
      c.skills.reduce((acc, s) => acc + (appliedSelectedSkillsLowerSet.has(s.toLowerCase()) ? 1 : 0), 0);

    const bySortFields = (a: Candidate, b: Candidate) => {
      const fields = Array.isArray(appliedFilters.sortFields) ? appliedFilters.sortFields : [];
      const dir = appliedFilters.sortDirection;

      for (const f of fields) {
        const av =
          f === "communication"
            ? a.aiRatings.communication ?? 0
            : f === "coding"
              ? a.aiRatings.coding ?? 0
              : f === "aptitude"
                ? a.aiRatings.aptitude ?? 0
                : f === "interview"
                  ? a.aiRatings.interview ?? 0
                  : f === "findternScore"
                    ? a.findternScore ?? 0
                    : 0;
        const bv =
          f === "communication"
            ? b.aiRatings.communication ?? 0
            : f === "coding"
              ? b.aiRatings.coding ?? 0
              : f === "aptitude"
                ? b.aiRatings.aptitude ?? 0
                : f === "interview"
                  ? b.aiRatings.interview ?? 0
                  : f === "findternScore"
                    ? b.findternScore ?? 0
                    : 0;
        if (bv !== av) return dir === "desc" ? bv - av : av - bv;
      }
      return 0;
    };

    list.sort((a, b) => {
      // 1) location relevance: more matches against employer-selected locations
      if (appliedSelectedCitiesLowerSet.size > 0) {
        const aLoc = getLocationMatchCount(a);
        const bLoc = getLocationMatchCount(b);
        if (bLoc !== aLoc) return bLoc - aLoc;
      }

      // 2) skill priority (toggle)
      if (appliedFilters.skillPriorityEnabled && appliedFilters.selectedSkills.length > 0) {
        const aSkill = baseSkillMatchCount(a);
        const bSkill = baseSkillMatchCount(b);
        if (bSkill !== aSkill) return bSkill - aSkill;
      }

      // 3) explicit sorting
      const sortCmp = bySortFields(a, b);
      if (sortCmp !== 0) return sortCmp;

      // 4) fallback
      if ((b.findternScore ?? 0) !== (a.findternScore ?? 0)) return (b.findternScore ?? 0) - (a.findternScore ?? 0);
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    return list;
  }, [
    candidates,
    resultsSearch,
    appliedFilters,
    selectedSkills,
    appliedSelectedSkillsLowerSet,
    appliedSelectedCitiesLowerSet,
  ]);

  const totalPages = useMemo(() => {
    const total = Math.ceil(filteredCandidates.length / pageSize);
    return total > 0 ? total : 1;
  }, [filteredCandidates.length, pageSize]);

  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  const pageRange = useMemo(() => {
    if (filteredCandidates.length === 0) return { start: 0, end: 0 };
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, filteredCandidates.length);
    return { start, end };
  }, [filteredCandidates.length, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize,
    resultsSearch,
    appliedFilters,
  ]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev < 1) return 1;
      if (prev > totalPages) return totalPages;
      return prev;
    });
  }, [totalPages]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.selectedCities.length > 0) count++;
    if (appliedFilters.includeRemote) count++;
    if (appliedFilters.hasLaptop) count++;
    if (String(appliedFilters.priceLabel ?? "").trim()) count++;
    if (appliedFilters.selectedSkills.length > 0) {
      if (appliedFilters.filterBySkills) count++;
      if (appliedFilters.skillPriorityEnabled) count++;
    }
    if (appliedFilters.minRatings.communication > 0) count++;
    if (appliedFilters.minRatings.coding > 0) count++;
    if (appliedFilters.minRatings.aptitude > 0) count++;
    if (appliedFilters.minRatings.interview > 0) count++;
    if (appliedFilters.minRatings.findternScore > 0) count++;
    if (appliedFilters.sortFields.length > 0) count++;
    return count;
  }, [
    appliedFilters,
  ]);

  const pendingFilterCount = useMemo(() => {
    let count = 0;
    if (includeRemote !== appliedFilters.includeRemote) count++;

    const uiCities = Array.isArray(selectedCities) ? selectedCities : [];
    const appliedCities = Array.isArray(appliedFilters.selectedCities) ? appliedFilters.selectedCities : [];
    const citiesDifferent =
      uiCities.length !== appliedCities.length ||
      uiCities.some((c, idx) => String(c ?? "") !== String(appliedCities[idx] ?? ""));
    if (citiesDifferent) count++;

    if (hasLaptop !== appliedFilters.hasLaptop) count++;
    if (String(priceFilter ?? "").trim() !== String(appliedFilters.priceLabel ?? "").trim()) count++;

    const uiSkills = Array.isArray(selectedSkills) ? selectedSkills : [];
    const appliedSkills = Array.isArray(appliedFilters.selectedSkills) ? appliedFilters.selectedSkills : [];
    const skillsDifferent =
      uiSkills.length !== appliedSkills.length ||
      uiSkills.some((s, idx) => String(s ?? "") !== String(appliedSkills[idx] ?? ""));
    if (skillsDifferent) count++;

    if (filterBySkills !== appliedFilters.filterBySkills) count++;
    if (skillPriorityEnabled !== appliedFilters.skillPriorityEnabled) count++;

    if (minRatings.communication !== appliedFilters.minRatings.communication) count++;
    if (minRatings.coding !== appliedFilters.minRatings.coding) count++;
    if (minRatings.aptitude !== appliedFilters.minRatings.aptitude) count++;
    if (minRatings.interview !== appliedFilters.minRatings.interview) count++;
    if (minRatings.findternScore !== appliedFilters.minRatings.findternScore) count++;

    const uiSortFields = Array.isArray(sortFields) ? sortFields : [];
    const appliedSortFields = Array.isArray(appliedFilters.sortFields) ? appliedFilters.sortFields : [];
    const sortFieldsDifferent =
      uiSortFields.length !== appliedSortFields.length ||
      uiSortFields.some((s, idx) => String(s ?? "") !== String(appliedSortFields[idx] ?? ""));
    if (sortFieldsDifferent) count++;

    if (sortDirection !== appliedFilters.sortDirection) count++;
    return count;
  }, [
    appliedFilters,
    filterBySkills,
    hasLaptop,
    includeRemote,
    minRatings,
    priceFilter,
    selectedCities,
    selectedSkills,
    skillPriorityEnabled,
    sortFields,
  ]);

  const clearAllFilters = () => {
    const defaultIncludeRemote =
      !!selectedProject && normalizeProjectLocationType(selectedProject.locationType) === "remote";
    setSelectedSkills([]);
    setSelectedCities([]);
    setLocationSearchQuery("");
    setIncludeRemote(defaultIncludeRemote);
    setHasLaptop(false);
    setFilterBySkills(true);
    setSkillPriorityEnabled(true);
    setPriceFilter("");
    setSkillSearch("");
    setIsSkillDropdownOpen(false);
    setMinRatings({
      communication: 0,
      coding: 0,
      aptitude: 0,
      interview: 0,
      findternScore: 0,
    });
    setSortFields([]);
    setSortDirection("desc");

    try {
      if (selectedProject) {
        window.localStorage.removeItem(getSelectedCitiesStorageKey(selectedProject.id));
        window.localStorage.removeItem(getSelectedSkillsStorageKey(selectedProject.id));
        window.localStorage.removeItem(getAppliedFiltersStorageKey(selectedProject.id));
      }
    } catch { }
    setAppliedFilters({
      includeRemote: defaultIncludeRemote,
      hasLaptop: false,
      filterBySkills: true,
      skillPriorityEnabled: true,
      priceLabel: "",
      selectedCities: [],
      selectedSkills: [],
      minRatings: {
        communication: 0,
        coding: 0,
        aptitude: 0,
        interview: 0,
        findternScore: 0,
      },
      sortFields: [],
      sortDirection: "desc",
    });
  };

  const applyAllFilters = () => {
    setAppliedFilters({
      includeRemote,
      hasLaptop,
      filterBySkills,
      skillPriorityEnabled,
      priceLabel: priceFilter,
      selectedCities,
      selectedSkills: Array.isArray(selectedSkills) ? selectedSkills : [],
      minRatings,
      sortFields,
      sortDirection,
    });
  };

  const autoApplyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!filtersHydratedRef.current) return;

    if (autoApplyTimeoutRef.current) {
      window.clearTimeout(autoApplyTimeoutRef.current);
      autoApplyTimeoutRef.current = null;
    }

    autoApplyTimeoutRef.current = window.setTimeout(() => {
      const nextApplied = {
        includeRemote,
        hasLaptop,
        filterBySkills,
        skillPriorityEnabled,
        priceLabel: priceFilter,
        selectedCities,
        selectedSkills: Array.isArray(selectedSkills) ? selectedSkills : [],
        minRatings,
        sortFields,
        sortDirection,
      };

      setAppliedFilters((prev) => {
        const prevSkills = Array.isArray(prev.selectedSkills) ? prev.selectedSkills : [];
        const nextSkills = Array.isArray(nextApplied.selectedSkills) ? nextApplied.selectedSkills : [];
        const skillsSame =
          prevSkills.length === nextSkills.length &&
          prevSkills.every((s, idx) => String(s ?? "").trim() === String(nextSkills[idx] ?? "").trim());
        const prevCities = Array.isArray(prev.selectedCities) ? prev.selectedCities : [];
        const nextCities = Array.isArray(nextApplied.selectedCities) ? nextApplied.selectedCities : [];
        const citiesSame =
          prevCities.length === nextCities.length &&
          prevCities.every((c, idx) => String(c ?? "").trim() === String(nextCities[idx] ?? "").trim());
        const prevSortFields = Array.isArray(prev.sortFields) ? prev.sortFields : [];
        const nextSortFields = Array.isArray(nextApplied.sortFields) ? nextApplied.sortFields : [];
        const sortFieldsSame =
          prevSortFields.length === nextSortFields.length &&
          prevSortFields.every((s, idx) => String(s ?? "").trim() === String(nextSortFields[idx] ?? "").trim());

        const same =
          prev.includeRemote === nextApplied.includeRemote &&
          prev.hasLaptop === nextApplied.hasLaptop &&
          prev.filterBySkills === nextApplied.filterBySkills &&
          prev.skillPriorityEnabled === nextApplied.skillPriorityEnabled &&
          String(prev.priceLabel ?? "").trim() === String(nextApplied.priceLabel ?? "").trim() &&
          citiesSame &&
          skillsSame &&
          prev.minRatings.communication === nextApplied.minRatings.communication &&
          prev.minRatings.coding === nextApplied.minRatings.coding &&
          prev.minRatings.aptitude === nextApplied.minRatings.aptitude &&
          prev.minRatings.interview === nextApplied.minRatings.interview &&
          prev.minRatings.findternScore === nextApplied.minRatings.findternScore &&
          sortFieldsSame &&
          prev.sortDirection === nextApplied.sortDirection;

        return same ? prev : nextApplied;
      });
    }, 250);

    return () => {
      if (autoApplyTimeoutRef.current) {
        window.clearTimeout(autoApplyTimeoutRef.current);
        autoApplyTimeoutRef.current = null;
      }
    };
  }, [
    filterBySkills,
    filtersHydratedRef,
    hasLaptop,
    includeRemote,
    minRatings,
    priceFilter,
    selectedCities,
    selectedSkills,
    skillPriorityEnabled,
    sortDirection,
    sortFields,
  ]);

  const triggerAppliedFeedback = () => {
    setFilterAppliedPulse(true);
    toast({
      title: "Filters applied",
      description: "Your filters have been applied.",
    });
    window.setTimeout(() => setFilterAppliedPulse(false), 1400);
  };

  const sortingSelectValue =
    sortFields.length > 0 ? String(sortFields[0] ?? "") : "";

  const doesProjectCityStateExist = (city: string, state: string) => {
    const c = String(city ?? "").trim();
    const s = String(state ?? "").trim();
    if (!c || !s) return true;
    const k = `${c.toLowerCase()}__${s.toLowerCase()}`;
    return projectCityStateOptions.some(
      (opt) => `${opt.city.toLowerCase()}__${opt.state.toLowerCase()}` === k,
    );
  };

  const openCreateProjectDialog = () => {
    setNewProjectName("");
    setProjectScope("");
    setProjectFullTimeOffer(false);
    setProjectLocationType("");
    setProjectLocationTypeTouched(false);
    setProjectCityStateTouched(false);
    setProjectPincode("");
    const nextCity = companyCity || "";
    const nextState = companyState || "";
    setProjectCity(nextCity);
    setProjectState(nextState);
    setProjectManualCityState(!doesProjectCityStateExist(nextCity, nextState));
    setProjectTimezone("Asia/Kolkata");
    setProjectStatus("active");
    setProjectSkillsInput("");
    setProjectSkillSearch("");
    setProjectStep(1);
    setIsCreateDialogOpen(true);
  };

  const hasActiveProjects = useMemo(() => {
    return visibleProjects.length > 0;
  }, [visibleProjects]);

  const filtersPanel = (
    <div className="flex min-h-full flex-col">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 min-w-0">
            <span className="truncate">Project</span>
          </span>
        </div>
        <div className="mb-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={openCreateProjectDialog}
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        <div className="mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-10 justify-between rounded-lg border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="truncate"
                    title={
                      hasActiveProjects
                        ? selectedProject
                          ? selectedProject.name
                          : "No project selected"
                        : "Create Project"
                    }
                  >
                    {hasActiveProjects
                      ? selectedProject
                        ? selectedProject.name
                        : "No project selected"
                      : "Create Project"}
                  </span>
                  {!hasActiveProjects ? (
                    <Plus className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : null}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              {!hasActiveProjects ? (
                <DropdownMenuItem className="cursor-pointer px-3 py-2" onClick={openCreateProjectDialog}>
                  Create Project
                </DropdownMenuItem>
              ) : null}

              {visibleProjects
                .slice(0, 5)
                .map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    className="flex items-center justify-between cursor-pointer group p-0"
                  >
                    <button
                      className={`flex flex-1 min-w-0 items-center gap-2 px-3 py-2 text-left ${selectedProject && selectedProject.id === project.id ? "bg-emerald-50" : ""
                        }`}
                      onClick={() => {
                        setCurrentPage(1);
                        setSelectedProject(project);
                        try {
                          window.localStorage.setItem(selectedProjectIdStorageKey, String(project.id));
                          window.dispatchEvent(new Event("employerProjectChanged"));
                        } catch { }
                        // Restore selected skills for the project (do not reset unexpectedly)
                        try {
                          const storedSkillsRaw = window.localStorage.getItem(getSelectedSkillsStorageKey(project.id));
                          const storedSkills = storedSkillsRaw ? JSON.parse(storedSkillsRaw) : null;
                          const projectSkills = normalizeSelectedSkills(project.skills);
                          const storedNormalized =
                            Array.isArray(storedSkills) && storedSkills.length > 0
                              ? normalizeSelectedSkills(storedSkills)
                              : [];

                          let nextSkills = storedNormalized.length > 0 ? storedNormalized : projectSkills;
                          if (
                            storedNormalized.length > 0 &&
                            projectSkills.length > 0 &&
                            !hasAnySkillOverlap(storedNormalized, projectSkills)
                          ) {
                            nextSkills = projectSkills;
                            try {
                              window.localStorage.setItem(
                                getSelectedSkillsStorageKey(project.id),
                                JSON.stringify(projectSkills),
                              );
                            } catch { }
                          }

                          setSelectedSkills(nextSkills);
                        } catch {
                          setSelectedSkills(normalizeSelectedSkills(project.skills));
                        }

                        try {
                          const storedCitiesRaw = window.localStorage.getItem(getSelectedCitiesStorageKey(project.id));
                          const storedCities = storedCitiesRaw ? JSON.parse(storedCitiesRaw) : null;
                          const projectLocationTypeValue = normalizeProjectLocationType(project.locationType);
                          const defaultCity =
                            projectLocationTypeValue === "remote"
                              ? ""
                              : normalizeCityOnlyLabel(String(project.city ?? "").trim());
                          const cleanedStoredCities = Array.isArray(storedCities)
                            ? storedCities
                              .map((v: any) => normalizeCityOnlyLabel(String(v ?? "")))
                              .filter(Boolean)
                            : [];
                          const nextCities =
                            cleanedStoredCities.length > 0
                              ? cleanedStoredCities
                              : defaultCity
                                ? [defaultCity]
                                : [];
                          setSelectedCities(Array.isArray(nextCities) ? nextCities : []);
                          setLocationSearchQuery(nextCities.length > 0 ? nextCities[0] : "");
                          setLocationManualCityState(false);
                        } catch {
                          const projectLocationTypeValue = normalizeProjectLocationType(project.locationType);
                          const defaultCity =
                            projectLocationTypeValue === "remote"
                              ? ""
                              : normalizeCityOnlyLabel(String(project.city ?? "").trim());
                          const nextCities = defaultCity ? [defaultCity] : [];
                          setSelectedCities(nextCities);
                          setLocationSearchQuery(nextCities.length > 0 ? nextCities[0] : "");
                          setLocationManualCityState(false);
                        }
                      }}
                    >
                      {selectedProject && selectedProject.id === project.id && (
                        <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                      )}
                      <span
                        title={project.name}
                        className={
                          selectedProject && selectedProject.id === project.id
                            ? "truncate font-medium text-emerald-700"
                            : "truncate"
                        }
                      >
                        {project.name}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 pr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProjectClick(project);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(project);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))}
              <DropdownMenuItem
                className="cursor-pointer px-3 py-2 text-emerald-700 hover:bg-emerald-50"
                onClick={() => {
                  setLocation("/employer/projects");
                }}
              >
                Manage All Projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 min-w-0">
              <Filter className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate">Candidate Filters</span>
            </span>
          </div>
          <Accordion
            type="multiple"
            defaultValue={["location", "device", "skills", "ratings"]}
            className={`space-y-2 ${!hasActiveProjects ? "pointer-events-none opacity-60" : ""}`}
          >
            <AccordionItem value="location" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  Location
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Work Location</label>
                  {selectedCities.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => {
                        setSelectedCities([]);
                        setLocationSearchQuery("");
                        setLocationManualCityState(false);
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {locationManualCityState ? (
                  <Input
                    placeholder="Enter city"
                    className="h-10 rounded-xl border-slate-200 text-sm"
                    value={locationSearchQuery}
                    onKeyDownCapture={(e) => {
                      if (e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === " ") {
                        e.stopPropagation();
                      }

                      if (e.key !== "Enter") return;
                      const normalized = normalizeCityOnlyLabel(locationSearchQuery);
                      setIncludeRemote(false);
                      setSelectedCities(normalized ? [normalized] : []);
                      setLocationSearchQuery(normalized);
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setIncludeRemote(false);
                      setLocationSearchQuery(raw);
                    }}
                    onBlur={() => {
                      const normalized = normalizeCityOnlyLabel(locationSearchQuery);
                      setSelectedCities(normalized ? [normalized] : []);
                      setLocationSearchQuery(normalized);
                    }}
                  />
                ) : (
                  <Popover open={locationPopoverOpen} onOpenChange={setLocationPopoverOpen}>
                    <PopoverAnchor asChild>
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search Indian cities..."
                          className="h-10 rounded-xl border-slate-200 text-sm pl-9"
                          value={locationSearchQuery}
                          onFocus={() => setLocationPopoverOpen(true)}
                          onKeyDownCapture={(e) => {
                            if (e.key === " ") {
                              e.stopPropagation();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === " ") {
                              e.stopPropagation();
                              return;
                            }

                            if (e.key !== "Enter") return;
                            const raw = locationSearchQuery.trim();
                            if (!raw) return;
                            e.preventDefault();

                            const q = raw.toLowerCase();
                            const exact = filteredLocationFilterOptions.find(
                              (item) => String(item.city ?? "").toLowerCase() === q,
                            );
                            const best = exact ?? filteredLocationFilterOptions[0];

                            if (best) {
                              setIncludeRemote(false);
                              setLocationManualCityState(false);
                              setSelectedCities([best.city]);
                              setLocationSearchQuery(best.city);
                              setLocationPopoverOpen(false);
                              return;
                            }

                            const normalized = normalizeCityOnlyLabel(raw);
                            setIncludeRemote(false);
                            setLocationManualCityState(true);
                            setSelectedCities(normalized ? [normalized] : []);
                            setLocationSearchQuery(normalized);
                            setLocationPopoverOpen(false);
                          }}
                          onChange={(e) => {
                            setLocationPopoverOpen(true);
                            setLocationSearchQuery(e.target.value);
                          }}
                        />
                      </div>
                    </PopoverAnchor>
                    <PopoverContent
                      className="w-[360px] max-w-[calc(100vw-2rem)] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <Command shouldFilter={false}>
                        <CommandList>
                          <CommandEmpty>
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                              No city found.
                              {locationSearchQuery.trim() ? (
                                <span>
                                  {" "}
                                  Press Enter to use &quot;{normalizeCityOnlyLabel(locationSearchQuery.trim())}&quot;.
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-1"
                                onClick={() => {
                                  const raw = locationSearchQuery;
                                  const normalized = normalizeCityOnlyLabel(raw);
                                  setIncludeRemote(false);
                                  setLocationManualCityState(true);
                                  setLocationPopoverOpen(false);
                                  setSelectedCities(normalized ? [normalized] : []);
                                  setLocationSearchQuery(normalized);
                                }}
                              >
                                Enter manually
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredLocationFilterOptions.map((item) => (
                              <CommandItem
                                key={`${item.city}-${item.state}`}
                                value={item.city}
                                onSelect={() => {
                                  setIncludeRemote(false);
                                  setLocationManualCityState(false);
                                  setSelectedCities([item.city]);
                                  setLocationSearchQuery(item.city);
                                  setLocationPopoverOpen(false);
                                }}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="truncate">{item.city}</span>
                                  <div className="flex items-center gap-2">
                                    {selectedCitiesLowerSet.has(item.city.toLowerCase()) && <Check className="h-4 w-4" />}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}

                {!locationManualCityState && (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                    onClick={() => {
                      const raw = locationSearchQuery || String(selectedCities?.[0] ?? "");
                      const normalized = normalizeCityOnlyLabel(raw);
                      setIncludeRemote(false);
                      setLocationManualCityState(true);
                      setSelectedCities(normalized ? [normalized] : []);
                      setLocationSearchQuery(normalized);
                    }}
                  >
                    Can&apos;t find your city? Enter manually
                  </button>
                )}

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={includeRemote}
                    onCheckedChange={(checked) => {
                      const v = checked as boolean;
                      setIncludeRemote(v);

                      if (v) {
                        setSelectedCities([]);
                        setLocationSearchQuery("");
                        setLocationManualCityState(false);

                        setAppliedFilters((prev) => ({
                          ...prev,
                          includeRemote: true,
                          selectedCities: [],
                        }));

                        try {
                          if (selectedProject) {
                            window.localStorage.setItem(
                              getAppliedFiltersStorageKey(selectedProject.id),
                              JSON.stringify({
                                ...appliedFilters,
                                includeRemote: true,
                                selectedCities: [],
                              }),
                            );
                          }
                        } catch {
                          // ignore
                        }
                      }
                    }}
                    className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                  />
                  <span className="text-slate-600">Include Remote Candidates</span>
                </label>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="device" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-500" />
                  Device
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={hasLaptop}
                    onCheckedChange={(checked) => setHasLaptop(checked as boolean)}
                    className="border-slate-300"
                  />
                  <span className="text-slate-600">Has Laptop</span>
                </label>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="price" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  Price
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <Select
                  value={priceFilter ? priceFilter : "__any"}
                  onValueChange={(v) => setPriceFilter(v === "__any" ? "" : v)}
                >
                  <SelectTrigger className="w-full h-10 text-sm rounded-xl border-slate-200">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Any</SelectItem>
                    <SelectItem value="Free">Free</SelectItem>
                    {priceFilterOptions.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </AccordionContent>
            </AccordionItem>

            {/* <AccordionItem value="skills" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-500" />
                Skills Filter
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={filterBySkills}
                  onCheckedChange={(checked) => setFilterBySkills(checked as boolean)}
                  className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                />
                <span className="text-slate-600">Filter candidates using selected skills</span>
              </Content>
          </AccordionItem> */}

            <AccordionItem value="ratings" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  Ratings
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div className="grid gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                        Communication
                      </span>
                      <span className="text-emerald-700">{minRatings.communication.toFixed(1)}</span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[minRatings.communication]}
                        onValueChange={(val) =>
                          setMinRatings((prev) => ({
                            ...prev,
                            communication: val[0],
                          }))
                        }
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-emerald-600" />
                        Coding
                      </span>
                      <span className="text-emerald-700">{minRatings.coding.toFixed(1)}</span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[minRatings.coding]}
                        onValueChange={(val) =>
                          setMinRatings((prev) => ({
                            ...prev,
                            coding: val[0],
                          }))
                        }
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Aptitude
                      </span>
                      <span className="text-emerald-700">{minRatings.aptitude.toFixed(1)}</span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[minRatings.aptitude]}
                        onValueChange={(val) =>
                          setMinRatings((prev) => ({
                            ...prev,
                            aptitude: val[0],
                          }))
                        }
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        AI Interview
                      </span>
                      <span className="text-emerald-700">{minRatings.interview.toFixed(1)}</span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[minRatings.interview]}
                        onValueChange={(val) =>
                          setMinRatings((prev) => ({
                            ...prev,
                            interview: val[0],
                          }))
                        }
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        Findtern Score
                      </span>
                      <span className="text-emerald-700">{minRatings.findternScore.toFixed(1)}</span>
                    </div>
                    <div className="mt-2">
                      <Slider
                        value={[minRatings.findternScore]}
                        onValueChange={(val) =>
                          setMinRatings((prev) => ({
                            ...prev,
                            findternScore: val[0],
                          }))
                        }
                        max={10}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sorting" className="border rounded-lg px-3">
              <AccordionTrigger className="text-sm font-medium text-slate-700 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  Sorting
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-3">
                <div className="space-y-2">
                  <Select
                    value={sortingSelectValue}
                    onValueChange={(v) => {
                      if (v === "__clear") {
                        setSortFields([]);
                        return;
                      }
                      setSortFields((prev) => {
                        const key = v as any;
                        if (!key) return Array.isArray(prev) ? prev.slice(0, 1) : [];
                        return [key];
                      });
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg border-slate-200">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="communication">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-emerald-600" />
                          Communication
                        </span>
                      </SelectItem>
                      <SelectItem value="coding">
                        <span className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-emerald-600" />
                          Coding
                        </span>
                      </SelectItem>
                      <SelectItem value="aptitude">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                          Aptitude
                        </span>
                      </SelectItem>
                      <SelectItem value="interview">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          AI Interview
                        </span>
                      </SelectItem>
                      <SelectItem value="findternScore">
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-emerald-600" />
                          Findtern Score
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Filter className="h-4 w-4 text-emerald-600" />
                      Maximum skill match
                    </div>
                    <Switch
                      checked={skillPriorityEnabled}
                      onCheckedChange={(checked) => setSkillPriorityEnabled(Boolean(checked))}
                      disabled={selectedSkills.length === 0}
                    />
                  </div>

                  <Select
                    value={sortDirection}
                    onValueChange={(v) => setSortDirection(v === "asc" ? "asc" : "desc")}
                  >
                    <SelectTrigger className="w-full h-9 text-sm rounded-lg border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">High → Low</SelectItem>
                      <SelectItem value="asc">Low → High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <div className=" bottom-0 mt-4 border-t border-slate-200 bg-white/90 backdrop-blur pt-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1 rounded-xl border-slate-200"
            onClick={() => clearAllFilters()}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              setIsFiltersOpen(false);
            }}
          >
            {filterAppliedPulse ? "Applied" : `Applied${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="dashboard" />

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

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="left" className="p-0 w-[92vw] sm:w-[420px] lg:hidden">
          <div className="p-4 border-b bg-white">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine candidates quickly</SheetDescription>
            </SheetHeader>
          </div>
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-120px)] bg-white/90">
            {filtersPanel}
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-64px)]">
        {/* Left Sidebar - Filters */}
        <aside className="hidden lg:block w-full lg:w-72 lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 overflow-y-auto border-r bg-white/70 backdrop-blur p-4">
          {filtersPanel}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 pb-28 sm:pb-6 lg:pt-0 lg:h-[calc(100vh-64px)] lg:overflow-y-auto">
          <div className="flex items-center gap-2 justify-between mb-4 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 flex items-center gap-2"
              onClick={() => setIsFiltersOpen(true)}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openCreateProjectDialog}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {/* Skills Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Select Required Skills</h2>
            <div className="flex flex-wrap items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-200">
              {/* Selected skill chips */}
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 basis-full md:basis-auto">
                {selectedSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-2">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {/* Skill search + dropdown */}
              <div className="relative w-full md:w-80 flex flex-col gap-2">
                {selectedSkills.length === 0 && skillsBackup.length > 0 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = Array.isArray(skillsBackup) ? skillsBackup : [];
                        if (next.length === 0) {
                          toast({
                            title: "At least one skill required",
                            description: "Add at least one skill to continue.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setSelectedSkills(normalizeSelectedSkills(next));
                        setSkillSearch("");
                        setIsSkillDropdownOpen(false);
                      }}
                      className="h-8 px-3 rounded-xl border-slate-200"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore skills
                    </Button>
                  </div>
                )}
                <div ref={skillDropdownRef} className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search & add skills..."
                    value={skillSearch}
                    onChange={(e) => {
                      setSkillSearch(e.target.value);
                      setIsSkillDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const value = skillSearch.trim();
                      if (!value) return;
                      if (filteredSkillOptions.length > 0) return;
                      e.preventDefault();
                      addSelectedSkill(value);
                      setSkillSearch("");
                      setIsSkillDropdownOpen(false);
                    }}
                    onFocus={() => setIsSkillDropdownOpen(true)}
                    className="pl-8 h-10 text-sm rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                  />
                  {isSkillDropdownOpen && (skillSearch || filteredSkillOptions.length > 0) && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto ring-1 ring-slate-900/5">
                      {filteredSkillOptions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            addSelectedSkill(skill);
                            setSkillSearch("");
                            setIsSkillDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 first:rounded-t-xl last:rounded-b-xl"
                        >
                          {skill}
                        </button>
                      ))}
                      {filteredSkillOptions.length === 0 && (
                        skillSearch.trim() ? (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const value = skillSearch.trim();
                              if (!value) return;
                              addSelectedSkill(value);
                              setSkillSearch("");
                              setIsSkillDropdownOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 first:rounded-t-xl last:rounded-b-xl"
                          >
                            Add "{skillSearch.trim()}"
                            <span className="ml-2 text-xs text-slate-500">(Press Enter)</span>
                          </button>
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-500">
                            No skills found. Try another keyword.
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className=" top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white/80 backdrop-blur border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold">● {filteredCandidates.length} candidates found</span>
              <span className="hidden sm:inline text-slate-400">•</span>
              <span className="hidden sm:inline text-slate-600">
                Showing {pageRange.start}-{pageRange.end}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={resultsSearch}
                  onChange={(e) => setResultsSearch(e.target.value)}
                  placeholder="Search candidates..."
                  className="h-9 pl-9 rounded-full border-slate-200"
                />
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-500">Show</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-9 w-[92px] rounded-full border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-500">/ page</span>
              </div>

              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                <Button
                  type="button"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 rounded-full ${viewMode === "list" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className={`h-8 w-8 rounded-full ${viewMode === "grid" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
               
              </div>

              {compareList.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/employer/compare")}
                  className="hidden sm:flex h-9 px-4 sm:px-5 w-full sm:w-auto justify-center rounded-full border-amber-300 bg-gradient-to-r from-amber-200 to-amber-100 text-amber-800 hover:from-amber-300 hover:to-amber-200 shadow-sm items-center gap-2 text-sm font-semibold"
                >
                  <Users className="w-4 h-4" />
                  <span>Compare Profiles ({compareList.length})</span>
                </Button>
              )}
            </div>
          </div>

          {String(appliedFilters.priceLabel ?? "").trim() ? (
            <div className="mb-4 flex items-start gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">PRICE</span>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-800 px-4 py-1.5 text-xs font-semibold whitespace-nowrap hover:bg-slate-200"
                  onClick={() => {
                    setPriceFilter("");
                  }}
                  title="Clear price filter"
                >
                  {String(appliedFilters.priceLabel ?? "").trim()}
                </button>
              </div>
            </div>
          ) : null}

          {/* Candidates List */}
          {filteredCandidates.length === 0 ? (
            appliedFilters.selectedCities.length > 0 ? (
              <AnimatedEmptyStateCard
                label="Error 404"
                code="404"
                variant="location"
                title="0 candidates found"
                context={`Selected location: ${appliedFilters.selectedCities.length === 1
                  ? appliedFilters.selectedCities[0]
                  : `${appliedFilters.selectedCities[0]} + ${appliedFilters.selectedCities.length - 1} more`
                  }`}
                description="Unfortunately, we currently don’t have resources available for the selected location. You may try choosing a remote candidate or selecting a different location."
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full border-slate-200"
                      onClick={() => {
                        setSelectedCities([]);
                        setLocationSearchQuery("");
                      }}
                    >
                      Clear location
                    </Button>
                    {!appliedFilters.includeRemote && (
                      <Button
                        type="button"
                        className="h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setIncludeRemote(true);
                          setSelectedCities([]);
                          setLocationSearchQuery("");
                        }}
                      >
                        Include remote candidates
                      </Button>
                    )}
                  </>
                }
              />
            ) : (
              <Card className="border-0 shadow-lg shadow-slate-900/5 rounded-2xl bg-white overflow-hidden">
                <div className="p-8 md:p-10">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-slate-800">0 candidates found</div>
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        No candidates match your current filters. Try adjusting filters to see more results.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          ) : viewMode === "table" ? (
            <Card className="border-0 shadow-lg shadow-slate-900/5 rounded-2xl bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right w-[140px]">Findtern Score</TableHead>
                    <TableHead className="text-right w-[120px]">Price</TableHead>
                    <TableHead className="text-right">AI Interview</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCandidates.map((candidate) => {
                    const proposalMeta = proposalMetaByInternId[candidate.id];
                    const statusLower = String(proposalMeta?.status ?? "").toLowerCase();
                    const isAccepted = statusLower === "accepted";
                    const isHiredAnywhere = (hiredInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                    const isHired = statusLower === "hired" || isHiredAnywhere;
                    const isFullTime = (fullTimeOfferInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                    const isFullTimeOfferSent = (fullTimeOfferSentInternIdSet ?? new Set()).has(
                      String(candidate.id ?? "").trim(),
                    );
                    const isFullTimeAccepted = (fullTimeAcceptedInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                    const hasAnyProposalSent =
                      statusLower.length > 0 &&
                      statusLower !== "rejected" &&
                      statusLower !== "expired" &&
                      statusLower !== "withdrawn";

                    const proposalId = String(proposalMeta?.proposalId ?? "").trim();
                    const proposalProjectId = String(proposalMeta?.projectId ?? "").trim();
                    const selectedProjectId = String(selectedProject?.id ?? "").trim();
                    const isProposalForSelectedProject = !!proposalProjectId && !!selectedProjectId && proposalProjectId === selectedProjectId;

                    return (
                      <TableRow key={candidate.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div
                              className={
                                "relative h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center text-lg sm:text-xl font-bold " +
                                (candidate.hasProfile
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-slate-200 text-slate-500")
                              }
                              onClick={() => {
                                if (!candidate.hasProfile) return;
                                openPhotoPreview(candidate.profilePhotoUrl, getCandidateDisplayName(candidate));
                              }}
                            >
                              {candidate.hasProfile ? (
                                <>
                                  <div
                                    className="absolute inset-0 hidden items-center justify-center"
                                    data-fallback="true"
                                  >
                                    <span>{getInitialsFromName(candidate.name, candidate.initials)}</span>
                                  </div>
                                  <img
                                    src={candidate.profilePhotoUrl ?? ""}
                                    alt={candidate.name}
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

                                <User className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="font-semibold text-slate-800 truncate">{getCandidateDisplayName(candidate)}</div>
                                {isFullTimeAccepted ? (
                                  <Badge className="bg-slate-900 text-white text-[10px] font-semibold rounded-full">Full-time</Badge>
                                ) : isHired ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">
                                    {isFullTime ? "Hired - Full Time" : "Hired - Intern"}
                                  </Badge>
                                ) : isAccepted ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">Accepted</Badge>
                                ) : isFullTime ? (
                                  <Badge className="bg-slate-900 text-white text-[10px] font-semibold rounded-full">Full-time</Badge>
                                ) : null}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{getOrderedCandidateSkillsForDisplay(candidate.skills).slice(0, 3).join(", ")}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-red-400" />
                            <span className="truncate">{candidate.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-semibold">
                            {candidate.findternScore.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-semibold whitespace-nowrap">
                            {getCandidateHourlyPriceLabel(candidate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-semibold text-emerald-700">
                            {candidate.aiRatings.interview}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full border-slate-200"
                              onClick={() =>
                                setLocation(
                                  `/employer/intern/${encodeURIComponent(String(candidate.id))}?returnTo=${encodeURIComponent(currentLocation)}`,
                                )
                              }
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center">
                                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                    View
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="max-w-xs">
                                    <div className="text-xs font-semibold">Preferred locations</div>
                                    <div className="text-xs text-slate-600 mt-1">
                                      {getPreferredLocationCities(candidate.preferredLocations).length
                                        ? getPreferredLocationCities(candidate.preferredLocations).join(", ")
                                        : "Not provided"}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </Button>
                            <Button
                              size="sm"
                              variant={compareList.includes(candidate.id) ? "secondary" : "outline"}
                              className={`h-8 rounded-full ${compareList.includes(candidate.id) ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-200"}`}
                              disabled={isHired || isFullTimeOfferSent}
                              onClick={() => toggleCompare(candidate.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              {compareList.includes(candidate.id) ? "In compare" : "Compare"}
                            </Button>
                            {isFullTimeAccepted ? (
                              String(selectedProject?.id ?? "").trim() === "3" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation(
                                      `/employer/intern/${encodeURIComponent(String(candidate.id))}/proposal?returnTo=${encodeURIComponent(currentLocation)}`,
                                    );
                                  }}
                                >
                                  View/Send Proposal
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                                  }}
                                >
                                  Proceed to Hire
                                </Button>
                              )
                            ) : isHired ? (
                              isFullTimeOfferSent ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation("/employer/orders");
                                  }}
                                >
                                  <Receipt className="w-3.5 h-3.5 mr-1.5" />
                                  Orders
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation(
                                      `/employer/orders?ftInternId=${encodeURIComponent(String(candidate.id ?? "").trim())}`,
                                    );
                                  }}
                                >
                                  Send full-time offer
                                </Button>
                              )
                            ) : isAccepted && isProposalForSelectedProject ? (
                              String(selectedProject?.id ?? "").trim() === "3" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation(
                                      `/employer/intern/${encodeURIComponent(String(candidate.id))}/proposal?returnTo=${encodeURIComponent(currentLocation)}`,
                                    );
                                  }}
                                >
                                  View/Send Proposal
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => {
                                    setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                                  }}
                                >
                                  Proceed to Hire
                                </Button>
                              )
                            ) : hasAnyProposalSent && proposalId ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                                onClick={() => setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`)}
                              >
                                View Sent Proposal
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={candidate.isAdded || isFullTimeOfferSent || hasAnyProposalSent}
                                onClick={() => handleAddToCart(candidate.id)}
                              >
                                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                                {hasAnyProposalSent ? "Proposal sent" : isFullTimeOfferSent ? "Full-time offer sent" : candidate.isAdded ? "Added" : "Cart"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  : "space-y-4"
              }
            >
              {paginatedCandidates.map((candidate) => {
                const proposalMeta = proposalMetaByInternId[candidate.id];
                const statusLower = String(proposalMeta?.status ?? "").toLowerCase();
                const isAccepted = statusLower === "accepted";
                const isHiredAnywhere = (hiredInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                const isHired = statusLower === "hired" || isHiredAnywhere;
                const isFullTime = (fullTimeOfferInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                const isFullTimeOfferSent = (fullTimeOfferSentInternIdSet ?? new Set()).has(
                  String(candidate.id ?? "").trim(),
                );
                const isFullTimeAccepted = (fullTimeAcceptedInternIdSet ?? new Set()).has(String(candidate.id ?? "").trim());
                const hasAnyProposalSent =
                  statusLower.length > 0 &&
                  statusLower !== "rejected" &&
                  statusLower !== "expired" &&
                  statusLower !== "withdrawn";

                const proposalId = String(proposalMeta?.proposalId ?? "").trim();
                const proposalProjectId = String(proposalMeta?.projectId ?? "").trim();
                const selectedProjectId = String(selectedProject?.id ?? "").trim();
                const isProposalForSelectedProject =
                  !!proposalProjectId && !!selectedProjectId && proposalProjectId === selectedProjectId;

                return (
                  <Card
                    key={candidate.id}
                    className={`p-4 sm:p-5 border-0 shadow-lg shadow-slate-900/5 rounded-2xl bg-white hover:shadow-xl transition-all ${viewMode === "grid" ? "h-full" : ""}`}
                  >
                    <div
                      className={
                        viewMode === "grid"
                          ? "flex flex-col gap-4"
                          : "flex flex-col sm:flex-row sm:items-start gap-4"
                      }
                    >
                      {/* Avatar */}
                      <div className="relative sm:shrink-0">
                        <div
                          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex items-center justify-center text-lg sm:text-xl font-bold ${candidate.hasProfile
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-200 text-slate-500"
                            }${candidate.hasProfile ? " cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!candidate.hasProfile) return;
                            openPhotoPreview(candidate.profilePhotoUrl, getCandidateDisplayName(candidate));
                          }}
                        >
                          {candidate.hasProfile ? (
                            <>
                              <div
                                className="absolute inset-0 hidden items-center justify-center"
                                data-fallback="true"
                              >
                                <span>{getInitialsFromName(candidate.name, candidate.initials)}</span>
                              </div>
                              <img
                                src={candidate.profilePhotoUrl ?? ""}
                                alt={candidate.name}
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

                            <User className="w-7 h-7 sm:w-8 sm:h-8" />
                          )}
                        </div>

                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={
                            viewMode === "grid"
                              ? "flex flex-col gap-3 mb-2"
                              : "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2"
                          }
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-800">{getCandidateDisplayName(candidate)}</h3>
                              {isFullTimeAccepted ? (
                                <Badge className="bg-slate-900 text-white text-[10px] font-semibold rounded-full">Full-time</Badge>
                              ) : isHired ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">
                                  {isFullTime ? "Hired - Full Time" : "Hired - Intern"}
                                </Badge>
                              ) : isAccepted ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">Accepted</Badge>
                              ) : isFullTime ? (
                                <Badge className="bg-slate-900 text-white text-[10px] font-semibold rounded-full">Full-time</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-slate-500 flex items-start gap-1.5 flex-wrap leading-snug">
                              <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                              {candidate.location}
                            </p>
                          </div>
                          <div
                            className={
                              viewMode === "grid"
                                ? "flex flex-wrap items-end gap-2"
                                : "flex flex-wrap items-end gap-2 sm:gap-3 sm:justify-end"
                            }
                          >
                            <div className="inline-flex flex-col items-start min-w-[120px]">
                              <span className="text-[10px] uppercase tracking-wide text-emerald-700/80">
                                Findtern score
                              </span>
                              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1 shadow-sm">
                                <span className="text-xs font-semibold">{candidate.findternScore.toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="inline-flex flex-col items-start min-w-[120px]">
                              <span className="text-[10px] uppercase tracking-wide text-emerald-700/80">
                                Price
                              </span>
                              <div className="inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-semibold whitespace-nowrap">
                                {getCandidateHourlyPriceLabel(candidate)}
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Skills */}
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            Skills
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {getOrderedCandidateSkillsForDisplay(candidate.skills).slice(0, 7).map((skill, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs px-2 py-0.5 rounded-full ${selectedSkillsLowerSet.has(skill.toLowerCase())
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                                  }`}
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* AI Interview Ratings */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            AI Interview Ratings: {candidate.aiRatings.interview}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-400" />
                              Communication: {candidate.aiRatings.communication}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Coding: {candidate.aiRatings.coding}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              Aptitude: {candidate.aiRatings.aptitude}
                            </span>

                          </div>
                        </div>
                        <div
                          className={
                            viewMode === "grid"
                              ? "flex flex-col gap-2"
                              : "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                          }
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-4 w-full sm:w-auto justify-center rounded-full text-emerald-700 hover:bg-emerald-50"
                            onClick={() =>
                              setLocation(
                                `/employer/intern/${encodeURIComponent(String(candidate.id))}?returnTo=${encodeURIComponent(currentLocation)}`,
                              )
                            }
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                  View
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <div className="text-xs font-semibold">Preferred locations</div>
                                  <div className="text-xs text-slate-600 mt-1">
                                    {getPreferredLocationCities(candidate.preferredLocations).length
                                      ? getPreferredLocationCities(candidate.preferredLocations).join(", ")
                                      : "Not provided"}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </Button>
                          <Button
                            size="sm"
                            variant={compareList.includes(candidate.id) ? "secondary" : "outline"}
                            className={`h-8 px-4 w-full sm:w-auto justify-center rounded-full ${compareList.includes(candidate.id) ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-200"}`}
                            disabled={isHired || isFullTimeOfferSent}
                            onClick={() => toggleCompare(candidate.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            {compareList.includes(candidate.id) ? "In compare" : "Compare"}
                          </Button>
                          {isFullTimeAccepted ? (
                            String(selectedProject?.id ?? "").trim() === "3" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation(
                                    `/employer/intern/${encodeURIComponent(String(candidate.id))}/proposal?returnTo=${encodeURIComponent(currentLocation)}`,
                                  );
                                }}
                              >
                                View/Send Proposal
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                                }}
                              >
                                Proceed to Hire
                              </Button>
                            )
                          ) : isHired ? (
                            isFullTimeOfferSent ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation("/employer/orders");
                                }}
                              >
                                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                                Orders
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation(
                                    `/employer/orders?ftInternId=${encodeURIComponent(String(candidate.id ?? "").trim())}`,
                                  );
                                }}
                              >
                                Send full-time offer
                              </Button>
                            )
                          ) : isAccepted && isProposalForSelectedProject ? (
                            String(selectedProject?.id ?? "").trim() === "3" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation(
                                    `/employer/intern/${encodeURIComponent(String(candidate.id))}/proposal?returnTo=${encodeURIComponent(currentLocation)}`,
                                  );
                                }}
                              >
                                View/Send Proposal
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-4 w-full sm:w-auto justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setLocation("/employer/cart?tab=checkout&scroll=checkout#checkout");
                                }}
                              >
                                Proceed to Hire
                              </Button>
                            )
                          ) : hasAnyProposalSent && proposalId ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-4 w-full sm:w-auto justify-center rounded-full border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                              onClick={() => setLocation(`/employer/proposals/${encodeURIComponent(proposalId)}`)}
                            >
                              View Sent Proposal
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-4 w-full sm:w-auto justify-center rounded-full border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={candidate.isAdded || isFullTimeOfferSent || hasAnyProposalSent}
                              onClick={() => handleAddToCart(candidate.id)}
                            >
                              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                              {hasAnyProposalSent ? "Proposal sent" : isFullTimeOfferSent ? "Full-time offer sent" : candidate.isAdded ? "Added" : "Add to Cart"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredCandidates.length > pageSize && (
            <div className="mt-6 -mx-4 md:-mx-6 px-4 md:px-6 py-3 sticky bottom-0 z-20 bg-white/90 backdrop-blur border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Showing {pageRange.start}-{pageRange.end} of {filteredCandidates.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-slate-200"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>

                <div className="text-sm font-medium text-slate-700 min-w-[90px] text-center">
                  {currentPage} / {totalPages}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-slate-200"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <div className="hidden md:flex fixed z-50 left-auto right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full bg-white text-emerald-700 border border-emerald-200 shadow-lg hover:bg-emerald-50"
          aria-label="Feedback"
          onClick={() => {
            setSupportKind("feedback");
            setSupportOpen(true);
          }}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full bg-white text-rose-700 border border-rose-200 shadow-lg hover:bg-rose-50"
          aria-label="Report"
          onClick={() => {
            setSupportKind("report");
            setSupportOpen(true);
          }}
        >
          <Flag className="w-5 h-5" />
        </Button>

        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
          aria-label="Update"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open("/faq", "_blank", "noopener,noreferrer");
            } else {
              setLocation("/faq");
            }
          }}
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>

      <Dialog
        open={supportOpen}
        onOpenChange={(open) => {
          setSupportOpen(open);
          if (!open) {
            setSupportMessage("");
            setSupportVideo(null);
            setSupportFiles([]);
            if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{supportKind === "feedback" ? "Feedback" : "Report"}</DialogTitle>
            <DialogDescription>
              {supportKind === "feedback"
                ? "Share product feedback or suggestions."
                : "Report a bug or issue you faced. Attach video/screenshots if possible."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder={supportKind === "feedback" ? "Write your feedback..." : "Describe the issue and steps to reproduce..."}
              />
            </div>

            {/* <div className="space-y-1.5">
              <Label>Video (optional)</Label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && f.size > SUPPORT_MAX_VIDEO_BYTES) {
                    toast({
                      title: "Video too large",
                      description: "Max video size is 2MB.",
                      variant: "destructive",
                    });
                    setSupportVideo(null);
                    return;
                  }
                  setSupportVideo(f);
                }}
              />
            </div> */}

            <div className="space-y-1.5">
              <Label>Attachments (optional)</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={supportAttachmentsInputRef}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const nonImage = files.find((f) => !String(f?.type ?? "").toLowerCase().startsWith("image/"));
                  if (nonImage) {
                    toast({
                      title: "Invalid attachment",
                      description: "Only image attachments are allowed.",
                      variant: "destructive",
                    });
                    setSupportFiles([]);
                    if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
                    return;
                  }
                  const bad = files.find((f) => f.size > SUPPORT_MAX_IMAGE_BYTES);
                  if (bad) {
                    toast({
                      title: "Image too large",
                      description: "Each image attachment must be 100KB or less.",
                      variant: "destructive",
                    });
                    setSupportFiles([]);
                    if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
                    return;
                  }
                  setSupportFiles(files);
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSupportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitSupport} disabled={supportSubmitting}>
              {supportSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {compareList.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
          <div className="mx-auto max-w-4xl px-4 pb-4">
            <div className="rounded-2xl border border-amber-200 bg-white/95 backdrop-blur shadow-lg p-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">
                {compareList.length} selected
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/employer/compare")}
                className="h-10 px-4 rounded-full border-amber-300 bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900 hover:from-amber-300 hover:to-amber-200 shadow-sm flex items-center gap-2 text-sm font-semibold"
              >
                <Users className="w-4 h-4" />
                Compare ({compareList.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Dialog (wizard) */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setProjectStep(1);
            setProjectSkillSearch("");
            setIsEditMode(false);
            setEditingProject(null);
            setProjectLocationTypeTouched(false);
            setProjectCityStateTouched(false);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-emerald-600" />
              {isEditMode ? "Edit Project" : "Create New Project"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update project details and internship requirements."
                : "Define project details and internship requirements."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-6 text-xs font-medium text-slate-500">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs " +
                      (projectStep === step
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : step < projectStep
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-400 border-slate-200")
                    }
                  >
                    {step}
                  </div>
                  <span
                    className={
                      projectStep === step
                        ? "text-emerald-700"
                        : step < projectStep
                          ? "text-slate-700"
                          : "text-slate-400"
                    }
                  >
                    {step === 1 && "Project Name"}
                    {step === 2 && "Skills"}
                    {step === 3 && "Scope of Work"}
                    {step === 4 && "Location"}
                  </span>
                </div>
              ))}
            </div>

            {/* Step content */}
            {projectStep === 1 && (
              <div className="mx-auto max-w-lg text-center space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Enter Your Project Name</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the name of the project you need resources for. You can always add more projects later.
                  </p>
                </div>
                <div className="space-y-2 text-left">
                  <label className="text-xs font-medium text-slate-600">Project Name *</label>
                  <Input
                    placeholder="e.g. Mobile App Development"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                  />
                </div>

                
              </div>
            )}

            {projectStep === 2 && (
              <div className="mx-auto max-w-xl space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">What are the main skills required for this project?</h3>
                  <p className="text-xs text-slate-500">Select skills (up to 7). For best results, add at least 4 skills in order of importance.</p>
                </div>

                <div className="space-y-3 bg-slate-50/80 rounded-2xl border border-slate-100 p-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Select skills</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search and select skills..."
                        value={projectSkillSearch}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProjectSkillSearch(v);
                          setProjectSkillsInput(projectSkillsInput);
                        }}
                        className="h-10 pl-9 rounded-xl border-slate-200 focus:border-emerald-400"
                        disabled={projectSkillList.length >= 7}
                      />
                      {projectSkillSearch && projectFilteredSkillOptions.length > 0 && projectSkillList.length < 7 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg text-left text-sm ring-1 ring-slate-900/5">
                          {projectFilteredSkillOptions.map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              disabled={projectSkillList.length >= 7}
                              aria-disabled={projectSkillList.length >= 7}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50"
                              onClick={() => {
                                if (projectSkillList.length >= 7) return;
                                if (!projectSkillList.includes(skill)) {
                                  const next = [...projectSkillList, skill];
                                  setProjectSkillsInput(next.join(", "));
                                }
                                setProjectSkillSearch("");
                              }}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      For the best results, add at least 4 skills.
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {projectSkillList.length}/7 selected
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {projectSkillList.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="px-3 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => {
                            const next = projectSkillList.filter((s) => s !== skill);
                            setProjectSkillsInput(next.join(", "));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-[1.5fr_auto] gap-3 items-center">
                    <Input
                      placeholder="Enter custom skill"
                      value={projectSkillSearch}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProjectSkillSearch(v);
                        setProjectSkillsInput(projectSkillsInput);
                      }}
                      className="h-10 rounded-xl border-slate-200 focus:border-emerald-400"
                      disabled={projectSkillList.length >= 7}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();

                        const value = projectSkillSearch.trim();
                        if (!value) return;
                        if (projectSkillList.length >= 7) return;
                        if (!projectSkillList.includes(value)) {
                          const next = [...projectSkillList, value];
                          setProjectSkillsInput(next.join(", "));
                        }
                        setProjectSkillSearch("");
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5"
                      onClick={() => {
                        const value = projectSkillSearch.trim();
                        if (!value) return;
                        if (projectSkillList.length >= 7) return;
                        if (!projectSkillList.includes(value)) {
                          const next = [...projectSkillList, value];
                          setProjectSkillsInput(next.join(", "));
                        }
                        setProjectSkillSearch("");
                      }}
                      disabled={projectSkillList.length >= 7}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Skill
                    </Button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Start typing and we'll suggest matching skills. Click a suggestion to auto-fill, then add it.
                  </p>
                </div>
              </div>
            )}

            {projectStep === 3 && (
              <div className="mx-auto max-w-xl space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">Next, estimate the scope of your work</h3>
                  <p className="text-xs text-slate-500">Choose the approximate duration for this internship project.</p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: "short-term", label: "Short-Term: 30–60 days" },
                    { id: "medium-term", label: "Medium-Term: 60–90 days" },
                    { id: "long-term", label: "Long-Term: 90+ days" },
                    { id: "not-sure", label: "Not Sure" },
                  ].map((opt) => {
                    const selected = projectScope === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setProjectScope(opt.id)}
                        className={`w-full rounded-xl border px-4 py-3 flex items-center justify-between text-left text-sm transition-colors ${selected
                          ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                          }`}
                      >
                        <span>{opt.label}</span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${selected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 bg-white"
                            }`}
                        >
                          {selected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <Checkbox
                    checked={projectFullTimeOffer}
                    onCheckedChange={(val) => setProjectFullTimeOffer(!!val)}
                    className="border-emerald-400 data-[state=checked]:bg-emerald-600"
                  />
                  <div className="text-xs text-slate-600">
                    Would you consider offering a <span className="font-semibold text-emerald-700">full-time position</span> to the interns after this internship?
                  </div>
                </div>
              </div>
            )}

            {projectStep === 4 && (
              <div className="mx-auto max-w-xl space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">Finally, set the internship location</h3>
                  <p className="text-xs text-slate-500">Choose location type and confirm city/state (if required).</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Internship Location Types
                    </label>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={projectLocationType === "remote"}
                          onCheckedChange={() => {
                            setProjectLocationTypeTouched(true);
                            setProjectLocationType("remote");
                            setProjectCityStateTouched(false);
                          }}
                          className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                        />
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-4 h-4" />
                          <span>Remote</span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={projectLocationType === "hybrid"}
                          onCheckedChange={() => {
                            setProjectLocationTypeTouched(true);
                            setProjectLocationType("hybrid");
                          }}
                          className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                        />
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>Hybrid</span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={projectLocationType === "onsite"}
                          onCheckedChange={() => {
                            setProjectLocationTypeTouched(true);
                            setProjectLocationType("onsite");
                          }}
                          className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                        />
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>Onsite</span>
                        </span>
                      </label>
                    </div>

                    {projectLocationTypeTouched && !projectLocationType.trim() && (
                      <p className="text-sm text-red-600">Please select at least one location type.</p>
                    )}
                  </div>

                  {requiresProjectCityState && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs md:text-sm font-medium text-foreground">
                            City<span className="text-destructive ml-0.5">*</span>
                          </label>

                          {viewerIsIndia ? (
                            projectManualCityState ? (
                              <Input
                                placeholder="Enter your city"
                                className="h-10 md:h-11 rounded-lg text-sm"
                                value={projectCity}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setProjectCityStateTouched(true);
                                  setProjectCity(v);
                                  setProjectCitySearchQuery(v);
                                }}
                              />
                            ) : (
                              <Popover
                                open={projectCityPopoverOpen}
                                onOpenChange={(open) => {
                                  setProjectCityPopoverOpen(open);
                                  if (open) {
                                    setProjectCitySearchQuery(String(projectCity ?? ""));
                                  } else {
                                    setProjectCitySearchQuery(String(projectCity ?? ""));
                                  }
                                }}
                              >
                                <PopoverAnchor asChild>
                                  <div className="relative w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                      placeholder="Search Indian cities..."
                                      className="h-10 md:h-11 rounded-lg text-sm pl-9"
                                      value={projectCitySearchQuery}
                                      onFocus={() => setProjectCityPopoverOpen(true)}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setProjectCityPopoverOpen(true);
                                        setProjectCitySearchQuery(v);
                                        setProjectCityStateTouched(true);
                                        setProjectManualCityState(false);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        const raw = projectCitySearchQuery.trim();
                                        if (!raw) return;
                                        e.preventDefault();

                                        const q = raw.toLowerCase();

                                        const pick = (item: { city: string; state: string }) => {
                                          setProjectCityStateTouched(true);
                                          setProjectManualCityState(false);
                                          setProjectCity(item.city);
                                          setProjectState(item.state);
                                          setProjectCityPopoverOpen(false);
                                          setProjectCitySearchQuery(item.city);
                                        };

                                        const exact = projectCityStateOptions.find(
                                          (item) => item.city.toLowerCase() === q,
                                        );

                                        if (exact) {
                                          pick(exact);
                                          return;
                                        }

                                        const best = projectCityStateOptions
                                          .filter((item) => {
                                            return (
                                              item.city.toLowerCase().includes(q) ||
                                              (item.state || "").toLowerCase().includes(q)
                                            );
                                          })
                                          .sort((a, b) => {
                                            const score = (x: { city: string; state: string }) => {
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
                                          })[0];

                                        if (best) {
                                          pick(best);
                                          return;
                                        }

                                        setProjectCityStateTouched(true);
                                        setProjectManualCityState(true);
                                        setProjectCity(raw);
                                        setProjectState("");
                                        setProjectCityPopoverOpen(false);
                                        setProjectCitySearchQuery(raw);
                                      }}
                                    />
                                  </div>
                                </PopoverAnchor>
                                <PopoverContent
                                  className="w-[360px] p-0"
                                  align="start"
                                  onOpenAutoFocus={(e) => {
                                    e.preventDefault();
                                  }}
                                  onCloseAutoFocus={(e) => {
                                    e.preventDefault();
                                  }}
                                >
                                  <Command shouldFilter={false}>
                                    <CommandList>
                                      <CommandEmpty>
                                        <div className="px-2 py-2 text-xs text-muted-foreground">
                                          No city found.
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            className="px-1"
                                            onClick={() => {
                                              const raw = projectCitySearchQuery.trim();
                                              setProjectCityStateTouched(true);
                                              setProjectManualCityState(true);
                                              setProjectCityPopoverOpen(false);
                                              setProjectCity(raw);
                                              setProjectState("");
                                              setProjectCitySearchQuery(raw);
                                            }}
                                          >
                                            Enter manually
                                          </Button>
                                        </div>
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {projectCityStateOptions
                                          .filter((item) => {
                                            if (!projectCitySearchQuery.trim()) return true;
                                            const q = projectCitySearchQuery.trim().toLowerCase();
                                            return (
                                              item.city.toLowerCase().includes(q) ||
                                              (item.state || "").toLowerCase().includes(q)
                                            );
                                          })
                                          .sort((a, b) => {
                                            const q = projectCitySearchQuery.trim().toLowerCase();

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
                                          })
                                          .map((item) => (
                                            <CommandItem
                                              key={`${item.city}-${item.state}`}
                                              value={item.city}
                                              onSelect={() => {
                                                setProjectCityStateTouched(true);
                                                setProjectManualCityState(false);
                                                setProjectCity(item.city);
                                                setProjectState(item.state);
                                                setProjectCityPopoverOpen(false);
                                                setProjectCitySearchQuery(item.city);
                                              }}
                                            >
                                              <div className="flex items-center justify-between w-full">
                                                <span className="truncate">{item.city}</span>
                                                <span className="text-xs text-muted-foreground ml-3 shrink-0">
                                                  {item.state}
                                                </span>
                                              </div>
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>

                                    {!projectManualCityState && (
                                      <div className="border-t px-2 py-2">
                                        <button
                                          type="button"
                                          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                                          onClick={() => {
                                            const raw = projectCitySearchQuery.trim();
                                            setProjectCityStateTouched(true);
                                            setProjectManualCityState(true);
                                            setProjectCityPopoverOpen(false);
                                            setProjectCity(raw);
                                            setProjectState("");
                                            setProjectCitySearchQuery(raw);
                                          }}
                                        >
                                          Can&apos;t find your city? Enter manually
                                        </button>
                                      </div>
                                    )}
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )
                          ) : (
                            <Input
                              placeholder="Enter city"
                              className="h-10 md:h-11 rounded-lg text-sm"
                              value={projectCity}
                              onChange={(e) => {
                                const v = e.target.value;
                                setProjectCityStateTouched(true);
                                setProjectCity(v);
                              }}
                            />
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs md:text-sm font-medium text-foreground">
                            State<span className="text-destructive ml-0.5">*</span>
                          </label>
                          {viewerIsIndia ? (
                            <Input
                              value={projectState}
                              disabled={!projectManualCityState}
                              placeholder={projectManualCityState ? "Enter your state" : "Auto-filled from city"}
                              className="h-10 md:h-11 rounded-lg text-sm"
                              onChange={(e) => {
                                const v = e.target.value;
                                setProjectState(v);
                              }}
                            />
                          ) : (
                            <Input
                              value={projectState}
                              placeholder="Enter state"
                              className="h-10 md:h-11 rounded-lg text-sm"
                              onChange={(e) => {
                                const v = e.target.value;
                                setProjectState(v);
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {projectCityStateTouched && !hasProjectCityState && (
                        <p className="text-sm text-red-600">City and state are required for Hybrid/Onsite internships.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                  <span className="font-semibold">Disclaimer:</span> Candidates are India-based. Please select only cities and states within India.
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Select Your Time Zone
                  </label>

                  <Select
                    value={projectTimezone}
                    onOpenChange={setIsTimezoneDropdownOpen}
                    open={isTimezoneDropdownOpen}
                    onValueChange={(value) => {
                      setProjectTimezone(value);
                      setIsTimezoneDropdownOpen(false);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-slate-200">
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.id} value={tz.id} disabled={tz.disabled}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="mt-1 text-xs text-slate-500">
                    Schedules will be shown in your selected time zone. Candidates in other time zones will see the meeting in their local time.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setProjectStep(1);
                setIsEditMode(false);
                setEditingProject(null);
              }}
              className="rounded-lg"
            >
              Cancel
            </Button>
            {projectStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setProjectStep((prev) => Math.max(1, prev - 1))}
                className="rounded-lg"
              >
                Back
              </Button>
            )}
            {projectStep < 4 && (
              <Button
                type="button"
                onClick={() => setProjectStep((prev) => Math.min(4, prev + 1))}
                disabled={
                  (projectStep === 1 && !newProjectName.trim()) ||
                  (projectStep === 2 && projectSkillList.length < 4) ||
                  (projectStep === 2 && projectSkillList.length > 7) ||
                  (projectStep === 3 && !projectScope.trim())
                }
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Continue
              </Button>
            )}
            {projectStep === 4 && (
              <Button
                onClick={isEditMode ? handleEditProject : handleCreateProject}
                disabled={
                  isLoading ||
                  !newProjectName.trim()
                }
                className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditMode ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {isEditMode ? "Save Changes" : "Create Project"}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Project
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<span className="font-semibold text-slate-700">{editingProject?.name}</span>"?
              This action cannot be undone. All candidates and settings associated with this project will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEditingProject(null);
              }}
              className="rounded-lg"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isLoading}
              className="rounded-lg bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}