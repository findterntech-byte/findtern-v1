import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Video,
  MapPin,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CandidateHeader } from "@/components/CandidateHeader";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InterviewsPage() {
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const meetingLinkGraceMs = 60 * 60 * 1000;

  const [aiGateOpen, setAiGateOpen] = useState(false);
  const [aiGateAgreed, setAiGateAgreed] = useState(false);
  const [aiGateSecondsLeft, setAiGateSecondsLeft] = useState(10);
  const [aiGateLink, setAiGateLink] = useState<string>("");

  const [meetGateOpen, setMeetGateOpen] = useState(false);
  const [meetGateSecondsLeft, setMeetGateSecondsLeft] = useState(10);
  const [meetGateLink, setMeetGateLink] = useState<string>("");

  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [applyingAi, setApplyingAi] = useState(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentLoaded, setPaymentLoaded] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "scheduled" | "sent" | "expired" | "completed"
  >("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Use logged-in intern's userId stored by login/signup flow
  const internId = (typeof window !== "undefined" && window.localStorage.getItem("userId")) || "";

  const [hasAdminRatings, setHasAdminRatings] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDialogTitle, setFeedbackDialogTitle] = useState<string>("Employer feedback");
  const [feedbackDialogText, setFeedbackDialogText] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        if (!internId) {
          setLoading(false);
          return;
        }

        try {
          const onboardingRes = await fetch(`/api/onboarding/${encodeURIComponent(internId)}`, {
            credentials: "include",
          });
          if (onboardingRes.ok) {
            const onboardingJson = await onboardingRes.json().catch(() => null);
            const ratings = onboardingJson?.onboarding?.extraData?.ratings;
            const anyRating =
              ratings &&
              typeof ratings === "object" &&
              Object.values(ratings).some((v: any) => typeof v === "number" && Number.isFinite(v));
            setHasAdminRatings(Boolean(anyRating));
          } else {
            setHasAdminRatings(false);
          }
        } catch {
          setHasAdminRatings(false);
        }

        try {
          const paymentRes = await fetch(`/api/intern/${encodeURIComponent(internId)}/payment-status`);
          if (paymentRes.ok) {
            const paymentJson = await paymentRes.json().catch(() => null);
            setIsPaid(Boolean(paymentJson?.isPaid));
          } else {
            setIsPaid(false);
          }
        } catch {
          setIsPaid(false);
        } finally {
          setPaymentLoaded(true);
        }

        const res = await fetch(`/api/intern/${internId}/interviews`);
        if (!res.ok) {
          throw new Error("Failed to load interviews");
        }
        const json = await res.json();
        setInterviews(json.interviews || []);
      } catch (error) {
        console.error("Load interviews error", error);
        toast({
          title: "Could not load interviews",
          description: "Something went wrong while fetching your interviews.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [internId, toast]);

  const hasAiInterview = useMemo(() => {
    return interviews.some((i) => String(i?.employerId ?? "").toLowerCase() === "admin");
  }, [interviews]);

  const baseInterviews = useMemo(() => {
    if (!hasAdminRatings) return interviews;
    return interviews.filter((i) => String(i?.employerId ?? "").toLowerCase() !== "admin");
  }, [hasAdminRatings, interviews]);

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

  const getEffectiveStatus = (interview: any) => {
    const rawStatus = interview.status || "sent";
    const rawLower = String(rawStatus).trim().toLowerCase();

    const nowMs = Date.now();

    const isScheduled = rawLower === "scheduled" && Boolean(interview?.selectedSlot);
    if (isScheduled) {
      const selectedKey = `slot${interview.selectedSlot}` as const;
      const slotValue = interview?.[selectedKey];
      if (!slotValue) return "scheduled";

      const slotTime = new Date(slotValue);
      if (Number.isNaN(slotTime.getTime())) return "scheduled";

      return nowMs > slotTime.getTime() + meetingLinkGraceMs ? "completed" : "scheduled";
    }

    if (!interview?.selectedSlot) {
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
        if (nowMs > latest) return "expired";
      }

      return "sent";
    }

    if (rawLower === "completed") return "completed";
    if (rawLower === "expired") return "expired";
    return rawLower || "sent";
  };

  const getSelectedSlotTime = (interview: any) => {
    const selected = interview?.selectedSlot;
    if (!selected) return null;
    const selectedKey = `slot${selected}` as const;
    const slotValue = interview?.[selectedKey];
    if (!slotValue) return null;
    const d = new Date(slotValue);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  };

  const getCompanyInitials = (name: string) => {
    const safe = String(name ?? "").trim();
    if (!safe) return "C";
    const words = safe
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/gi, ""))
      .filter(Boolean);
    const initials = words
      .slice(0, 2)
      .map((w) => (w[0] ?? "").toUpperCase())
      .join("");
    return initials || safe[0]?.toUpperCase() || "C";
  };

  const maskDisplayName = (value: string) => {
    const s = String(value ?? "").trim();
    if (!s) return s;
    const first = s[0] ?? "";
    const last = s[s.length - 1] ?? "";
    if (s.length <= 2) return first + "*";
    return `${first}${"*".repeat(Math.min(6, Math.max(3, s.length - 2)))}${last}`;
  };

  const getCompanyDisplayName = (interview: any) => {
    const raw = String(interview?.employerName ?? "").trim();
    if (raw) return maskDisplayName(raw) || raw;
    const isAi = String(interview?.employerId ?? "").toLowerCase() === "admin";
    return isAi ? "AI Interview" : "Company";
  };

  const getStatusMeta = (status: string) => {
    switch (status) {
      case "scheduled":
        return {
          label: "Scheduled",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "sent":
        return {
          label: "Pending scheduling",
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "expired":
        return {
          label: "Expired",
          className: "bg-red-50 text-red-700 border-red-200",
        };
      case "completed":
        return {
          label: "Completed",
          className: "bg-slate-100 text-slate-700 border-slate-200",
        };
      default:
        return {
          label: status || "Unknown",
          className: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  const isMeetLink = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return false;
    if (raw.startsWith("/")) return false;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(normalized);
      return u.hostname.toLowerCase() === "meet.google.com";
    } catch {
      return false;
    }
  };

  const openMeeting = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return;
    if (!isMeetLink(raw)) {
      toast({
        title: "Invalid meeting link",
        description: "Meeting link is not a valid Google Meet URL. Please ask the employer/admin to generate the Meet link.",
        variant: "destructive",
      });
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  const openExternalLink = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      window.open(normalized, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  };

  const openFeedbackDialog = (interview: any) => {
    const text = String((interview as any)?.feedbackText ?? (interview as any)?.feedback_text ?? "").trim();
    const titleBase =
      (interview?.employerName || (interview?.employerId === "admin" ? "AI Interview" : "Company")) ??
      "Company";
    setFeedbackDialogTitle(`Feedback from ${maskDisplayName(String(titleBase)) || String(titleBase)}`);
    setFeedbackDialogText(text);
    setFeedbackOpen(true);
  };

  useEffect(() => {
    if (!aiGateOpen) return;
    setAiGateAgreed(false);
    setAiGateSecondsLeft(10);

    const interval = window.setInterval(() => {
      setAiGateSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [aiGateOpen]);

  useEffect(() => {
    if (!meetGateOpen) return;
    setMeetGateSecondsLeft(10);

    const interval = window.setInterval(() => {
      setMeetGateSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [meetGateOpen]);

  const requestAiInterviewStart = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return;
    if (!isMeetLink(raw)) {
      toast({
        title: "Invalid meeting link",
        description: "Meeting link is not a valid Google Meet URL. Please ask the employer/admin to generate the Meet link.",
        variant: "destructive",
      });
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setAiGateLink(normalized);
    setAiGateOpen(true);
  };

  const requestMeetingStart = (value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return;
    if (!isMeetLink(raw)) {
      toast({
        title: "Invalid meeting link",
        description:
          "Meeting link is not a valid Google Meet URL. Please ask the employer/admin to generate the Meet link.",
        variant: "destructive",
      });
      return;
    }
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setMeetGateLink(normalized);
    setMeetGateOpen(true);
  };

  const statusCounts = baseInterviews.reduce(
    (acc, interview) => {
      const status = getEffectiveStatus(interview) || "sent";
      acc.all += 1;
      if (status === "scheduled") acc.scheduled += 1;
      else if (status === "sent") acc.sent += 1;
      else if (status === "expired") acc.expired += 1;
      else if (status === "completed") acc.completed += 1;
      return acc;
    },
    {
      all: 0,
      scheduled: 0,
      sent: 0,
      expired: 0,
      completed: 0,
    },
  );

  const filteredInterviews = useMemo(() => {
    const dateKeyLocal = (d: Date) => {
      const fmt = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return fmt.format(d);
    };

    const getSelectedSlotTime = (interview: any) => {
      const selected = interview?.selectedSlot;
      if (!selected) return null;
      const key = `slot${selected}` as const;
      const raw = interview?.[key];
      if (!raw) return null;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      return d;
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

    const dateFilterKey = String(dateFilter ?? "").trim();

    return baseInterviews.filter((interview) => {
      const status = getEffectiveStatus(interview) || "sent";
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (dateFilterKey) {
        const t = getSelectedSlotTime(interview) || getEarliestSlotTime(interview);
        if (!t) return false;
        const k = dateKeyLocal(t);
        if (k !== dateFilterKey) return false;
      }

      return true;
    });
  }, [baseInterviews, dateFilter, statusFilter]);

  const handleSelectSlot = async (interviewId: string, slot: number) => {
    try {
      setSelectingId(interviewId + "-" + slot);

      const res = await fetch(`/api/interviews/${interviewId}/select-slot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const message = json?.message || "Failed to confirm slot";
        throw new Error(message);
      }

      const json = await res.json().catch(() => null);
      const interview = json?.interview;

      if (!interview || !interview.id) {
        throw new Error("Failed to confirm slot");
      }

      setInterviews((prev) =>
        prev.map((i) => (i.id === interview.id ? interview : i)),
      );

      if (interview && !interview.meetingLink) {
        try {
          const genRes = await fetch(`/api/interviews/${encodeURIComponent(String(interview.id))}/generate-meet`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const genJson = await genRes.json().catch(() => null);
          if (genRes.ok && genJson?.interview) {
            const updated = genJson.interview;
            setInterviews((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          } else {
            toast({
              title: "Meet link pending",
              description: "Your slot is confirmed. Meet link will appear shortly. If it doesn't, ask the employer to generate it from Schedule.",
            });
          }
        } catch {
          toast({
            title: "Meet link pending",
            description: "Your slot is confirmed. Meet link will appear shortly. If it doesn't, ask the employer to generate it from Schedule.",
          });
        }
      }

      toast({
        title: "Slot confirmed",
        description: "Your interview time has been confirmed.",
      });
    } catch (error: any) {
      console.error("Select slot error", error);
      toast({
        title: "Could not confirm slot",
        description: error?.message || "Something went wrong while confirming your interview slot.",
        variant: "destructive",
      });
    } finally {
      setSelectingId(null);
    }
  };

  const handleApplyAiInterview = async () => {
    try {
      if (!internId) return;

      if (!paymentLoaded || !isPaid) {
        toast({
          title: "Could not apply",
          description: "Payment required before applying for AI interview",
          variant: "destructive",
        });
        return;
      }

      setApplyingAi(true);

      const res = await fetch(`/api/intern/${internId}/ai-interview/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = json?.message || "Failed to apply";
        throw new Error(message);
      }

      const created = json?.interview;
      if (created) {
        setInterviews((prev) => [created, ...prev]);
      }

      toast({
        title: "Applied for AI Interview",
        description: "You will receive the interview link within 48 working hours.",
      });
    } catch (error: any) {
      console.error("Apply AI interview error", error);
      toast({
        title: "Could not apply",
        description: error?.message || "Something went wrong while applying for AI interview.",
        variant: "destructive",
      });
    } finally {
      setApplyingAi(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Dialog
        open={feedbackOpen}
        onOpenChange={(next) => {
          setFeedbackOpen(next);
          if (!next) {
            setFeedbackDialogTitle("Employer feedback");
            setFeedbackDialogText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{feedbackDialogTitle}</DialogTitle>
            <DialogDescription>
              This feedback was shared by the employer for your interview.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={feedbackDialogText} readOnly className="min-h-[140px]" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={meetGateOpen}
        onOpenChange={(next) => {
          setMeetGateOpen(next);
          if (!next) {
            setMeetGateLink("");
            setMeetGateSecondsLeft(10);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important Instructions</DialogTitle>
            <DialogDescription>
              Please read before joining. You can accept in {meetGateSecondsLeft}s.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed">
                Do not reveal personal or employer identity, seek off-platform contact, or violate Findtern meeting rules—this meeting is recorded,
                monitored, and any breach will immediately void your guaranteed internship and may result in penalties or blacklisting.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetGateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={meetGateSecondsLeft > 0 || !meetGateLink}
              onClick={() => {
                const link = String(meetGateLink ?? "").trim();
                if (!link) return;
                openMeeting(link);
                setMeetGateOpen(false);
              }}
            >
              {meetGateSecondsLeft > 0 ? `Accept in ${meetGateSecondsLeft}s` : "Accept & Join"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={aiGateOpen}
        onOpenChange={(next) => {
          setAiGateOpen(next);
          if (!next) {
            setAiGateLink("");
            setAiGateAgreed(false);
            setAiGateSecondsLeft(10);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Interview: Terms & Instructions</DialogTitle>
            <DialogDescription>
              Please read and agree before starting. You can proceed in {aiGateSecondsLeft}s.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-slate-700">
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">Instructions</div>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Ensure stable internet and a quiet environment.</li>
                  <li>Allow microphone/camera permissions if prompted.</li>
                  <li>Do not refresh/close the interview window once started.</li>
                  <li>Your performance will be evaluated and shared as part of your profile.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="ai-interview-agree"
                checked={aiGateAgreed}
                onCheckedChange={(v) => setAiGateAgreed(Boolean(v))}
              />
              <Label htmlFor="ai-interview-agree" className="text-xs leading-snug">
                I have read the instructions and I agree to proceed.
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!aiGateAgreed || aiGateSecondsLeft > 0 || !aiGateLink}
              onClick={() => {
                const link = String(aiGateLink ?? "").trim();
                if (!link) return;
                window.open(link, "_blank", "noopener,noreferrer");
                setAiGateOpen(false);
              }}
            >
              Proceed to interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CandidateHeader />

      <div className="container px-4 md:px-6 py-8">
        <h1 className="text-2xl font-bold text-[#0E6049] mb-6">My Interviews</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
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
              <SelectItem value="sent">Pending scheduling</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading your interviews...</div>
        ) : baseInterviews.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">You don't have any interviews yet.</p>
              {!hasAdminRatings && (
                <div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="inline-flex"
                          onClick={() => {
                            if (!hasAiInterview) return;
                            toast({
                              title: "Applied for AI Interview",
                              description: "You will receive the interview link within 48 working hours.",
                            });
                          }}
                        >
                         
                        </span>
                      </TooltipTrigger>
                      {hasAiInterview && (
                        <TooltipContent>
                          You will receive the interview link within 48 working hours.
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInterviews.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">No interviews found for this filter.</p>
              </Card>
            ) : (
              filteredInterviews.map((interview, index) => (
                <div key={interview.id}>
                  <Card className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                            {getCompanyInitials(
                              interview.employerName || (interview.employerId === "admin" ? "AI" : "Company"),
                            )}
                          </div>
                          <div>
                            <h3
                              className="text-lg font-semibold mb-1"
                              title={getCompanyDisplayName(interview)}
                            >
                              {getCompanyDisplayName(interview)}
                            </h3>
                            {/* <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{interview.timezone || "Employer timezone"}</span>
                            </p> */}
                          </div>
                        </div>

                        {(() => {
                          const s = getEffectiveStatus(interview) || "sent";
                          const meta = getStatusMeta(s);
                          return (
                            <Badge
                              variant="outline"
                              className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${meta.className}`}
                            >
                              {meta.label}
                            </Badge>
                          );
                        })()}
                      </div>

                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Available Slots (shown in your local time)</span>
                      </p>

                      <div className="space-y-2">
                        {([1, 2, 3] as const).map((n) => {
                          const key = `slot${n}` as const;
                          const rawSlotValue = interview[key];
                          const label = formatSlot(rawSlotValue);
                          if (!label) return null;

                          const effectiveStatus = getEffectiveStatus(interview);
                          const isSelected = interview.selectedSlot === n;
                          const isSent = effectiveStatus === "sent";
                          const selectKey = interview.id + "-" + n;

                          if (!!interview.selectedSlot && !isSelected) {
                            return null;
                          }

                          let isFutureSlot = false;
                          if (rawSlotValue) {
                            const slotDate = new Date(rawSlotValue);
                            if (!Number.isNaN(slotDate.getTime())) {
                              isFutureSlot = slotDate.getTime() > Date.now();
                            }
                          }

                          const canSelect = isSent && isFutureSlot;

                          return (
                            <div
                              key={n}
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px]">
                                  Slot {n}
                                </Badge>
                                <span>{label}</span>
                              </div>

                              {isSelected ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Confirmed
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canSelect || selectingId === selectKey}
                                  onClick={() => handleSelectSlot(interview.id, n)}
                                >
                                  {selectingId === selectKey ? "Confirming..." : "Choose this time"}
                                </Button>
                              )}
                            </div>
                          );
                        })}

                        {!interview.slot1 &&
                          !interview.slot2 &&
                          !interview.slot3 &&
                          !interview.meetingLink && (
                            <p className="text-xs text-muted-foreground">
                              Your request is under review. A join link will appear here once the interview is scheduled.
                            </p>
                          )}
                      </div>

                      {(() => {
                        const effective = getEffectiveStatus(interview);
                        if (effective !== "scheduled") return null;

                        if (!interview.meetingLink) {
                          return (
                            <div className="pt-2 border-t mt-2">
                              <p className="text-xs text-muted-foreground">
                                Meet link will appear here shortly. If it doesn't, ask the employer to generate it from Schedule.
                              </p>
                            </div>
                          );
                        }

                        if (!interview.selectedSlot) {
                          return (
                            <div className="pt-2 border-t mt-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <Button
                                  variant="ghost"
                                  className="h-auto p-0 text-[#0E6049] hover:underline"
                                  onClick={() => {
                                    const isAi = String(interview?.employerId ?? "").toLowerCase() === "admin";
                                    if (isAi) requestAiInterviewStart(interview.meetingLink);
                                    else requestMeetingStart(interview.meetingLink);
                                  }}
                                >
                                  <Video className="h-4 w-4 mr-1 inline" />
                                  Join Meeting
                                </Button>
                                {String(interview?.employerId ?? "").toLowerCase() === "admin" && (
                                  <>
                                    {String((interview as any)?.feedbackLink ?? (interview as any)?.feedback_link ?? "").trim() && (
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-0 text-muted-foreground hover:underline"
                                        onClick={() => openExternalLink((interview as any)?.feedbackLink ?? (interview as any)?.feedback_link)}
                                      >
                                        View Feedback
                                      </Button>
                                    )}
                                    {String((interview as any)?.recordingLink ?? (interview as any)?.recording_link ?? "").trim() && (
                                      <Button
                                        variant="ghost"
                                        className="h-auto p-0 text-muted-foreground hover:underline"
                                        onClick={() => openExternalLink((interview as any)?.recordingLink ?? (interview as any)?.recording_link)}
                                      >
                                        View Recording
                                      </Button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }

                        const selectedSlotTime = getSelectedSlotTime(interview);
                        const canJoin =
                          !!selectedSlotTime && Date.now() <= selectedSlotTime.getTime() + meetingLinkGraceMs;
                        if (!canJoin) return null;

                        return (
                          <div className="pt-2 border-t mt-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <Button
                                variant="ghost"
                                className="h-auto p-0 text-[#0E6049] hover:underline"
                                onClick={() => {
                                  const isAi = String(interview?.employerId ?? "").toLowerCase() === "admin";
                                  if (isAi) requestAiInterviewStart(interview.meetingLink);
                                  else requestMeetingStart(interview.meetingLink);
                                }}
                              >
                                <Video className="h-4 w-4 mr-1 inline" />
                                Join Meeting
                              </Button>
                              {String(interview?.employerId ?? "").toLowerCase() === "admin" && (
                                <>
                                  {String((interview as any)?.feedbackLink ?? (interview as any)?.feedback_link ?? "").trim() && (
                                    <Button
                                      variant="ghost"
                                      className="h-auto p-0 text-muted-foreground hover:underline"
                                      onClick={() => openExternalLink((interview as any)?.feedbackLink ?? (interview as any)?.feedback_link)}
                                    >
                                      View Feedback
                                    </Button>
                                  )}
                                  {String((interview as any)?.recordingLink ?? (interview as any)?.recording_link ?? "").trim() && (
                                    <Button
                                      variant="ghost"
                                      className="h-auto p-0 text-muted-foreground hover:underline"
                                      onClick={() => openExternalLink((interview as any)?.recordingLink ?? (interview as any)?.recording_link)}
                                    >
                                      View Recording
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const employerFeedback = String(
                          (interview as any)?.feedbackText ?? (interview as any)?.feedback_text ?? "",
                        ).trim();
                        if (!employerFeedback) return null;

                        return (
                          <div className="pt-3 border-t mt-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-slate-900">Employer feedback</p>
                              <Button
                                variant="ghost"
                                className="h-auto p-0 text-muted-foreground hover:underline"
                                onClick={() => openFeedbackDialog(interview)}
                              >
                                View feedback
                              </Button>
                            </div>
                            <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                              {employerFeedback}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                  {index < filteredInterviews.length - 1 && <Separator className="my-4" />}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}