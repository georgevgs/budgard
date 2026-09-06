import { budgetApi } from '@/pages/budget/budgetApi';
import { categoriesApi } from '@/pages/categories/categoriesApi';
import { debtsApi } from '@/pages/debts/debtsApi';
import { expensesApi } from '@/pages/expenses/expensesApi';
import { goalsApi } from '@/pages/goals/goalsApi';
import { incomeApi } from '@/pages/income/incomeApi';
import { networthApi } from '@/pages/networth/networthApi';
import { planApi } from '@/pages/plan/planApi';
import { recurringApi } from '@/pages/recurring/recurringApi';
import { settingsApi } from '@/pages/settings/settingsApi';
import { tagsApi } from '@/pages/tags/tagsApi';

export type { ExpenseWritePayload } from '@/common/api/dataAccess';

// One object over the per-feature API modules. Callers keep a single
// dataService.X() surface while each feature owns its own queries.
export const dataService = {
  ...budgetApi,
  ...categoriesApi,
  ...debtsApi,
  ...expensesApi,
  ...goalsApi,
  ...incomeApi,
  ...networthApi,
  ...planApi,
  ...recurringApi,
  ...settingsApi,
  ...tagsApi,
};
