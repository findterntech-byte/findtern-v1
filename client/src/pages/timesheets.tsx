import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateHeader } from "@/components/CandidateHeader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { addDaysToDateString } from "@/lib/timezone";
import { CalendarDays, ChevronRight, Clock, Send, Sparkles } from "lucide-react";

type Proposal = {
  id: string;
  status?: string;
  employerId?: string;
  projectId?: string;
  projectName?: string;
  offerDetails?: {
    roleTitle?: string;
    startDate?: string;
    duration?: string;
    timezone?: string;
    fullTimeOffer?: unknown;
  };
};

type TimesheetRow = {
  date: string;
  status: "Present" | "Absent" | "Fixed off" | "Holiday" | "";
};

type Timesheet = {
  id: string;
  proposalId: string;
  employerId: string;
  internId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  entries: any;
  submittedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  internNote?: string | null;
  managerNote?: string | null;
};

function isoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function monthStringFromDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(month: string) {
  const v = String(month ?? "").trim();
  const match = /^\d{4}-\d{2}$/.test(v) ? v : monthStringFromDate(new Date());
  const [yy, mm] = match.split("-");
  const year = Number(yy);
  const monthIndex = Number(mm) - 1;
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end, month: match };
}

function isoFromUnknownDate(value: unknown) {
  const raw = String(value ?? "").trim();
  const iso = raw.length >= 10 ? raw.slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
}

function maxIsoDate(a: string, b: string) {
  const aa = String(a ?? "").slice(0, 10);
  const bb = String(b ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(aa)) return bb;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bb)) return aa;
  return aa >= bb ? aa : bb;
}

function addMonthsToIso(iso: string, months: number) {
  const v = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";

  const [yy, mm, dd] = v.split("-").map((x) => Number(x));
  const base = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  if (Number.isNaN(base.getTime())) return "";

  const next = new Date(base);
  next.setMonth(next.getMonth() + Math.max(0, Math.floor(months || 0)));
  return isoDateOnly(next);
}

function addDaysToIso(iso: string, days: number) {
  const v = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";

  const [yy, mm, dd] = v.split("-").map((x) => Number(x));
  const base = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  if (Number.isNaN(base.getTime())) return "";

  const next = new Date(base);
  next.setDate(next.getDate() + Math.floor(days || 0));
  return isoDateOnly(next);
}

function dateFromIsoLocal(iso: string) {
  const v = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(NaN);
  return new Date(`${v}T00:00:00`);
}

