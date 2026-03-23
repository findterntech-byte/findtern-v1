export type EmployerAuth = {
  id: string;
  companyEmail: string;
  setupCompleted: boolean;
  onboardingCompleted: boolean;
  name?: string;
  companyName?: string;
  country?: string;
  countryCode?: string;
};

const STORAGE_KEY = "employerAuth";
const PROVIDER_KEY = "employerAuthProvider";

export function saveEmployerAuth(
  employer: any,
  options?: {
    persist?: "local" | "session";
  },
) {
  if (!employer || !employer.id) return;
  const payload: EmployerAuth = {
    id: employer.id,
    companyEmail: employer.companyEmail,
    setupCompleted: employer.setupCompleted ?? false,
    onboardingCompleted: employer.onboardingCompleted ?? false,
    name: employer.name,
    companyName: employer.companyName,
    country: employer.country,
    countryCode: employer.countryCode,
  };
  if (typeof window !== "undefined") {
    const persist = options?.persist ?? "local";
    if (persist === "session") {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function setEmployerAuthProvider(
  provider: "google" | "password" | string,
  options?: {
    persist?: "local" | "session";
  },
) {
  if (typeof window === "undefined") return;
  const persist = options?.persist ?? "local";
  try {
    if (persist === "session") {
      window.sessionStorage.setItem(PROVIDER_KEY, String(provider));
      window.localStorage.removeItem(PROVIDER_KEY);
      return;
    }
    window.localStorage.setItem(PROVIDER_KEY, String(provider));
    window.sessionStorage.removeItem(PROVIDER_KEY);
  } catch {
    return;
  }
}

export function getEmployerAuthProvider(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(PROVIDER_KEY) ?? window.localStorage.getItem(PROVIDER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getEmployerAuth(): EmployerAuth | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EmployerAuth;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearEmployerAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(PROVIDER_KEY);
  window.sessionStorage.removeItem(PROVIDER_KEY);
}

export function inferEmployerIsIndia(auth?: EmployerAuth | null): boolean {
  try {
    const cc = String(auth?.country ?? "").trim().toLowerCase();
    if (cc) {
      if (cc === "india" || cc === "in" || cc.includes("india")) return true;
      return false;
    }
  } catch {
    // ignore
  }

  try {
    const code = String(auth?.countryCode ?? "").trim();
    if (code) return code === "+91";
  } catch {
    // ignore
  }

  return false;
}
