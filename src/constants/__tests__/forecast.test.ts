import { describe, it, expect } from 'vitest';
import {
  computeUpcomingRecurringThisMonth,
  computeTwelveMonthProjection,
  computeSpendableBalance,
  findFirstShortfall,
} from '@/constants/forecast';
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

const NO_LOANS = { restOfMonth: 0, months: new Array<number>(12).fill(0) };

const emptyProjectionInput = (now: Date) => ({
  expenses: [] as Expense[],
  incomes: [] as Expense[],
  recurringExpenses: [] as RecurringExpense[],
  recurringIncomes: [] as RecurringExpense[],
  loanOutflow: NO_LOANS,
  now,
});

describe('computeUpcomingRecurringThisMonth', () => {
  it('returns 0 for an empty list', () => {
    expect(computeUpcomingRecurringThisMonth([], JULY_15_2026, [])).toBe(0);
  });

  it('ignores a monthly item whose next charge falls in the next month', () => {
    const items = [buildRecurring({ last_generated_date: '2026-07-05' })];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(0);
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
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(10);
  });

  it('counts every remaining weekly occurrence in the month', () => {
    // Last charged Jul 14 → Jul 21 and Jul 28 remain; Aug 4 is out.
    const items = [
      buildRecurring({
        frequency: 'weekly',
        last_generated_date: '2026-07-14',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(20);
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
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(30);
  });

  it('ignores inactive items', () => {
    const items = [
      buildRecurring({ active: false, last_generated_date: '2026-06-20' }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(0);
  });

  it('ignores occurrences beyond the end_date', () => {
    const items = [
      buildRecurring({
        last_generated_date: '2026-06-20',
        end_date: '2026-07-18',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(0);
  });

  // The job that writes a charge's row runs at an hour the app does not
  // choose. Skipping today outright left a bill due today out of the figure
  // until then — neither spent yet nor still to come.
  it('counts a charge due today until its row is written', () => {
    const items = [
      buildRecurring({
        start_date: '2026-01-15',
        last_generated_date: '2026-06-15',
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(10);
  });

  it('drops a charge due today once its row exists', () => {
    const items = [
      buildRecurring({
        start_date: '2026-01-15',
        last_generated_date: '2026-06-15',
      }),
    ];
    const written = [
      buildExpense({ recurring_expense_id: 'r1', date: '2026-07-15' }),
    ];
    expect(
      computeUpcomingRecurringThisMonth(items, JULY_15_2026, written),
    ).toBe(0);
  });

  it('counts an item whose start_date falls later this month', () => {
    const items = [
      buildRecurring({
        start_date: '2026-07-25',
        last_generated_date: undefined,
      }),
    ];
    expect(computeUpcomingRecurringThisMonth(items, JULY_15_2026, [])).toBe(10);
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
    expect(computeUpcomingRecurringThisMonth(items, DEC_20_2026, [])).toBe(10);
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

  it('counts the charges a weekly item really makes in each month', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [buildRecurring({ frequency: 'weekly' })],
    });

    // Weekly from Thu 1 Jan 2026: August has four Thursdays, October five.
    expect(result[0].projectedExpenses).toBe(40);
    expect(result[2].projectedExpenses).toBe(50);
  });

  it('puts a yearly charge in the month it falls, not a twelfth in each', () => {
    const result = computeTwelveMonthProjection({
      ...emptyProjectionInput(JULY_15_2026),
      recurringExpenses: [
        buildRecurring({
          amount: 1200,
          frequency: 'yearly',
          start_date: '2025-11-10',
        }),
      ],
    });

    expect(result[0].projectedExpenses).toBe(0);
    expect(result[3].monthKey).toBe('2026-11');
    expect(result[3].projectedExpenses).toBe(1200);
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
    ({
      kind: 'bank',
      current_balance: 100,
      default_currency: 'EUR',
      is_archived: false,
      ...over,
    }) as never;

  // Everything below is already in the default currency.
  const asIs = (account: { current_balance: number }) =>
    account.current_balance;

  it('adds up cash and bank accounts', () => {
    expect(
      computeSpendableBalance(
        [
          account({ kind: 'bank', current_balance: 1200 }),
          account({ kind: 'cash', current_balance: 80 }),
        ],
        asIs,
      ),
    ).toBe(1280);
  });

  // Selling an investment is a decision, not a payment. Counting it would
  // quietly promise that a shortfall is covered by something the user may have
  // no intention of touching.
  it('leaves investments out', () => {
    expect(
      computeSpendableBalance(
        [
          account({ kind: 'bank', current_balance: 500 }),
          account({ kind: 'investment', current_balance: 40000 }),
        ],
        asIs,
      ),
    ).toBe(500);
  });

  // Mirror reason: a card balance is not cash you have.
  it('leaves liabilities out', () => {
    expect(
      computeSpendableBalance(
        [
          account({ kind: 'bank', current_balance: 500 }),
          account({ kind: 'credit_card', current_balance: -300 }),
          account({ kind: 'loan', current_balance: -9000 }),
        ],
        asIs,
      ),
    ).toBe(500);
  });

  it('ignores archived accounts', () => {
    expect(
      computeSpendableBalance(
        [
          account({ current_balance: 500 }),
          account({ current_balance: 900, is_archived: true }),
        ],
        asIs,
      ),
    ).toBe(500);
  });

  // Null, not zero. Zero is a balance; null means the app does not know one,
  // and the projection must say so rather than draw a line from nowhere.
  it('has no opinion when nothing spendable is tracked', () => {
    expect(computeSpendableBalance([], asIs)).toBeNull();
    expect(
      computeSpendableBalance([account({ kind: 'investment' })], asIs),
    ).toBeNull();
  });

  // Balances are stored in each account's own currency. Adding them raw put a
  // ¥200,000 account into a euro forecast as €200,000.
  it('converts every account into the default currency', () => {
    const toEuro = (a: {
      current_balance: number;
      default_currency: string;
    }) => {
      if (a.default_currency === 'JPY') {
        return a.current_balance / 160;
      }

      return a.current_balance;
    };

    expect(
      computeSpendableBalance(
        [
          account({ current_balance: 1000 }),
          account({ current_balance: 200000, default_currency: 'JPY' }),
        ],
        toEuro,
      ),
    ).toBe(2250);
  });

  it('draws no balance when an account cannot be priced', () => {
    expect(
      computeSpendableBalance(
        [
          account({ current_balance: 1000 }),
          account({ current_balance: 200000, default_currency: 'JPY' }),
        ],
        (a) => {
          if (a.default_currency === 'JPY') {
            return null;
          }

          return a.current_balance;
        },
      ),
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
      loanOutflow: NO_LOANS,
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
      loanOutflow: NO_LOANS,
      now: NOW,
      openingBalance: 1000,
    });

    // With no activity at all the balance simply holds.
    expect(months[0].projectedBalance).toBe(1000);
    expect(months[11].projectedBalance).toBe(1000);
  });

  // Today's balance is not next month's opening balance: the rest of this
  // month still has a bill to pay, pay to arrive and everyday spending.
  it('moves the opening balance through the rest of this month first', () => {
    const now = new Date(2026, 7, 16, 12, 0, 0);
    const months = computeTwelveMonthProjection({
      // 310 a month of everyday spending, over a 31-day August: 10 a day.
      expenses: [buildExpense({ date: '2026-07-10', amount: 310 })],
      incomes: [],
      recurringExpenses: [
        buildRecurring({ amount: 200, start_date: '2026-01-20' }),
      ],
      recurringIncomes: [
        buildRecurring({
          id: 'pay',
          amount: 1000,
          type: 'income',
          start_date: '2026-01-25',
        }),
      ],
      loanOutflow: NO_LOANS,
      now,
      openingBalance: 500,
    });

    // 500 + 1000 pay - 200 bill - 15 days at 10 = 1150 on 31 August, then
    // September adds 1000 - 200 - 310.
    expect(months[0].projectedBalance).toBe(1640);
  });

  it('does not expect variable income that has already arrived', () => {
    const now = new Date(2026, 7, 16, 12, 0, 0);
    const firstBalanceOrNull = (incomes: Expense[]) =>
      computeTwelveMonthProjection({
        expenses: [],
        incomes,
        recurringExpenses: [],
        recurringIncomes: [],
        loanOutflow: NO_LOANS,
        now,
        openingBalance: 0,
      })[0].projectedBalance;
    const july = buildExpense({
      id: 'i-jul',
      date: '2026-07-25',
      amount: 900,
      type: 'income',
    });
    const august = buildExpense({
      id: 'i-aug',
      date: '2026-08-05',
      amount: 900,
      type: 'income',
    });

    // Still to arrive this month, then September's.
    expect(firstBalanceOrNull([july])).toBe(1800);
    // Already in the opening balance, so only September's is added.
    expect(firstBalanceOrNull([july, august])).toBe(900);
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

  // A loan instalment is cash out like any bill. Left out, a 400 a month loan
  // put the year-end balance 4,800 too high.
  it('takes loan minimums out of the balance, this month and after', () => {
    const months = computeTwelveMonthProjection({
      ...emptyProjectionInput(new Date(2026, 7, 16, 12, 0, 0)),
      loanOutflow: { restOfMonth: 400, months: [400, 400, 150, ...NO_REST] },
      openingBalance: 2000,
    });

    expect(months[0].projectedExpenses).toBe(400);
    expect(months[0].projectedBalance).toBe(1200);
    expect(months[2].projectedBalance).toBe(650);
    expect(months[11].projectedBalance).toBe(650);
  });
});

const NO_REST = new Array<number>(9).fill(0);
