export function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);

  if ([year, month, day, hour, minute, second].some((n) => Number.isNaN(n))) {
    throw new Error("Could not compute timezone offset");
  }

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

export type TimeZoneOption = { value: string; label: string };

const WORLD_TIME_API_TZ_STORAGE_KEY = "worldtimeapi:timezones:v1";
const WORLD_TIME_API_TZ_FETCHED_AT_KEY = "worldtimeapi:timezonesFetchedAt:v1";
const WORLD_TIME_API_TZ_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function safeReadLocalStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteLocalStorage(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function normalizeIanaTimezones(list: unknown): string[] {
  const raw = Array.isArray(list) ? list : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const tz = String(item ?? "").trim();
    if (!tz) continue;
    const key = tz.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tz);
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function fetchIanaTimezonesFromWorldTimeApi(): Promise<string[]> {
  const res = await fetch("/api/timezones", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const list = (json as any)?.timezones;
  return normalizeIanaTimezones(list);
}

export async function getIanaTimezonesCached(fallback: TimeZoneOption[] = []): Promise<TimeZoneOption[]> {
  const fallbackValues = normalizeIanaTimezones(fallback.map((f) => f.value));
  const fallbackByValueLower = new Map(
    fallback.map((f) => [String(f.value ?? "").trim().toLowerCase(), f] as const).filter((x) => x[0]),
  );

  const cachedRaw = safeReadLocalStorage(WORLD_TIME_API_TZ_STORAGE_KEY);
  const cachedAtRaw = safeReadLocalStorage(WORLD_TIME_API_TZ_FETCHED_AT_KEY);
  const cachedAt = cachedAtRaw ? new Date(cachedAtRaw).getTime() : 0;
  const now = Date.now();

  if (cachedRaw && Number.isFinite(cachedAt) && cachedAt > 0 && now - cachedAt < WORLD_TIME_API_TZ_TTL_MS) {
    const parsed = (() => {
      try {
        return JSON.parse(cachedRaw);
      } catch {
        return null;
      }
    })();
    const list = normalizeIanaTimezones(parsed);
    if (list.length > 0) {
      return list.map((tz) => fallbackByValueLower.get(tz.toLowerCase()) ?? { value: tz, label: tz });
    }
  }

  try {
    const list = await fetchIanaTimezonesFromWorldTimeApi();
    if (list.length > 0) {
      safeWriteLocalStorage(WORLD_TIME_API_TZ_STORAGE_KEY, JSON.stringify(list));
      safeWriteLocalStorage(WORLD_TIME_API_TZ_FETCHED_AT_KEY, new Date().toISOString());
      return list.map((tz) => fallbackByValueLower.get(tz.toLowerCase()) ?? { value: tz, label: tz });
    }
  } catch {
    // ignore
  }

  return fallbackValues.map((tz) => fallbackByValueLower.get(tz.toLowerCase()) ?? { value: tz, label: tz });
}

export function addDaysToDateString(datePart: string, days: number) {
  const m = String(datePart ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if ([year, month, day].some((n) => Number.isNaN(n))) return null;

  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function parseDateTimeInTimeZoneToUtc(datePart: string, timePart: string, timeZone: string) {
  const dm = String(datePart ?? "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = String(timePart ?? "").trim().match(/^(\d{2}):(\d{2})$/);
  if (!dm || !tm) return null;

  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  const hour = Number(tm[1]);
  const minute = Number(tm[2]);

  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

  try {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const offset = getTimeZoneOffsetMs(timeZone, utcGuess);
    const utcDate = new Date(utcGuess.getTime() - offset);
    if (Number.isNaN(utcDate.getTime())) return null;
    return utcDate;
  } catch {
    return null;
  }
}

export function formatHHmmInTimeZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const hh = map.hour;
  const mm = map.minute;
  if (!hh || !mm) return "";
  return `${hh}:${mm}`;
}

export function formatTimeRangeInTimeZone(startUtc: Date | null, endUtc: Date | null, timeZone: string) {
  if (!startUtc || !endUtc) return "";
  const s = formatHHmmInTimeZone(startUtc, timeZone);
  const e = formatHHmmInTimeZone(endUtc, timeZone);
  if (!s || !e) return "";
  return `${s} - ${e}`;
}

export type TimeApiZoneInfo = {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  seconds?: number;
  milliSeconds?: number;
  dateTime?: string;
  date?: string;
  time?: string;
  timeZone?: string;
  dayOfWeek?: string;
  dstActive: boolean;
};

export async function fetchTimeApiZoneInfo(timeZone: string): Promise<TimeApiZoneInfo | null> {
  const tz = String(timeZone ?? "").trim();
  if (!tz) return null;

  const res = await fetch(`/api/time/current/zone?timeZone=${encodeURIComponent(tz)}`);
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  if (!json || typeof json !== "object") return null;
  return {
    year: (json as any).year,
    month: (json as any).month,
    day: (json as any).day,
    hour: (json as any).hour,
    minute: (json as any).minute,
    seconds: (json as any).seconds,
    milliSeconds: (json as any).milliSeconds,
    dateTime: (json as any).dateTime,
    date: (json as any).date,
    time: (json as any).time,
    timeZone: (json as any).timeZone,
    dayOfWeek: (json as any).dayOfWeek,
    dstActive: Boolean((json as any).dstActive),
  };
}
