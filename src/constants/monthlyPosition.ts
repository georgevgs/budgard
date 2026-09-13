export type MonthlyPositionState = 'noBudget' | 'shortfall' | 'save' | 'ready';

export type MonthlyPosition = {
  state: MonthlyPositionState;
  available: number | null;
  spent: number;
  committed: number;
  savingsReserve: number;
};

type MonthlyPositionInput = {
  monthlyBudget: number | null;
  spent: number;
  committed: number;
  savingsTargetPct: number | null;
  saved: number;
};

// The single current-month position shared by Today, Plan and Trends:
// budget - spent - bills still due - the unfinished savings target.
export const buildMonthlyPosition = (
  input: MonthlyPositionInput,
): MonthlyPosition => {
  const spent = Math.max(input.spent, 0);
  const committed = Math.max(input.committed, 0);

  if (input.monthlyBudget === null || input.monthlyBudget <= 0) {
    return {
      state: 'noBudget',
      available: null,
      spent,
      committed,
      savingsReserve: 0,
    };
  }

  const savingsTarget = targetAmount(
    input.monthlyBudget,
    input.savingsTargetPct,
  );
  const savingsReserve = Math.max(savingsTarget - Math.max(input.saved, 0), 0);
  const available = input.monthlyBudget - spent - committed - savingsReserve;

  if (available < 0) {
    return position('shortfall', available, spent, committed, savingsReserve);
  }
  if (savingsReserve > 0) {
    return position('save', available, spent, committed, savingsReserve);
  }

  return position('ready', available, spent, committed, savingsReserve);
};

const targetAmount = (budget: number, percentage: number | null): number => {
  if (percentage === null || percentage <= 0) {
    return 0;
  }

  return budget * (Math.min(percentage, 100) / 100);
};

const position = (
  state: Exclude<MonthlyPositionState, 'noBudget'>,
  available: number,
  spent: number,
  committed: number,
  savingsReserve: number,
): MonthlyPosition => ({
  state,
  available,
  spent,
  committed,
  savingsReserve,
});
