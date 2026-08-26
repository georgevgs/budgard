import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayIso } from '@/lib/dates';

// Use vi.resetModules() in beforeEach to get a fresh module (and fresh cache Map)
// for each test, preventing cache state from leaking between tests.

type FetchExchangeRate = (
  fromCurrency: string,
  date: string,
  signal?: AbortSignal,
) => Promise<number>;

const makeOkResponse = (rate: number, quote = 'EUR', base = 'USD') =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([{ date: '2024-01-15', base, quote, rate }]),
  } as Response);

const makeErrorResponse = (status: number) =>
  Promise.resolve({ ok: false, status } as Response);

describe('fetchExchangeRate', () => {
  let fetchExchangeRate: FetchExchangeRate;

  beforeEach(async () => {
    vi.resetModules();
    // The cache is persisted to localStorage; clear it so entries written by
    // one test never satisfy a lookup in the next.
    localStorage.clear();
    ({ fetchExchangeRate } = await import('@/services/exchangeRateService'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 1 for EUR without calling fetch', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const rate = await fetchExchangeRate('EUR', '2024-01-15');
    expect(rate).toBe(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches rate for a historical date and includes date param', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.9234)));
    const rate = await fetchExchangeRate('USD', '2024-01-15');
    expect(rate).toBe(0.9234);
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('date=2024-01-15');
    expect(url).toContain('base=USD');
    expect(url).toContain('quotes=EUR');
  });

  it('omits date param for today (uses latest rates)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.92)));
    // todayIso(), not toISOString(): the service compares against the local
    // calendar day, so a UTC "today" reads as a past date either side of
    // midnight and the request gains a date= param.
    const today = todayIso();
    await fetchExchangeRate('USD', today);
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('date=');
    expect(url).toContain('/v2/rates');
  });

  it('omits date param for a future date', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.92)));
    await fetchExchangeRate('USD', '2099-12-31');
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).not.toContain('date=');
  });

  it('caches result — second call with same key skips fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.85, 'EUR', 'GBP')));
    const rate1 = await fetchExchangeRate('GBP', '2024-01-15');
    const rate2 = await fetchExchangeRate('GBP', '2024-01-15');
    expect(rate1).toBe(0.85);
    expect(rate2).toBe(0.85);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('uses separate cache entries for different currencies', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(makeOkResponse(0.92, 'EUR', 'USD'))
        .mockReturnValueOnce(makeOkResponse(0.0062, 'EUR', 'JPY')),
    );
    const usdRate = await fetchExchangeRate('USD', '2024-01-15');
    const jpyRate = await fetchExchangeRate('JPY', '2024-01-15');
    expect(usdRate).toBe(0.92);
    expect(jpyRate).toBe(0.0062);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('uses separate cache entries for same currency on different dates', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockReturnValueOnce(makeOkResponse(0.91, 'EUR', 'USD'))
        .mockReturnValueOnce(makeOkResponse(0.93, 'EUR', 'USD')),
    );
    const rate1 = await fetchExchangeRate('USD', '2024-01-10');
    const rate2 = await fetchExchangeRate('USD', '2024-01-20');
    expect(rate1).toBe(0.91);
    expect(rate2).toBe(0.93);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });

  it('throws on non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeErrorResponse(404)));
    await expect(fetchExchangeRate('USD', '2024-01-15')).rejects.toThrow(
      'Exchange rate fetch failed: 404',
    );
  });

  it('throws when EUR rate is absent from response array', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(makeOkResponse(0.79, 'GBP', 'USD')),
    );
    await expect(fetchExchangeRate('USD', '2024-01-15')).rejects.toThrow(
      'EUR rate missing from response',
    );
  });

  it('throws when response array is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response),
      ),
    );
    await expect(fetchExchangeRate('USD', '2024-01-15')).rejects.toThrow(
      'EUR rate missing from response',
    );
  });

  it('propagates fetch rejection (e.g. AbortError)', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchExchangeRate('USD', '2024-01-15', controller.signal),
    ).rejects.toThrow('Aborted');
  });

  it('passes AbortSignal through to fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.92)));
    const controller = new AbortController();
    await fetchExchangeRate('USD', '2024-01-15', controller.signal);
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect((callArgs[1] as RequestInit)?.signal).toBe(controller.signal);
  });

  it('serves a historic rate from localStorage after a reload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.9234)));
    await fetchExchangeRate('USD', '2024-01-15');

    // Fresh module = fresh in-memory Map, simulating an app reload.
    vi.resetModules();
    ({ fetchExchangeRate } = await import('@/services/exchangeRateService'));
    vi.stubGlobal('fetch', vi.fn());

    const rate = await fetchExchangeRate('USD', '2024-01-15');
    expect(rate).toBe(0.9234);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('re-fetches a latest rate that was cached on a previous day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      'budgard-exchange-rates',
      JSON.stringify({
        version: 1,
        rates: { [`USD-EUR-${today}`]: { rate: 0.5, fetchedOn: '2020-01-01' } },
      }),
    );
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.92)));

    const rate = await fetchExchangeRate('USD', today);
    expect(rate).toBe(0.92);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it('falls back to network when the persisted cache is corrupt', async () => {
    localStorage.setItem('budgard-exchange-rates', 'not-json');
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.91)));

    const rate = await fetchExchangeRate('USD', '2024-01-15');
    expect(rate).toBe(0.91);
  });

  it('discards a persisted cache with a different version', async () => {
    localStorage.setItem(
      'budgard-exchange-rates',
      JSON.stringify({
        version: 999,
        rates: { 'USD-EUR-2024-01-15': { rate: 0.5 } },
      }),
    );
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(makeOkResponse(0.92)));

    const rate = await fetchExchangeRate('USD', '2024-01-15');
    expect(rate).toBe(0.92);
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });
});
