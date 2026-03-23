export type CmsPlan = {
  id?: string;
  slug?: string | null;
  name?: string | null;
  currency?: string | null;
  priceHourlyMinor?: number | null;
  perHireChargeMinor?: number | null;
  features?: string[] | null;
};

export type ScoreTier = {
  slug: string;
  currency: string;
  priceHourlyMinor: number;
  min: number;
  max?: number;
};

export type ResolvedPricing = {
  slug?: string;
  currency: string;
  priceHourlyMinor: number;
  perHireChargeMinor: number;
};

export function parseScoreBand(label: string): { min: number; max?: number } {
  const raw = String(label ?? "").trim();
  const s = raw.replace(/⭐/g, "").trim().toLowerCase();

  const plus = s.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:\/\s*10)?/);
  if (plus) {
    return { min: Number(plus[1]) };
  }

  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–to]+\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }

  const lt = s.match(/less\s+than\s+(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
  if (lt) {
    return { min: Number.NEGATIVE_INFINITY, max: Number(lt[1]) };
  }

  const under = s.match(/<\s*(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
  if (under) {
    return { min: Number.NEGATIVE_INFINITY, max: Number(under[1]) };
  }

  return { min: Number.NEGATIVE_INFINITY, max: Infinity };
}

export function deriveScoreTiers(plans: CmsPlan[]): ScoreTier[] {
  const out: ScoreTier[] = [];
  for (const p of Array.isArray(plans) ? plans : []) {
    const slug = String(p?.slug ?? p?.name ?? "").trim().toLowerCase();
    if (!slug) continue;

    const currency = String(p?.currency ?? "").trim().toUpperCase() || "INR";
    const priceHourlyMinor = Number(p?.priceHourlyMinor ?? 0);

    const features = Array.isArray(p?.features) ? p?.features ?? [] : [];
    const bandText = typeof features[1] === "string" ? String(features[1]) : "";
    const band = parseScoreBand(bandText);

    if (!Number.isFinite(band.min)) continue;
    if (band.max !== undefined && !Number.isFinite(band.max)) {
      delete (band as any).max;
    }

    out.push({
      slug,
      currency,
      priceHourlyMinor: Number.isFinite(priceHourlyMinor) ? priceHourlyMinor : 0,
      min: band.min,
      max: band.max,
    });
  }

  return out
    .slice()
    .sort((a, b) => {
      if (a.min !== b.min) return a.min - b.min;
      const aMax = a.max ?? Infinity;
      const bMax = b.max ?? Infinity;
      return aMax - bMax;
    });
}

export function pickTier(score: number, tiers: ScoreTier[]): ScoreTier | undefined {
  const s = Number(score);
  if (!Number.isFinite(s)) return undefined;

  const list = Array.isArray(tiers) ? tiers : [];
  for (const t of list) {
    const min = Number(t.min);
    const max = t.max == null ? Infinity : Number(t.max);
    if (!Number.isFinite(min)) continue;
    if (!Number.isFinite(max)) continue;
    if (s >= min && s < max) return t;
  }

  const last = list[list.length - 1];
  if (!last) return undefined;
  if (s >= last.min) return last;
  return undefined;
}

export function hourlyMinorToPseudoInrMajor(minor: number, currency: string): number {
  const c = String(currency ?? "").trim().toUpperCase();
  const m = Number(minor);
  if (!Number.isFinite(m) || m <= 0) return 0;
  const major = m / 100;
  if (c === "USD") return major * 100;
  return major;
}

export function formatCurrencyMinor(minor: number, currency: string): string {
  const cur = String(currency || "USD").toUpperCase();
  const major = Number(minor || 0) / 100;
  const hasDecimals = Math.round(major * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(major);

  if (cur === "USD") return `$${formatted}`;
  if (cur === "INR") return `₹${formatted}`;
  return `${cur} ${formatted}`;
}

export function resolvePricingForScore(
  findternScore: number,
  plans: CmsPlan[],
  options?: { expectedCurrency?: string },
): ResolvedPricing | undefined {
  const expected = String(options?.expectedCurrency ?? "").trim().toUpperCase();
  const list = Array.isArray(plans) ? plans : [];
  if (list.length === 0) return undefined;

  const tiersAll = deriveScoreTiers(list);
  const tiers = expected ? tiersAll.filter((t) => t.currency === expected) : tiersAll;
  const picked = pickTier(findternScore, tiers.length ? tiers : tiersAll);
  if (!picked) return undefined;

  const matchPlan = (arr: CmsPlan[]) =>
    arr.find((p) => {
      const slug = String(p?.slug ?? p?.name ?? "").trim().toLowerCase();
      return slug === picked.slug;
    });

  const planInExpected = expected
    ? matchPlan(list.filter((p) => String(p?.currency ?? "").trim().toUpperCase() === expected))
    : undefined;
  const planAny = matchPlan(list);
  const plan = planInExpected ?? planAny;

  const currency = String(plan?.currency ?? picked.currency ?? expected ?? "").trim().toUpperCase() || "INR";
  const priceHourlyMinor = Number(plan?.priceHourlyMinor ?? picked.priceHourlyMinor ?? 0);
  const perHireChargeMinor = Number(plan?.perHireChargeMinor ?? 0);

  return {
    slug: picked.slug,
    currency,
    priceHourlyMinor: Number.isFinite(priceHourlyMinor) ? priceHourlyMinor : 0,
    perHireChargeMinor: Number.isFinite(perHireChargeMinor) ? perHireChargeMinor : 0,
  };
}

export async function fetchPricingPlans(options?: { country?: string }): Promise<CmsPlan[]> {
  const country = String(options?.country ?? "").trim();
  const url = `/api/pricing${country ? `?country=${encodeURIComponent(country)}` : ""}`;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return [];
    const j = await res.json().catch(() => null);
    const items = Array.isArray(j?.items) ? j.items : [];
    return items as CmsPlan[];
  } catch {
    return [];
  }
}

export function resolveHourlyRatePseudoInrMajor(
  findternScore: number,
  plans: CmsPlan[],
  options?: { expectedCurrency?: string },
): number {
  const expected = String(options?.expectedCurrency ?? "").trim().toUpperCase();
  const tiersAll = deriveScoreTiers(plans);
  const tiers = expected ? tiersAll.filter((t) => t.currency === expected) : tiersAll;
  const picked = pickTier(findternScore, tiers.length ? tiers : tiersAll);
  if (!picked) return 0;
  return hourlyMinorToPseudoInrMajor(picked.priceHourlyMinor, picked.currency);
}

export function fallbackHourlyRatePseudoInrMajor(findternScore: number, expectedCurrency: string): number {
  const s = Number(findternScore);
  if (!Number.isFinite(s)) return 0;
  const cur = String(expectedCurrency ?? "").trim().toUpperCase();

  if (s >= 8) return cur === "USD" ? 200 : 200;
  if (s >= 6) return cur === "USD" ? 100 : 100;
  return 0;
}
