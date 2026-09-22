import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProPlanPrices } from '@/constants/proPlans';
import { FALLBACK_PLAN_PRICES } from '@/constants/proPlans';

const mocks = vi.hoisted(() => ({
  loadSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  getPlanPrices: vi.fn(),
}));

vi.mock('@/constants/proPlansCache', () => ({
  loadPlanPricesSnapshot: mocks.loadSnapshot,
  savePlanPricesSnapshot: mocks.saveSnapshot,
}));

vi.mock('@/common/api/proApi', () => ({
  proApi: { getPlanPrices: mocks.getPlanPrices },
}));

import { useProPlans } from '@/common/hooks/useProPlans';

const livePrices: ProPlanPrices = {
  monthly: { priceId: 'price-month', amount: 299, currency: 'EUR' },
  yearly: { priceId: 'price-year', amount: 2999, currency: 'EUR' },
};

describe('useProPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadSnapshot.mockReturnValue(null);
    mocks.getPlanPrices.mockResolvedValue(livePrices);
  });

  it('keeps prices unknown instead of flashing the compiled fallback', async () => {
    let resolvePrices: (prices: ProPlanPrices) => void = () => undefined;
    mocks.getPlanPrices.mockReturnValue(
      new Promise((resolve) => {
        resolvePrices = resolve;
      }),
    );
    const { result } = renderHook(() => useProPlans());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.monthlyLabel).toBe('—');

    await act(async () => resolvePrices(livePrices));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual(livePrices);
    expect(result.current.monthlyLabel).not.toBe('—');
  });

  it('uses a fresh live snapshot immediately', () => {
    mocks.loadSnapshot.mockReturnValue(livePrices);

    const { result } = renderHook(() => useProPlans());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.prices).toEqual(livePrices);
    expect(mocks.getPlanPrices).not.toHaveBeenCalled();
  });

  it('adopts a snapshot written between render and the effect', async () => {
    mocks.loadSnapshot
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(livePrices);

    const { result } = renderHook(() => useProPlans());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual(livePrices);
    expect(mocks.getPlanPrices).not.toHaveBeenCalled();
  });

  it('only presents fallback prices after the endpoint fails', async () => {
    mocks.getPlanPrices.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useProPlans());

    expect(result.current.monthlyLabel).toBe('—');
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.prices).toEqual(FALLBACK_PLAN_PRICES);
    expect(result.current.monthlyLabel).not.toBe('—');
  });
});
