// Frankfurter API — free, no key required, uses official ECB data
// https://frankfurter.dev
const BASE_URL = 'https://api.frankfurter.dev/v2';

// In-memory cache: key is "<from>-<to>-<date>" → cached entry. Mirrored to
// localStorage so rates survive reloads: historic rates are immutable and
// cache forever; a "latest" (today/future date) rate expires daily.
type CachedRate = {
  rate: number;
  // Day (yyyy-MM-dd) a "latest" rate was fetched on. Historic rates omit it;
  // latest rates are only trusted on the day they were fetched.
  fetchedOn?: string;
};

const rateCache = new Map<string, CachedRate>();
let hydratedFromStorage = false;

const CACHE_KEY = 'budgard-exchange-rates';
// Bump when the persisted shape changes; a mismatch discards the old cache.
const CACHE_VERSION = 1;

type StoredRateCache = {
  version: number;
  rates: Record<string, CachedRate>;
};

type RateEntry = { date: string; base: string; quote: string; rate: number };

export const fetchExchangeRate = async (
  fromCurrency: string,
  date: string, // 'yyyy-MM-dd'
  signal?: AbortSignal,
  toCurrency: string = 'EUR',
): Promise<number> => {
  if (fromCurrency === toCurrency) return 1;

  hydrateFromStorage();

  const cacheKey = `${fromCurrency}-${toCurrency}-${date}`;
  const today = new Date().toISOString().slice(0, 10);
  const cached = rateCache.get(cacheKey);
  if (cached && isCacheEntryFresh(cached, today)) return cached.rate;

  const params = new URLSearchParams({ base: fromCurrency, quotes: toCurrency });
  if (date < today) params.set('date', date);
  const url = `${BASE_URL}/rates?${params.toString()}`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Exchange rate fetch failed: ${response.status}`);

  const data = (await response.json()) as RateEntry[];
  const entry = data.find((r) => r.quote === toCurrency);
  if (!entry) throw new Error(`${toCurrency} rate missing from response`);

  storeRate(cacheKey, buildCacheEntry(entry.rate, date, today));

  return entry.rate;
};

// --- Helpers ---

const isCacheEntryFresh = (entry: CachedRate, today: string): boolean => {
  // No fetchedOn means a historic date — immutable, valid forever.
  if (entry.fetchedOn === undefined) return true;

  return entry.fetchedOn === today;
};

const buildCacheEntry = (
  rate: number,
  date: string,
  today: string,
): CachedRate => {
  if (date < today) {
    return { rate };
  }

  return { rate, fetchedOn: today };
};

// Lazily load the persisted cache once per session. Any storage or parse
// failure falls back silently to the empty in-memory cache (network wins).
const hydrateFromStorage = (): void => {
  if (hydratedFromStorage) return;
  hydratedFromStorage = true;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const stored = JSON.parse(raw) as StoredRateCache;
    if (stored.version !== CACHE_VERSION) return;
    if (typeof stored.rates !== 'object' || stored.rates === null) return;

    for (const [key, entry] of Object.entries(stored.rates)) {
      if (typeof entry?.rate !== 'number') continue;
      rateCache.set(key, entry);
    }
  } catch {
    // Corrupt JSON or unavailable localStorage — ignore and refetch.
  }
};

const storeRate = (cacheKey: string, entry: CachedRate): void => {
  rateCache.set(cacheKey, entry);

  try {
    const rates: Record<string, CachedRate> = {};
    for (const [key, value] of rateCache.entries()) {
      rates[key] = value;
    }
    const stored: StoredRateCache = { version: CACHE_VERSION, rates };
    localStorage.setItem(CACHE_KEY, JSON.stringify(stored));
  } catch {
    // Quota exceeded or private mode — the in-memory cache still works.
  }
};
