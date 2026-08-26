import { describe, expect, it } from 'vitest';
import { buildMonthlyDecision } from '@/lib/monthlyDecision';

describe('buildMonthlyDecision', () => {
  it('starts with the budget when no boundary exists', () => {
    expect(
      buildMonthlyDecision({
        monthlyBudget: null,
        spent: 300,
        committed: 100,
        savingsTargetPct: 20,
        saved: 0,
      }),
    ).toEqual({
      state: 'noBudget',
      amount: null,
      spent: 300,
      committed: 100,
      savingsReserve: 0,
    });
  });

  it('reserves the unfinished part of the savings target', () => {
    expect(
      buildMonthlyDecision({
        monthlyBudget: 2_000,
        spent: 900,
        committed: 300,
        savingsTargetPct: 20,
        saved: 150,
      }),
    ).toEqual({
      state: 'save',
      amount: 550,
      spent: 900,
      committed: 300,
      savingsReserve: 250,
    });
  });

  it('reports the size of a shortfall instead of a negative allowance', () => {
    expect(
      buildMonthlyDecision({
        monthlyBudget: 1_000,
        spent: 800,
        committed: 250,
        savingsTargetPct: 10,
        saved: 0,
      }),
    ).toEqual({
      state: 'shortfall',
      amount: 150,
      spent: 800,
      committed: 250,
      savingsReserve: 100,
    });
  });

  it('shows what remains when bills and savings are already covered', () => {
    expect(
      buildMonthlyDecision({
        monthlyBudget: 1_500,
        spent: 700,
        committed: 200,
        savingsTargetPct: 10,
        saved: 200,
      }),
    ).toEqual({
      state: 'ready',
      amount: 600,
      spent: 700,
      committed: 200,
      savingsReserve: 0,
    });
  });
});
