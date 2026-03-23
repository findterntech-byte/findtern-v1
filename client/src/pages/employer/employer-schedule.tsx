import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import { Check, AlertCircle, ExternalLink, Search, ShieldAlert, EyeOff, PhoneOff, Ban, Video, Scale } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import { getEmployerAuth } from "@/lib/employerAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function EmployerSchedulePage() {
  const [currentLocation, setLocation] = useLocation();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [acceptedInternIds, setAcceptedInternIds] = useState<Set<string>>(new Set());
  const [internProfilePhotoById, setInternProfilePhotoById] = useState<Record<string, string>>({});
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [photoDialogSrc, setPhotoDialogSrc] = useState<string>("");
  const [photoDialogAlt, setPhotoDialogAlt] = useState<string>("Profile photo");
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [generatingMeetId, setGeneratingMeetId] = useState<string | null>(null);
  const [activeInterview, setActiveInterview] = useState<any | null>(null);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState({ slot1: "", slot2: "", slot3: "" });
  const [isSendingSlots, setIsSendingSlots] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<any | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "sent" | "expired" | "completed">("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [timezoneFilter, setTimezoneFilter] = useState("all");

  const [meetingPolicyOpen, setMeetingPolicyOpen] = useState(false);
  const [meetingPolicyAgreed, setMeetingPolicyAgreed] = useState(false);
  const [pendingMeetingLink, setPendingMeetingLink] = useState<string>("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const getInitials = (value: string) => {
    const fullName = String(value ?? "").trim();
    return (fullName || "Intern")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "IN";
  };

  const parseNotesLink = (notes: string, prefix: string) => {
    const p = `${prefix}:`;
    const line = String(notes ?? "")
      .split("\n")
      .map((s) => s.trim())
      .find((s) => s.toLowerCase().startsWith(p));
    if (!line) return null;
    const value = line.slice(p.length).trim();
    return value || null;
  };

  const getFeedbackText = (interview: any) => {
    const direct = String(interview?.feedbackText ?? interview?.feedback_text ?? "").trim();
    if (direct) return direct;
    const fromNotes = parseNotesLink(String(interview?.notes ?? ""), "feedback_text");
    return fromNotes ? String(fromNotes).trim() : "";
  };

  const requestJoinMeeting = (linkValue: unknown) => {
    const raw = String(linkValue ?? "").trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setPendingMeetingLink(normalized);
    setMeetingPolicyAgreed(false);
    setMeetingPolicyOpen(true);
  };

  const getFeedbackLink = (interview: any) => {
    const direct = String(interview?.feedbackLink ?? interview?.feedback_link ?? "").trim();
    if (direct) return direct;
    const fromNotes = parseNotesLink(String(interview?.notes ?? ""), "feedback");
    return fromNotes ? String(fromNotes).trim() : "";
  };

  const isMeetingLinkActiveNow = (scheduledStart: Date | null, now: Date) => {
    if (!scheduledStart) return false;
    const startMs = scheduledStart.getTime();
    if (!Number.isFinite(startMs)) return false;
    const nowMs = now.getTime();
    return nowMs >= startMs;
  };

  const openAiFeedbackReport = async (interview: any) => {
    try {
      const internId = String(interview?.internId ?? "").trim();
      if (!internId) return;

      const res = await fetch(`/api/intern/${encodeURIComponent(internId)}/interviews`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(String(json?.message ?? "Failed to load AI interview report"));
      }

      const list = Array.isArray(json?.interviews) ? (json.interviews as any[]) : [];
      const aiInterview = list.find((i) => String(i?.employerId ?? "").trim().toLowerCase() === "admin") ?? null;
      if (!aiInterview) {
        throw new Error("AI interview feedback report is not available yet");
      }

      const notes = String(aiInterview?.notes ?? "");
      const raw = String(aiInterview?.feedback_link ?? aiInterview?.feedbackLink ?? "").trim();
      const fromNotes = notes ? parseNotesLink(notes, "feedback") : "";
      const link = raw || fromNotes;

      if (!link) {
        throw new Error("AI interview feedback report is not available yet");
      }

      const normalized = /^https?:\/\//i.test(link) ? link : `https://${link}`;
      window.open(normalized, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: "Feedback report not available",
        description: err?.message || "Could not open AI interview feedback report.",
        variant: "destructive",
      });
    }
  };

  const openFeedbackDialog = (interview: any) => {
    setFeedbackInterview(interview);
    setFeedbackText(getFeedbackText(interview));
    setIsFeedbackDialogOpen(true);
  };

  const submitFeedback = async () => {
    try {
      if (!feedbackInterview) return;
      const interviewId = String(feedbackInterview?.id ?? "").trim();
      if (!interviewId) return;

      const text = String(feedbackText ?? "").trim();
      if (!text) {
        toast({
          title: "Feedback required",
          description: "Please enter your feedback.",
          variant: "destructive",
        });
        return;
      }

      setSubmittingFeedback(true);
      const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackText: text }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = String(json?.message ?? "").trim() || "Failed to save feedback";
        if (res.status === 409) {
          throw new Error("Feedback already submitted");
        }
        throw new Error(msg);
      }

      const updated = json?.interview;
      if (updated?.id) {
        setInterviews((prev) =>
          prev.map((i) => {
            if (i.id !== updated.id) return i;
            const merged = {
              ...i,
              ...updated,
              offerDetails: (updated as any)?.offerDetails ?? (i as any)?.offerDetails,
              project: (updated as any)?.project ?? (i as any)?.project,
            };
            return merged;
          }),
        );
        setFeedbackInterview((prev: any) => {
          if (!prev) return updated;
          if (String((prev as any)?.id ?? "") !== String(updated?.id ?? "")) return prev;
          return {
            ...prev,
            ...updated,
            offerDetails: (updated as any)?.offerDetails ?? (prev as any)?.offerDetails,
            project: (updated as any)?.project ?? (prev as any)?.project,
          };
        });
      }

      toast({
        title: "Feedback saved",
        description: "Your feedback has been recorded for this interview.",
      });

      setIsFeedbackDialogOpen(false);
      setFeedbackInterview(null);
      setFeedbackText("");
    } catch (err: any) {
      toast({
        title: "Could not save feedback",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getInternDisplayName = (interview: any) => {
    const internId = String(interview?.internId ?? "").trim();
    const name = String(interview?.internName ?? "Intern");
    if (internId && acceptedInternIds.has(internId)) return name || "Intern";
    return getInitials(name);
  };

  const getProjectTitle = (interview: any) => {
    const direct = String(interview?.projectName ?? "").trim();
    if (direct) return direct;
    const nested = String(interview?.project?.projectName ?? interview?.project?.name ?? "").trim();
    if (nested) return nested;
    const fromOffer = String(interview?.offerDetails?.projectName ?? interview?.offerDetails?.projectTitle ?? "").trim();
    if (fromOffer) return fromOffer;
    return "";
  };

  const openPhotoPreview = (src: string, alt: string) => {
    const safeSrc = String(src ?? "").trim();
    if (!safeSrc) return;
    setPhotoDialogSrc(safeSrc);
    setPhotoDialogAlt(String(alt ?? "Profile photo") || "Profile photo");
    setIsPhotoDialogOpen(true);
  };

  const selectedProjectIdStorageKey = "employerSelectedProjectId";

  const projectOptions = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const interview of interviews) {
      const name = getProjectTitle(interview);
      if (!name) continue;
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(name);
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }, [interviews]);

  const timezoneOptions = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const interview of interviews) {
      const tz = String(interview?.timezone ?? "").trim();
      if (!tz) continue;
      const k = tz.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(tz);
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  }, [interviews]);

  const filteredInterviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const project = String(projectFilter || "all").trim();
    const timezone = String(timezoneFilter || "all").trim();
    const currentNow = now;

    const dateKeyInTz = (d: Date, timeZone: string) => {
      const tz = String(timeZone ?? "").trim() || "UTC";
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return fmt.format(d);
    };

    const dateFilterKey = String(dateFilter ?? "").trim();

    const getSelectedSlotTime = (interview: any) => {
      const selected = interview?.selectedSlot;
      if (!selected) return null;
      const slotKey = `slot${selected}`;
      const value = interview?.[slotKey];
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    };

    const resolveStatus = (interview: any) => {
      const statusLower = String(interview?.status ?? "").trim().toLowerCase();

      if (statusLower === "completed") return "completed" as const;
      if (statusLower === "expired") return "expired" as const;

      const isScheduled = statusLower === "scheduled" && Boolean(interview?.selectedSlot);
      if (isScheduled) {
        const selectedTime = getSelectedSlotTime(interview);
        if (!selectedTime) return "scheduled" as const;
        const meetingStartMs = selectedTime.getTime();
        const meetingEndMs = meetingStartMs + 30 * 60 * 1000;
        return currentNow.getTime() > meetingEndMs ? ("completed" as const) : ("scheduled" as const);
      }

      const slots = [interview?.slot1, interview?.slot2, interview?.slot3]
        .map((v) => {
          if (!v) return null;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) return null;
          return d;
        })
        .filter(Boolean) as Date[];

      if (slots.length > 0) {
        const latest = Math.max(...slots.map((d) => d.getTime()));
        if (currentNow.getTime() > latest) return "expired" as const;
      }

      return "sent" as const;
    };

    const statusRank = (status: ReturnType<typeof resolveStatus>) => {
      switch (status) {
        case "scheduled":
          return 0;
        case "sent":
          return 1;
        case "expired":
          return 2;
        case "completed":
          return 3;
        default:
          return 9;
      }
    };

    const getEarliestSlotTime = (interview: any) => {
      const slots = [interview?.slot1, interview?.slot2, interview?.slot3]
        .map((v) => {
          if (!v) return null;
          const d = new Date(v);
          if (Number.isNaN(d.getTime())) return null;
          return d;
        })
        .filter(Boolean) as Date[];
      if (slots.length === 0) return null;
      const earliest = Math.min(...slots.map((d) => d.getTime()));
      return new Date(earliest);
    };

    const getInterviewFilterTime = (interview: any) => {
      const selected = getSelectedSlotTime(interview);
      return selected || getEarliestSlotTime(interview);
    };

    const list = interviews.filter((interview) => {
      if (project !== "all") {
        const p = getProjectTitle(interview);
        if (p !== project) return false;
      }

      if (timezone !== "all") {
        const tz = String(interview?.timezone ?? "").trim() || "UTC";
        if (tz !== timezone) return false;
      }

      if (statusFilter !== "all") {
        const s = resolveStatus(interview);
        if (s !== statusFilter) return false;
      }

      if (q) {
        const nameRaw = String(interview?.internName ?? "").trim();
        const initials = getInitials(nameRaw).toLowerCase();
        const projectName = getProjectTitle(interview).toLowerCase();
        if (!initials.includes(q) && !projectName.includes(q)) return false;
      }

      if (dateFilterKey) {
        const t = getInterviewFilterTime(interview);
        if (!t) return false;

        const tz = String(interview?.timezone ?? "").trim() || "UTC";
        const interviewKey = dateKeyInTz(t, tz);
        if (interviewKey !== dateFilterKey) return false;
      }

      return true;
    });

    return list
      .slice()
      .sort((a, b) => {
        const sa = resolveStatus(a);
        const sb = resolveStatus(b);
        const ra = statusRank(sa);
        const rb = statusRank(sb);
        if (ra !== rb) return ra - rb;

        const da = sa === "scheduled" ? getSelectedSlotTime(a) : getEarliestSlotTime(a);
        const db = sb === "scheduled" ? getSelectedSlotTime(b) : getEarliestSlotTime(b);

        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
      });
  }, [interviews, projectFilter, timezoneFilter, searchQuery, statusFilter, dateFilter, now]);

  useEffect(() => {
    const auth = getEmployerAuth();
    const employerId = auth?.id as string | undefined;
    if (!employerId) return;
    (async () => {
      try {
        const projectId = (() => {
          try {
            return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          } catch {
            return "";
          }
        })();
        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

        const res = await fetch(`/api/employer/${employerId}/proposals${qs}`);
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const list = (json?.proposals ?? []) as any[];
        const accepted = new Set<string>();
        const photoById: Record<string, string> = {};
        for (const p of list) {
          if (Boolean(p?.isNameUnlocked)) {
            const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
            if (internId) accepted.add(internId);
          }

          const pid = String(p?.internId ?? p?.intern_id ?? "").trim();
          const photo = String(p?.internProfilePhotoName ?? p?.intern?.profilePhotoName ?? "").trim();
          if (pid && photo && !photoById[pid]) {
            photoById[pid] = photo;
          }
        }
        setAcceptedInternIds(accepted);
        setInternProfilePhotoById(photoById);
      } catch {
        return;
      }
    })();
  }, []);

  function pad2(n: number) {
    return String(n).padStart(2, "0");
  }

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

  const meetingWindowMin = ceilToMinutes(new Date(), 30);
  const meetingWindowMax = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d;
  })();

  const meetingInputMin = formatDateTimeLocal(meetingWindowMin);
  const meetingInputMax = formatDateTimeLocal(meetingWindowMax);

  const normalizeRescheduleSlotValue = (rawValue: string) => {
    const parsed = parseDateTimeLocal(rawValue);
    if (!parsed) return rawValue;

    const snapped = ceilToMinutes(parsed, 30);
    const clamped = clampDate(snapped, meetingWindowMin, meetingWindowMax);
    return formatDateTimeLocal(clamped);
  };

  const buildDefaultRescheduleSlots = () => {
    const base = meetingWindowMin;
    return {
      slot1: normalizeRescheduleSlotValue(formatDateTimeLocal(base)),
      slot2: normalizeRescheduleSlotValue(formatDateTimeLocal(addMinutes(base, 30))),
      slot3: normalizeRescheduleSlotValue(formatDateTimeLocal(addMinutes(base, 60))),
    };
  };

  const getSlotParts = (value: string) => {
    const [datePart, timePart] = value.split("T");
    return {
      date: datePart || "",
      time: timePart || "",
    };
  };

  const combineSlotParts = (datePart: string, timePart: string) => {
    if (!datePart || !timePart) return "";
    return normalizeRescheduleSlotValue(`${datePart}T${timePart}`);
  };

  const timeOptions = (() => {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
      options.push(`${pad2(h)}:00`);
      options.push(`${pad2(h)}:30`);
    }
    return options;
  })();

  const isTimeDisabledForDate = (datePart: string, timePart: string) => {
    if (!datePart || !timePart) return true;
    const dt = parseDateTimeLocal(`${datePart}T${timePart}`);
    if (!dt) return true;
    const t = dt.getTime();
    return t < meetingWindowMin.getTime() || t > meetingWindowMax.getTime();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const auth = getEmployerAuth();
        const employerId = auth?.id as string | undefined;
        if (!employerId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/employer/${employerId}/interviews`);
        if (!res.ok) {
          throw new Error("Failed to load interviews");
        }
        const json = await res.json();
        setInterviews(json.interviews || []);
      } catch (error) {
        console.error("Employer schedule load error", error);
        toast({
          title: "Could not load interviews",
          description: "Something went wrong while fetching your interview schedule.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const formatSlot = (slot: string | null | undefined, timeZone?: string | null) => {
    if (!slot) return null;
    const d = new Date(slot);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
      timeZone: String(timeZone ?? "").trim() || undefined,
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const openRescheduleDialog = (interview: any) => {
    setActiveInterview(interview);
    setRescheduleSlots(buildDefaultRescheduleSlots());
    setIsRescheduleDialogOpen(true);
  };

  const handleSendReminder = async (interview: any) => {
    try {
      const interviewId = String(interview?.id ?? "").trim();
      if (!interviewId) return;

      setSendingReminderId(interviewId);

      const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/send-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || "Failed to send reminder");
      }

      toast({
        title: "Reminder sent",
        description: "The candidate has been notified.",
      });
    } catch (err: any) {
      toast({
        title: "Could not send reminder",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!activeInterview) return;

    const { slot1, slot2, slot3 } = rescheduleSlots;
    if (!slot1 || !slot2 || !slot3) {
      toast({
        title: "Add all 3 slots",
        description: "Please select all three meeting slots before sending.",
        variant: "destructive",
      });
      return;
    }

    if (new Set([slot1, slot2, slot3]).size !== 3) {
      toast({
        title: "Choose different time slots",
        description: "All 3 meeting slots must be different.",
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

      const slots = [slot1, slot2, slot3];

      const res = await fetch(`/api/employer/${employerId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internId: activeInterview.internId,
          projectId: activeInterview.projectId ?? null,
          timezone:
            activeInterview.timezone ||
            (() => {
              try {
                return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
              } catch {
                return "UTC";
              }
            })(),
          slots,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message = json?.message || "Failed to create interview slots";
        throw new Error(message);
      }

      const json = await res.json().catch(() => null);
      const interview = json?.interview;
      const meet = json?.meet as
        | {
            created?: boolean;
            warning?: string | null;
            connectUrl?: string | null;
          }
        | undefined;
      if (interview) {
        setInterviews((prev) => [interview, ...prev]);
      }

      toast({
        title: "Slots sent",
        description: `New meeting slots have been shared with ${activeInterview ? getInternDisplayName(activeInterview) : "the candidate"}. The Google Meet link will be created when the candidate selects a slot.`,
      });

      setIsRescheduleDialogOpen(false);
      setActiveInterview(null);
      setRescheduleSlots({ slot1: "", slot2: "", slot3: "" });
    } catch (error: any) {
      console.error("Submit reschedule error", error);
      toast({
        title: "Could not send slots",
        description: error?.message || "Something went wrong while creating interview slots.",
        variant: "destructive",
      });
    } finally {
      setIsSendingSlots(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/10 to-slate-50">
      <EmployerHeader active="schedule" />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900">
              Interview Scheduling
            </h2>
            <p className="mt-1 text-xs md:text-sm text-slate-600">
              Track all upcoming interviews, candidate confirmations and meeting links in one place.
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 md:px-6 py-3 flex items-center justify-between">
            <p className="text-xs md:text-sm text-slate-600">
              Showing <span className="font-medium text-slate-900">{filteredInterviews.length}</span> interviews
            </p>
          </div>

          <div className="px-2 md:px-4 pb-2 md:pb-4 pt-2 bg-white">
            <div className="px-2 md:px-0 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate or project"
                    className="h-10 pl-9 rounded-xl"
                  />
                </div>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-10 rounded-xl"
                />
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Filter by project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projectOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={timezoneFilter} onValueChange={setTimezoneFilter}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All timezones</SelectItem>
                    {timezoneOptions.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[60px] text-xs md:text-sm">Sr. No.</TableHead>
                    <TableHead className="min-w-[120px] text-xs md:text-sm">Intern Name</TableHead>
                    <TableHead className="min-w-[160px] text-xs md:text-sm">Project Title</TableHead>
                    <TableHead className="min-w-[150px] text-xs md:text-sm">Meeting Status</TableHead>
                    <TableHead className="min-w-[220px] text-xs md:text-sm">Slots Sent</TableHead>
                    <TableHead className="min-w-[180px] text-xs md:text-sm">Meeting Timing</TableHead>
                    <TableHead className="min-w-[160px] text-xs md:text-sm">Timezone</TableHead>
                    <TableHead className="w-[140px] text-xs md:text-sm text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody className="text-xs md:text-sm">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                        Loading interviews...
                      </TableCell>
                    </TableRow>
                  ) : filteredInterviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-slate-500">
                        {interviews.length === 0
                          ? "No interviews yet. Schedule meetings from your cart."
                          : "No interviews match your filters."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInterviews.map((interview, index) => {
                      const statusLower = String(interview?.status ?? "").trim().toLowerCase();
                      const isCompleted = statusLower === "completed";
                      const isScheduled = statusLower === "scheduled" && interview.selectedSlot;
                      const selectedSlotKey: string | null = interview?.selectedSlot
                        ? `slot${interview.selectedSlot}`
                        : null;
                      const slotKey: string | null = isScheduled ? selectedSlotKey : null;

                      let rawDate: Date | null = null;
                      let meetingTime: string | null = null;
                      if (selectedSlotKey) {
                        const value = interview[selectedSlotKey] as string | null | undefined;
                        if (value) {
                          const d = new Date(value);
                          if (!Number.isNaN(d.getTime())) {
                            rawDate = d;
                            meetingTime = formatSlot(value, interview?.timezone);
                          }
                        }
                      }

                      const meetingStartMs = rawDate ? rawDate.getTime() : null;
                      const meetingEndMs = meetingStartMs != null ? meetingStartMs + 30 * 60 * 1000 : null;
                      const isAfterMeetingWindow = Boolean(meetingEndMs != null && now.getTime() > meetingEndMs);
                      const isEffectivelyCompleted = Boolean(isCompleted || (isScheduled && isAfterMeetingWindow));
                      const hasFeedbackSubmitted = Boolean(getFeedbackText(interview));
                      const canGenerateMeet = Boolean(isScheduled && !isAfterMeetingWindow && !interview.meetingLink);
                      const shouldShowJoinMeeting = Boolean(
                        meetingTime &&
                        interview.meetingLink &&
                        !isEffectivelyCompleted &&
                        !hasFeedbackSubmitted,
                      );

                      const hasAnySlots = Boolean(interview?.slot1 || interview?.slot2 || interview?.slot3);
                      const latestSlotMs = (() => {
                        const slots = [interview?.slot1, interview?.slot2, interview?.slot3]
                          .map((v) => {
                            if (!v) return null;
                            const d = new Date(v);
                            if (Number.isNaN(d.getTime())) return null;
                            return d.getTime();
                          })
                          .filter((t): t is number => Number.isFinite(t));
                        return slots.length ? Math.max(...slots) : null;
                      })();
                      const isExpired = !isScheduled && hasAnySlots && latestSlotMs != null && now.getTime() > latestSlotMs;

                      const internIdRaw = String(interview?.internId ?? "").trim();
                      const photoName = String(
                        interview?.internProfilePhotoName ??
                          interview?.intern?.profilePhotoName ??
                          (internIdRaw ? internProfilePhotoById[internIdRaw] : "") ??
                          "",
                      ).trim();
                      const avatarSrc = photoName ? `/uploads/${photoName}` : "";
                      const displayName = getInternDisplayName(interview);
                      const initials = getInitials(displayName);

                      const slotsSent = [
                        formatSlot(interview?.slot1, interview?.timezone),
                        formatSlot(interview?.slot2, interview?.timezone),
                        formatSlot(interview?.slot3, interview?.timezone),
                      ].filter(Boolean) as string[];

                      const timezoneLabel = String(interview?.timezone ?? "").trim() || "UTC";

                      return (
                        <TableRow
                          key={interview.id}
                          className={isScheduled ? "hover:bg-emerald-50/40" : "hover:bg-slate-50"}
                        >
                          <TableCell className="font-medium text-slate-700">{index + 1}</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                                onClick={() => openPhotoPreview(avatarSrc, displayName)}
                                aria-label="Open profile photo"
                              >
                                {avatarSrc ? (
                                  <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-[11px] font-semibold text-slate-700">
                                    {initials}
                                  </div>
                                )}
                              </button>
                              <span className="truncate">{displayName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {getProjectTitle(interview) || "-"}
                          </TableCell>
                          <TableCell>
                            {isEffectivelyCompleted ? (
                                <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold rounded-full px-2 py-0.5">
                                  Completed
                                </Badge>
                              ) : isScheduled ? (
                              (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px] font-semibold rounded-full px-2 py-0.5">
                                  Scheduled
                                </Badge>
                              )
                            ) : isExpired ? (
                              <Badge className="bg-red-50 text-red-700 border-red-200 text-[11px] rounded-full px-2 py-0.5">
                                Expired
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] rounded-full px-2 py-0.5">
                                Sent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className={slotsSent.length ? "text-slate-700" : "text-slate-400 italic"}>
                            {isEffectivelyCompleted ? (
                              "—"
                            ) : slotsSent.length ? (
                              <div className="space-y-1">
                                {slotsSent.map((s, idx) => (
                                  <div key={`${interview.id}-slot-${idx}`} className="leading-tight">
                                    {idx + 1}. {s}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className={meetingTime ? "text-slate-700" : "text-slate-400 italic"}>
                            <div className="flex flex-col gap-2">
                              <div>{meetingTime || "Not Scheduled"}</div>
                              {shouldShowJoinMeeting ? (
                                <Button
                                  size="sm"
                                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-full w-fit"
                                  onClick={() => requestJoinMeeting(interview.meetingLink)}
                                >
                                  Join Meeting
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{timezoneLabel}</TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="inline-flex items-center gap-2 justify-end">
                            {String(interview?.internId ?? "").trim() ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs rounded-full text-slate-600 border-slate-200"
                                onClick={() =>
                                  setLocation(
                                    `/employer/intern/${encodeURIComponent(String(interview.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                                  )
                                }
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Profile
                              </Button>
                            ) : null}

                            {isCompleted || (meetingStartMs != null && now.getTime() >= meetingStartMs) ? (
                              <Button
                                size="sm"
                                className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-full"
                                onClick={() => openFeedbackDialog(interview)}
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                Feedback
                              </Button>
                            ) : null}

                            {isScheduled && !isAfterMeetingWindow && !interview.meetingLink && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs rounded-full text-slate-600 border-slate-200"
                                disabled={generatingMeetId === String(interview.id)}
                                onClick={async () => {
                                  try {
                                    setGeneratingMeetId(String(interview.id));
                                    const res = await fetch(`/api/interviews/${encodeURIComponent(String(interview.id))}/generate-meet`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                    });
                                    const json = await res.json().catch(() => null);
                                    if (!res.ok) {
                                      throw new Error(json?.message || "Failed to generate meet link");
                                    }
                                    const updated = json?.interview;
                                    if (updated) {
                                      setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
                                    }
                                    toast({
                                      title: "Meet link generated",
                                      description: "Google Meet link has been created and saved.",
                                    });
                                  } catch (err: any) {
                                    toast({
                                      title: "Could not generate meet link",
                                      description: err?.message || "Something went wrong.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setGeneratingMeetId(null);
                                  }
                                }}
                              >
                                {generatingMeetId === String(interview.id) ? "Generating..." : "Generate Meet Link"}
                              </Button>
                            )}

                            {!isAfterMeetingWindow ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 text-xs rounded-full text-slate-600 border-slate-200"
                                disabled={sendingReminderId === String(interview.id)}
                                onClick={() => void handleSendReminder(interview)}
                              >
                                {sendingReminderId === String(interview.id) ? "Sending..." : "Send Reminder"}
                              </Button>
                            ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-3">
              {loading ? (
                <Card className="p-4 rounded-2xl border-slate-100">
                  <p className="text-sm text-slate-600">Loading interviews...</p>
                </Card>
              ) : filteredInterviews.length === 0 ? (
                <Card className="p-4 rounded-2xl border-slate-100">
                  <p className="text-sm text-slate-600">
                    {interviews.length === 0
                      ? "No interviews yet. Schedule meetings from your cart."
                      : "No interviews match your filters."}
                  </p>
                </Card>
              ) : (
                filteredInterviews.map((interview, index) => {
                  const statusLower = String(interview?.status ?? "").trim().toLowerCase();
                  const isCompleted = statusLower === "completed";
                  const isScheduled = statusLower === "scheduled" && interview.selectedSlot;
                  const selectedSlotKey: string | null = interview?.selectedSlot
                    ? `slot${interview.selectedSlot}`
                    : null;
                  const slotKey: string | null = isScheduled ? selectedSlotKey : null;

                  let rawDate: Date | null = null;
                  let meetingTime: string | null = null;
                  if (selectedSlotKey) {
                    const value = interview[selectedSlotKey] as string | null | undefined;
                    if (value) {
                      const d = new Date(value);
                      if (!Number.isNaN(d.getTime())) {
                        rawDate = d;
                        meetingTime = formatSlot(value, interview?.timezone);
                      }
                    }
                  }

                  const meetingStartMs = rawDate ? rawDate.getTime() : null;
                  const meetingEndMs = meetingStartMs != null ? meetingStartMs + 30 * 60 * 1000 : null;
                  const isAfterMeetingWindow = Boolean(meetingEndMs != null && now.getTime() > meetingEndMs);
                  const isEffectivelyCompleted = Boolean(isCompleted || (isScheduled && isAfterMeetingWindow));
                  const hasFeedbackSubmitted = Boolean(getFeedbackText(interview));
                  const canGenerateMeet = Boolean(isScheduled && !isAfterMeetingWindow && !interview.meetingLink);
                  const shouldShowJoinMeeting = Boolean(
                    meetingTime &&
                      interview.meetingLink &&
                      !isEffectivelyCompleted &&
                      !hasFeedbackSubmitted,
                  );

                  const hasAnySlots = Boolean(interview?.slot1 || interview?.slot2 || interview?.slot3);
                  const latestSlotMs = (() => {
                    const slots = [interview?.slot1, interview?.slot2, interview?.slot3]
                      .map((v) => {
                        if (!v) return null;
                        const d = new Date(v);
                        if (Number.isNaN(d.getTime())) return null;
                        return d.getTime();
                      })
                      .filter((t): t is number => Number.isFinite(t));
                    return slots.length ? Math.max(...slots) : null;
                  })();
                  const isExpired = !isScheduled && hasAnySlots && latestSlotMs != null && now.getTime() > latestSlotMs;

                  const internIdRaw = String(interview?.internId ?? "").trim();
                  const photoName = String(
                    interview?.internProfilePhotoName ??
                      interview?.intern?.profilePhotoName ??
                      (internIdRaw ? internProfilePhotoById[internIdRaw] : "") ??
                      "",
                  ).trim();
                  const avatarSrc = photoName ? `/uploads/${photoName}` : "";
                  const displayName = getInternDisplayName(interview);
                  const initials = getInitials(displayName);

                  const statusBadge = isEffectivelyCompleted ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold rounded-full px-2 py-0.5">
                        Completed
                      </Badge>
                    ) : isScheduled ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[11px] font-semibold rounded-full px-2 py-0.5">
                        Scheduled
                      </Badge>
                    ) : (
                    isExpired ? (
                      <Badge className="bg-red-50 text-red-700 border-red-200 text-[11px] rounded-full px-2 py-0.5">
                        Expired
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] rounded-full px-2 py-0.5">
                        Sent
                      </Badge>
                    )
                  );

                  const effectiveStatusBadge = statusBadge;

                  return (
                    <Card key={interview.id} className="p-4 rounded-2xl border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <button
                            type="button"
                            className="h-12 w-12 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
                            onClick={() => openPhotoPreview(avatarSrc, displayName)}
                            aria-label="Open profile photo"
                          >
                            {avatarSrc ? (
                              <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[11px] font-semibold text-slate-700">
                                {initials}
                              </div>
                            )}
                          </button>
                          <div className="min-w-0">
                          <p className="text-xs text-slate-500">#{index + 1}</p>
                          <p className="text-base font-semibold text-slate-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-slate-600 truncate">
                            {getProjectTitle(interview) || "-"}
                          </p>
                          </div>
                        </div>
                        <div className="shrink-0">{effectiveStatusBadge}</div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-700">Timing:</span> {meetingTime || "Not scheduled"}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-medium text-slate-700">Timezone:</span> {String(interview?.timezone ?? "").trim() || "UTC"}
                        </p>
                        {shouldShowJoinMeeting ? (
                          <div>
                            <Button
                              size="sm"
                              className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => requestJoinMeeting(interview.meetingLink)}
                            >
                              Join Meeting
                            </Button>
                            <span className="mt-1 block text-[10px] text-slate-500">Join as guest and enter your name.</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        {String(interview?.internId ?? "").trim() ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl text-slate-600 border-slate-200"
                            onClick={() =>
                              setLocation(
                                `/employer/intern/${encodeURIComponent(String(interview.internId))}?returnTo=${encodeURIComponent(currentLocation)}`,
                              )
                            }
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                        ) : null}

                        {isCompleted || (meetingStartMs != null && now.getTime() >= meetingStartMs) ? (
                          <Button
                            size="sm"
                            className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => openFeedbackDialog(interview)}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Feedback
                          </Button>
                        ) : null}

                        {canGenerateMeet && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl text-slate-600 border-slate-200"
                            disabled={generatingMeetId === String(interview.id)}
                            onClick={async () => {
                              try {
                                setGeneratingMeetId(String(interview.id));
                                const res = await fetch(`/api/interviews/${encodeURIComponent(String(interview.id))}/generate-meet`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                });
                                const json = await res.json().catch(() => null);
                                if (!res.ok) {
                                  throw new Error(json?.message || "Failed to generate meet link");
                                }
                                const updated = json?.interview;
                                if (updated) {
                                  setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
                                }
                                toast({
                                  title: "Meet link generated",
                                  description: "Google Meet link has been created and saved.",
                                });
                              } catch (err: any) {
                                toast({
                                  title: "Could not generate meet link",
                                  description: err?.message || "Something went wrong.",
                                  variant: "destructive",
                                });
                              } finally {
                                setGeneratingMeetId(null);
                              }
                            }}
                          >
                            {generatingMeetId === String(interview.id) ? "Generating..." : "Generate Meet Link"}
                          </Button>
                        )}

                        {!isAfterMeetingWindow ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl text-slate-600 border-slate-200"
                            disabled={sendingReminderId === String(interview.id)}
                            onClick={() => void handleSendReminder(interview)}
                          >
                            {sendingReminderId === String(interview.id) ? "Sending..." : "Send Reminder"}
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

           
          </div>
        </Card>
      </main>

      <Dialog
        open={isRescheduleDialogOpen}
        onOpenChange={(open) => {
          setIsRescheduleDialogOpen(open);
          if (!open) {
            setActiveInterview(null);
            setRescheduleSlots({ slot1: "", slot2: "", slot3: "" });
          } else {
            setRescheduleSlots(buildDefaultRescheduleSlots());
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeInterview
                ? `Reschedule Interview with ${getInternDisplayName(activeInterview)}`
                : "Reschedule Interview"}
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
                        ? rescheduleSlots.slot1
                        : slot === 2
                        ? rescheduleSlots.slot2
                        : rescheduleSlots.slot3;
                    const parts = getSlotParts(slotValue);

                    const otherSlotValues = [rescheduleSlots.slot1, rescheduleSlots.slot2, rescheduleSlots.slot3].filter(
                      (v) => v && v !== slotValue,
                    );

                    const setSlotValue = (next: string) => {
                      setRescheduleSlots((prev) =>
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
                              const next = combineSlotParts(nextDate, parts.time || "00:00");
                              setSlotValue(next);
                            }}
                          />
                        </div>

                        <Select
                          value={parts.time}
                          onValueChange={(nextTime) => {
                            const next = combineSlotParts(parts.date, nextTime);
                            setSlotValue(next);
                          }}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((t) => (
                              <SelectItem
                                key={t}
                                value={t}
                                disabled={
                                  isTimeDisabledForDate(parts.date, t) ||
                                  otherSlotValues.includes(combineSlotParts(parts.date, t))
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
              <p className="text-slate-500">Your account time zone will be shown to the candidate along with the slots.</p>
              <p className="text-[11px] text-amber-600 flex items-start gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                <span>Timezone is pre-selected and cannot be changed here. Ensure your profile timezone is correct.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={isSendingSlots}
              onClick={handleSubmitReschedule}
            >
              {isSendingSlots ? "Sending..." : "Save & Send New Slots"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPhotoDialogOpen}
        onOpenChange={(open) => {
          setIsPhotoDialogOpen(open);
          if (!open) {
            setPhotoDialogSrc("");
            setPhotoDialogAlt("Profile photo");
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Profile photo</DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-xl border border-slate-100 bg-white p-2 h-[75vh] overflow-hidden flex items-center justify-center">
            {photoDialogSrc ? (
              <img src={photoDialogSrc} alt={photoDialogAlt} className="max-h-full max-w-full object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFeedbackDialogOpen}
        onOpenChange={(open) => {
          setIsFeedbackDialogOpen(open);
          if (!open) {
            setFeedbackInterview(null);
            setFeedbackText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {feedbackInterview ? `Interview feedback for ${getInternDisplayName(feedbackInterview)}` : "Interview feedback"}
            </DialogTitle>
            <DialogDescription>
              {feedbackInterview && getFeedbackText(feedbackInterview)
                ? "Feedback is submitted. You can view it here."
                : "Add your feedback for this interview."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Feedback</label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[120px]"
              placeholder="Write feedback..."
              disabled={Boolean(feedbackInterview && getFeedbackText(feedbackInterview))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFeedbackDialogOpen(false);
                setFeedbackInterview(null);
                setFeedbackText("");
              }}
              disabled={submittingFeedback}
            >
              Close
            </Button>
            {!(feedbackInterview && getFeedbackText(feedbackInterview)) ? (
              <Button type="button" onClick={() => void submitFeedback()} disabled={submittingFeedback}>
                {submittingFeedback ? "Saving..." : "Save feedback"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={meetingPolicyOpen}
        onOpenChange={(open) => {
          setMeetingPolicyOpen(open);
          if (!open) {
            setPendingMeetingLink("");
            setMeetingPolicyAgreed(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-700" />
              Mandatory Rules While Joining Meetings
            </DialogTitle>
            <DialogDescription>
              By joining a meeting scheduled through Findtern, you confirm you will follow these rules.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2">
                  <EyeOff className="w-4 h-4 text-slate-700 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Do Not Reveal Company or Personal Identity</p>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                      Do not disclose company name, employee identity, direct contact info, office location, or organizational identifiers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2">
                  <PhoneOff className="w-4 h-4 text-slate-700 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Do Not Request Intern Personal Contact Information</p>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                      Do not ask for phone, email, social handles or personal contact channels.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2">
                  <Ban className="w-4 h-4 text-slate-700 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Do Not Initiate Off-Platform Hiring or Negotiation</p>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                      Do not confirm hiring or negotiate outside Findtern.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex items-start gap-2">
                  <Video className="w-4 h-4 text-slate-700 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Monitoring and Recording Consent</p>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                      Meetings are monitored and recorded for compliance, security, and dispute resolution.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
              <div className="flex items-start gap-2">
                <Scale className="w-4 h-4 text-amber-700 mt-0.5" />
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  Violations may result in monetary penalties, suspension, reduced visibility, blacklisting, or legal action.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="meeting-policy-agree"
              checked={meetingPolicyAgreed}
              onCheckedChange={(v) => setMeetingPolicyAgreed(Boolean(v))}
            />
            <Label htmlFor="meeting-policy-agree" className="text-xs leading-snug">
              I have read the rules and I agree to comply.
            </Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingPolicyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!meetingPolicyAgreed || !pendingMeetingLink}
              onClick={() => {
                const link = String(pendingMeetingLink ?? "").trim();
                if (!link) return;
                window.open(link, "_blank", "noopener,noreferrer");
                setMeetingPolicyOpen(false);
              }}
            >
              Proceed to meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
