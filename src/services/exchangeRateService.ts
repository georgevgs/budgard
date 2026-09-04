// Frankfurter API — free, no key required, uses official ECB data
// https://frankfurter.dev
import { todayIso } from '@/lib/dates';
import { isUsableRate } from '@/lib/money';

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
  // Local calendar day: the transaction's date is local, so the
  // historic-vs-latest decision has to be made in the same frame.
  const today = todayIso();
  const cached = rateCache.get(cacheKey);
  if (cached && isCacheEntryFresh(cached, today)) return cached.rate;

  const params = new URLSearchParams({
    base: fromCurrency,
    quotes: toCurrency,
  });
  if (date < today) params.set('date', date);
  const url = `${BASE_URL}/rates?${params.toString()}`;

  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`Exchange rate fetch failed: ${response.status}`);

  const data = (await response.json()) as RateEntry[];
  const entry = data.find((r) => r.quote === toCurrency);
  if (!entry) throw new Error(`${toCurrency} rate missing from response`);

  // A null or absurd rate has to fail here. Taken on trust it becomes
  // `amount * null` — an expense saved at zero that looks like a real row
  // forever after, and a poisoned cache entry for every later conversion.
  if (!isUsableRate(entry.rate)) {
    throw new Error(
      `Implausible ${fromCurrency}->${toCurrency} rate: ${String(entry.rate)}`,
    );
  }

  storeRate(cacheKey, buildCacheEntry(entry.rate, date, today));

  // The ECB publishes on business days only, so a weekend or holiday request
  // is answered with the preceding business day's rate. That is the right
  // convention — it is the rate that was in force — but it means the value is
  // not "the rate on `date`". Caching it under the date the API actually
  // returned as well lets neighbouring non-business days reuse it instead of
  // each making their own round trip for the same number.
  if (entry.date && entry.date !== date) {
    storeRate(
      `${fromCurrency}-${toCurrency}-${entry.date}`,
      buildCacheEntry(entry.rate, entry.date, today),
    );
  }

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
      if (!isUsableRate(entry?.rate)) continue;
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
