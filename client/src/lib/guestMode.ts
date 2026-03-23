const STORAGE_KEY = "guestMode";

export function isGuestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableGuestMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("userEmail");
  } catch {
    // ignore
  }
}

export function disableGuestMode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