function buildDateRangeDates(startDate: string, endDate: string) {
  const out: string[] = [];
  const start = String(startDate ?? "").slice(0, 10);
  const end = String(endDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return out;

  let cur = start;
  let guard = 0;
  while (guard < 1200) {
    out.push(cur);
    if (cur === end) break;
    const next = addDaysToDateString(cur, 1);
    if (!next) break;
    cur = next;
    guard += 1;
  }
  return out;
}

function hasFullTimeOffer(p: Proposal | null | undefined) {
  const offer = (p as any)?.offerDetails ?? {};
  const ft = (offer as any)?.fullTimeOffer ?? null;
  return !!ft && typeof ft === "object";
}

function monthsFromDuration(duration: unknown) {
  const v = String(duration ?? "").trim().toLowerCase();
  const m = v.match(/^(\d+)\s*m$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return 1;
}

function proposalDurationMonths(p: Proposal | null | undefined) {
  if (!p) return 1;
  if (hasFullTimeOffer(p)) return 12;
  return Math.max(1, monthsFromDuration((p as any)?.offerDetails?.duration));
}

function isoToDateSafe(iso: string) {
  const d = new Date(String(iso ?? "").trim());
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function rangesOverlap(aStartIso: string, aEndIso: string, bStartIso: string, bEndIso: string) {
  const aStart = isoToDateSafe(aStartIso);
  const aEnd = isoToDateSafe(aEndIso);
  const bStart = isoToDateSafe(bStartIso);
  const bEnd = isoToDateSafe(bEndIso);
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

function normalizeEntries(weekDates: string[], existing: any): TimesheetRow[] {
  const prev = Array.isArray(existing) ? existing : [];
  const byDate = new Map<string, any>();
  for (const it of prev) {
    const d = String(it?.date ?? "").trim();
    if (!d) continue;
    byDate.set(d, it);
  }

  return weekDates.map((d) => {
    const row = byDate.get(d) ?? {};
    const st = String(row?.status ?? "").trim();
    const normalized =
      st === "Present" || st === "Absent" || st === "Fixed off" || st === "Holiday" ? st : "";
    return {
      date: d,
      status: normalized as any,
    };
  });
}

export default function TimesheetsPage() {
  const [loc, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

  const { data: proposalsResp, isLoading: proposalsLoading, error: proposalsError } = useQuery<{ proposals: Proposal[] }>({
    queryKey: ["/api/intern/proposals", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) return { proposals: [] };
      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/proposals`, { credentials: "include" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Failed to fetch proposals");
      }
      return res.json();
    },
  });

  const hiredProposals = useMemo(() => {
    const list = Array.isArray(proposalsResp?.proposals) ? proposalsResp?.proposals : [];
    return list.filter((p) => {
      if (hasFullTimeOffer(p)) return false;
      const status = String(p?.status ?? "").trim().toLowerCase();
      return status === "hired";
    });
  }, [proposalsResp?.proposals]);

  const { data: tsResp, isLoading: tsLoading, error: tsError } = useQuery<{ timesheets: Timesheet[] }>({
    queryKey: ["/api/intern/timesheets", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) return { timesheets: [] };
      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/timesheets?limit=500`, {
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || "Failed to fetch timesheets");
      }
      return res.json();
    },
  });

  const timesheets = useMemo(() => {
    return Array.isArray(tsResp?.timesheets) ? tsResp?.timesheets : [];
  }, [tsResp?.timesheets]);

  const timesheetsByProposalId = useMemo(() => {
    const map = new Map<string, Timesheet[]>();
    for (const t of timesheets) {
      const pid = String(t?.proposalId ?? "").trim();
      if (!pid) continue;
      const arr = map.get(pid) ?? [];
      arr.push(t);
      map.set(pid, arr);
    }
    Array.from(map.entries()).forEach(([k, arr]) => {
      arr.sort(
        (a: Timesheet, b: Timesheet) =>
          new Date(String(b.periodStart)).getTime() - new Date(String(a.periodStart)).getTime(),
      );
      map.set(k, arr);
    });
    return map;
  }, [timesheets]);

  const initialProposalId = useMemo(() => {
    try {
      const url = new URL(String(loc ?? ""), window.location.origin);
      return String(url.searchParams.get("proposalId") ?? "").trim();
    } catch {
      return "";
    }
  }, [loc]);

  const [activeProposalId, setActiveProposalId] = useState<string>("");
  const activeProposal = useMemo(() => {
    return hiredProposals.find((p) => String(p.id) === String(activeProposalId)) ?? null;
  }, [activeProposalId, hiredProposals]);

  const activeProposalTimesheetCount = useMemo(() => {
    if (!activeProposalId) return 0;
    return (timesheetsByProposalId.get(activeProposalId) ?? []).length;
  }, [activeProposalId, timesheetsByProposalId]);

  useEffect(() => {
    if (activeProposalId) return;
    if (initialProposalId && hiredProposals.some((p) => String(p.id) === String(initialProposalId))) {
      setActiveProposalId(initialProposalId);
      return;
    }
    if (hiredProposals.length > 0) setActiveProposalId(hiredProposals[0].id);
  }, [activeProposalId, hiredProposals, initialProposalId]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => monthStringFromDate(new Date()));
  const selectedMonthRange = useMemo(() => monthRange(selectedMonth), [selectedMonth]);

  const effectiveCreatePeriod = useMemo(() => {
    const monthStartIso = isoDateOnly(selectedMonthRange.start);
    const joiningIso = isoFromUnknownDate(activeProposal?.offerDetails?.startDate);

    const contractMonths = proposalDurationMonths(activeProposal);

    if (!joiningIso) {
      const contractEndIso = addDaysToIso(addMonthsToIso(monthStartIso, contractMonths), -1);
      const periodStartIso = monthStartIso;
      const rawEndIso = addDaysToIso(addMonthsToIso(periodStartIso, 1), -1);
      const periodEndIso = rawEndIso > contractEndIso ? contractEndIso : rawEndIso;
      return { periodStartIso, periodEndIso, joiningIso: "", contractEndIso };
    }

    const periodStartIso = maxIsoDate(monthStartIso, joiningIso);

    const contractEndIso = addDaysToIso(addMonthsToIso(joiningIso, contractMonths), -1);
    const rawEndIso = addDaysToIso(addMonthsToIso(periodStartIso, 1), -1);
    const periodEndIso = rawEndIso > contractEndIso ? contractEndIso : rawEndIso;
    return { periodStartIso, periodEndIso, joiningIso, contractEndIso };
  }, [activeProposal, activeProposal?.offerDetails?.startDate, selectedMonthRange.end, selectedMonthRange.start]);

  const activeProposalHasTimesheetForSelectedPeriod = useMemo(() => {
    if (!activeProposalId) return false;
    const list = timesheetsByProposalId.get(activeProposalId) ?? [];
    const aStart = effectiveCreatePeriod?.periodStartIso;
    const aEnd = effectiveCreatePeriod?.periodEndIso;
    if (!aStart || !aEnd) return false;

    return list.some((t: any) => {
      const bStart = isoDateOnly(new Date(String(t?.periodStart ?? "")));
      const bEnd = isoDateOnly(new Date(String(t?.periodEnd ?? "")));
      return rangesOverlap(aStart, aEnd, bStart, bEnd);
    });
  }, [activeProposalId, effectiveCreatePeriod?.periodEndIso, effectiveCreatePeriod?.periodStartIso, timesheetsByProposalId]);

  const canCreateMoreTimesheetsForActiveProposal = useMemo(() => {
    if (!activeProposal) return false;
    if (activeProposalHasTimesheetForSelectedPeriod) return false;
    return true;
  }, [activeProposal, activeProposalHasTimesheetForSelectedPeriod]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTimesheet, setEditingTimesheet] = useState<Timesheet | null>(null);
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [internNote, setInternNote] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string>("");

  const editorIsReadOnly = useMemo(() => {
    const status = String((editingTimesheet as any)?.status ?? "").trim().toLowerCase();
    return !["draft", "rejected"].includes(status);
  }, [editingTimesheet]);

  const todayIso = useMemo(() => isoDateOnly(new Date()), []);
  const isMonthEnded = useMemo(() => {
    if (!editingTimesheet) return false;
    const endIso = isoDateOnly(new Date(String(editingTimesheet.periodEnd ?? "")));
    if (!endIso) return false;
    return todayIso >= endIso;
  }, [editingTimesheet, todayIso]);

  const presentCount = useMemo(
    () => rows.reduce((acc, r) => acc + (r.status === "Present" ? 1 : 0), 0),
    [rows],
  );
  const absentCount = useMemo(
    () => rows.reduce((acc, r) => acc + (r.status === "Absent" ? 1 : 0), 0),
    [rows],
  );
  const fixedOffCount = useMemo(
    () => rows.reduce((acc, r) => acc + (r.status === "Fixed off" ? 1 : 0), 0),
    [rows],
  );
  const holidayCount = useMemo(
    () => rows.reduce((acc, r) => acc + (r.status === "Holiday" ? 1 : 0), 0),
    [rows],
  );
  const filledCount = useMemo(
    () => rows.reduce((acc, r) => acc + (r.status ? 1 : 0), 0),
    [rows],
  );
  const hasAnyEntry = useMemo(() => rows.some((r) => Boolean(r.status)), [rows]);
  const isFullyFilled = useMemo(() => rows.length > 0 && filledCount === rows.length, [filledCount, rows.length]);

  const attendanceSegments = useMemo(() => {
    const total = Math.max(0, rows.length);
    if (!total) {
      return { total: 0, presentPct: 0, absentPct: 0, fixedOffPct: 0, holidayPct: 0, unfilledPct: 0 };
    }
    const present = Math.max(0, presentCount);
    const absent = Math.max(0, absentCount);
    const fixedOff = Math.max(0, fixedOffCount);
    const holiday = Math.max(0, holidayCount);
    const filled = Math.max(0, filledCount);
    const unfilled = Math.max(0, total - filled);
    const toPct = (n: number) => Math.max(0, Math.min(100, (n / total) * 100));
    return {
      total,
      presentPct: toPct(present),
      absentPct: toPct(absent),
      fixedOffPct: toPct(fixedOff),
      holidayPct: toPct(holiday),
      unfilledPct: toPct(unfilled),
    };
  }, [absentCount, filledCount, fixedOffCount, holidayCount, presentCount, rows.length]);

  const openEditor = (t: Timesheet) => {
    const start = isoDateOnly(new Date(String(t.periodStart ?? "")));
    const end = isoDateOnly(new Date(String(t.periodEnd ?? "")));
    const dates = buildDateRangeDates(start, end);
    setRows(normalizeEntries(dates, (t as any)?.entries));
    setInternNote(String((t as any)?.internNote ?? ""));
    setEditingTimesheet(t);
    setEditorOpen(true);
  };

  const handleCreate = async () => {
    if (!storedUserId) return;
    if (!activeProposal) {
      toast({ title: "Select a proposal", description: "Choose a paid proposal to create a timesheet." });
      return;
    }

    if (!canCreateMoreTimesheetsForActiveProposal) {
      toast({
        title: "Not allowed",
        description: "A timesheet already exists for the selected month.",
        variant: "destructive",
      });
      return;
    }

    const monthEndIso = isoDateOnly(selectedMonthRange.end);
    const joiningIso = isoFromUnknownDate(activeProposal?.offerDetails?.startDate);

    if (joiningIso && joiningIso > monthEndIso) {
      toast({
        title: "Invalid month",
        description: "Selected month is before the joining date.",
        variant: "destructive",
      });
      return;
    }

    const start = dateFromIsoLocal(effectiveCreatePeriod.periodStartIso);
    const end = dateFromIsoLocal(effectiveCreatePeriod.periodEndIso);

    try {
      setSaving(true);
      const res = await apiRequest("POST", `/api/intern/${encodeURIComponent(storedUserId)}/timesheets`, {
        proposalId: activeProposal.id,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString(),
      });
      const json = await res.json().catch(() => null);
      const t = (json?.timesheet ?? null) as Timesheet | null;
      if (!t) throw new Error("Failed to create timesheet");

      toast({ title: "Timesheet created", description: "Now mark attendance and submit for approval." });
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["/api/intern/timesheets", storedUserId] });
      openEditor(t);
    } catch (e: any) {
      toast({ title: "Could not create", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTimesheet = async (t: Timesheet) => {
    if (!storedUserId) return;
    const tid = String(t?.id ?? "").trim();
    if (!tid) return;

    const status = String(t?.status ?? "draft").trim().toLowerCase();
    if (status !== "draft" && status !== "submitted") {
      toast({
        title: "Cannot delete",
        description: "Only draft/submitted timesheets can be deleted.",
        variant: "destructive",
      });
      return;
    }

    const ok = window.confirm("Delete this timesheet? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingId(tid);
      await apiRequest(
        "DELETE",
        `/api/intern/${encodeURIComponent(storedUserId)}/timesheets/${encodeURIComponent(tid)}`,
      );

      toast({ title: "Deleted", description: "Timesheet deleted." });

      if (String(editingTimesheet?.id ?? "") === tid) {
        setEditorOpen(false);
        setEditingTimesheet(null);
        setRows([]);
        setInternNote("");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/intern/timesheets", storedUserId] });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setDeletingId("");
    }
  };

  const handleSaveDraft = async () => {
    if (!storedUserId || !editingTimesheet) return;

    const status = String(editingTimesheet?.status ?? "").trim().toLowerCase();
    if (status !== "draft" && status !== "rejected") {
      toast({
        title: "Read-only",
        description: "Only draft/rejected timesheets can be edited.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      await apiRequest(
        "PUT",
        `/api/intern/${encodeURIComponent(storedUserId)}/timesheets/${encodeURIComponent(editingTimesheet.id)}`,
        { entries: rows, internNote: String(internNote ?? "") },
      );
      toast({ title: "Saved", description: "Draft saved." });
      await queryClient.invalidateQueries({ queryKey: ["/api/intern/timesheets", storedUserId] });
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!storedUserId || !editingTimesheet) return;

    const status = String(editingTimesheet?.status ?? "").trim().toLowerCase();
    if (status !== "draft" && status !== "rejected") {
      toast({
        title: "Read-only",
        description: "Only draft/rejected timesheets can be edited.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAnyEntry) {
      toast({
        title: "Timesheet incomplete",
        description: "Please mark attendance for all dates before submitting for approval.",
        variant: "destructive",
      });
      return;
    }

    if (!isFullyFilled) {
      toast({
        title: "Timesheet incomplete",
        description: "Every date must have a status (Present / Absent / Fixed off / Holiday) before sending for approval.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest(
        "PUT",
        `/api/intern/${encodeURIComponent(storedUserId)}/timesheets/${encodeURIComponent(editingTimesheet.id)}`,
        { entries: rows, internNote: String(internNote ?? "") },
      );

      await apiRequest(
        "POST",
        `/api/intern/${encodeURIComponent(storedUserId)}/timesheets/${encodeURIComponent(editingTimesheet.id)}/submit`,
      );

      toast({ title: "Sent for approval", description: "Your hiring manager has been notified." });
      setEditorOpen(false);
      setEditingTimesheet(null);
      setRows([]);
      setInternNote("");
      await queryClient.invalidateQueries({ queryKey: ["/api/intern/timesheets", storedUserId] });
    } catch (e: any) {
      toast({ title: "Submit failed", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const proposalHeader = useMemo(() => {
    if (!activeProposal) return null;
    const offer = (activeProposal.offerDetails ?? {}) as any;
    const companyName =
      String((activeProposal as any)?.employerCompanyName ?? "").trim() ||
      String((activeProposal as any)?.employerName ?? "").trim() ||
      "";
    const roleTitle = String(offer?.roleTitle ?? "").trim();
    const projectName = String((activeProposal as any)?.projectName ?? "").trim();
    return {
      title: roleTitle || projectName || "Paid proposal",
      companyName,
      roleTitle,
      projectName,
      startDate: String(offer?.startDate ?? "").trim(),
      duration: String(offer?.duration ?? "").trim(),
      timezone: String(offer?.timezone ?? "").trim(),
    };
  }, [activeProposal]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 pb-20 md:pb-0">
      <CandidateHeader />

      <div className="container px-3 sm:px-4 md:px-6 py-6 md:py-8 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#0E6049]">Timesheets</h1>
            <p className="text-sm text-muted-foreground">Create, fill and submit monthly timesheets.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setLocation("/dashboard")}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (!activeProposalId || hiredProposals.length === 0) return;
                if (!canCreateMoreTimesheetsForActiveProposal) {
                  toast({
                    title: "Not allowed",
                    description: "A timesheet already exists for the selected month.",
                    variant: "destructive",
                  });
                  return;
                }
                setCreateOpen(true);
              }}
              disabled={!activeProposalId || hiredProposals.length === 0}
              className="w-full sm:w-auto bg-[#0E6049] hover:bg-[#0b4b3a]"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              New timesheet
            </Button>
          </div>
        </div>

        <Card className="p-4 md:p-5 rounded-2xl border-slate-200 bg-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">Paid proposals</div>
              <div className="text-xs text-slate-600 mt-1">
                Only proposals with payment completed are shown here.
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-200 text-emerald-800 w-fit">
              {hiredProposals.length} active
            </Badge>
          </div>

          {(proposalsLoading || tsLoading) && (
            <div className="mt-4 text-sm text-slate-600">Loading...</div>
          )}

          {!proposalsLoading && proposalsError instanceof Error && (
            <div className="mt-4 text-sm text-red-600">{proposalsError.message}</div>
          )}

          {!tsLoading && tsError instanceof Error && (
            <div className="mt-2 text-sm text-red-600">{tsError.message}</div>
          )}

          {!proposalsLoading && !proposalsError && hiredProposals.length === 0 && (
            <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
              No paid proposals yet.
            </div>
          )}

          {!proposalsLoading && !proposalsError && hiredProposals.length > 0 && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2">
                {hiredProposals.map((p) => {
                  const offer = (p.offerDetails ?? {}) as any;
                  const companyName =
                    String((p as any)?.employerCompanyName ?? "").trim() ||
                    String((p as any)?.employerName ?? "").trim() ||
                    "";
                  const roleTitle = String(offer?.roleTitle ?? "").trim();
                  const projectName = String((p as any)?.projectName ?? "").trim();
                  const title = String(roleTitle || projectName || "Paid proposal").trim() || "Paid proposal";
                  const isActive = String(p.id) === String(activeProposalId);
                  const tCount = (timesheetsByProposalId.get(p.id) ?? []).length;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left rounded-xl border px-3 py-3 transition ${isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      onClick={() => setActiveProposalId(p.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{title}</div>
                          {companyName ? (
                            <div className="mt-0.5 text-xs text-slate-600 truncate">{companyName}</div>
                          ) : null}
                          {roleTitle || projectName ? (
                            <div className="mt-0.5 text-xs text-slate-600 truncate">
                              {roleTitle ? `Role: ${roleTitle}` : ""}
                              {projectName ? ` • Project: ${projectName}` : ""}
                            </div>
                          ) : null}
                          <div className="mt-1 text-xs text-slate-600">
                            {String(offer?.duration ?? "").trim() ? `Duration: ${String(offer?.duration ?? "").trim()}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">{tCount} sheet{tCount === 1 ? "" : "s"}</Badge>
                          <ChevronRight className={`h-4 w-4 ${isActive ? "text-emerald-700" : "text-slate-400"}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-2">
                {!activeProposal ? (
                  <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">Select a proposal.</div>
                ) : (
                  <Card className="p-4 md:p-5 rounded-2xl border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{proposalHeader?.title}</div>
                        {proposalHeader?.companyName ? (
                          <div className="mt-1 text-xs text-slate-600 truncate">{proposalHeader.companyName}</div>
                        ) : null}
                        {proposalHeader?.roleTitle || proposalHeader?.projectName ? (
                          <div className="mt-1 text-xs text-slate-600">
                            {proposalHeader?.roleTitle ? `Role: ${proposalHeader.roleTitle}` : ""}
                            {proposalHeader?.projectName ? ` • Project: ${proposalHeader.projectName}` : ""}
                          </div>
                        ) : null}
                        <div className="mt-1 text-xs text-slate-600">
                          {proposalHeader?.startDate ? `Start: ${proposalHeader.startDate}` : ""}
                          {proposalHeader?.duration ? ` • ${proposalHeader.duration}` : ""}
                        </div>
                      </div>
                      <Badge className="bg-emerald-600">Paid</Badge>
                    </div>

                    <Tabs defaultValue="timesheets" className="mt-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
                        <TabsTrigger value="how">How it works</TabsTrigger>
                      </TabsList>

                      <TabsContent value="timesheets" className="mt-4">
                        {(() => {
                          const list = timesheetsByProposalId.get(activeProposal.id) ?? [];
                          if (list.length === 0) {
                            return (
                              <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                                No timesheets created yet. Create your first weekly sheet.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {list.map((t) => {
                                const start = isoDateOnly(new Date(String(t.periodStart)));
                                const end = isoDateOnly(new Date(String(t.periodEnd)));
                                const status = String(t.status ?? "draft").toLowerCase();
                                const statusBadge =
                                  status === "approved"
                                    ? { label: "Approved", cls: "bg-emerald-600" }
                                    : status === "rejected"
                                      ? { label: "Rejected", cls: "bg-rose-600" }
                                      : status === "submitted"
                                        ? { label: "Submitted", cls: "bg-amber-600" }
                                        : { label: "Draft", cls: "bg-slate-700" };

                                return (
                                  <Card key={t.id} className="p-4 rounded-xl border-slate-200">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold text-slate-900">{start} → {end}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                          ID: {String(t.id).slice(0, 8)}
                                        </div>
                                        {String((t as any)?.internNote ?? "").trim() && (
                                          <div className="mt-2 text-xs text-slate-700 bg-slate-50 rounded-lg border p-2">
                                            Your note: {String((t as any).internNote)}
                                          </div>
                                        )}
                                        {String(t.managerNote ?? "").trim() && (
                                          <div className="mt-2 text-xs text-slate-700 bg-slate-50 rounded-lg border p-2">
                                            Manager note: {String(t.managerNote)}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={statusBadge.cls}>{statusBadge.label}</Badge>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            openEditor(t);
                                          }}
                                        >
                                          <Clock className="h-4 w-4 mr-2" />
                                          {status === "draft" || status === "rejected" ? "Edit" : "View"}
                                        </Button>

                                        {status === "draft" || status === "submitted" ? (
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={deletingId === String(t.id)}
                                            onClick={() => void handleDeleteTimesheet(t)}
                                          >
                                            Delete
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="how" className="mt-4">
                        <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
                          <div className="flex items-center gap-2 font-semibold text-slate-900">
                            <Sparkles className="h-4 w-4 text-emerald-700" />
                            Best practice
                          </div>
                          <div>1) Create monthly timesheet for the current month.</div>
                          <div>2) Mark your daily attendance (Present / Absent).</div>
                          <div>3) Save draft anytime. Send for approval only after the month ends.</div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </Card>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={(o) => setCreateOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create monthly timesheet</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-3">
              <div className="text-xs text-slate-600">Selected proposal</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {proposalHeader?.title || "—"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  max={monthStringFromDate(new Date())}
                  onChange={(e) => {
                    const v = String(e.target.value ?? "").trim();
                    if (!v) return;
                    setSelectedMonth(v);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Input
                  value={`${effectiveCreatePeriod.periodStartIso} → ${effectiveCreatePeriod.periodEndIso}`}
                  disabled
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !activeProposal} className="bg-[#0E6049] hover:bg-[#0b4b3a]">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingTimesheet(null);
            setRows([]);
            setInternNote("");
            setSaving(false);
            setSubmitting(false);
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Fill timesheet</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
              <Card className="p-4 rounded-2xl border-slate-200 bg-white lg:col-span-1">
                <div className="text-sm font-semibold text-slate-900">Summary</div>
                <div className="mt-2 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Present</span>
                    <span className="font-semibold">{presentCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Absent</span>
                    <span className="font-semibold">{absentCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fixed off</span>
                    <span className="font-semibold">{fixedOffCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Holiday</span>
                    <span className="font-semibold">{holidayCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Filled</span>
                    <span className="font-semibold">{filledCount}/{rows.length || 0}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border">
                    <div className="h-full flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${attendanceSegments.presentPct}%` }} />
                      <div className="h-full bg-rose-500" style={{ width: `${attendanceSegments.absentPct}%` }} />
                      <div className="h-full bg-amber-400" style={{ width: `${attendanceSegments.fixedOffPct}%` }} />
                      <div className="h-full bg-sky-400" style={{ width: `${attendanceSegments.holidayPct}%` }} />
                      <div className="h-full bg-slate-300" style={{ width: `${attendanceSegments.unfilledPct}%` }} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      Present
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500" />
                      Absent
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-400" />
                      Fixed off
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-400" />
                      Holiday
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-300" />
                      Not filled
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-slate-600 mb-1">Note for hiring manager (optional)</div>
                  <Input
                    value={internNote}
                    onChange={(e) => setInternNote(e.target.value)}
                    placeholder="Add a note"
                    disabled={editorIsReadOnly}
                  />
                </div>

                <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-xs text-slate-600">
                  Tip: Mark attendance day-wise and send for approval.
                </div>
              </Card>

              <Card className="p-4 rounded-2xl border-slate-200 bg-white lg:col-span-2 overflow-hidden flex flex-col">
                <div className="overflow-y-auto pr-2 max-h-[55vh]">
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px]">
                    <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-600 pb-2 border-b">
                      <div className="col-span-6">Date</div>
                    </div>

                    <div className="space-y-2">
                      {rows.map((r) => {
                        const day = new Date(`${r.date}T00:00:00`);
                        const label = day.toLocaleDateString(undefined, { weekday: "long" });

                        return (
                          <div key={r.date} className="grid grid-cols-2 gap-3 items-center py-1">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{r.date}</div>
                              <div className="text-xs text-slate-500">{label}</div>
                            </div>
                            <div className="flex justify-center">
                              <Select
                                value={r.status}
                                onValueChange={(v) => {
                                  const next = rows.map((x) => (x.date === r.date ? { ...x, status: v as any } : x));
                                  setRows(next);
                                }}
                                disabled={editorIsReadOnly}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present">Present</SelectItem>
                                  <SelectItem value="Absent">Absent</SelectItem>
                                  <SelectItem value="Fixed off">Fixed off</SelectItem>
                                  <SelectItem value="Holiday">Holiday</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    Save draft anytime. Submit when ready.
                  </div>

                  {!editorIsReadOnly ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={saving || submitting}
                      >
                        Save draft
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={saving || submitting || !editingTimesheet || !isFullyFilled}
                        className={`w-full sm:w-auto bg-[#0E6049] hover:bg-[#0b4b3a] ${!isFullyFilled ? "opacity-50 blur-[0.2px]" : ""}`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send for approval
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditorOpen(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
