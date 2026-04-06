import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Receipt, ExternalLink, CreditCard } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import { getEmployerAuth, inferEmployerIsIndia, saveEmployerAuth } from "@/lib/employerAuth";
import { apiRequest } from "@/lib/queryClient";
import { fetchPricingPlans, formatCurrencyMinor, resolvePricingForScore, type CmsPlan } from "@/lib/pricingTiers";
import { useToast } from "@/hooks/use-toast";

type CheckoutProposal = {
  id: string;
  internId: string;
  internName: string;
  projectName: string;
  status: string;
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
      jobMode?: string;
      jobLocationCity?: string;
      jobLocationState?: string;
      annualCtc?: number;
      ctcCurrency?: string;
    };
  };
};

type CheckoutItem = {
  proposalId: string;
  internId: string;
  candidateName: string;
  projectName: string;
  durationLabel: string;
  monthlyAmount: number;
  totalPrice: number;
  currency: "INR" | "USD";
  mode: string;
  location: string;
  hourlyPriceLabel: string;
  isFullTimeOffer: boolean;
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

export default function EmployerCheckoutPage() {
  const [currentLocation, setLocation] = useLocation();
  const { toast } = useToast();

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

  const normalizeCurrency = (value: unknown): "INR" | "USD" => {
    const v = String(value ?? "").trim().toUpperCase();
    return v === "USD" ? "USD" : "INR";
  };

  const auth = getEmployerAuth();
  const employerId = auth?.id as string | undefined;

  const selectedProjectIdStorageKey = "employerSelectedProjectId";

  const [loading, setLoading] = useState(true);
  const [rawAccepted, setRawAccepted] = useState<CheckoutProposal[]>([]);
  const [internPricingMetaById, setInternPricingMetaById] = useState<
    Record<string, { findternScore: number; location: string; state: string }>
  >({});

  const [viewerIsIndia, setViewerIsIndia] = useState(() => inferEmployerIsIndia(getEmployerAuth()));
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

  const getCandidateHourlyPriceLabel = (
    candidate: { findternScore?: number; state?: string; location?: string },
    currency: "INR" | "USD",
  ) => {
    const score = Number(candidate.findternScore ?? 0);
    const resolved = resolvePricingForScore(score, pricingPlans, { expectedCurrency: currency });
    if (resolved) {
      const minor = Number(resolved.priceHourlyMinor ?? 0);
      if (!Number.isFinite(minor) || minor <= 0) return "Free";
      return `${formatCurrencyMinor(minor, resolved.currency)}/hr`;
    }

    const tier: "low" | "mid" | "high" = score < 6 ? "low" : score < 8 ? "mid" : "high";

    if (currency === "INR") {
      if (tier === "low") return "Free";
      if (tier === "mid") return "₹100/hr";
      return "₹200/hr";
    }

    if (tier === "low") return "Free";
    if (tier === "mid") return "$1/hr";
    return "$2/hr";
  };

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

        const next: Record<string, { findternScore: number; location: string; state: string }> = {};
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
    if (!employerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const projectId = (() => {
          try {
            return window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          } catch {
            return "";
          }
        })();
        const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

        const res = await fetch(`/api/employer/${encodeURIComponent(employerId)}/proposals${qs}`);
        if (!res.ok) throw new Error("Failed to load proposals");
        const json = await res.json().catch(() => null);
        const proposals = (json?.proposals ?? []) as any[];

        const accepted = proposals
          .filter((p) => String(p?.status ?? "").toLowerCase() === "accepted")
          .map((p) => {
            const internId = String(p?.internId ?? p?.intern_id ?? "").trim();
            const internName = String(p?.internName ?? "Intern");
            return {
              id: String(p?.id ?? ""),
              internId,
              internName,
              projectName: String(p?.projectName ?? "Project"),
              status: String(p?.status ?? ""),
              createdAt: p?.createdAt,
              offerDetails: p?.offerDetails ?? {},
            } satisfies CheckoutProposal;
          })
          .filter((p) => p.id && p.internId);

        if (!cancelled) setRawAccepted(accepted);
      } catch (e) {
        if (!cancelled) {
          setRawAccepted([]);
          toast({
            title: "Could not load checkout",
            description: "Something went wrong while fetching accepted proposals.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId, toast]);

  const items: CheckoutItem[] = useMemo(() => {
    return rawAccepted.map((p) => {
      const offer = p.offerDetails ?? {};
      const fullTimeOffer = (offer as any)?.fullTimeOffer ?? null;
      const hasFullTimeOffer = !!fullTimeOffer && typeof fullTimeOffer === "object";
      const months = monthsFromDuration(offer.duration);
      const currency = normalizeCurrency(offer.currency ?? p.currency ?? (viewerIsIndia ? "INR" : "USD"));
      const meta = internPricingMetaById[String(p.internId ?? "").trim()];
      const score = Number(meta?.findternScore ?? 0);
      const fallbackMonthly = Number.isFinite(score) && score < 6 ? 5000 : 0;
      const monthlyFromOffer = typeof offer.monthlyAmount === "number" ? offer.monthlyAmount : 0;
      const monthly = hasFullTimeOffer ? 0 : monthlyFromOffer > 0 ? monthlyFromOffer : fallbackMonthly;
      const totalFromOffer = typeof offer.totalPrice === "number" ? offer.totalPrice : 0;
      const total = (() => {
        if (totalFromOffer > 0) return totalFromOffer;
        if (hasFullTimeOffer) {
          const annualCtc = Number((fullTimeOffer as any)?.annualCtc ?? 0);
          if (!Number.isFinite(annualCtc) || annualCtc <= 0) return 0;
          return Math.max(0, (annualCtc * 8.33) / 100);
        }
        return monthly * months;
      })();

      const hourlyPriceLabel = getCandidateHourlyPriceLabel({
        findternScore: meta?.findternScore ?? 0,
        location: meta?.location ?? "",
        state: meta?.state ?? "",
      }, currency);

      return {
        proposalId: p.id,
        internId: p.internId,
        candidateName: p.internName,
        projectName: p.projectName,
        durationLabel: hasFullTimeOffer ? "Full-time" : durationLabelFromDuration(offer.duration),
        monthlyAmount: monthly,
        totalPrice: total,
        currency,
        mode: (() => {
          if (!hasFullTimeOffer) return String(offer.mode ?? "Remote");
          const raw = String((fullTimeOffer as any)?.jobMode ?? "").trim();
          return raw ? raw : "remote";
        })(),
        location: (() => {
          if (!hasFullTimeOffer) return String(offer.location ?? "Location not specified");
          const mode = String((fullTimeOffer as any)?.jobMode ?? "").trim().toLowerCase();
          if (mode === "remote") return "Remote";
          const city = String((fullTimeOffer as any)?.jobLocationCity ?? "").trim();
          const state = String((fullTimeOffer as any)?.jobLocationState ?? "").trim();
          return [city, state].filter(Boolean).join(", ") || "Location not specified";
        })(),
        hourlyPriceLabel,
        isFullTimeOffer: hasFullTimeOffer,
      };
    });
  }, [internPricingMetaById, rawAccepted, viewerIsIndia]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="checkout" />

      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Checkout</h1>
              <p className="text-slate-500 text-sm">Accepted proposals ready to hire</p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 rounded-3xl border-slate-100 bg-white/80">
            <p className="text-sm text-slate-600">Loading accepted proposals...</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-10 rounded-3xl border-dashed border-slate-200 bg-white/80 text-center">
            <p className="text-base font-semibold text-slate-800">No accepted proposals yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Once a candidate accepts your proposal, they will appear here.
            </p>
            <div className="mt-5">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLocation("/employer/proposals")}>
                View proposals
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const currencyLocale = item.currency === "INR" ? "en-IN" : "en-US";
              const fractionDigits = 0;
              const monthlyLabel = new Intl.NumberFormat(currencyLocale, {
                style: "currency",
                currency: item.currency,
                maximumFractionDigits: fractionDigits,
              }).format(item.monthlyAmount || 0);

              const totalLabel = new Intl.NumberFormat(currencyLocale, {
                style: "currency",
                currency: item.currency,
                maximumFractionDigits: fractionDigits,
              }).format(item.totalPrice || 0);

              return (
                <Card
                  key={item.proposalId}
                  className="p-5 border border-slate-100 shadow-sm rounded-2xl bg-white"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-900 truncate">{item.candidateName}</p>
                        <Badge className="bg-emerald-600 text-white text-[10px] font-semibold rounded-full">Accepted</Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="font-medium text-slate-700">Project:</span> {item.projectName}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {item.location} · {item.mode} · {item.durationLabel}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-700">
                          Monthly: {monthlyLabel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-emerald-200 text-emerald-700 bg-emerald-50">
                          Total: {totalLabel}
                        </Badge>
                        {!item.isFullTimeOffer ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full border-slate-200 text-slate-700">
                            Price: {item.hourlyPriceLabel}
                          </Badge>
                        ) : null}
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
                        className="h-9 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          toast({
                            title: "Proceed to hire",
                            description: "Payment and onboarding flow is not integrated yet. This will be connected next.",
                          });
                          removeInternIdsFromAllCompareLists([item.internId]);
                          setLocation("/employer/orders");
                        }}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        Proceed to Hire
                      </Button>
                    </div>
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
