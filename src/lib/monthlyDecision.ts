export type MonthlyDecisionState = 'noBudget' | 'shortfall' | 'save' | 'ready';

export type MonthlyDecision = {
  state: MonthlyDecisionState;
  amount: number | null;
  spent: number;
  committed: number;
  savingsReserve: number;
};

type Input = {
  monthlyBudget: number | null;
  spent: number;
  committed: number;
  savingsTargetPct: number | null;
  saved: number;
};

// Turns the plan's separate facts into one decision: what is genuinely free
// after spending, bills still due and the part the user intends to save.
export const buildMonthlyDecision = (input: Input): MonthlyDecision => {
  if (input.monthlyBudget === null || input.monthlyBudget <= 0) {
    return {
      state: 'noBudget',
      amount: null,
      spent: Math.max(input.spent, 0),
      committed: Math.max(input.committed, 0),
      savingsReserve: 0,
    };
  }

  const savingsTarget = targetAmount(
    input.monthlyBudget,
    input.savingsTargetPct,
  );
  const savingsReserve = Math.max(savingsTarget - Math.max(input.saved, 0), 0);
  const flexible =
    input.monthlyBudget - input.spent - input.committed - savingsReserve;

  if (flexible < 0) {
    return decision('shortfall', Math.abs(flexible), input, savingsReserve);
  }
  if (savingsReserve > 0) {
    return decision('save', flexible, input, savingsReserve);
  }

  return decision('ready', flexible, input, savingsReserve);
};

// --- Helpers ---

const targetAmount = (budget: number, percentage: number | null): number => {
  if (percentage === null || percentage <= 0) {
    return 0;
  }

  return budget * (Math.min(percentage, 100) / 100);
};

const decision = (
  state: Exclude<MonthlyDecisionState, 'noBudget'>,
  amount: number,
  input: Input,
  savingsReserve: number,
): MonthlyDecision => {
  return {
    state,
    amount,
    spent: Math.max(input.spent, 0),
    committed: Math.max(input.committed, 0),
    savingsReserve,
  };
};
