import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CandidateHeader } from "@/components/CandidateHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_USD_TO_INR_RATE, formatMoney, formatMonthlyStipendForInternView } from "@/lib/currency";

export default function EarningsPage() {
  const [, setLocation] = useLocation();
  const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

  const { data, isLoading, error } = useQuery<{ proposals: any[] }>({
    queryKey: ["/api/intern/proposals", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) return { proposals: [] };
      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/proposals`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch proposals";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const { data: payoutsResp } = useQuery<{
    items: any[];
    summary: {
      paidMinor: number;
      pendingMinor: number;
      failedMinor: number;
      lastPaidAt: string | null;
      derivedPendingMinor?: number;
    };
    derivedPendingMinorByProposalId?: Record<string, number>;
  }>({
    queryKey: ["/api/intern/payouts", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) {
        return {
          items: [],
          summary: { paidMinor: 0, pendingMinor: 0, failedMinor: 0, lastPaidAt: null },
        };
      }
      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/payouts?limit=500`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch payout history";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const earningOffers = useMemo(() => {
    const proposals = Array.isArray(data?.proposals) ? data?.proposals : [];
    return proposals.filter((p) => String(p?.status ?? "").trim().toLowerCase() === "hired");
  }, [data?.proposals]);

  const totalMonthly = useMemo(() => {
    return earningOffers.reduce((acc, p) => {
      const findternScore = Number((p as any)?.findternScore ?? 0);
      const isNoStipend = Number.isFinite(findternScore) && findternScore > 0 && findternScore < 6;
      if (isNoStipend) return acc;

      const offer = (p?.offerDetails || {}) as any;
      const raw = offer?.monthlyAmount;
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return acc;

      const currencyRaw = String(offer?.currency ?? (p as any)?.currency ?? "INR").trim().toUpperCase();
      const asInr = currencyRaw === "USD" ? Math.round(n * DEFAULT_USD_TO_INR_RATE) : n;
      return acc + asInr;
    }, 0);
  }, [earningOffers]);

  const payoutSummary = useMemo(() => {
    return payoutsResp?.summary ?? { paidMinor: 0, pendingMinor: 0, failedMinor: 0, lastPaidAt: null };
  }, [payoutsResp?.summary]);

  const payoutPaidMajor = useMemo(() => Math.floor((Number(payoutSummary.paidMinor ?? 0) || 0) / 100), [payoutSummary.paidMinor]);
  const payoutPendingMajor = useMemo(() => {
    const derived = Number((payoutSummary as any)?.derivedPendingMinor ?? 0) || 0;
    const rawPending = Number(payoutSummary.pendingMinor ?? 0) || 0;
    const useMinor = derived > 0 ? derived : rawPending;
    return Math.floor(useMinor / 100);
  }, [payoutSummary]);

  const nextPendingPayoutDate = useMemo(() => {
    const items = Array.isArray(payoutsResp?.items) ? payoutsResp?.items : [];
    const pending = items
      .filter((row: any) => String(row?.status ?? "").trim().toLowerCase() === "pending")
      .map((row: any) => {
        const raw = row?.raw ?? {};
        const scheduledFor = String(raw?.scheduledFor ?? raw?.scheduled_for ?? "").trim();
        const createdAt = String(row?.createdAt ?? row?.created_at ?? "").trim();
        const paidAt = String(row?.paidAt ?? row?.paid_at ?? "").trim();
        const iso = scheduledFor || paidAt || createdAt;
        const d = iso ? new Date(iso) : null;
        return {
          iso: iso ? iso.slice(0, 10) : "",
          time: d && Number.isFinite(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY,
        };
      })
      .filter((x) => x.iso && Number.isFinite(x.time));

    if (pending.length === 0) return "";
    pending.sort((a, b) => a.time - b.time);
    return pending[0]?.iso ?? "";
  }, [payoutsResp?.items]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <CandidateHeader />

      <div className="container px-4 md:px-6 py-8 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0E6049]">My Earnings</h1>
            <p className="text-sm text-muted-foreground">
              Earnings are based on hired offers.
            </p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/dashboard")}>Back</Button>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        {!isLoading && error instanceof Error && (
          <p className="text-sm text-red-600">{error.message}</p>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4 md:p-5">
              <div className="text-xs text-slate-600">Total monthly stipend</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">₹{totalMonthly.toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-500">From active hired proposals</div>
            </Card>

            <Card className="p-4 md:p-5">
              <div className="text-xs text-slate-600">Paid by Findtern</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(payoutPaidMajor, "INR") || "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {payoutSummary.lastPaidAt ? `Last paid: ${String(payoutSummary.lastPaidAt).slice(0, 10)}` : "No payout yet"}
              </div>
            </Card>

            <Card className="p-4 md:p-5">
              <div className="text-xs text-slate-600">Pending payout</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">
                {formatMoney(payoutPendingMajor, "INR") || "—"}
              </div>
              <div className="mt-1 text-xs text-slate-500">Includes pending items</div>
              {nextPendingPayoutDate ? (
                <div className="mt-1 text-xs text-slate-500">Next payout: {nextPendingPayoutDate}</div>
              ) : null}
            </Card>
          </div>
        )}

        {!isLoading && !error && earningOffers.length === 0 && (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">
              No hired offers yet.
            </p>
          </Card>
        )}

        {!isLoading && !error && earningOffers.length > 0 && (
          <div className="space-y-3">
            {earningOffers.map((p) => {
              const offer = (p?.offerDetails || {}) as any;
              const monthlyAmount = offer?.monthlyAmount;
              const projectName = String((p as any)?.projectName ?? "").trim();
              const companyName = String((p as any)?.employerCompanyName ?? (p as any)?.employerName ?? "").trim();

              const findternScore = Number((p as any)?.findternScore ?? 0);
              const showNoStipend = Number.isFinite(findternScore) && findternScore > 0 && findternScore < 6;

              const currencyRaw = String(offer?.currency ?? (p as any)?.currency ?? "INR").trim().toUpperCase();
              const stipendDisplay =
                showNoStipend
                  ? "Not eligible for stipend"
                  : monthlyAmount !== undefined && monthlyAmount !== null
                    ? formatMonthlyStipendForInternView({
                        monthlyAmount: Number(monthlyAmount),
                        offerCurrency: currencyRaw,
                      }) || `₹${String(monthlyAmount)}`
                    : "—";

              const paidMinor = (() => {
                const items = Array.isArray(payoutsResp?.items) ? payoutsResp?.items : [];
                const pid = String((p as any)?.id ?? "").trim();
                return items
                  .filter((row: any) => {
                    const st = String(row?.status ?? "").trim().toLowerCase();
                    if (st !== "paid") return false;
                    const raw = row?.raw ?? {};
                    const rid = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
                    return pid && rid && pid === rid;
                  })
                  .reduce((acc: number, row: any) => {
                    const amt = Number(row?.amountMinor ?? row?.amount_minor ?? 0) || 0;
                    return acc + Math.max(0, amt);
                  }, 0);
              })();

              const pendingMinor = (() => {
                const items = Array.isArray(payoutsResp?.items) ? payoutsResp?.items : [];
                const pid = String((p as any)?.id ?? "").trim();
                const explicitPending = items
                  .filter((row: any) => {
                    const st = String(row?.status ?? "").trim().toLowerCase();
                    if (st !== "pending") return false;
                    const raw = row?.raw ?? {};
                    const rid = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
                    return pid && rid && pid === rid;
                  })
                  .reduce((acc: number, row: any) => {
                    const amt = Number(row?.amountMinor ?? row?.amount_minor ?? 0) || 0;
                    return acc + Math.max(0, amt);
                  }, 0);
                const derived = Math.max(
                  0,
                  Number((payoutsResp as any)?.derivedPendingMinorByProposalId?.[pid] ?? 0) || 0,
                );
                return explicitPending > 0 ? explicitPending : derived;
              })();

              const nextPayoutDate = (() => {
                const items = Array.isArray(payoutsResp?.items) ? payoutsResp?.items : [];
                const pid = String((p as any)?.id ?? "").trim();
                const pendingRows = items
                  .filter((row: any) => {
                    const st = String(row?.status ?? "").trim().toLowerCase();
                    if (st !== "pending") return false;
                    const raw = row?.raw ?? {};
                    const rid = String(raw?.proposalId ?? raw?.proposal_id ?? "").trim();
                    return pid && rid && pid === rid;
                  })
                  .map((row: any) => {
                    const raw = row?.raw ?? {};
                    const scheduledFor = String(raw?.scheduledFor ?? raw?.scheduled_for ?? "").trim();
                    const createdAt = String(row?.createdAt ?? row?.created_at ?? "").trim();
                    const iso = scheduledFor || createdAt;
                    const d = iso ? new Date(iso) : null;
                    return {
                      iso: iso ? iso.slice(0, 10) : "",
                      time: d && Number.isFinite(d.getTime()) ? d.getTime() : Number.POSITIVE_INFINITY,
                    };
                  })
                  .filter((x) => x.iso && Number.isFinite(x.time));

                if (pendingRows.length === 0) return "";
                pendingRows.sort((a, b) => a.time - b.time);
                return pendingRows[0]?.iso ?? "";
              })();

              return (
                <Card key={p.id} className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {String(offer?.roleTitle ?? "").trim() || projectName || "Hired offer"}
                      </div>
                      {companyName ? (
                        <div className="mt-0.5 text-xs text-slate-600 truncate">{companyName}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-600">
                        {String(offer?.location ?? "").trim() ? `${String(offer?.location ?? "").trim()} • ` : ""}
                        {String(offer?.duration ?? "").trim() ? `Duration: ${String(offer?.duration ?? "").trim()}` : ""}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-800 shrink-0">
                      {showNoStipend ? "No stipend" : "Hired"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-[11px] text-slate-600">Monthly stipend</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {stipendDisplay}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-[11px] text-slate-600">Paid (Findtern)</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {formatMoney(Math.floor(paidMinor / 100), "INR") || "—"}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <div className="text-[11px] text-slate-600">Pending payout</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {formatMoney(Math.floor(pendingMinor / 100), "INR") || "—"}
                      </div>
                      {nextPayoutDate ? (
                        <div className="mt-1 text-[11px] text-slate-600">Payout date: {nextPayoutDate}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setLocation(`/proposals/${encodeURIComponent(String(p.id))}`)}
                    >
                      View proposal
                    </Button>
                    <Button
                      className="w-full sm:w-auto bg-[#0E6049] hover:bg-[#0b4b3a]"
                      onClick={() => setLocation(`/timesheets?proposalId=${encodeURIComponent(String(p.id))}`)}
                    >
                      View timesheet
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
