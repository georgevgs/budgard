import { describe, expect, it } from 'vitest';
import { buildMonthlyPosition } from '@/constants/monthlyPosition';

describe('buildMonthlyPosition', () => {
  it('has no available amount before a budget is set', () => {
    expect(
      buildMonthlyPosition({
        monthlyBudget: null,
        spent: 300,
        committed: 100,
        savingsTargetPct: 20,
        saved: 0,
      }),
    ).toEqual({
      state: 'noBudget',
      available: null,
      spent: 300,
      committed: 100,
      savingsReserve: 0,
    });
  });

  it('reserves the unfinished part of the savings target', () => {
    expect(
      buildMonthlyPosition({
        monthlyBudget: 2_000,
        spent: 900,
        committed: 300,
        savingsTargetPct: 20,
        saved: 150,
      }),
    ).toEqual({
      state: 'save',
      available: 550,
      spent: 900,
      committed: 300,
      savingsReserve: 250,
    });
  });

  it('keeps a shortfall signed so every consumer reads the same position', () => {
    expect(
      buildMonthlyPosition({
        monthlyBudget: 1_000,
        spent: 800,
        committed: 250,
        savingsTargetPct: 10,
        saved: 0,
      }),
    ).toEqual({
      state: 'shortfall',
      available: -150,
      spent: 800,
      committed: 250,
      savingsReserve: 100,
    });
  });

  it('shows what remains when bills and savings are already covered', () => {
    expect(
      buildMonthlyPosition({
        monthlyBudget: 1_500,
        spent: 700,
        committed: 200,
        savingsTargetPct: 10,
        saved: 200,
      }),
    ).toEqual({
      state: 'ready',
      available: 600,
      spent: 700,
      committed: 200,
      savingsReserve: 0,
    });
  });
});
