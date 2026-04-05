// Frankfurter API — free, no key required, uses official ECB data
// https://frankfurter.dev
const BASE_URL = 'https://api.frankfurter.dev/v2';

// In-memory cache: key is "<fromCurrency>-<date>" → EUR rate
const rateCache = new Map<string, number>();

type RateEntry = { date: string; base: string; quote: string; rate: number };

export const fetchExchangeRate = async (
  fromCurrency: string,
  date: string, // 'yyyy-MM-dd'
  signal?: AbortSignal,
): Promise<number> => {
  if (fromCurrency === 'EUR') return 1;

  const cacheKey = `${fromCurrency}-${date}`;
  const cached = rateCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({ base: fromCurrency, quotes: 'EUR' });
  if (date < today) params.set('date', date);
  const url = `${BASE_URL}/rates?${params.toString()}`;

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Exchange rate fetch failed: ${response.status}`);

  const data = (await response.json()) as RateEntry[];
  const entry = data.find((r) => r.quote === 'EUR');
  if (!entry) throw new Error('EUR rate missing from response');

  rateCache.set(cacheKey, entry.rate);
  return entry.rate;
};
