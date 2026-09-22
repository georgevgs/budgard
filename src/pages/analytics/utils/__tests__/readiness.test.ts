import { describe, expect, it } from 'vitest';
import { isAnalyticsReady } from '@/pages/analytics/utils/readiness';

const ready = (overrides: Partial<Parameters<typeof isAnalyticsReady>[0]>) =>
  isAnalyticsReady({
    isInitialized: true,
    isHistoryLoaded: true,
    isSecondaryLoaded: true,
    isPro: true,
    requiresForecastData: false,
    ...overrides,
  });

describe('isAnalyticsReady', () => {
  it('waits for full history before presenting Pro analytics', () => {
    expect(ready({ isHistoryLoaded: false })).toBe(false);
  });

  it('waits for schedules and accounts when the forecast is present', () => {
    expect(
      ready({ isSecondaryLoaded: false, requiresForecastData: true }),
    ).toBe(false);
  });

  it('does not make the bounded Free view wait for Pro-only data', () => {
    expect(
      ready({
        isPro: false,
        isHistoryLoaded: false,
        isSecondaryLoaded: false,
        requiresForecastData: true,
      }),
    ).toBe(true);
  });
});
