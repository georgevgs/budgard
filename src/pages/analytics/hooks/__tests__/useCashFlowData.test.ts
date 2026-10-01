import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Expense } from '@/types/Expense';

const data = vi.hoisted(() => ({
  expenses: [] as unknown[],
  incomes: [] as unknown[],
}));

vi.mock('@/common/contexts/DataContext', () => ({
  useExpensesData: () => data.expenses,
  useIncomesData: () => data.incomes,
}));
vi.mock('@/common/hooks/useDateLocale', () => ({
  useDateLocale: () => undefined,
}));
vi.mock('@/common/hooks/useCurrentDate', () => ({
  useCurrentDate: () => new Date(2026, 7, 15),
}));

import { useCashFlowData } from '@/pages/analytics/hooks/useCashFlowData';

const row = (
  amount: number,
  type: 'expense' | 'income',
  isExcluded = false,
): Expense => ({
  id: `${type}-${amount}`,
  amount,
  date: '2026-08-01',
  description: 'x',
  type,
  is_excluded: isExcluded,
  user_id: 'u',
  created_at: '2026-08-01T00:00:00Z',
});

describe('useCashFlowData', () => {
  it('reconciles monthly and yearly cash flow without decimal drift or transfers', () => {
    data.expenses = [
      row(0.1, 'expense'),
      row(0.2, 'expense'),
      row(9, 'expense', true),
    ];
    data.incomes = [row(0.4, 'income'), row(1, 'income', true)];

    const { result } = renderHook(() => useCashFlowData(2026));
    expect(result.current.monthlyData[7]).toEqual(
      expect.objectContaining({ income: 0.4, expense: -0.3, net: 0.1 }),
    );
    expect(result.current.yearTotals).toEqual(
      expect.objectContaining({
        totalIncome: 0.4,
        totalExpense: 0.3,
        net: 0.1,
      }),
    );
  });
});
