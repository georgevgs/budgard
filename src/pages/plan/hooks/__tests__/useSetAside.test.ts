import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Goal } from '@/types/Goal';

const config = vi.hoisted(() => ({ defaultCurrency: 'EUR' }));
vi.mock('@/common/contexts/DataContext', () => ({
  useDataConfig: () => config,
}));

const expenseOps = vi.hoisted(() => ({ handleExpenseSubmit: vi.fn() }));
vi.mock('@/common/hooks/dataOps/useExpenseOps', () => ({
  useExpenseOps: () => expenseOps,
}));

const surplusOps = vi.hoisted(() => ({ investSurplus: vi.fn() }));
vi.mock('@/common/hooks/dataOps/useSurplusInvestmentOps', () => ({
  useSurplusInvestmentOps: () => surplusOps,
}));

import { useSetAside } from '@/pages/plan/hooks/useSetAside';

const goal = (over: Partial<Goal> = {}): Goal =>
  ({
    id: 'goal-1',
    source_type: 'category',
    category_id: 'category-1',
    ...over,
  }) as Goal;

beforeEach(() => {
  vi.clearAllMocks();
  config.defaultCurrency = 'EUR';
  expenseOps.handleExpenseSubmit.mockResolvedValue(undefined);
  surplusOps.investSurplus.mockResolvedValue(undefined);
});

describe('useSetAside', () => {
  it('rounds to whole yen for a yen user', async () => {
    config.defaultCurrency = 'JPY';
    const { result } = renderHook(() => useSetAside());

    await result.current(goal(), 1234.56);

    expect(expenseOps.handleExpenseSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1235 }),
    );
  });

  it('rounds a half cent up for a euro user', async () => {
    const { result } = renderHook(() => useSetAside());

    await result.current(goal(), 10.005);

    expect(expenseOps.handleExpenseSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 10.01 }),
    );
  });

  it('rounds the amount invested into an account goal', async () => {
    config.defaultCurrency = 'JPY';
    const { result } = renderHook(() => useSetAside());

    await result.current(goal({ source_type: 'account' }), 1234.56);

    expect(surplusOps.investSurplus).toHaveBeenCalledWith(
      'goal-1',
      1235,
      expect.any(String),
    );
  });
});
