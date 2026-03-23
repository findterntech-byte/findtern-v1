import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { EmployerHeader } from "@/components/employer/EmployerHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEmployerAuth } from "@/lib/employerAuth";
import { apiRequest } from "@/lib/queryClient";

function isoDateOnly(v: unknown) {
  const raw = String(v ?? "").trim();
  const isoPart = raw.length >= 10 ? raw.slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) return isoPart;

  const d = v instanceof Date ? v : new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDateRange(start: string, end: string) {
  const out: string[] = [];
  const s = String(start ?? "").slice(0, 10);
  const e = String(end ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return out;

  const startDt = new Date(`${s}T00:00:00`);
  const endDt = new Date(`${e}T00:00:00`);
  if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) return out;

  const cur = new Date(startDt);
  let guard = 0;
  while (guard < 370) {
    out.push(isoDateOnly(cur));
    if (isoDateOnly(cur) === isoDateOnly(endDt)) break;
    cur.setDate(cur.getDate() + 1);
    guard += 1;
  }
  return out;
}

function exportTimesheetXlsx(timesheet: any) {
  if (!timesheet) return;

  const periodStart = isoDateOnly(timesheet?.periodStart);
  const periodEnd = isoDateOnly(timesheet?.periodEnd);
  const entries = Array.isArray(timesheet?.entries) ? timesheet.entries : [];
  const byDate = new Map<string, string>();
  for (const e of entries) {
    const d = String(e?.date ?? "").slice(0, 10);
    const st = String(e?.status ?? "").trim();
    if (!d) continue;
    byDate.set(d, st);
  }
  const dates = periodStart && periodEnd ? buildDateRange(periodStart, periodEnd) : Array.from(byDate.keys());
  const sorted = dates.slice().sort();

  let presentCount = 0;
  let absentCount = 0;
  let fixedOffCount = 0;
  let holidayCount = 0;
  let unfilledCount = 0;
  for (const d of sorted) {
    const st = String(byDate.get(d) ?? "").trim();
    if (!st) {
      unfilledCount += 1;
    } else if (st === "Present") {
      presentCount += 1;
    } else if (st === "Absent") {
      absentCount += 1;
    } else if (st === "Fixed off") {
      fixedOffCount += 1;
    } else if (st === "Holiday") {
      holidayCount += 1;
    }
  }

  const candidate = String(timesheet?.internName ?? "").trim();
  const project = String(timesheet?.projectName ?? "").trim();
  const statusLabel = String(timesheet?.status ?? "").toUpperCase();
  const internNote = String(timesheet?.internNote ?? "");
  const managerNote = String(timesheet?.managerNote ?? "");

  const summaryAoA = [
    ["Intern", candidate],
    ["Project", project],
    ["Period Start", periodStart],
    ["Period End", periodEnd],
    ["Status", statusLabel],
    ["Present", presentCount],
    ["Absent", absentCount],
    ["Fixed off", fixedOffCount],
    ["Holiday", holidayCount],
    ["Not filled", unfilledCount],
    ["Intern note", internNote],
    ["Manager note", managerNote],
  ];

  const attendanceAoA: any[][] = [["Date", "Attendance"]];
  for (const d of sorted) {
    attendanceAoA.push([d, String(byDate.get(d) ?? "").trim()]);
  }

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceAoA);

  (wsSummary as any)["!cols"] = [{ wch: 16 }, { wch: 56 }];
  (wsAttendance as any)["!cols"] = [{ wch: 14 }, { wch: 16 }];

  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
  XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeId = String(timesheet?.id ?? "timesheet").slice(0, 8);
  a.download = `timesheet_${safeId}_${periodStart || "period"}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function EmployerTimesheetDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/employer/timesheets/:id");

  const queryClient = useQueryClient();

  const auth = getEmployerAuth();
  const employerId = String(auth?.id ?? "").trim();
  const timesheetId = String(params?.id ?? "").trim();

  const [managerNote, setManagerNote] = useState<string>("");
  const [decisionBusy, setDecisionBusy] = useState<string>("");
  const [decisionError, setDecisionError] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/employer/timesheet", employerId, timesheetId],
    enabled: !!employerId && !!timesheetId,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/employer/${encodeURIComponent(employerId)}/timesheets/${encodeURIComponent(timesheetId)}`,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const message = String(json?.message ?? "Failed to fetch timesheet");
        throw new Error(message);
      }
      return json;
    },
  });

  const timesheet = data?.timesheet ?? null;

  const projectName = String(timesheet?.projectName ?? "").trim();

  const periodStart = isoDateOnly(timesheet?.periodStart);
  const periodEnd = isoDateOnly(timesheet?.periodEnd);

  const normalizedRows = useMemo(() => {
    const entries = Array.isArray(timesheet?.entries) ? timesheet.entries : [];
    const byDate = new Map<string, string>();
    for (const e of entries) {
      const d = String(e?.date ?? "").slice(0, 10);
      const st = String(e?.status ?? "").trim();
      if (!d) continue;
      byDate.set(d, st);
    }

    const dates = periodStart && periodEnd ? buildDateRange(periodStart, periodEnd) : Array.from(byDate.keys());
    const sorted = dates.slice().sort();

    return sorted.map((d) => ({
      date: d,
      status: String(byDate.get(d) ?? "").trim(),
    }));
  }, [periodEnd, periodStart, timesheet?.entries]);

  const visibleRows = useMemo(() => {
    const rows = Array.isArray(normalizedRows) ? normalizedRows : [];
    if (rows.length === 0) return rows;

    let startIdx = 0;
    while (startIdx < rows.length && !String(rows[startIdx]?.status ?? "").trim()) startIdx += 1;

    let endIdx = rows.length - 1;
    while (endIdx >= startIdx && !String(rows[endIdx]?.status ?? "").trim()) endIdx -= 1;

    if (startIdx > endIdx) return [];
    return rows.slice(startIdx, endIdx + 1);
  }, [normalizedRows]);

  const displayPeriodStart = useMemo(() => {
    const first = visibleRows[0]?.date ? String(visibleRows[0].date).slice(0, 10) : "";
    return first || periodStart;
  }, [periodStart, visibleRows]);

  const displayPeriodEnd = useMemo(() => {
    const last = visibleRows.length ? String(visibleRows[visibleRows.length - 1]?.date ?? "").slice(0, 10) : "";
    return last || periodEnd;
  }, [periodEnd, visibleRows]);

  const presentCount = useMemo(
    () => visibleRows.reduce((acc, r) => acc + (r.status === "Present" ? 1 : 0), 0),
    [visibleRows],
  );
  const absentCount = useMemo(
    () => visibleRows.reduce((acc, r) => acc + (r.status === "Absent" ? 1 : 0), 0),
    [visibleRows],
  );
  const fixedOffCount = useMemo(
    () => visibleRows.reduce((acc, r) => acc + (r.status === "Fixed off" ? 1 : 0), 0),
    [visibleRows],
  );
  const holidayCount = useMemo(
    () => visibleRows.reduce((acc, r) => acc + (r.status === "Holiday" ? 1 : 0), 0),
    [visibleRows],
  );
  const filledCount = useMemo(
    () => visibleRows.reduce((acc, r) => acc + (r.status ? 1 : 0), 0),
    [visibleRows],
  );

  const attendanceSegments = useMemo(() => {
    const total = Math.max(0, visibleRows.length);
    if (!total) {
      return {
        total: 0,
        presentPct: 0,
        absentPct: 0,
        fixedOffPct: 0,
        holidayPct: 0,
        unfilledPct: 0,
      };
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
  }, [absentCount, filledCount, fixedOffCount, holidayCount, presentCount, visibleRows.length]);

  const presentPctLabel = useMemo(() => {
    if (!attendanceSegments.total) return "0%";
    return `${Math.round(attendanceSegments.presentPct)}%`;
  }, [attendanceSegments.presentPct, attendanceSegments.total]);

  const absentPctLabel = useMemo(() => {
    if (!attendanceSegments.total) return "0%";
    return `${Math.round(attendanceSegments.absentPct)}%`;
  }, [attendanceSegments.absentPct, attendanceSegments.total]);

  const fixedOffPctLabel = useMemo(() => {
    if (!attendanceSegments.total) return "0%";
    return `${Math.round(attendanceSegments.fixedOffPct)}%`;
  }, [attendanceSegments.fixedOffPct, attendanceSegments.total]);

  const holidayPctLabel = useMemo(() => {
    if (!attendanceSegments.total) return "0%";
    return `${Math.round(attendanceSegments.holidayPct)}%`;
  }, [attendanceSegments.holidayPct, attendanceSegments.total]);

  const attendanceBar = useMemo(() => {
    const rows = Array.isArray(visibleRows) ? visibleRows : [];
    const n = rows.length;

    const barW = 10;
    const gap = 2;
    const padX = 10;
    const padTop = 10;
    const padBottom = 16;
    const barH = 22;

    const width = Math.max(360, padX * 2 + Math.max(0, n * (barW + gap) - gap));
    const height = padTop + barH + padBottom;

    const pick = (status: string) => {
      const s = String(status ?? "").trim();
      if (s === "Present") return { fill: "#10b981", label: "P" };
      if (s === "Absent") return { fill: "#f43f5e", label: "A" };
      if (s === "Fixed off") return { fill: "#fbbf24", label: "F" };
      if (s === "Holiday") return { fill: "#38bdf8", label: "H" };
      return { fill: "#cbd5e1", label: "" };
    };

    const dayLabel = (iso: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
      return iso.slice(8, 10);
    };

    const monthLabel = (iso: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
      const dt = new Date(`${iso}T00:00:00`);
      if (Number.isNaN(dt.getTime())) return "";
      return dt.toLocaleString(undefined, { month: "short" });
    };

    const monthMarkers: { x: number; label: string }[] = [];
    let lastMonth = "";

    const bars = rows.map((r, i) => {
      const x = padX + i * (barW + gap);
      const y = padTop;
      const meta = pick(String(r?.status ?? ""));
      const d = String(r?.date ?? "").slice(0, 10);

      const m = d ? d.slice(0, 7) : "";
      if (m && m !== lastMonth) {
        lastMonth = m;
        const label = monthLabel(d);
        if (label) monthMarkers.push({ x, label });
      }

      const showDay = i === 0 || i === n - 1 || (n <= 31 ? i % 2 === 0 : i % 5 === 0);
      return {
        x,
        y,
        w: barW,
        h: barH,
        fill: meta.fill,
        label: meta.label,
        date: d,
        dayText: showDay ? dayLabel(d) : "",
      };
    });

    return {
      width,
      height,
      bars,
      monthMarkers,
      barH,
      padTop,
    };
  }, [visibleRows]);

  const canDecide = useMemo(() => {
    const s = String(timesheet?.status ?? "").trim().toLowerCase();
    return s === "submitted";
  }, [timesheet?.status]);

  const decide = async (action: "approve" | "reject") => {
    if (!employerId || !timesheetId) return;

    try {
      setDecisionBusy(action);
      setDecisionError("");
      const note = String(managerNote ?? "").trim();
      await apiRequest(
        "POST",
        `/api/employer/${encodeURIComponent(employerId)}/timesheets/${encodeURIComponent(timesheetId)}/${action}`,
        note ? { managerNote: note } : {},
      );
      await queryClient.invalidateQueries({
        queryKey: ["/api/employer/timesheet", employerId, timesheetId],
      });
    } catch (e) {
      setDecisionError((e as any)?.message || "Failed to update timesheet");
    } finally {
      setDecisionBusy("");
    }
  };

  const statusBadge = useMemo(() => {
    const status = String(timesheet?.status ?? "").trim().toLowerCase();
    if (status === "approved") return { label: "Approved", cls: "bg-emerald-600" };
    if (status === "rejected") return { label: "Rejected", cls: "bg-rose-600" };
    if (status === "submitted") return { label: "Submitted", cls: "bg-amber-600" };
    return { label: status ? status.toUpperCase() : "Draft", cls: "bg-slate-700" };
  }, [timesheet?.status]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <EmployerHeader active="none" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-full"
                onClick={() => setLocation("/employer/orders")}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>

            <h1 className="mt-4 text-xl font-semibold text-slate-900">Timesheet details</h1>
            
            <div className="mt-1 text-sm text-slate-600">
              {String(timesheet?.internName ?? "").trim() || "Intern"}
              {projectName ? ` • ${projectName}` : ""}
              {displayPeriodStart && displayPeriodEnd ? ` • ${displayPeriodStart} → ${displayPeriodEnd}` : ""}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge className={statusBadge.cls}>{statusBadge.label}</Badge>
            <Button
              variant="outline"
              className="h-9 rounded-full"
              onClick={() => exportTimesheetXlsx(timesheet)}
              disabled={!timesheet}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="mt-6 p-6 rounded-2xl border-slate-200 bg-white">
            <div className="text-sm text-slate-600">Loading…</div>
          </Card>
        ) : error ? (
          <Card className="mt-6 p-6 rounded-2xl border-slate-200 bg-white">
            <div className="text-sm text-rose-700">{(error as any)?.message || "Failed to load"}</div>
          </Card>
        ) : !timesheetId || !employerId ? (
          <Card className="mt-6 p-6 rounded-2xl border-slate-200 bg-white">
            <div className="text-sm text-slate-600">Invalid request.</div>
          </Card>
        ) : !timesheet ? (
          <Card className="mt-6 p-6 rounded-2xl border-slate-200 bg-white">
            <div className="text-sm text-slate-600">Timesheet not found.</div>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
              {(String(timesheet?.internNote ?? "").trim() || String(timesheet?.managerNote ?? "").trim()) && (
              <Card className="p-4 rounded-2xl border-slate-200 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {String(timesheet?.internNote ?? "").trim() ? (
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">Intern note</div>
                      <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap break-words">
                        {String(timesheet?.internNote ?? "")}
                      </div>
                    </div>
                  ) : null}
                  {String(timesheet?.managerNote ?? "").trim() ? (
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-600">Manager note</div>
                      <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap break-words">
                        {String(timesheet?.managerNote ?? "")}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
            )}
            {canDecide ? (
              <Card className="p-4 rounded-2xl border-slate-200 bg-white">
                <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">Manager decision</div>
                    <div className="mt-1 text-xs text-slate-600">Add a note (optional) then approve or reject.</div>
                    <div className="mt-3">
                      <Textarea
                        value={managerNote}
                        onChange={(e) => setManagerNote(e.target.value)}
                        placeholder="Add manager note"
                      />
                    </div>
                    {decisionError ? <div className="mt-2 text-xs text-rose-600">{decisionError}</div> : null}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-full"
                      disabled={decisionBusy === "approve" || decisionBusy === "reject"}
                      onClick={() => void decide("reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      className="h-9 rounded-full bg-emerald-600 hover:bg-emerald-700"
                      disabled={decisionBusy === "approve" || decisionBusy === "reject"}
                      onClick={() => void decide("approve")}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-4 rounded-2xl border-slate-200 bg-white">
                <div className="text-xs text-slate-500">Present</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{presentCount}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-slate-200 bg-white">
                <div className="text-xs text-slate-500">Absent</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{absentCount}</div>
              </Card>
              <Card className="p-4 rounded-2xl border-slate-200 bg-white">
                <div className="text-xs text-slate-500">Filled</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{filledCount}/{visibleRows.length}</div>
              </Card>
            </div>

            <Card className="p-4 rounded-2xl border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Attendance graph</p>
                  <p className="text-xs text-slate-500 truncate">
                    {displayPeriodStart && displayPeriodEnd ? `${displayPeriodStart} → ${displayPeriodEnd}` : ""}
                  </p>
                </div>
                <p className="text-xs text-slate-500 text-right">
                  {attendanceSegments.total ? `${attendanceSegments.total} days` : "—"}
                  {attendanceSegments.total ? ` • Present ${presentPctLabel} • Absent ${absentPctLabel} • Fixed off ${fixedOffPctLabel} • Holiday ${holidayPctLabel}` : ""}
                </p>
              </div>

              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100 border">
                <div className="h-full flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${attendanceSegments.presentPct}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${attendanceSegments.absentPct}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${attendanceSegments.fixedOffPct}%` }} />
                  <div className="h-full bg-sky-400" style={{ width: `${attendanceSegments.holidayPct}%` }} />
                  <div className="h-full bg-slate-300" style={{ width: `${attendanceSegments.unfilledPct}%` }} />
                </div>
              </div>

              <div className="mt-3 rounded-xl border bg-white p-3">
                <div className="text-xs text-slate-600 mb-2">Daily bar (month/date)</div>
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${attendanceBar.width} ${attendanceBar.height}`}
                    width={attendanceBar.width}
                    height={attendanceBar.height}
                    className="min-w-full"
                  >
                    {attendanceBar.monthMarkers.map((m, idx) => (
                      <text key={`${m.label}-${idx}`} x={m.x} y={10} fontSize="10" fill="#64748b">
                        {m.label}
                      </text>
                    ))}

                    {attendanceBar.bars.map((b, idx) => (
                      <g key={`${b.date}-${idx}`}>
                        <rect x={b.x} y={attendanceBar.padTop} width={b.w} height={b.h} rx={3} fill={b.fill} />
                        {b.dayText ? (
                          <text
                            x={b.x + b.w / 2}
                            y={attendanceBar.padTop + b.h + 12}
                            fontSize="10"
                            fill="#64748b"
                            textAnchor="middle"
                          >
                            {b.dayText}
                          </text>
                        ) : null}
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
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

              {(() => {
                const rows = visibleRows;
                const n = rows.length;
                const width = 740;
                const height = 200;
                const padX = 26;
                const padY = 18;
                const innerW = Math.max(1, width - padX * 2);
                const innerH = Math.max(1, height - padY * 2);

                const cumPresent: number[] = [];
                const cumAbsent: number[] = [];
                const cumFixedOff: number[] = [];
                const cumHoliday: number[] = [];
                let pAcc = 0;
                let aAcc = 0;
                let fAcc = 0;
                let hAcc = 0;
                for (let i = 0; i < n; i += 1) {
                  const st = String(rows[i]?.status ?? "");
                  if (st === "Present") pAcc += 1;
                  if (st === "Absent") aAcc += 1;
                  if (st === "Fixed off") fAcc += 1;
                  if (st === "Holiday") hAcc += 1;
                  cumPresent.push(pAcc);
                  cumAbsent.push(aAcc);
                  cumFixedOff.push(fAcc);
                  cumHoliday.push(hAcc);
                }

                const maxY = Math.max(1, ...cumPresent, ...cumAbsent, ...cumFixedOff, ...cumHoliday);
                const toPts = (arr: number[]) =>
                  arr
                    .map((v, i) => {
                      const x = padX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
                      const y = padY + (1 - v / maxY) * innerH;
                      return `${x.toFixed(2)},${y.toFixed(2)}`;
                    })
                    .join(" ");

                const ptsP = toPts(cumPresent);
                const ptsA = toPts(cumAbsent);
                const ptsF = toPts(cumFixedOff);
                const ptsH = toPts(cumHoliday);
                const labelEvery = n <= 31 ? 2 : 5;

                return (
                  <div className="mt-3 rounded-xl border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">Cumulative (line)</div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
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
                      </div>
                    </div>
                    <div className="mt-2 w-full overflow-x-auto">
                      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="min-w-full">
                        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#e2e8f0" strokeWidth="1" />
                        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#e2e8f0" strokeWidth="1" />

                        {ptsP ? (
                          <polyline
                            points={ptsP}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ) : null}
                        {ptsA ? (
                          <polyline
                            points={ptsA}
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ) : null}

                        {ptsF ? (
                          <polyline
                            points={ptsF}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ) : null}

                        {ptsH ? (
                          <polyline
                            points={ptsH}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                        ) : null}

                        {rows.map((r, i) => {
                          if (i % labelEvery !== 0 && i !== n - 1) return null;
                          const d = String(r?.date ?? "").slice(8, 10);
                          const x = padX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
                          return (
                            <text key={`${String(r?.date ?? "")}-${i}`} x={x} y={height - 4} fontSize="10" fill="#64748b" textAnchor="middle">
                              {d}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  </div>
                );
              })()}
            </Card>

          

            <Card className="rounded-2xl border-slate-200 bg-white overflow-hidden">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead className="w-[160px]">Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((r) => {
                    const st = r.status || "—";
                    const pillCls =
                      st === "Present"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : st === "Absent"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : st === "Fixed off"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : st === "Holiday"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-slate-50 text-slate-700 border-slate-200";

                    return (
                      <TableRow key={`${String(timesheet?.id ?? "")}::${r.date}`}>
                        <TableCell className="text-xs font-medium text-slate-900">{r.date}</TableCell>
                        <TableCell className="text-xs">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${pillCls}`}>{st}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
