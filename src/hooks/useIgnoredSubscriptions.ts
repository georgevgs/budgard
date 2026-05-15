import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'budgard_ignored_subscriptions';

type Listener = () => void;
const listeners = new Set<Listener>();

const readFromStorage = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
};

let cached: Set<string> | null = null;

const getSnapshot = (): Set<string> => {
  if (cached === null) {
    cached = readFromStorage();
  }

  return cached;
};

const persist = (next: Set<string>): void => {
  cached = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  } catch {
    // localStorage may be unavailable
  }
  listeners.forEach((l) => l());
};

const subscribe = (cb: Listener): (() => void) => {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
};

// Cross-tab sync: other tabs writing to the same key refresh the in-memory cache
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    cached = readFromStorage();
    listeners.forEach((l) => l());
  });
}

const addKey = (key: string): void => {
  if (!key) return;
  const current = getSnapshot();
  if (current.has(key)) return;

  const next = new Set(current);
  next.add(key);
  persist(next);
};

const removeKey = (key: string): void => {
  const current = getSnapshot();
  if (!current.has(key)) return;

  const next = new Set(current);
  next.delete(key);
  persist(next);
};

export const useIgnoredSubscriptions = () => {
  const ignored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { ignored, ignore: addKey, unignore: removeKey };
};

// Test seam: lets tests reset the module-level cache between cases.
export const __resetIgnoredSubscriptionsCache = (): void => {
  cached = null;
};
