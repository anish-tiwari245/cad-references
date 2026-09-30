// A tiny external store (for React's useSyncExternalStore) backing
// client-side favorites. No accounts on this site, so favorites live in the
// browser's localStorage rather than the database — starring something on
// one device doesn't follow you to another.
const STORAGE_KEY = "ftc-cad-base:favorites";
const EMPTY = new Set<string>();

let favorites: Set<string> = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStorage(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  favorites = readStorage(window.localStorage.getItem(STORAGE_KEY));
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    favorites = readStorage(e.newValue);
    emit();
  });
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // storage unavailable (private browsing, quota, ...): favorites just won't persist
  }
}

export function subscribe(listener: () => void): () => void {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Set<string> {
  ensureLoaded();
  return favorites;
}

// Stable reference so React doesn't think the server snapshot changed every render.
export function getServerSnapshot(): Set<string> {
  return EMPTY;
}

export function toggleFavorite(id: string): void {
  ensureLoaded();
  const next = new Set(favorites);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  favorites = next;
  persist();
  emit();
}
