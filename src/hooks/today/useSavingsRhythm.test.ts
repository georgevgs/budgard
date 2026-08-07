import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSavingsRhythm } from '@/hooks/today/useSavingsRhythm';
import type { Expense } from '@/types/Expense';
import type { NoSpendDay } from '@/types/NoSpendDay';

let monthlyBudget: number | null = 3100;
let noSpendDays: NoSpendDay[] = [];

vi.mock('@/contexts/DataContext', () => ({
  useNoSpendDaysData: () => noSpendDays,
  useRecurringData: () => ({ recurringExpenses: [] }),
  useDataConfig: () => ({ monthlyBudget }),
}));

// August 2026 has 31 days. A 3100 budget with no recurring bills gives a flat
// allowance of exactly 100 a day, which keeps the arithmetic below readable.
const ALLOWANCE = 100;

const spend = (date: string, amount: number, recurringId?: string): Expense =>
  ({
    id: `${date}-${amount}`,
    amount,
    date,
    description: 'x',
    created_at: `${date}T09:00:00Z`,
    recurring_expense_id: recurringId ?? null,
  }) as unknown as Expense;

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

  it('banks the shortfall on a day that came in under the allowance', () => {
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-03', 40)]),
    );

    expect(outcomeFor(result.current, '2026-08-03')).toBe('under');
    expect(result.current?.banked).toBeCloseTo(ALLOWANCE - 40);
  });

  // The pot is a record of the days that went well, not a running balance.
  it('banks nothing — never a negative — on a day that ran over', () => {
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-03', 400)]),
    );

    expect(outcomeFor(result.current, '2026-08-03')).toBe('over');
    expect(result.current?.banked).toBe(0);
  });

  // The core objection this feature exists to answer: a day with no expenses
  // is the best kind of day, and must not look like a day you failed to log.
  it('banks a full allowance for a claimed no-spend day', () => {
    noSpendDays = [claim('2026-08-03')];
    const { result } = renderHook(() => useSavingsRhythm([]));

    expect(outcomeFor(result.current, '2026-08-03')).toBe('noSpend');
    expect(result.current?.banked).toBeCloseTo(ALLOWANCE);
  });

  it('scores an unclaimed empty day as quiet and banks nothing for it', () => {
    const { result } = renderHook(() => useSavingsRhythm([]));

    expect(outcomeFor(result.current, '2026-08-03')).toBe('quiet');
    expect(result.current?.banked).toBe(0);
  });

  // A claim cannot outrank the ledger: logging an expense afterwards demotes
  // the day to however it actually went.
  it('lets a later expense override a stale claim', () => {
    noSpendDays = [claim('2026-08-03')];
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-03', 400)]),
    );

    expect(outcomeFor(result.current, '2026-08-03')).toBe('over');
  });

  it('ignores recurring bills when scoring a day', () => {
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-03', 900, 'rent')]),
    );

    expect(outcomeFor(result.current, '2026-08-03')).toBe('quiet');
  });

  // Refunds are legal, so a day can net out negative. It must not mint savings
  // above the allowance it was scored against.
  it('caps a refund day at one allowance', () => {
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-03', -500)]),
    );

    expect(result.current?.banked).toBeCloseTo(ALLOWANCE);
  });

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

  it('has no target until there is a real month to beat', () => {
    const { result } = renderHook(() => useSavingsRhythm([]));

    expect(result.current?.target).toBeNull();
    expect(result.current?.progress).toBeNull();
  });

  it('targets last month once that month banked something', () => {
    const lastMonth = [spend('2026-07-01', 40), spend('2026-07-02', 60)];
    const { result } = renderHook(() =>
      useSavingsRhythm([...lastMonth, spend('2026-08-01', 50)]),
    );

    // July: 31 days, allowance 100 — two under days banked 60 + 40.
    expect(result.current?.target).toBeCloseTo(100);
    expect(result.current?.banked).toBeCloseTo(50);
    expect(result.current?.remainingToTarget).toBeCloseTo(50);
    expect(result.current?.progress).toBeCloseTo(50);
  });

  it('caps progress once last month is beaten', () => {
    const august = Array.from({ length: 9 }, (_, index) =>
      spend(`2026-08-0${index + 1}`, 10),
    );
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-07-01', 90), ...august]),
    );

    expect(result.current?.progress).toBe(100);
    expect(result.current?.remainingToTarget).toBe(0);
  });

  it('counts only elapsed days of the current month toward banked', () => {
    const { result } = renderHook(() =>
      useSavingsRhythm([spend('2026-08-25', 10)]),
    );

    // The 25th has not happened yet on the 10th, so it cannot have banked.
    expect(result.current?.banked).toBe(0);
  });
});
