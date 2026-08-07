import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSavingsRhythm } from '@/hooks/today/useSavingsRhythm';
import type { Category } from '@/types/Category';
import type { Expense } from '@/types/Expense';
import type { NoSpendDay } from '@/types/NoSpendDay';

let monthlyBudget: number | null = 3100;
let noSpendDays: NoSpendDay[] = [];

const SAVINGS_CATEGORY: Category = {
  id: 'savings-cat',
  name: 'Savings',
  color: '#000',
  icon: null,
  user_id: 'u',
  created_at: '2026-01-01T00:00:00Z',
  type: 'expense',
  kind: 'savings',
};

vi.mock('@/contexts/DataContext', () => ({
  useNoSpendDaysData: () => noSpendDays,
  useRecurringData: () => ({ recurringExpenses: [] }),
  useCategoriesData: () => ({ expenseCategories: [SAVINGS_CATEGORY] }),
  useGoalsData: () => [],
  useDataConfig: () => ({ monthlyBudget }),
}));

// August 2026 has 31 days. A 3100 budget with no recurring bills gives a flat
// allowance of exactly 100 a day, which keeps the arithmetic below readable.
const ALLOWANCE = 100;

const spend = (
  date: string,
  amount: number,
  overrides: Partial<Expense> = {},
): Expense =>
  ({
    id: `${date}-${amount}-${overrides.category_id ?? 'x'}`,
    amount,
    date,
    description: 'x',
    created_at: `${date}T09:00:00Z`,
    recurring_expense_id: null,
    ...overrides,
  }) as unknown as Expense;

const setAside = (date: string, amount: number): Expense =>
  spend(date, amount, { category_id: SAVINGS_CATEGORY.id });

const claim = (day: string): NoSpendDay => ({
  user_id: 'u',
  day,
  created_at: `${day}T20:00:00Z`,
});

const outcomeFor = (result: ReturnType<typeof useSavingsRhythm>, day: string) =>
  result?.days.find((entry) => entry.key === day)?.outcome;

describe('useSavingsRhythm', () => {
  beforeEach(() => {
    monthlyBudget = 3100;
    noSpendDays = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null without a budget, since there is no allowance to score against', () => {
    monthlyBudget = null;
    const { result } = renderHook(() => useSavingsRhythm([]));

    expect(result.current).toBeNull();
  });

  describe('day scoring', () => {
    it('scores a day below the allowance as under', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-03', 40)]),
      );

      expect(outcomeFor(result.current, '2026-08-03')).toBe('under');
    });

    it('scores a day above the allowance as over', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-03', 400)]),
      );

      expect(outcomeFor(result.current, '2026-08-03')).toBe('over');
    });

    // The core objection this card exists to answer: a day with no expenses is
    // the best kind of day, and must not look like a day you failed to log.
    it('scores a claimed empty day as a no-spend day', () => {
      noSpendDays = [claim('2026-08-03')];
      const { result } = renderHook(() => useSavingsRhythm([]));

      expect(outcomeFor(result.current, '2026-08-03')).toBe('noSpend');
    });

    it('scores an unclaimed empty day as quiet', () => {
      const { result } = renderHook(() => useSavingsRhythm([]));

      expect(outcomeFor(result.current, '2026-08-03')).toBe('quiet');
    });

    it('lets a later expense override a stale claim', () => {
      noSpendDays = [claim('2026-08-03')];
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-03', 400)]),
      );

      expect(outcomeFor(result.current, '2026-08-03')).toBe('over');
    });

    it('ignores recurring bills when scoring a day', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([
          spend('2026-08-03', 900, { recurring_expense_id: 'rent' }),
        ]),
      );

      expect(outcomeFor(result.current, '2026-08-03')).toBe('quiet');
    });

    // Without this the mechanic eats itself: setting aside the surplus would
    // count as spending, destroying the surplus that earned it and flipping a
    // good day to a bad one.
    it('does not count a set-aside transfer as spending', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-08-03', 400)]),
      );

      expect(outcomeFor(result.current, '2026-08-03')).toBe('quiet');
    });
  });

  describe('yesterday surplus', () => {
    it('offers what a finished under day left over', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-09', 40)]),
      );

      expect(result.current?.surplusYesterday).toBeCloseTo(ALLOWANCE - 40);
    });

    it('offers a full allowance after a claimed no-spend day', () => {
      noSpendDays = [claim('2026-08-09')];
      const { result } = renderHook(() => useSavingsRhythm([]));

      expect(result.current?.surplusYesterday).toBeCloseTo(ALLOWANCE);
    });

    it('offers nothing after a day that ran over', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-09', 400)]),
      );

      expect(result.current?.surplusYesterday).toBe(0);
    });

    // An unclaimed empty day could equally be a day the app was never opened,
    // so it must not offer money.
    it('offers nothing after an unclaimed quiet day', () => {
      const { result } = renderHook(() => useSavingsRhythm([]));

      expect(result.current?.surplusYesterday).toBe(0);
    });

    it('caps a refund day at one allowance', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-09', -500)]),
      );

      expect(result.current?.surplusYesterday).toBeCloseTo(ALLOWANCE);
    });
  });

  describe('set aside total', () => {
    // Every figure in currency must be money that actually moved.
    it('counts only real transfers into a savings category', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([
          setAside('2026-08-02', 60),
          setAside('2026-08-05', 40),
          spend('2026-08-06', 20),
        ]),
      );

      expect(result.current?.setAside).toBeCloseTo(100);
    });

    it('ignores transfers made in another month', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-07-20', 500)]),
      );

      expect(result.current?.setAside).toBe(0);
    });

    it('knows when today already has a transfer', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-08-10', 20)]),
      );

      expect(result.current?.setAsideToday).toBe(true);
    });
  });

  describe('milestone', () => {
    // A near target that fills beats a distant one that looms.
    it('aims at the next 25 rung while small', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-08-02', 30)]),
      );

      expect(result.current?.milestone).toBe(50);
      expect(result.current?.milestoneRemaining).toBeCloseTo(20);
      expect(result.current?.milestoneProgress).toBeCloseTo(60);
    });

    it('steps up to 50s past a hundred', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-08-02', 120)]),
      );

      expect(result.current?.milestone).toBe(150);
    });

    it('always leaves a rung ahead, even exactly on one', () => {
      const { result } = renderHook(() =>
        useSavingsRhythm([setAside('2026-08-02', 50)]),
      );

      expect(result.current?.milestone).toBe(75);
      expect(result.current?.milestoneRemaining).toBeCloseTo(25);
    });
  });

  describe('claim availability', () => {
    it('offers the claim only on a day with nothing logged', () => {
      const { result: empty } = renderHook(() => useSavingsRhythm([]));
      expect(empty.current?.canClaimToday).toBe(true);

      const { result: spent } = renderHook(() =>
        useSavingsRhythm([spend('2026-08-10', 5)]),
      );
      expect(spent.current?.canClaimToday).toBe(false);
    });

    it('does not re-offer a claim already made', () => {
      noSpendDays = [claim('2026-08-10')];
      const { result } = renderHook(() => useSavingsRhythm([]));

      expect(result.current?.canClaimToday).toBe(false);
      expect(result.current?.todayClaimed).toBe(true);
    });
  });
});
