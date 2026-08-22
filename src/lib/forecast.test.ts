import { describe, it, expect } from 'vitest';
import {
  computeSafeToSpend,
  computeUpcomingRecurringThisMonth,
  computeTwelveMonthProjection,
  computeSpendableBalance,
  findFirstShortfall,
} from '@/lib/forecast';
import type { Expense } from '@/types/Expense';
import type { RecurringExpense } from '@/types/RecurringExpense';

// Local-time constructor (month is 0-based) — matches how forecast.ts
// compares parseISO local midnights, so tests are TZ-independent.
const JULY_15_2026 = new Date(2026, 6, 15, 10, 0, 0);
const DEC_20_2026 = new Date(2026, 11, 20, 10, 0, 0);

const buildRecurring = (
  overrides: Partial<RecurringExpense>,
): RecurringExpense => ({
  id: 'r1',
  user_id: 'u1',
  amount: 10,
  description: 'Netflix',
  frequency: 'monthly',
  start_date: '2026-01-01',
  active: true,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const buildExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  amount: 100,
  description: 'Groceries',
  date: '2026-06-15',
  user_id: 'u1',
  created_at: '2026-06-15T00:00:00Z',
  ...overrides,
});

const emptyProjectionInput = (now: Date) => ({
  expenses: [] as Expense[],
  incomes: [] as Expense[],
  recurringExpenses: [] as RecurringExpense[],
  recurringIncomes: [] as RecurringExpense[],
  now,
});

describe('computeSafeToSpend', () => {
  it('returns null when there is no budget', () => {
    const result = computeSafeToSpend({
      monthlyBudget: null,
      spentThisMonth: 500,
      upcomingRecurringThisMonth: 100,
    });
    expect(result).toBeNull();
  });

  it('subtracts spent and upcoming recurring from the budget', () => {
    const result = computeSafeToSpend({
      monthlyBudget: 1000,
      spentThisMonth: 400,
      upcomingRecurringThisMonth: 100,
    });
    expect(result).toBe(500);
  });

  it('goes negative honestly when overspent', () => {
    const result = computeSafeToSpend({
      monthlyBudget: 500,
      spentThisMonth: 450,
      upcomingRecurringThisMonth: 200,
    });
    expect(result).toBe(-150);
  });

  it('treats a zero budget as a real budget, not as missing', () => {
    const result = computeSafeToSpend({
      monthlyBudget: 0,
      spentThisMonth: 50,
      upcomingRecurringThisMonth: 0,
    });
    expect(result).toBe(-50);
  });
});

