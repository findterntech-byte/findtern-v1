import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Receipt,
  ArrowLeft,
  ExternalLink,
  ClipboardList,
  CalendarDays,
  CreditCard,
  Download,
  Search,
  FileText,
  FileImage,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import newlogo from '@assets/logo-remove.png';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { EmployerHeader } from "@/components/employer/EmployerHeader";

import { getEmployerAuth } from "@/lib/employerAuth";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import cityStatePincode from "@/data/cityStatePincode.json";
import { timezones } from "@shared/schema";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function EmployerOrdersPage() {
  const [, setLocation] = useLocation();

  const { toast } = useToast();

  const auth = getEmployerAuth();
  const employerId = auth?.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [paidOrders, setPaidOrders] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [activeTab, setActiveTab] = useState<string>("orders");

  const [hiresLoading, setHiresLoading] = useState(false);
  const [hiresError, setHiresError] = useState<string>("");
  const [hiredProposals, setHiredProposals] = useState<any[]>([]);
  const [employerProposals, setEmployerProposals] = useState<any[]>([]);

  const [hireSearch, setHireSearch] = useState<string>("");
  const [hireProject, setHireProject] = useState<string>("");
  const [hireCurrency, setHireCurrency] = useState<string>("");
  const [hireFrom, setHireFrom] = useState<string>("");
  const [hireTo, setHireTo] = useState<string>("");

  const [upcomingCurrency, setUpcomingCurrency] = useState<string>("");
  const [upcomingPayStatus, setUpcomingPayStatus] = useState<"" | "partially_paid" | "fully_paid">("");
  const [upcomingFrom, setUpcomingFrom] = useState<string>("");
  const [upcomingTo, setUpcomingTo] = useState<string>("");

  const [tsOpen, setTsOpen] = useState(false);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsError, setTsError] = useState<string>("");
  const [tsRows, setTsRows] = useState<any[]>([]);
  const [tsSelectedProposal, setTsSelectedProposal] = useState<any | null>(null);
  const [decisionNote, setDecisionNote] = useState<string>("");
  const [decisionBusyId, setDecisionBusyId] = useState<string>("");

  const [status, setStatus] = useState<string>("");
  const [currency, setCurrency] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [orderCandidate, setOrderCandidate] = useState<string>("");
  const [orderProject, setOrderProject] = useState<string>("");

  const [ordersRefreshKey, setOrdersRefreshKey] = useState<number>(0);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string>("");
  const [invoiceData, setInvoiceData] = useState<any | null>(null);

  const invoicePrintRef = useRef<HTMLDivElement | null>(null);

  const [payingProposalId, setPayingProposalId] = useState<string>("");

  const [ftOpen, setFtOpen] = useState(false);
  const [ftBusy, setFtBusy] = useState(false);
  const [ftError, setFtError] = useState<string>("");
  const [ftSelectedProposal, setFtSelectedProposal] = useState<any | null>(null);

  const [ftJobTitle, setFtJobTitle] = useState<string>("");
  const [ftOfferLetter, setFtOfferLetter] = useState<File | null>(null);
  const [ftOfferLetterPreviewUrl, setFtOfferLetterPreviewUrl] = useState<string>("");
  const [ftJobMode, setFtJobMode] = useState<string>("remote");

  const [fullTimeOfferSentKeys, setFullTimeOfferSentKeys] = useState<Set<string>>(() => new Set());
  const [fullTimeOfferSentInternIds, setFullTimeOfferSentInternIds] = useState<Set<string>>(() => new Set());

  const [ftLocationState, setFtLocationState] = useState<string>("");
  const [ftLocationCity, setFtLocationCity] = useState<string>("");
  const [ftCityPopoverOpen, setFtCityPopoverOpen] = useState(false);
  const [ftCitySearch, setFtCitySearch] = useState("");
  const [ftManualLocation, setFtManualLocation] = useState(false);
  const [ftTimezone, setFtTimezone] = useState<string>("Asia/Kolkata");
  const [ftShiftFrom, setFtShiftFrom] = useState<string>("09:00");
  const [ftShiftTo, setFtShiftTo] = useState<string>("18:00");
  const [ftCtcCurrency, setFtCtcCurrency] = useState<string>("INR");
  const [ftCtcAmount, setFtCtcAmount] = useState<string>("");
  const [usdInfoOpen, setUsdInfoOpen] = useState(false);
  const [usdInfoCountdown, setUsdInfoCountdown] = useState<number>(0);
  const [usdInfoAck, setUsdInfoAck] = useState(false);

  const ftAutoOpenedRef = useRef(false);

  const [internationalFteStatus, setInternationalFteStatus] = useState<string>("none");

  const ftOfferLetterInputRef = useRef<HTMLInputElement | null>(null);

  const isAllowedOfferLetter = (f: File) => {
    const name = String(f?.name ?? "").toLowerCase();
    const type = String(f?.type ?? "").toLowerCase();
    if (type === "application/pdf") return true;
    if (type === "image/png" || type === "image/jpeg") return true;
    if (name.endsWith(".pdf")) return true;
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")) return true;
    return false;
  };

  useEffect(() => {
    if (!ftOfferLetter) {
      setFtOfferLetterPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(ftOfferLetter);
    setFtOfferLetterPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [ftOfferLetter]);

  useEffect(() => {
    if (!usdInfoOpen) {
      setUsdInfoCountdown(0);
      setUsdInfoAck(false);
      return;
    }

    setUsdInfoCountdown(10);
    setUsdInfoAck(false);
    const id = window.setInterval(() => {
      setUsdInfoCountdown((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => {
      window.clearInterval(id);
    };
  }, [usdInfoOpen]);

  useEffect(() => {
    if (!employerId) {
      setInternationalFteStatus("none");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(String(employerId))}`);
        const json = await res.json().catch(() => null);
        const s = String(json?.employer?.internationalFteStatus ?? "none");
        if (!cancelled) setInternationalFteStatus(s);
      } catch {
        if (!cancelled) setInternationalFteStatus("none");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId]);

  useEffect(() => {
    if (!ftOpen) return;
    if (ftManualLocation) return;
    const mode = String(ftJobMode ?? "").trim().toLowerCase();
    if (mode !== "onsite" && mode !== "hybrid") return;
    if (String(ftLocationCity ?? "").trim() !== "") return;
    setFtCityPopoverOpen(true);
  }, [ftJobMode, ftLocationCity, ftManualLocation, ftOpen]);

  const indiaStates = useMemo(
    () =>
      [
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Andaman and Nicobar Islands",
        "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu",
        "Delhi",
        "Jammu and Kashmir",
        "Ladakh",
        "Lakshadweep",
        "Puducherry",
      ].slice(),
    [],
  );

  const indiaCityStateOptions = useMemo(() => {
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

    out.sort((a, b) => `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`));
    return out;
  }, []);

  const oneTimeFeeLabel = useMemo(() => {
    const cur = String(ftCtcCurrency).toUpperCase();
    if (cur !== "INR" && cur !== "USD") return "";
    const amt = Number(ftCtcAmount);
    if (!Number.isFinite(amt) || amt <= 0) return "";
    const fee = (amt * 8.33) / 100;
    const locale = cur === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(fee);
  }, [ftCtcAmount, ftCtcCurrency]);

  const submitFullTimeOffer = async () => {
    if (!employerId) return;
    if (!ftSelectedProposal) return;
    if (ftBusy) return;

    const jobTitle = String(ftJobTitle ?? "").trim();
    const mode = String(ftJobMode ?? "").trim().toLowerCase();
    const timezone = String(ftTimezone ?? "").trim();
    const shiftFrom = String(ftShiftFrom ?? "").trim();
    const shiftTo = String(ftShiftTo ?? "").trim();
    const currency = String(ftCtcCurrency ?? "INR").trim().toUpperCase();
    const ctcAmount = Number(ftCtcAmount);

    const needsLocation = mode === "onsite" || mode === "hybrid";
    const state = String(ftLocationState ?? "").trim();
    const city = String(ftLocationCity ?? "").trim();

    if (!jobTitle) {
      setFtError("Job title is required");
      return;
    }
    if (!ftOfferLetter) {
      setFtError("Offer letter attachment is required");
      return;
    }
    if (mode !== "remote" && mode !== "hybrid" && mode !== "onsite") {
      setFtError("Please select a valid job mode");
      return;
    }
    if (needsLocation) {
      if (!state) {
        setFtError("State is required for onsite/hybrid roles");
        return;
      }
      if (!indiaStates.some((s) => s.toLowerCase() === state.toLowerCase())) {
        setFtError("Only Indian locations are allowed");
        return;
      }
      if (!city) {
        setFtError("City is required for onsite/hybrid roles");
        return;
      }
    }
    if (!timezone) {
      setFtError("Timezone is required");
      return;
    }
    if (!shiftFrom || !shiftTo) {
      setFtError("Shift timings are required");
      return;
    }
    if (currency !== "INR" && currency !== "USD") {
      setFtError("Please select a valid currency");
      return;
    }
    if (!Number.isFinite(ctcAmount) || ctcAmount <= 0) {
      setFtError("Annual CTC amount must be greater than 0");
      return;
    }

    const ifteApproved = String(internationalFteStatus ?? "none").trim().toLowerCase() === "approved";
    if (currency === "USD" && !ifteApproved) {
      setUsdInfoOpen(true);
      setFtError("USD is disabled until admin approves International FTE");
      return;
    }

    try {
      setFtBusy(true);
      setFtError("");

      const proposalId = String(ftSelectedProposal?.id ?? "").trim();
      const internId = String(ftSelectedProposal?.internId ?? "").trim();

      const fd = new FormData();
      fd.set("proposalId", proposalId);
      fd.set("internId", internId);
      fd.set("jobTitle", jobTitle);
      fd.set("jobMode", mode);
      fd.set("jobLocationState", needsLocation ? state : "");
      fd.set("jobLocationCity", needsLocation ? city : "");
      fd.set("timezone", timezone);
      fd.set("shiftFrom", shiftFrom);
      fd.set("shiftTo", shiftTo);
      fd.set("ctcCurrency", currency);
      fd.set("annualCtc", String(ctcAmount));
      fd.set("offerLetter", ftOfferLetter);

      const res = await apiRequestFormData(
        "POST",
        `/api/employer/${encodeURIComponent(String(employerId))}/full-time-offer`,
        fd,
      );

      const json = await res.json().catch(() => null);
      const createdProposalId = String(json?.proposalId ?? "").trim();

      try {
        const key = internProjectKey(ftSelectedProposal);
        const id = String(ftSelectedProposal?.internId ?? ftSelectedProposal?.intern_id ?? "").trim();
        setFullTimeOfferSentKeys((prev) => {
          const next = new Set<string>(Array.from(prev ?? []));
          if (key) next.add(key);
          return next;
        });
        if (id) {
          setFullTimeOfferSentInternIds((prev) => {
            const next = new Set<string>(Array.from(prev ?? []));
            next.add(id);
            return next;
          });
        }
      } catch {
        // ignore
      }

      toast({
        title: "Proposal sent",
        description: "Your full-time hiring proposal has been submitted.",
      });
      setFtOpen(false);
      setLocation(`/employer/proposals/${encodeURIComponent(createdProposalId || proposalId)}`);
    } catch (e: any) {
      setFtError(e?.message || "Failed to submit proposal");
      toast({
        title: "Failed",
        description: e?.message || "Failed to submit proposal",
        variant: "destructive",
      });
    } finally {
      setFtBusy(false);
    }
  };

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

  const payUpcomingMonthly = async (proposal: any) => {
    if (!employerId) {
      toast({
        title: "Please login",
        description: "You need to be logged in to pay.",
        variant: "destructive",
      });
      setLocation("/employer/login");
      return;
    }

    const proposalId = String(proposal?.id ?? "").trim();
    if (!proposalId) return;
    if (payingProposalId) return;

    try {
      setPayingProposalId(proposalId);

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment gateway");

      const orderRes = await apiRequest(
        "POST",
        `/api/employer/${encodeURIComponent(String(employerId))}/payment/razorpay/monthly-order`,
        { proposalId },
      );
      const orderJson = await orderRes.json().catch(() => null);

      const keyId = String(orderJson?.keyId ?? "");
      const orderId = String(orderJson?.orderId ?? "");
      const amountMinor = Number(orderJson?.amountMinor ?? 0);
      const currency = String(orderJson?.currency ?? "INR");
      if (!keyId || !orderId || !Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new Error(orderJson?.message || "Invalid payment order response");
      }

      await new Promise<void>((resolve, reject) => {
        const RazorpayCtor = (window as any).Razorpay;
        if (!RazorpayCtor) {
          reject(new Error("Payment gateway unavailable"));
          return;
        }

        const options: any = {
          key: keyId,
          amount: amountMinor,
          currency,
          name: "Findtern",
          description: "Monthly payment",
          order_id: orderId,
          handler: async (response: any) => {
            try {
              await apiRequest(
                "POST",
                `/api/employer/${encodeURIComponent(String(employerId))}/payment/razorpay/monthly-verify`,
                response,
              );
              resolve();
            } catch (e) {
              reject(e instanceof Error ? e : new Error("Payment verification failed"));
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
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

      toast({ title: "Payment successful", description: "Monthly payment completed." });
      setActiveTab("payments");
      setOrdersRefreshKey((v) => v + 1);
    } catch (e: any) {
      toast({
        title: "Payment not completed",
        description: e?.message || "Payment failed",
        variant: "destructive",
      });
    } finally {
      setPayingProposalId("");
    }
  };

  const isoDateOnly = (v: unknown) => {
    const raw = String(v ?? "").trim();
    const isoPart = raw.length >= 10 ? raw.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) return isoPart;

    const d = v instanceof Date ? v : new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const buildDateRange = (start: string, end: string) => {
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
  };

  const exportTimesheetXlsx = (t: any) => {
    if (!t) return;

    const periodStart = isoDateOnly(t?.periodStart);
    const periodEnd = isoDateOnly(t?.periodEnd);
    const entries = Array.isArray(t?.entries) ? t.entries : [];
    const byDate = new Map<string, string>();
    for (const e of entries) {
      const d = String(e?.date ?? "").slice(0, 10);
      const st = String(e?.status ?? "").trim();
      if (!d) continue;
      byDate.set(d, st);
    }
    const dates = periodStart && periodEnd ? buildDateRange(periodStart, periodEnd) : Array.from(byDate.keys());
    const sorted = dates.slice().sort();

    const candidate = String(t?.internName ?? "").trim();
    const project = String(t?.projectName ?? "").trim();
    const statusLabel = String(t?.status ?? "").toUpperCase();
    const internNote = String(t?.internNote ?? "");
    const managerNote = String(t?.managerNote ?? "");

    const summaryAoA = [
      ["Intern", candidate],
      ["Project", project],
      ["Period Start", periodStart],
      ["Period End", periodEnd],
      ["Status", statusLabel],
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

    (wsSummary as any)["!cols"] = [{ wch: 16 }, { wch: 48 }];
    (wsAttendance as any)["!cols"] = [{ wch: 14 }, { wch: 14 }];

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeId = String(t?.id ?? "timesheet").slice(0, 8);
    a.download = `timesheet_${safeId}_${periodStart || "period"}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (currency) params.set("currency", currency);
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    params.set("_r", String(ordersRefreshKey));
    params.set("limit", "100");
    const s = params.toString();
    return s ? `?${s}` : "";
  }, [currency, from, ordersRefreshKey, q, status, to]);

  const monthsFromDuration = (duration: unknown) => {
    switch (String(duration ?? "").trim().toLowerCase()) {
      case "2m":
        return 2;
      case "3m":
        return 3;
      case "6m":
        return 6;
      default:
        return 1;
    }
  };

  const openTimesheetDetailsPage = (t: any) => {
    const tid = String(t?.id ?? "").trim();
    if (!tid) return;
    setLocation(`/employer/timesheets/${encodeURIComponent(tid)}`);
  };

  const addMonthsToIso = (iso: string, months: number) => {
    const s = String(iso ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
    const [yy, mm, dd] = s.split("-").map((v) => Number(v));
    const base = new Date(yy, mm - 1, dd);
    if (Number.isNaN(base.getTime())) return "";
    const d = new Date(base);
    d.setMonth(d.getMonth() + Math.max(0, months));
    const out = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return out;
  };

  const formatDurationLabel = (duration: unknown) => {
    const v = String(duration ?? "").trim().toLowerCase();
    if (v === "1m") return "1 month";
    if (v === "2m") return "2 months";
    if (v === "3m") return "3 months";
    if (v === "6m") return "6 months";
    return v || "—";
  };

  const projectLabel = (p: any) => {
    const offer = (p?.offerDetails ?? {}) as any;
    const fromOffer = String(offer?.roleTitle ?? "").trim();
    const fromProposal = String(p?.projectName ?? p?.project_name ?? "").trim();
    const fromNested = String(p?.project?.projectName ?? p?.project?.project_name ?? "").trim();
    return fromProposal || fromNested || fromOffer || "—";
  };

  const internProjectKey = (p: any) => {
    const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
    const projectId = String(p?.projectId ?? p?.project_id ?? "").trim();
    const project = projectId || projectLabel(p);
    return `${internId}__${project}`;
  };

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of hiredProposals) {
      const name = projectLabel(p);
      if (name && name !== "—") set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [hiredProposals]);

  const filteredHiredProposals = useMemo(() => {
    const q = String(hireSearch ?? "").trim().toLowerCase();
    const proj = String(hireProject ?? "").trim();
    const cur = String(hireCurrency ?? "").trim().toUpperCase();
    const from = String(hireFrom ?? "").slice(0, 10);
    const to = String(hireTo ?? "").slice(0, 10);

    return hiredProposals.filter((p) => {
      const internName = String(p?.internName ?? "").trim();
      const projectName = projectLabel(p);
      const offer = (p?.offerDetails ?? {}) as any;
      const currencyCode = String(offer?.currency ?? p?.currency ?? "INR").toUpperCase();
      const startDate = String(offer?.startDate ?? "").slice(0, 10);

      if (proj && projectName !== proj) return false;
      if (cur && currencyCode !== cur) return false;
      if (from && startDate && startDate < from) return false;
      if (to && startDate && startDate > to) return false;
      if (!q) return true;
      const hay = `${internName} ${projectName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [hireCurrency, hireFrom, hireProject, hireSearch, hireTo, hiredProposals]);

  const fullTimeOfferKeySet = useMemo(() => {
    const out = new Set<string>();
    for (const p of employerProposals) {
      const offer = (p?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const statusLower = String(p?.status ?? "").trim().toLowerCase();
      if (!hasFullTimeOffer) continue;
      if (statusLower === "rejected" || statusLower === "expired" || statusLower === "withdrawn") continue;
      out.add(internProjectKey(p));
    }
    return out;
  }, [employerProposals]);

  const fullTimeOfferInternSet = useMemo(() => {
    const out = new Set<string>();
    for (const p of employerProposals) {
      const offer = (p?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const statusLower = String(p?.status ?? "").trim().toLowerCase();
      if (!hasFullTimeOffer) continue;
      if (statusLower === "rejected" || statusLower === "expired" || statusLower === "withdrawn") continue;

      const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
      if (!internId) continue;
      out.add(internId);
    }
    return out;
  }, [employerProposals]);

  const filteredUpcomingProposals = useMemo(() => {
    const cur = String(upcomingCurrency ?? "").trim().toUpperCase();
    const from = String(upcomingFrom ?? "").slice(0, 10);
    const to = String(upcomingTo ?? "").slice(0, 10);
    const payStatus = String(upcomingPayStatus ?? "").trim().toLowerCase();

    return filteredHiredProposals.filter((p) => {
      const offer = (p?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const duration = String(offer?.duration ?? "").trim();
      const rawMonthlyAmount = Number(offer?.monthlyAmount ?? 0);
      const totalPrice = Number(offer?.totalPrice ?? 0);
      const currencyCode = String(
        (hasFullTimeOffer ? (fullTimeOffer as any)?.ctcCurrency : offer?.currency) ?? p?.currency ?? "INR",
      ).toUpperCase();

      if (cur && currencyCode !== cur) return false;

      if (!hasFullTimeOffer && currencyCode === "INR" && rawMonthlyAmount === 5000) return false;

      const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
      const fullTimeFeeMajor =
        hasFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0
          ? Math.max(0, Math.round((annualCtc * 8.33) / 100))
          : 0;

      const totalMonths = hasFullTimeOffer ? 1 : Math.max(1, monthsFromDuration(duration));
      const effectiveMonthlyAmount = hasFullTimeOffer
        ? fullTimeFeeMajor
        : Number.isFinite(rawMonthlyAmount) && rawMonthlyAmount > 0
          ? rawMonthlyAmount
          : Number.isFinite(totalPrice) && totalPrice > 0
            ? totalPrice / totalMonths
            : 0;

      const amountMinor = Math.round(Math.max(0, effectiveMonthlyAmount) * 100);
      const totalAmountMinorRaw = hasFullTimeOffer
        ? amountMinor
        : Number.isFinite(totalPrice) && totalPrice > 0
          ? Math.round(Math.max(0, totalPrice) * 100)
          : amountMinor * totalMonths;

      const proposalId = String(p?.id ?? "").trim();
      const paidForProposal = (Array.isArray(paidOrders) ? paidOrders : []).filter((o: any) => {
        if (orderStatus(o) !== "paid") return false;

        const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
        const isInOrder = String(o?.proposalId ?? "").trim() === proposalId || ids.includes(proposalId);
        if (!isInOrder) return false;

        const purpose = orderPurpose(o);
        return purpose === "employer_monthly_payment" || purpose === "employer_checkout";
      });

      const checkoutTotalPaidForThisProposal = paidForProposal.some((o: any) => {
        if (orderPurpose(o) !== "employer_checkout") return false;
        if (orderPaymentMode(o) !== "total") return false;
        const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
        if (ids.length > 0) return ids.length === 1 && ids[0] === proposalId;
        return String(o?.proposalId ?? "").trim() === proposalId;
      });

      const discountEligible = checkoutTotalPaidForThisProposal && totalMonths > 1 && rawMonthlyAmount > 0;
      const totalAmountMinor = discountEligible
        ? Math.max(0, Math.round(totalAmountMinorRaw * 0.9))
        : totalAmountMinorRaw;

      const paidAmountMinor = paidForProposal.reduce((sum: number, o: any) => {
        const purpose = orderPurpose(o);
        if (purpose === "employer_checkout") {
          const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
          const single = ids.length > 0
            ? ids.length === 1 && ids[0] === proposalId
            : String(o?.proposalId ?? "").trim() === proposalId;
          if (!single) return sum;
        }

        const amt = Number(o?.amountMinor ?? o?.amount_minor ?? 0);
        return sum + (Number.isFinite(amt) ? Math.max(0, amt) : 0);
      }, 0);

      const dueAmountMinor = Math.max(0, totalAmountMinor - paidAmountMinor);
      const isFullyPaid = dueAmountMinor <= 0 || totalAmountMinor <= 0;

      if (payStatus === "fully_paid" && !isFullyPaid) return false;
      if (payStatus === "partially_paid" && isFullyPaid) return false;

      const startDate = String(offer?.startDate ?? "").trim();
      const paidMonths = paidForProposal.filter((o: any) => orderPurpose(o) === "employer_monthly_payment").length;
      const upcomingDate = !isFullyPaid && startDate ? addMonthsToIso(startDate, Math.max(1, paidMonths + 1)) : "";

      const completedAt = (() => {
        if (!isFullyPaid) return "";
        const latest = paidForProposal.reduce<Date | null>((acc, o: any) => {
          const raw = (o?.paidAt ?? o?.paid_at ?? o?.createdAt ?? o?.created_at) as any;
          if (!raw) return acc;
          const d = raw instanceof Date ? raw : new Date(raw);
          if (Number.isNaN(d.getTime())) return acc;
          if (!acc) return d;
          return d.getTime() > acc.getTime() ? d : acc;
        }, null);
        return latest ? isoDateOnly(latest) : "";
      })();

      const filterDate = String(upcomingDate || completedAt || "").slice(0, 10);
      if (from && filterDate && filterDate < from) return false;
      if (to && filterDate && filterDate > to) return false;

      return true;
    });
  }, [filteredHiredProposals, paidOrders, upcomingCurrency, upcomingFrom, upcomingPayStatus, upcomingTo]);

  const openTimesheetManager = (proposal: any) => {
    if (!employerId) return;
    setTsSelectedProposal(proposal);
    setTsOpen(true);
    setTsRows([]);
    setTsError("");
    setTsLoading(false);
    setDecisionNote("");
    setDecisionBusyId("");

    const proposalId = String(proposal?.id ?? proposal?.proposalId ?? "").trim();
    if (!proposalId) return;

    void (async () => {
      try {
        setTsLoading(true);
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/timesheets?proposalId=${encodeURIComponent(proposalId)}&limit=5000`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.timesheets) ? (json.timesheets as any[]) : [];
        setTsRows(list);
      } catch (e) {
        setTsError((e as any)?.message || "Failed to load timesheets");
        setTsRows([]);
      } finally {
        setTsLoading(false);
      }
    })();
  };

  const decideTimesheet = async (timesheetId: string, decision: "approve" | "reject") => {
    if (!employerId) return;
    const tid = String(timesheetId ?? "").trim();
    if (!tid) return;

    try {
      setDecisionBusyId(tid);
      setTsError("");

      const note = String(decisionNote ?? "").trim();
      await apiRequest(
        "POST",
        `/api/employer/${encodeURIComponent(String(employerId))}/timesheets/${encodeURIComponent(tid)}/${decision}`,
        note ? { managerNote: note } : {},
      );

      const proposalId = String(tsSelectedProposal?.id ?? tsSelectedProposal?.proposalId ?? "").trim();
      if (proposalId) {
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/timesheets?proposalId=${encodeURIComponent(proposalId)}&limit=5000`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.timesheets) ? (json.timesheets as any[]) : [];
        setTsRows(list);
      }
    } catch (e) {
      setTsError((e as any)?.message || "Failed to update timesheet");
    } finally {
      setDecisionBusyId("");
    }
  };

  useEffect(() => {
    if (!employerId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/orders${queryString}`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.orders) ? (json.orders as any[]) : [];

        if (!cancelled) setOrders(list);
      } catch (e) {
        if (!cancelled) {
          setOrders([]);
          setErrorMessage((e as any)?.message || "Failed to load orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId, queryString]);

  useEffect(() => {
    if (!employerId) return;
    let cancelled = false;

    (async () => {
      try {
        setHiresLoading(true);
        setHiresError("");

        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/proposals`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.proposals) ? (json.proposals as any[]) : [];
        const hired = list.filter((p) => String(p?.status ?? "").trim().toLowerCase() === "hired");
        if (!cancelled) {
          setEmployerProposals(list);
          setHiredProposals(hired);
        }
      } catch (e) {
        if (!cancelled) {
          setEmployerProposals([]);
          setHiredProposals([]);
          setHiresError((e as any)?.message || "Failed to load hires");
        }
      } finally {
        if (!cancelled) setHiresLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ftAutoOpenedRef.current) return;
    if (hiresLoading) return;
    if (hiredProposals.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const ftInternId = String(params.get("ftInternId") ?? "").trim();
    if (!ftInternId) return;

    const match = hiredProposals.find((p) => {
      const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
      if (internId !== ftInternId) return false;
      const offer = (p?.offerDetails ?? {}) as any;
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      return !hasFullTimeOffer;
    });

    if (!match) return;

    ftAutoOpenedRef.current = true;
    setActiveTab("orders");
    setFtSelectedProposal(match);
    setFtOpen(true);
  }, [hiredProposals, hiresLoading]);

  useEffect(() => {
    if (!employerId) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/orders?status=paid&limit=5000&_r=${encodeURIComponent(String(ordersRefreshKey))}`,
        );
        const json = await res.json().catch(() => null);
        const list = Array.isArray(json?.orders) ? (json.orders as any[]) : [];
        if (!cancelled) setPaidOrders(list);
      } catch {
        if (!cancelled) setPaidOrders([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId, ordersRefreshKey]);

  const openInvoice = (orderId: string) => {
    if (!employerId) return;
    const oid = String(orderId ?? "").trim();
    if (!oid) return;

    setInvoiceOpen(true);
    setInvoiceLoading(true);
    setInvoiceError("");
    setInvoiceData(null);

    void (async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/employer/${encodeURIComponent(String(employerId))}/orders/${encodeURIComponent(oid)}/invoice`,
        );
        const json = await res.json().catch(() => null);
        setInvoiceData(json);
      } catch (e) {
        setInvoiceError((e as any)?.message || "Failed to load invoice");
      } finally {
        setInvoiceLoading(false);
      }
    })();
  };

  const invoiceAmountLabel = useMemo(() => {
    const payment = invoiceData?.payment ?? {};
    const amountMinor = Number(payment?.amountMinor ?? payment?.amount_minor ?? 0);
    const currencyCode = String(payment?.currency ?? "INR").toUpperCase();
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    const amountMajor = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amountMajor || 0);
  }, [invoiceData]);

  const formatAmount = (amountMinor: number, currencyCode: string) => {
    const cur = String(currencyCode || "INR").toUpperCase();
    const locale = cur === "INR" ? "en-IN" : "en-US";
    const major = Number.isFinite(amountMinor) ? amountMinor / 100 : 0;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(major || 0);
  };

  function orderPurpose(row: any) {
    const raw = row?.raw ?? {};
    const notes = raw?.notes ?? raw?.order?.notes ?? {};
    return String((notes as any)?.purpose ?? "").trim().toLowerCase();
  }

  function orderPaymentMode(row: any) {
    const raw = row?.raw ?? {};
    const notes = raw?.notes ?? raw?.order?.notes ?? {};
    return String((notes as any)?.paymentMode ?? (notes as any)?.payment_mode ?? "").trim().toLowerCase();
  }

  function orderStatus(row: any) {
    return String(row?.status ?? "").trim().toLowerCase();
  }

  const orderCandidateOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of orders) {
      const candidate = String((row as any)?.internName ?? "").trim();
      if (candidate) set.add(candidate);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const orderProjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of orders) {
      const project = String((row as any)?.projectName ?? "").trim();
      if (project) set.add(project);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((row) => {
      const candidate = String((row as any)?.internName ?? "").trim();
      const project = String((row as any)?.projectName ?? "").trim();
      if (orderCandidate && candidate !== orderCandidate) return false;
      if (orderProject && project !== orderProject) return false;
      return true;
    });
  }, [orderCandidate, orderProject, orders]);

  const printInvoice = () => {
    const el = invoicePrintRef.current;
    if (!el) return;

    const head = document.head?.innerHTML ?? "";
    const origin = window.location?.origin ?? "";
    const html = `<!doctype html><html><head><base href="${origin}/" />${head}<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body style="margin:0">${el.outerHTML}</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) {
        iframe.remove();
        return;
      }

      try {
        doc.open();
        doc.write(html);
        doc.close();
        win.focus();
        window.setTimeout(() => {
          try {
            win.print();
          } finally {
            window.setTimeout(() => {
              try {
                iframe.remove();
              } catch {
                // ignore
              }
            }, 250);
          }
        }, 250);
      } catch {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      }
      return;
    }

    try {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();

      window.setTimeout(() => {
        try {
          w.print();
        } finally {
          window.setTimeout(() => {
            try {
              w.close();
            } catch {
              // ignore
            }
          }, 250);
        }
      }, 250);
    } catch {
      try {
        w.close();
      } catch {
        // ignore
      }
    }
  };

  const downloadInvoicePdf = async () => {
    const el = invoicePrintRef.current;
    if (!el) return;
    if (invoiceDownloading) return;
    // ...
    if (!invoiceData) return;

    setInvoiceDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let remainingHeight = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      remainingHeight -= pageHeight;

      while (remainingHeight > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        remainingHeight -= pageHeight;
      }

      const invoiceNumber = String((invoiceData as any)?.invoiceNumber ?? "").trim() || "invoice";
      pdf.save(`${invoiceNumber}.pdf`);
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e?.message || "Could not generate PDF.",
        variant: "destructive",
      });
    } finally {
      setInvoiceDownloading(false);
    }
  };

  const visibleTsRows = useMemo(() => {
    return (tsRows ?? []).filter((t) => {
      const statusRaw = String(t?.status ?? "").trim().toLowerCase();
      if (!statusRaw) return false;
      if (statusRaw === "draft") return false;
      return true;
    });
  }, [tsRows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="none" />

      <Dialog
        open={usdInfoOpen}
        onOpenChange={(open) => {
          if (!open && usdInfoCountdown > 0) return;
          setUsdInfoOpen(open);
        }}
      >
        <DialogContent
          className="max-w-2xl"
          closeDisabled={usdInfoCountdown > 0}
          onEscapeKeyDown={(e) => {
            if (usdInfoCountdown > 0) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (usdInfoCountdown > 0) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Important notice</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-700">
            <p>
              If your organization is located outside India, please note that hiring a candidate directly on a full-time basis may
              require compliance with local employment and work visa regulations.
            </p>
            <p>
              To simplify this process and eliminate visa-related complexities, Findtern offers a payroll-managed hiring option. Under
              this arrangement, the employer remits the salary to Findtern, and Findtern manages payroll and salary disbursement to the
              candidate in compliance with applicable regulations.
            </p>
            <p>
              Employers opting for this model will be charged a one-time full-time conversion fee of 8.33% of the total Annual CTC. No recurring hiring fees apply.
            </p>
            <p>
              To enable this option:
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={usdInfoAck}
                onChange={(e) => setUsdInfoAck(e.target.checked)}
                disabled={usdInfoCountdown > 0}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">I understand and want to enable this option</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {usdInfoCountdown > 0 ? `Please wait ${usdInfoCountdown}s to continue.` : "You can now proceed."}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUsdInfoOpen(false)}
              disabled={usdInfoCountdown > 0}
            >
              Cancel request
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (usdInfoCountdown > 0 || !usdInfoAck) return;
                if (!employerId) return;
                void (async () => {
                  try {
                    await apiRequest(
                      "POST",
                      `/api/employer/${encodeURIComponent(String(employerId))}/international-fte/apply`,
                      {},
                    );
                    toast({
                      title: "Applied",
                      description: "International FTE request has been submitted to admin.",
                    });
                    setUsdInfoOpen(false);
                  } catch (e: any) {
                    toast({
                      title: "Failed",
                      description: e?.message || "Failed to submit request",
                      variant: "destructive",
                    });
                  }
                })();
              }}
              disabled={usdInfoCountdown > 0 || !usdInfoAck}
            >
              Apply here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={ftOpen}
        onOpenChange={(open) => {
          setFtOpen(open);
          if (!open) {
            setFtBusy(false);
            setFtError("");
            setFtSelectedProposal(null);
            setFtJobTitle("");
            setFtOfferLetter(null);
            setFtOfferLetterPreviewUrl("");
            if (ftOfferLetterInputRef.current) ftOfferLetterInputRef.current.value = "";
            setFtJobMode("remote");
            setFtLocationState("");
            setFtLocationCity("");
            setFtCityPopoverOpen(false);
            setFtCitySearch("");

            setFtManualLocation(false);
            setFtTimezone("Asia/Kolkata");
            setFtShiftFrom("09:00");
            setFtShiftTo("18:00");
            setFtCtcCurrency("INR");
            setFtCtcAmount("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send full-time offer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 rounded-2xl border-slate-200 bg-white">
              <p className="text-xs text-slate-600 mb-1">Candidate</p>
              <p className="text-sm font-semibold text-slate-900">{String(ftSelectedProposal?.internName ?? "—") || "—"}</p>
              <p className="text-xs text-slate-600 mt-1">{projectLabel(ftSelectedProposal)}</p>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Job title</p>
                <Input value={ftJobTitle} onChange={(e) => setFtJobTitle(e.target.value)} placeholder="Enter job title" />
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-1">Offer letter</p>
                <input
                  ref={ftOfferLetterInputRef}
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setFtOfferLetter(null);
                      return;
                    }
                    if (!isAllowedOfferLetter(f)) {
                      toast({
                        title: "Invalid file",
                        description: "Please upload a PDF, JPG/JPEG or PNG file.",
                        variant: "destructive",
                      });
                      if (ftOfferLetterInputRef.current) ftOfferLetterInputRef.current.value = "";
                      setFtOfferLetter(null);
                      return;
                    }
                    setFtOfferLetter(f);
                  }}
                />

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  {!ftOfferLetter ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">Upload offer letter</p>
                        <p className="text-xs text-slate-600">PDF, JPG/JPEG or PNG</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => ftOfferLetterInputRef.current?.click()}
                      >
                        Choose file
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 min-w-0 text-left"
                        onClick={() => {
                          if (!ftOfferLetterPreviewUrl) return;
                          window.open(ftOfferLetterPreviewUrl, "#", "noopener,noreferrer");
                        }}
                        title="Open in new tab"
                      >
                        {String(ftOfferLetter?.type ?? "").toLowerCase() === "application/pdf" ? (
                          <FileText className="h-5 w-5 text-rose-600 shrink-0" />
                        ) : (
                          <FileImage className="h-5 w-5 text-emerald-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{ftOfferLetter.name}</p>
                          <p className="text-xs text-slate-600">Click to preview</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => ftOfferLetterInputRef.current?.click()}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setFtOfferLetter(null);
                            if (ftOfferLetterInputRef.current) ftOfferLetterInputRef.current.value = "";
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Job mode</p>
                <Select
                  value={ftJobMode}
                  onValueChange={(v) => {
                    setFtJobMode(v);
                    setFtCityPopoverOpen(false);
                    setFtCitySearch("");
                  }}
                >
                  <SelectTrigger
                    onPointerDown={() => {
                      setFtCityPopoverOpen(false);
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(String(ftJobMode).toLowerCase() === "onsite" || String(ftJobMode).toLowerCase() === "hybrid") ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs md:text-sm font-medium text-foreground">
                        City<span className="text-destructive ml-0.5">*</span>
                      </label>

                      {ftManualLocation ? (
                        <Input
                          placeholder="Enter your city"
                          className="h-9 md:h-10 rounded-lg text-sm"
                          value={ftLocationCity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFtLocationCity(v);
                          }}
                        />
                      ) : (
                        <Popover
                          open={ftCityPopoverOpen}
                          onOpenChange={(open) => {
                            setFtCityPopoverOpen(open);
                            if (open) setFtCitySearch(String(ftLocationCity ?? ""));
                          }}
                        >
                          <PopoverAnchor asChild>
                            <div className="relative w-full">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                placeholder="Search Indian cities..."
                                className="h-9 md:h-10 rounded-lg text-sm pl-9"
                                value={ftCitySearch}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setFtCityPopoverOpen(true);
                                  setFtCitySearch(v);
                                }}
                              />
                            </div>
                          </PopoverAnchor>
                          <PopoverContent
                            className="w-[360px] p-0"
                            align="start"
                            portal={false}
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
                                        const raw = String(ftCitySearch ?? "").trim();
                                        setFtManualLocation(true);
                                        setFtCityPopoverOpen(false);
                                        setFtLocationCity(raw);
                                        setFtLocationState("");
                                      }}
                                    >
                                      Enter manually
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {indiaCityStateOptions
                                    .filter((item) => {
                                      const q = String(ftCitySearch ?? "").trim().toLowerCase();
                                      if (!q) return true;
                                      return (
                                        item.city.toLowerCase().includes(q) ||
                                        (item.state || "").toLowerCase().includes(q)
                                      );
                                    })
                                    .slice(0, 200)
                                    .map((item) => (
                                      <CommandItem
                                        key={`${item.city}-${item.state}`}
                                        value={item.city}
                                        onSelect={() => {
                                          setFtManualLocation(false);
                                          setFtLocationCity(item.city);
                                          setFtLocationState(item.state);
                                          setFtCityPopoverOpen(false);
                                          setFtCitySearch(item.city);
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

                              {!ftManualLocation && (
                                <div className="border-t px-2 py-2">
                                  <button
                                    type="button"
                                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                                    onClick={() => {
                                      const raw = String(ftCitySearch ?? "").trim();
                                      setFtManualLocation(true);
                                      setFtCityPopoverOpen(false);
                                      setFtLocationCity(raw);
                                      setFtLocationState("");
                                    }}
                                  >
                                    Can&apos;t find your city? Enter manually
                                  </button>
                                </div>
                              )}
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs md:text-sm font-medium text-foreground">
                        State<span className="text-destructive ml-0.5">*</span>
                      </label>

                      {ftManualLocation ? (
                        <Select value={ftLocationState || ""} onValueChange={(v) => setFtLocationState(v)}>
                          <SelectTrigger className="h-9 md:h-10 rounded-lg text-sm">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {indiaStates.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={ftLocationState}
                          disabled
                          placeholder="Auto-filled from city"
                          className="h-9 md:h-10 rounded-lg text-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-600 mb-1">Job location</p>
                  <Input value="Remote" disabled />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Timezone</p>
                <Select value={ftTimezone} onValueChange={(v) => setFtTimezone(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-slate-600 mb-1">Shift timings</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="time" value={ftShiftFrom} onChange={(e) => setFtShiftFrom(e.target.value)} />
                  <Input type="time" value={ftShiftTo} onChange={(e) => setFtShiftTo(e.target.value)} />
                </div>
              </div>
            </div>

            <Card className="p-4 rounded-2xl border-slate-200 bg-white">
              <p className="text-xs text-slate-600 mb-1">Annual CTC</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select
                  value={ftCtcCurrency}
                  onValueChange={(v) => {
                    const cur = String(v ?? "").toUpperCase();
                    const ifteApproved =
                      String(internationalFteStatus ?? "none").trim().toLowerCase() === "approved";
                    setFtCtcCurrency(cur);
                    if (cur === "USD" && !ifteApproved) setUsdInfoOpen(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="md:col-span-2"
                  value={ftCtcAmount}
                  onChange={(e) => {
                    const next = String(e.target.value ?? "").replace(/[^0-9]/g, "");
                    setFtCtcAmount(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey || e.metaKey || e.altKey) return;
                    if (e.key.length === 1 && !/^[0-9]$/.test(e.key)) e.preventDefault();
                  }}
                  placeholder="Amount"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>

              <p className="mt-2 text-[11px] text-slate-600">
                The recruitment fee charged by Findtern is separate from the candidate’s CTC and is not included within
                the offered compensation package. The fee is payable independently by the hiring organization.
              </p>

              {String(ftCtcCurrency).toUpperCase() === "INR" || String(ftCtcCurrency).toUpperCase() === "USD" ? (
                <div className="mt-3">
                  <p className="text-xs text-slate-600">One-time hiring fees</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {oneTimeFeeLabel ? `${oneTimeFeeLabel} (8.33% of Annual CTC)` : "8.33% of the total mentioned CTC"}
                  </p>
                </div>
              ) : null}
            </Card>

            {ftError ? <p className="text-sm text-rose-600">{ftError}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFtOpen(false)} disabled={ftBusy}>
              Close
            </Button>
            {(() => {
              const awaitingApproval =
                String(ftCtcCurrency ?? "INR").trim().toUpperCase() === "USD" &&
                String(internationalFteStatus ?? "none").trim().toLowerCase() !== "approved";
              const disabled = ftBusy || awaitingApproval;

              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex" title={awaitingApproval ? "" : undefined}>
                        <Button
                          type="button"
                          onClick={() => void submitFullTimeOffer()}
                          disabled={disabled}
                          className={`disabled:opacity-50 disabled:cursor-not-allowed disabled:blur-[1px]`}
                        >
                          Send full time hiring proposal
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {awaitingApproval ? (
                      <TooltipContent>Awaiting approval from Findtern</TooltipContent>
                    ) : null}
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={invoiceOpen}
        onOpenChange={(open) => {
          setInvoiceOpen(open);
          if (!open) {
            setInvoiceData(null);
            setInvoiceError("");
            setInvoiceLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <DialogHeader className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>Invoice</DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    onClick={() => printInvoice()}
                    disabled={invoiceLoading || !invoiceData}
                  >
                    <Receipt className="w-3.5 h-3.5 mr-1" />
                    Print
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    onClick={() => downloadInvoicePdf()}
                    disabled={invoiceLoading || invoiceDownloading || !invoiceData}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs"
                    onClick={() => setInvoiceOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogHeader>
          </div>

          {invoiceLoading ? (
            <div className="px-6 pb-6">
              <p className="text-sm text-slate-600">Loading invoice...</p>
            </div>
          ) : invoiceError ? (
            <div className="px-6 pb-6">
              <p className="text-sm text-red-600">{invoiceError}</p>
            </div>
          ) : invoiceData ? (
            <div className="bg-slate-50 px-6 pb-8 pt-6">
              {(() => {
                const payment = invoiceData?.payment ?? {};
                const rawPaidAt = payment?.paidAt ?? payment?.paid_at ?? payment?.createdAt ?? payment?.created_at;

                const paidAt = rawPaidAt ? new Date(rawPaidAt) : null;
                const invoiceDate = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null;
                const invoiceNumber = String((invoiceData as any)?.invoiceNumber ?? "").trim() || "—";
                const invoiceDateLabel = invoiceDate
                  ? `${String(invoiceDate.getDate()).padStart(2, "0")}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}-${String(invoiceDate.getFullYear() % 100).padStart(2, "0")}`
                  : "—";

                const employerCompany = String(invoiceData?.employer?.companyName ?? "—").trim() || "—";
                const employerEmail = String(invoiceData?.employer?.companyEmail ?? "").trim();

                const items = Array.isArray(invoiceData?.items) ? (invoiceData.items as any[]) : [];
                const currencyCode = String(payment?.currency ?? "INR").toUpperCase();

                const isFullTimeInvoice = items.some((it: any) => {
                  const offer = (it?.offerDetails ?? {}) as any;
                  const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                  const duration = String(offer?.duration ?? "").trim();
                  return hasFullTimeOffer || /full[-\s]?time/i.test(duration);
                });

                const invoiceItemBaseMinor = (it: any) => {
                  if (!isFullTimeInvoice) {
                    return Math.round(Math.max(0, Number(it?.totalPrice ?? 0)) * 100);
                  }

                  const offer = (it?.offerDetails ?? {}) as any;
                  const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                  const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                  if (!hasFullTimeOffer) {
                    return Math.round(Math.max(0, Number(it?.totalPrice ?? 0)) * 100);
                  }

                  const annualCtcMajor = Number((fullTimeOffer as any)?.annualCtc ?? 0);
                  if (!Number.isFinite(annualCtcMajor) || annualCtcMajor <= 0) return 0;

                  const feeMajor = Math.max(0, Math.round((annualCtcMajor * 8.33) / 100));
                  return Math.round(feeMajor * 100);
                };

                const subtotalMinor = items.reduce((sum, it) => sum + invoiceItemBaseMinor(it), 0);
                const totalMinor = Number(payment?.amountMinor ?? payment?.amount_minor ?? subtotalMinor);

                const gstRate = 18;
                const gstApplicable =
                  !isFullTimeInvoice && currencyCode === "INR" && Number.isFinite(totalMinor) && totalMinor > 0;

                const subtotalFromTotalMinor = gstApplicable ? Math.round((Math.max(0, totalMinor) * 100) / 118) : 0;
                const gstMinor = gstApplicable ? Math.max(0, Math.max(0, totalMinor) - subtotalFromTotalMinor) : 0;
                const totalWithTaxMinor = Math.max(0, totalMinor);

                const discountMinorRaw = Math.max(0, subtotalMinor - totalWithTaxMinor);
                const discountRatio = subtotalMinor > 0 ? discountMinorRaw / subtotalMinor : 0;
                const showTenPercentDiscount = discountMinorRaw > 0 && Math.abs(discountRatio - 0.1) <= 0.02;
                const discountMinor = showTenPercentDiscount ? discountMinorRaw : 0;

                const subtotalDisplayMinor = isFullTimeInvoice
                  ? totalWithTaxMinor
                  : gstApplicable
                    ? subtotalFromTotalMinor
                    : subtotalMinor;

                return (
                  <div
                    ref={invoicePrintRef}
                    className="invoice-print-root mx-auto w-full max-w-[980px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="bg-emerald-900 text-white">
                      <div className="px-6 py-5 flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <img src={newlogo}alt="Findtern" className="h-14 w-auto" />

                            <div className="leading-tight">
                              <p className="text-sm font-semibold text-white">Findtern Private Limited</p>
                              <p className="text-[11px] text-white/90">386, Jagatpura, Jaipur, Rajasthan (302017)</p>
                              <p className="text-[11px] text-white/90">GST: 08AAGCF2512F1Z0</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-3xl font-bold tracking-wide text-white">INVOICE</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Invoice Date :</p>
                          <p className="text-sm text-slate-900 mt-1">{invoiceDateLabel}</p>

                          <p className="text-xs font-semibold text-slate-700 mt-4">Invoice Number :</p>
                          <p className="text-sm text-slate-900 mt-1">{invoiceNumber}</p>
                        </div>

                        <div className="md:text-right">
                          <p className="text-xs font-semibold text-slate-700">Invoice to :</p>
                          <p className="text-sm text-slate-900 mt-1">{employerCompany}</p>
                          {employerEmail ? <p className="text-sm text-slate-700">{employerEmail}</p> : null}
                        </div>
                      </div>

                      <div className="mt-6 overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-emerald-950 text-white">
                              <th className="text-left text-xs font-semibold px-3 py-2">ITEM DESCRIPTION</th>
                              <th className="text-right text-xs font-semibold px-3 py-2">PRICE ({currencyCode})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td className="px-3 py-3 text-sm text-slate-700" colSpan={2}>
                                  No items
                                </td>
                              </tr>
                            ) : (
                              items.map((item: any, idx: number) => {
                                const offer = (item?.offerDetails ?? {}) as any;
                                const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                                const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                                const duration = String(offer?.duration ?? "").trim();
                                const monthlyAmount = offer?.monthlyAmount;
                                const roleTitle = String(offer?.roleTitle ?? "").trim();

                                const descriptionMain = String(item?.internName ?? "").trim()
                                  ? `${String(item?.internName)}${roleTitle ? ` — ${roleTitle}` : ""}`
                                  : String(item?.projectName ?? "").trim()
                                    ? String(item?.projectName)
                                    : `Proposal ${String(item?.proposalId ?? "")}`;

                                const detailParts: string[] = [];
                                if (duration) detailParts.push(duration);

                                const isFullTimeOffer = hasFullTimeOffer || /full[-\s]?time/i.test(duration);
                                const annualCtc = Number(
                                  (hasFullTimeOffer ? (fullTimeOffer as any)?.annualCtc : undefined) ??
                                    offer?.annualCtc ??
                                    offer?.annual_ctc ??
                                    offer?.ctcAmount ??
                                    offer?.ctc_amount ??
                                    offer?.ctc ??
                                    0,
                                );

                                if (isFullTimeOffer) {
                                  if (Number.isFinite(annualCtc) && annualCtc > 0) {
                                    detailParts.push(`Annual CTC: ${formatAmount(Math.round(annualCtc * 100), currencyCode)}`);
                                  }
                                } else if (typeof monthlyAmount === "number" && Number.isFinite(monthlyAmount) && monthlyAmount > 0) {
                                  detailParts.push(`${monthlyAmount}/month`);
                                }

                                const detail = detailParts.join(" · ");
                                const rowMinor = invoiceItemBaseMinor(item);
                                const displayPriceMinor = isFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0
                                  ? Math.round(annualCtc * 100)
                                  : rowMinor;
                                const rowKey = String(item?.proposalId ?? item?.id ?? item?.internId ?? idx);

                                const displayTitle = isFullTimeOffer
                                  ? `${descriptionMain || "—"}  Full time consulting fee (8.33% of the total mentioned CTC)`
                                  : (descriptionMain || "—");

                                return (
                                  <tr key={rowKey} className="border-b border-slate-200">
                                    <td className="px-3 py-3">
                                      <p className="text-sm font-medium text-slate-900">{displayTitle}</p>
                                      {detail ? <p className="text-xs text-slate-600 mt-1">{detail}</p> : null}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <p className="text-sm font-semibold text-slate-900">{formatAmount(subtotalDisplayMinor, currencyCode)}</p>
                                    </td>
                                  </tr>
                                );
                              })
                            )}

                            {showTenPercentDiscount ? (
                              <tr>
                                <td className="px-3 py-2 text-sm font-semibold text-slate-900">Discount (10%)</td>
                                <td className="px-3 py-2 text-right text-sm text-slate-900">
                                  -{formatAmount(discountMinor, currencyCode)}
                                </td>
                              </tr>
                            ) : null}

                            {isFullTimeInvoice ? (
                              <tr>
                                {/* <td className="px-3 py-2 text-sm font-semibold text-slate-900">
                                  Full time consulting fee (8.33% of the total mentioned CTC)
                                </td>
                                <td className="px-3 py-2 text-right text-sm text-slate-900">
                                  {formatAmount(subtotalDisplayMinor, currencyCode)}
                                </td> */}
                              </tr>
                            ) : (
                              <>
                                <tr>
                                  <td className="px-3 py-2 text-sm font-semibold text-slate-900">Subtotal</td>
                                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                                    {formatAmount(subtotalDisplayMinor, currencyCode)}
                                  </td>
                                </tr>

                                <tr className="bg-slate-50">
                                  <td className="px-3 py-2 text-sm font-semibold text-slate-900">GST</td>
                                  <td className="px-3 py-2 text-right text-sm text-slate-900">
                                    {gstApplicable ? `${gstRate}% (${formatAmount(gstMinor, currencyCode)})` : "—" }
                                  </td>
                                </tr>
                              </>
                            )}
                            <tr>
                              <td className="px-3 py-2 text-sm font-semibold text-slate-900">Total</td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-slate-900">
                                {formatAmount(totalWithTaxMinor, currencyCode)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-emerald-900 text-white">
                      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-semibold !text-white">SEND PAYMENTS TO:</p>
                          <div className="mt-2 text-[12px] !text-white leading-5">
                            <p className="!text-white ">Bank Account No:&nbsp;&nbsp;5949973545</p>
                            <p className="!text-white ">Bank Name:&nbsp;&nbsp;Kotak Mahindra Bank</p>
                            <p className="!text-white ">IFSC:&nbsp;&nbsp;KKBK0003572</p>
                          </div>
                        </div>
                        <div className="md:text-right">
                          <p className="text-xs font-semibold !text-white">CONTACT</p>
                          <p className="mt-2 text-[12px] text-white">admin@findtern.in</p>
                          
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="px-6 pb-6">
              <p className="text-sm text-slate-600">No invoice selected.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={tsOpen}
        onOpenChange={(open) => {
          setTsOpen(open);
          if (!open) {
            setTsSelectedProposal(null);
            setTsRows([]);
            setTsError("");
            setTsLoading(false);
            setDecisionNote("");
            setDecisionBusyId("");
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Timesheet Manager</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            <Card className="p-4 rounded-2xl border-slate-200 bg-white lg:col-span-1">
              <p className="text-xs text-slate-500">Intern</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {String(tsSelectedProposal?.internName ?? "—") || "—"}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {projectLabel(tsSelectedProposal)}
              </p>

              
            </Card>

            <Card className="p-4 rounded-2xl border-slate-200 bg-white lg:col-span-2 overflow-hidden">
              {tsLoading ? (
                <p className="text-sm text-slate-600">Loading...</p>
              ) : visibleTsRows.length === 0 ? (
                <p className="text-sm text-slate-700">No timesheets found.</p>
              ) : (
                <div className="max-h-[55vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleTsRows.map((t) => {
                        const id = String(t?.id ?? "").trim();
                        const periodStart = isoDateOnly(t?.periodStart);
                        const periodEnd = isoDateOnly(t?.periodEnd);
                        const statusRaw = String(t?.status ?? "").trim().toLowerCase();
                        const statusLabel = statusRaw ? statusRaw.toUpperCase() : "DRAFT";
                        const badgeCls =
                          statusRaw === "approved"
                            ? "bg-emerald-600"
                            : statusRaw === "rejected"
                              ? "bg-rose-600"
                              : statusRaw === "submitted"
                                ? "bg-amber-600"
                                : "bg-slate-700";

                        return (
                          <TableRow key={id || Math.random()}>
                            <TableCell className="text-xs">
                              {periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge className={badgeCls}>{statusLabel}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-full text-xs"
                                  onClick={() => openTimesheetDetailsPage(t)}
                                  disabled={!id}
                                >
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-full text-xs"
                                  onClick={() => exportTimesheetXlsx(t)}
                                  disabled={!id}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1" />
                                  Export
                                </Button>
                                {statusRaw === "submitted" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-full text-xs"
                                      disabled={decisionBusyId === id}
                                      onClick={() => void decideTimesheet(id, "reject")}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-8 rounded-full text-xs bg-emerald-600 hover:bg-emerald-700"
                                      disabled={decisionBusyId === id}
                                      onClick={() => void decideTimesheet(id, "approve")}
                                    >
                                      Approve
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="max-w-12xl mx-auto px-4 md:px-8 py-8 md:py-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Orders</h1>
            <p className="text-sm text-slate-600">Payments and invoices for your hires.</p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-full text-xs"
            onClick={() => setLocation("/employer/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Button>
        </div>

        {!employerId ? (
          <Card className="p-6 rounded-2xl bg-white/95 border-slate-200">
            <p className="text-sm text-slate-700">Please login to view orders.</p>
          </Card>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="payments">View payments</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming payments</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                <Card className="p-4 rounded-2xl bg-white/95 border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Hired candidates</h2>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 mb-1">Search</p>
                      <Input
                        value={hireSearch}
                        onChange={(e) => setHireSearch(e.target.value)}
                        placeholder="Candidate or project"
                      />
                    </div>

                    <div className="w-full md:w-56">
                      <p className="text-xs text-slate-600 mb-1">Project</p>
                      <Select value={hireProject || "all"} onValueChange={(v) => setHireProject(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {projectOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-40">
                      <p className="text-xs text-slate-600 mb-1">Currency</p>
                      <Select value={hireCurrency || "all"} onValueChange={(v) => setHireCurrency(v === "all" ? "" : String(v || "").toUpperCase())}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">From</p>
                      <Input type="date" value={hireFrom} onChange={(e) => setHireFrom(e.target.value)} />
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">To</p>
                      <Input type="date" value={hireTo} onChange={(e) => setHireTo(e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl text-xs"
                        onClick={() => {
                          setHireSearch("");
                          setHireProject("");
                          setHireCurrency("");
                          setHireFrom("");
                          setHireTo("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  {hiresLoading ? (
                    <p className="text-sm text-slate-600">Loading hires...</p>
                  ) : hiresError ? (
                    <p className="text-sm text-red-600">{hiresError}</p>
                  ) : filteredHiredProposals.length === 0 ? (
                    <p className="text-sm text-slate-700">No hired candidates found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Start date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>End date</TableHead>
                          <TableHead>Timesheet</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHiredProposals.map((p) => {
                          const offer = (p?.offerDetails ?? {}) as any;
                          const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                          const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                          const statusLower = String(p?.status ?? "").trim().toLowerCase();
                          const shouldShowFullTime = hasFullTimeOffer && statusLower === "hired";
                          const startDate = String(offer?.startDate ?? "").trim();
                          const duration = String(offer?.duration ?? "").trim();

                          const endDate = startDate
                            ? hasFullTimeOffer
                              ? ""
                              : addMonthsToIso(startDate, monthsFromDuration(duration))
                            : "";

                          const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
                          const internName = String(p?.internName ?? "").trim() || "Intern";
                          const projectName = projectLabel(p);

                          const isFullTimeOfferDisabled =
                            hasFullTimeOffer ||
                            (internId && fullTimeOfferInternSet.has(internId)) ||
                            fullTimeOfferKeySet.has(internProjectKey(p)) ||
                            (internId && fullTimeOfferSentInternIds.has(internId)) ||
                            fullTimeOfferSentKeys.has(internProjectKey(p)) ||
                            ftBusy;

                          return (
                            <TableRow key={String(p?.id ?? Math.random())}>
                              <TableCell className="text-xs">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-auto p-0 text-xs underline underline-offset-2"
                                  onClick={() => {
                                    if (!internId) return;
                                    setLocation(`/employer/intern/${encodeURIComponent(internId)}`);
                                  }}
                                  disabled={!internId}
                                >
                                  {internName}
                                </Button>
                                {shouldShowFullTime ? (
                                  <Badge className="ml-2 bg-slate-900 text-white text-[10px] font-semibold rounded-full">Full-time</Badge>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-xs">{projectName}</TableCell>
                              <TableCell className="text-xs">{startDate || "—"}</TableCell>
                              <TableCell className="text-xs">{hasFullTimeOffer ? "Full-time" : formatDurationLabel(duration)}</TableCell>
                              <TableCell className="text-xs">{endDate || "—"}</TableCell>
                              <TableCell>
                                {hasFullTimeOffer ? (
                                  <span className="text-xs text-slate-500">—</span>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-full text-xs"
                                    onClick={() => openTimesheetManager(p)}
                                  >
                                    <CalendarDays className="w-3.5 h-3.5 mr-1" />
                                    Open
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    className="h-8 rounded-full text-xs bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                                    disabled={
                                      isFullTimeOfferDisabled
                                    }
                                    onClick={() => {
                                      setFtSelectedProposal(p);
                                      setFtOpen(true);
                                    }}
                                  >
                                    {isFullTimeOfferDisabled && !ftBusy ? "Full-time offer sent" : "Send full-time offer"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-full text-xs"
                                    onClick={() => {
                                      setActiveTab("payments");
                                    }}
                                  >
                                    <Receipt className="w-3.5 h-3.5 mr-1" />
                                    View payments
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-full text-xs"
                                    onClick={() => {
                                      setActiveTab("upcoming");
                                    }}
                                  >
                                    <CreditCard className="w-3.5 h-3.5 mr-1" />
                                    Upcoming payments
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <Card className="p-4 rounded-2xl bg-white/95 border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Order history</h2>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 mb-1">Search</p>
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Order ID or payment ID"
                      />
                    </div>

                    <div className="w-full md:w-48">
                      <p className="text-xs text-slate-600 mb-1">Candidate</p>
                      <Select value={orderCandidate || "all"} onValueChange={(v) => setOrderCandidate(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {orderCandidateOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-48">
                      <p className="text-xs text-slate-600 mb-1">Project</p>
                      <Select value={orderProject || "all"} onValueChange={(v) => setOrderProject(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {orderProjectOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-40">
                      <p className="text-xs text-slate-600 mb-1">Currency</p>
                      <Select value={currency || "all"} onValueChange={(v) => setCurrency(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">From</p>
                      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">To</p>
                      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl text-xs"
                        onClick={() => {
                          setStatus("");
                          setCurrency("");
                          setQ("");
                          setFrom("");
                          setTo("");
                          setOrderCandidate("");
                          setOrderProject("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 rounded-2xl bg-white/95 border-slate-200 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Order history</h2>
                  </div>

                  {loading ? (
                    <p className="text-sm text-slate-600">Loading orders...</p>
                  ) : errorMessage ? (
                    <p className="text-sm text-red-600">{errorMessage}</p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="text-sm text-slate-700">No orders found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Currency</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Invoice</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((row) => {
                          const orderId = String(row?.orderId ?? row?.order_id ?? "");
                          const amountMinor = Number(row?.amountMinor ?? row?.amount_minor ?? 0);
                          const cur = String(row?.currency ?? "INR").toUpperCase();
                          const createdAt = row?.createdAt ? new Date(row.createdAt) : row?.created_at ? new Date(row.created_at) : null;
                          const createdLabel = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString() : "—";
                          const candidate = String(row?.internName ?? "").trim() || "—";
                          const project = String(row?.projectName ?? "").trim() || "—";
                          return (
                            <TableRow key={orderId || String(row?.id ?? Math.random())}>
                              <TableCell className="font-mono text-xs">{orderId || "—"}</TableCell>
                              <TableCell className="text-xs">{candidate}</TableCell>
                              <TableCell className="text-xs">{project}</TableCell>
                              <TableCell className="text-xs">{String(row?.status ?? "").toUpperCase() || "—"}</TableCell>
                              <TableCell className="text-xs">{formatAmount(amountMinor, cur)}</TableCell>
                              <TableCell className="text-xs">{cur}</TableCell>
                              <TableCell className="text-xs">{createdLabel}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-full text-xs"
                                  onClick={() => openInvoice(orderId)}
                                  disabled={!orderId}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="upcoming" className="mt-4">
                <Card className="p-4 rounded-2xl bg-white/95 border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    <h2 className="text-sm md:text-base font-semibold text-slate-900">Upcoming payments</h2>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 mb-1">Search</p>
                      <Input
                        value={hireSearch}
                        onChange={(e) => setHireSearch(e.target.value)}
                        placeholder="Candidate or project"
                      />
                    </div>

                    <div className="w-full md:w-56">
                      <p className="text-xs text-slate-600 mb-1">Project</p>
                      <Select value={hireProject || "all"} onValueChange={(v) => setHireProject(v === "all" ? "" : v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {projectOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-40">
                      <p className="text-xs text-slate-600 mb-1">Currency</p>
                      <Select
                        value={upcomingCurrency || "all"}
                        onValueChange={(v) => setUpcomingCurrency(v === "all" ? "" : String(v || "").toUpperCase())}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-40">
                      <p className="text-xs text-slate-600 mb-1">Payment status</p>
                      <Select value={upcomingPayStatus || "all"} onValueChange={(v) => setUpcomingPayStatus(v === "all" ? "" : (v as any))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="partially_paid">Partially paid</SelectItem>
                          <SelectItem value="fully_paid">Fully paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">From</p>
                      <Input type="date" value={upcomingFrom} onChange={(e) => setUpcomingFrom(e.target.value)} />
                    </div>

                    <div className="w-full md:w-44">
                      <p className="text-xs text-slate-600 mb-1">To</p>
                      <Input type="date" value={upcomingTo} onChange={(e) => setUpcomingTo(e.target.value)} />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl text-xs"
                        onClick={() => {
                          setHireSearch("");
                          setHireProject("");
                          setUpcomingCurrency("");
                          setUpcomingPayStatus("");
                          setUpcomingFrom("");
                          setUpcomingTo("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  {hiresLoading ? (
                    <p className="text-sm text-slate-600">Loading...</p>
                  ) : hiresError ? (
                    <p className="text-sm text-red-600">{hiresError}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Start date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Upcoming payment date</TableHead>
                          <TableHead>Completed date</TableHead>
                          <TableHead>Upcoming payment</TableHead>
                          <TableHead>Total amount</TableHead>
                          <TableHead>Due amount</TableHead>
                          <TableHead className="text-right">Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUpcomingProposals
                          .map((p) => {
                            const offer = (p?.offerDetails ?? {}) as any;
                            const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
                            const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
                            const startDate = String(offer?.startDate ?? "").trim();
                            const duration = String(offer?.duration ?? "").trim();
                            const rawMonthlyAmount = Number(offer?.monthlyAmount ?? 0);
                            const totalPrice = Number(offer?.totalPrice ?? 0);
                            const internName = String(p?.internName ?? "").trim() || "Intern";
                            const projectName = projectLabel(p);
                            const currencyCode = String(
                              (hasFullTimeOffer ? (fullTimeOffer as any)?.ctcCurrency : offer?.currency) ?? p?.currency ?? "INR",
                            ).toUpperCase();

                            const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
                            const fullTimeFeeMajor =
                              hasFullTimeOffer && Number.isFinite(annualCtc) && annualCtc > 0
                                ? Math.max(0, Math.round((annualCtc * 8.33) / 100))
                                : 0;

                            const totalMonths = hasFullTimeOffer ? 1 : Math.max(1, monthsFromDuration(duration));
                            const effectiveMonthlyAmount = hasFullTimeOffer
                              ? fullTimeFeeMajor
                              : Number.isFinite(rawMonthlyAmount) && rawMonthlyAmount > 0
                                ? rawMonthlyAmount
                                : Number.isFinite(totalPrice) && totalPrice > 0
                                  ? totalPrice / totalMonths
                                  : 0;

                            const amountMinor = Math.round(Math.max(0, effectiveMonthlyAmount) * 100);
                            const totalAmountMinorRaw = hasFullTimeOffer
                              ? amountMinor
                              : Number.isFinite(totalPrice) && totalPrice > 0
                                ? Math.round(Math.max(0, totalPrice) * 100)
                                : amountMinor * totalMonths;

                            const proposalId = String(p?.id ?? "").trim();
                            const paidForProposal = (Array.isArray(paidOrders) ? paidOrders : []).filter((o: any) => {
                              if (orderStatus(o) !== "paid") return false;

                              const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
                              const isInOrder = String(o?.proposalId ?? "").trim() === proposalId || ids.includes(proposalId);
                              if (!isInOrder) return false;

                              const purpose = orderPurpose(o);
                              return purpose === "employer_monthly_payment" || purpose === "employer_checkout";
                            });

                            const checkoutTotalPaidForThisProposal = paidForProposal.some((o: any) => {
                              if (orderPurpose(o) !== "employer_checkout") return false;
                              if (orderPaymentMode(o) !== "total") return false;
                              const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
                              if (ids.length > 0) return ids.length === 1 && ids[0] === proposalId;
                              return String(o?.proposalId ?? "").trim() === proposalId;
                            });

                            const discountEligible = checkoutTotalPaidForThisProposal && totalMonths > 1 && rawMonthlyAmount > 0;
                            const totalAmountMinor = discountEligible
                              ? Math.max(0, Math.round(totalAmountMinorRaw * 0.9))
                              : totalAmountMinorRaw;

                            const paidAmountMinor = paidForProposal.reduce((sum: number, o: any) => {
                              const purpose = orderPurpose(o);
                              if (purpose === "employer_checkout") {
                                const ids = Array.isArray(o?.proposalIds) ? o.proposalIds : [];
                                const single = ids.length > 0
                                  ? ids.length === 1 && ids[0] === proposalId
                                  : String(o?.proposalId ?? "").trim() === proposalId;
                                if (!single) return sum;
                              }

                              const amt = Number(o?.amountMinor ?? o?.amount_minor ?? 0);
                              return sum + (Number.isFinite(amt) ? Math.max(0, amt) : 0);
                            }, 0);

                            const dueAmountMinor = Math.max(0, totalAmountMinor - paidAmountMinor);
                            const isFullyPaid = dueAmountMinor <= 0 || totalAmountMinor <= 0;

                            const paidMonths = paidForProposal.filter((o: any) => orderPurpose(o) === "employer_monthly_payment").length;
                            const upcomingDate = !isFullyPaid && startDate ? addMonthsToIso(startDate, Math.max(1, paidMonths + 1)) : "";

                            const completedAt = (() => {
                              if (!isFullyPaid) return "";
                              const latest = paidForProposal.reduce<Date | null>((acc, o: any) => {
                                const raw = (o?.paidAt ?? o?.paid_at ?? o?.createdAt ?? o?.created_at) as any;
                                if (!raw) return acc;
                                const d = raw instanceof Date ? raw : new Date(raw);
                                if (Number.isNaN(d.getTime())) return acc;
                                if (!acc) return d;
                                return d.getTime() > acc.getTime() ? d : acc;
                              }, null);
                              return latest ? isoDateOnly(latest) : "";
                            })();

                            const upcomingAmountMinor = isFullyPaid ? 0 : Math.min(amountMinor, dueAmountMinor);

                            return (
                              <TableRow key={proposalId || Math.random()}>
                                <TableCell className="text-xs">{internName}</TableCell>
                                <TableCell className="text-xs">{projectName}</TableCell>
                                <TableCell className="text-xs">{startDate || "—"}</TableCell>
                                <TableCell className="text-xs">{hasFullTimeOffer ? "Full-time offer" : formatDurationLabel(duration)}</TableCell>
                                <TableCell className="text-xs">{upcomingDate || "—"}</TableCell>
                                <TableCell className="text-xs">{completedAt || "—"}</TableCell>
                                <TableCell className="text-xs">{formatAmount(upcomingAmountMinor, currencyCode)}</TableCell>
                                <TableCell className="text-xs">{formatAmount(totalAmountMinor, currencyCode)}</TableCell>
                                <TableCell className="text-xs">{formatAmount(dueAmountMinor, currencyCode)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 rounded-full text-xs bg-emerald-600 hover:bg-emerald-700"
                                    disabled={payingProposalId === proposalId || isFullyPaid}
                                    onClick={() => void payUpcomingMonthly(p)}
                                  >
                                    <CreditCard className="w-3.5 h-3.5 mr-1" />
                                    {payingProposalId === proposalId ? "Processing..." : isFullyPaid ? "Paid" : "Pay"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                          .filter(Boolean) as any}
                      </TableBody>
                    </Table>
                  )}
                
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}