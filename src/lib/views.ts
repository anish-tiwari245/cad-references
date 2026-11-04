// Records a view once per browser per CAD file, ever. No reactive UI state
// depends on this (unlike favorites), so a plain localStorage set is enough;
// no useSyncExternalStore wiring needed.
const STORAGE_KEY = "ftc-cad-base:viewed";

function readViewed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function registerView(id: string): void {
  if (typeof window === "undefined") return;

  const viewed = readViewed();
  if (viewed.has(id)) return;
  viewed.add(id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...viewed]));
  } catch {
    // storage unavailable (private browsing, quota, ...): we'll just count this browser's view again next time
  }

  fetch("/api/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}