describe('computeUpcomingRecurringThisMonth', () => {
  it('returns 0 for an empty list', () => {
    expect(computeUpcomingRecurringThisMonth([], JULY_15_2026)).toBe(0);
  });

  it('ignores a monthly item whose next charge falls in the next month', () => {
    const items = [buildRecurring({ last_generated_date: '2026-07-05' })];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(0);
  });

  it('counts a monthly item still due later this month', () => {
    // start_date carries the anchor day, so it has to agree with the day the
    // item last generated on — real data always does.
    const items = [
      buildRecurring({
        start_date: '2026-01-20',
        last_generated_date: '2026-06-20',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(10);
  });

  it('counts every remaining weekly occurrence in the month', () => {
    // Last charged Jul 14 → Jul 21 and Jul 28 remain; Aug 4 is out.
    const items = [
      buildRecurring({
        frequency: 'weekly',
        last_generated_date: '2026-07-14',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(20);
  });

  it('uses the actual charge amount for quarterly items, not the monthly equivalent', () => {
    // Quarterly 30 due Jul 20 costs 30 this month, not 10.
    const items = [
      buildRecurring({
        amount: 30,
        frequency: 'quarterly',
        start_date: '2026-01-20',
        last_generated_date: '2026-04-20',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(30);
  });

  it('ignores inactive items', () => {
    const items = [
      buildRecurring({ active: false, last_generated_date: '2026-06-20' }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(0);
  });

  it('ignores occurrences beyond the end_date', () => {
    const items = [
      buildRecurring({
        last_generated_date: '2026-06-20',
        end_date: '2026-07-18',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(0);
  });

  it('excludes a charge due today (the cron already generates it)', () => {
    const items = [buildRecurring({ last_generated_date: '2026-06-15' })];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(0);
  });

  it('counts an item whose start_date falls later this month', () => {
    const items = [
      buildRecurring({
        start_date: '2026-07-25',
        last_generated_date: undefined,
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026)).toBe(10);
  });

  it('does not leak January charges into December (year boundary)', () => {
    const dueNextJanuary = buildRecurring({
      start_date: '2026-01-05',
      last_generated_date: '2026-12-05',
    });
    const dueDec28 = buildRecurring({
      id: 'r2',
      start_date: '2026-01-28',
      last_generated_date: '2026-11-28',
    });
    const items = [dueNextJanuary, dueDec28];
    expect(computeUpcomingRecurringThisMonth(items, DEC_20_2026)).toBe(10);
  });
});

describe('computeTwelveMonthProjection', () => {
  it('returns 12 zeroed months starting next month when there is no data', () => {
    const result = computeTwelveMonthProjection(
      emptyProjectionInput(JULY_15_2026),
    );

    expect(result).toHaveLength(12);
    expect(result[0].monthKey).toBe('2026-08');
    expect(result[11].monthKey).toBe('2027-07');
    for (const month of result) {
      expect(month.projectedExpenses).toBe(0);
      expect(month.projectedIncome).toBe(0);
      expect(month.projectedNet).toBe(0);
      expect(month.label.length).toBeGreaterThan(0);
    }
  });

  it('crosses the year boundary correctly', () => {
    const result = computeTwelveMonthProjection(
      emptyProjectionInput(DEC_20_2026),
    );

    expect(result[0].monthKey).toBe('2027-01');
    expect(result[11].monthKey).toBe('2027-12');
  });

  it('uses the injected label formatter', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      formatMonthLabel: (monthStart) => `M${monthStart.getMonth() + 1}`,
    });

    expect(result[0].label).toBe('M8');
  });

  it('projects recurring-only expenses flat across all months', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [buildRecurring({ amount: 50 })],
    });

    for (const month of result) {
      expect(month.projectedExpenses).toBe(50);
      expect(month.projectedIncome).toBe(0);
      expect(month.projectedNet).toBe(-50);
    }
  });

  it('converts weekly recurring items to a monthly equivalent', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [buildRecurring({ frequency: 'weekly' })],
    });

    expect(result[0].projectedExpenses).toBeCloseTo(43.3);
  });

  it('averages non-recurring expenses over the last 6 full months', () => {
    // 100 in each of Jan–Jun 2026, plus a current-month row (excluded: the
    // month is partial) and a recurring-generated row (excluded: FK set).
    const expenses = [
      buildExpense({ id: 'e-jan', date: '2026-01-10' }),
      buildExpense({ id: 'e-feb', date: '2026-02-10' }),
      buildExpense({ id: 'e-mar', date: '2026-03-10' }),
      buildExpense({ id: 'e-apr', date: '2026-04-10' }),
      buildExpense({ id: 'e-may', date: '2026-05-10' }),
      buildExpense({ id: 'e-jun', date: '2026-06-10' }),
      buildExpense({ id: 'e-jul', date: '2026-07-10', amount: 9999 }),
      buildExpense({
        id: 'e-rec',
        date: '2026-05-20',
        amount: 500,
        recurring_expense_id: 'r9',
      }),
    ];
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      expenses,
    });

    expect(result[0].projectedExpenses).toBe(100);
  });

  it('caps the window at 6 full months even with older history', () => {
    // A huge December 2025 row sits outside the Jan–Jun window.
    const expenses = [
      buildExpense({ id: 'e-old', date: '2025-12-10', amount: 6000 }),
      buildExpense({ id: 'e-jan', date: '2026-01-10', amount: 60 }),
      buildExpense({ id: 'e-feb', date: '2026-02-10', amount: 60 }),
      buildExpense({ id: 'e-mar', date: '2026-03-10', amount: 60 }),
      buildExpense({ id: 'e-apr', date: '2026-04-10', amount: 60 }),
      buildExpense({ id: 'e-may', date: '2026-05-10', amount: 60 }),
      buildExpense({ id: 'e-jun', date: '2026-06-10', amount: 60 }),
    ];
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      expenses,
    });

    expect(result[0].projectedExpenses).toBe(60);
  });

  it('divides by the actual number of months when history is shorter', () => {
    const expenses = [
      buildExpense({ id: 'e-may', date: '2026-05-10', amount: 90 }),
      buildExpense({ id: 'e-jun', date: '2026-06-10', amount: 110 }),
    ];
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      expenses,
    });

    expect(result[0].projectedExpenses).toBe(100);
  });

  it('projects zero variable spend when history starts this month', () => {
    const expenses = [
      buildExpense({ id: 'e-jul', date: '2026-07-05', amount: 300 }),
    ];
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      expenses,
    });

    expect(result[0].projectedExpenses).toBe(0);
  });

  it('drops a recurring item from months after its end_date', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [
        buildRecurring({ amount: 50, end_date: '2026-10-15' }),
      ],
    });

    // Aug, Sep, Oct include it; Nov onward does not.
    expect(result[0].projectedExpenses).toBe(50);
    expect(result[2].projectedExpenses).toBe(50);
    expect(result[3].projectedExpenses).toBe(0);
  });

  it('excludes a recurring item from months before its start_date', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [
        buildRecurring({ amount: 50, start_date: '2026-11-01' }),
      ],
    });

    // Aug–Oct exclude it; Nov onward includes it.
    expect(result[0].projectedExpenses).toBe(0);
    expect(result[2].projectedExpenses).toBe(0);
    expect(result[3].projectedExpenses).toBe(50);
  });

  it('ignores inactive recurring items', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [buildRecurring({ amount: 50, active: false })],
    });

    expect(result[0].projectedExpenses).toBe(0);
  });

  it('projects income from recurring incomes plus the variable income average', () => {
    const incomes = [
      buildExpense({
        id: 'i-may',
        date: '2026-05-25',
        amount: 200,
        type: 'income',
      }),
      buildExpense({
        id: 'i-jun',
        date: '2026-06-25',
        amount: 400,
        type: 'income',
      }),
    ];
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      incomes,
      recurringIncomes: [
        buildRecurring({ id: 'ri1', amount: 2000, type: 'income' }),
      ],
      recurringExpenses: [buildRecurring({ amount: 500 })],
    });

    // Variable income average: (200 + 400) / 2 = 300.
    expect(result[0].projectedIncome).toBe(2300);
    expect(result[0].projectedExpenses).toBe(500);
    expect(result[0].projectedNet).toBe(1800);
  });
});

