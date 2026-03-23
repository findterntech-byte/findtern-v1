export const DEFAULT_USD_TO_INR_RATE = 100;

export function inferIsIndiaFromEmployerMeta(employer?: {
  country?: string | null;
  countryCode?: string | null;
} | null): boolean {
  try {
    const c = String(employer?.country ?? "").trim().toLowerCase();
    if (c) {
      if (c === "india" || c === "in" || c.includes("india")) return true;
      return false;
    }
  } catch {
    // ignore
  }

  try {
    const code = String(employer?.countryCode ?? "").trim();
    if (code) return code === "+91";
  } catch {
    // ignore
  }

  return false;
}

export function formatMoney(amount: number, currency: "INR" | "USD"): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatMonthlyStipendForInternView(opts: {
  monthlyAmount: number;
  employer?: { country?: string | null; countryCode?: string | null } | null;
  offerCurrency?: string | null;
  assumedForeignCurrency?: "USD";
  usdToInrRate?: number;
}): string {
  const n = Number(opts.monthlyAmount ?? 0);
  if (!Number.isFinite(n) || n <= 0) return "";

  const offerCurrency = String(opts.offerCurrency ?? "")
    .trim()
    .toUpperCase();

  if (offerCurrency === "INR") {
    return formatMoney(n, "INR");
  }

  const isIndia = inferIsIndiaFromEmployerMeta(opts.employer);

  if (offerCurrency === "USD") {
    const rate = Number(opts.usdToInrRate ?? DEFAULT_USD_TO_INR_RATE);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_INR_RATE;
    const converted = Math.round(n * safeRate);
    return formatMoney(converted, "INR");
  }

  if (isIndia) {
    return formatMoney(n, "INR");
  }

  const rate = Number(opts.usdToInrRate ?? DEFAULT_USD_TO_INR_RATE);
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_INR_RATE;
  const converted = Math.round(n * safeRate);
  return formatMoney(converted, "INR");
}