describe('computeSpendableBalance', () => {
  const account = (over: Record<string, unknown>) =>
    ({ kind: 'bank', current_balance: 100, is_archived: false, ...over }) as never;

  it('adds up cash and bank accounts', () => {
    expect(
      computeSpendableBalance([
        account({ kind: 'bank', current_balance: 1200 }),
        account({ kind: 'cash', current_balance: 80 }),
      ]),
    ).toBe(1280);
  });

  // Selling an investment is a decision, not a payment. Counting it would
  // quietly promise that a shortfall is covered by something the user may have
  // no intention of touching.
  it('leaves investments out', () => {
    expect(
      computeSpendableBalance([
        account({ kind: 'bank', current_balance: 500 }),
        account({ kind: 'investment', current_balance: 40000 }),
      ]),
    ).toBe(500);
  });

  // Mirror reason: a card balance is not cash you have.
  it('leaves liabilities out', () => {
    expect(
      computeSpendableBalance([
        account({ kind: 'bank', current_balance: 500 }),
        account({ kind: 'credit_card', current_balance: -300 }),
        account({ kind: 'loan', current_balance: -9000 }),
      ]),
    ).toBe(500);
  });

  it('ignores archived accounts', () => {
    expect(
      computeSpendableBalance([
        account({ current_balance: 500 }),
        account({ current_balance: 900, is_archived: true }),
      ]),
    ).toBe(500);
  });

  // Null, not zero. Zero is a balance; null means the app does not know one,
  // and the projection must say so rather than draw a line from nowhere.
  it('has no opinion when nothing spendable is tracked', () => {
    expect(computeSpendableBalance([])).toBeNull();
    expect(
      computeSpendableBalance([account({ kind: 'investment' })]),
    ).toBeNull();
  });
});

describe('projected balance', () => {
  const NOW = new Date('2026-08-15T12:00:00Z');

  const project = (openingBalance: number | null) =>
    computeTwelveMonthProjection({
      expenses: [],
      incomes: [],
      recurringExpenses: [],
      recurringIncomes: [],
      now: NOW,
      openingBalance,
    });

  it('reports flows only when no balance is known', () => {
    const months = project(null);

    expect(months).toHaveLength(12);
    expect(months.every((month) => month.projectedBalance === null)).toBe(true);
  });

  it('carries the balance forward month by month', () => {
    const months = computeTwelveMonthProjection({
      expenses: [],
      incomes: [],
      recurringExpenses: [],
      recurringIncomes: [],
      now: NOW,
      openingBalance: 1000,
    });

    // With no activity at all the balance simply holds.
    expect(months[0].projectedBalance).toBe(1000);
    expect(months[11].projectedBalance).toBe(1000);
  });

  it('finds nothing to warn about when the balance stays positive', () => {
    expect(findFirstShortfall(project(5000))).toBeNull();
  });

  // The first shortfall, not the worst one: a gap in March is the thing to act
  // on, and knowing August is worse does not change what you do about March.
  it('reports the first month the balance goes under, not the lowest', () => {
    const months = [
      { monthKey: '2026-09', projectedBalance: 200 },
      { monthKey: '2026-10', projectedBalance: -50 },
      { monthKey: '2026-11', projectedBalance: -900 },
    ] as never as Parameters<typeof findFirstShortfall>[0];

    expect(findFirstShortfall(months)?.monthKey).toBe('2026-10');
  });
});
