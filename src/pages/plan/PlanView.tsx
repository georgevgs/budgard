import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import PageHeader from '@/common/components/common/PageHeader';
import { ExpenseLoadingState } from '@/pages/expenses/components/ExpensesLoading';
import PlanOverviewCard from '@/pages/plan/components/PlanOverviewCard';
import MonthlyDecisionCard from '@/pages/plan/components/MonthlyDecisionCard';
import PlanDetails from '@/pages/plan/components/PlanDetails';
import PlanTimeline from '@/pages/plan/components/PlanTimeline';
import {
  useAccountsData,
  useDataConfig,
  useGoalsData,
  useRecurringData,
} from '@/common/contexts/DataContext';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import { useBudgetOps } from '@/common/hooks/dataOps/useBudgetOps';
import { useDebts } from '@/common/hooks/useDebts';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { useMoneyTimeline } from '@/pages/plan/hooks/useMoneyTimeline';
import { useSavingsRhythm } from '@/common/hooks/savings/useSavingsRhythm';
import { getMonthlyAmount } from '@/constants/recurring';
import { computeUpcomingRecurringThisMonth } from '@/constants/forecast';
import { buildMonthlyDecision } from '@/pages/plan/utils/monthlyDecision';
import { formatCurrency } from '@/constants/utils';
import { sumSpending } from '@/constants/spending';
import type { Expense } from '@/types/Expense';

const PlanView = () => {
  const { t } = useTranslation();
  const config = useDataConfig();
  const goals = useGoalsData();
  const { recurringExpenses, recurringIncomes } = useRecurringData();
  const { accounts } = useAccountsData();
  const { summary: debtSummary } = useDebts();
  const { handleBudgetUpdate } = useBudgetOps();
  const { optimisticExpenses } = useQuickAdd();
  const [areDetailsOpen, setDetailsOpen] = useState(false);
  const now = useCurrentDate();
  const rhythm = useSavingsRhythm(optimisticExpenses);
  const timeline = useMoneyTimeline({
    recurringExpenses,
    recurringIncomes,
    now,
  });
  const model = useMemo(
    () => buildPlanModel(optimisticExpenses, goals, recurringExpenses, now),
    [optimisticExpenses, goals, recurringExpenses, now],
  );
  const decision = useMemo(
    () =>
      buildMonthlyDecision({
        monthlyBudget: config.monthlyBudget,
        spent: model.monthlySpent,
        committed: model.upcomingThisMonth,
        savingsTargetPct: config.defaultSavingsPct,
        saved: rhythm?.setAside ?? 0,
      }),
    [
      config.monthlyBudget,
      config.defaultSavingsPct,
      model.monthlySpent,
      model.upcomingThisMonth,
      rhythm?.setAside,
    ],
  );
  const counts = {
    goals: model.goalCount,
    debts: debtSummary.activeCount,
    accounts: accounts.length,
  };
  const isLoading = !config.isInitialized || !config.isSecondaryLoaded;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="page-shell">
      <PageHeader title={t('plan.title')} subtitle={t('plan.subtitle')} />
      <PlanTimeline timeline={timeline} currency={config.defaultCurrency} />
      <MonthlyDecisionCard
        decision={decision}
        currency={config.defaultCurrency}
        onOpenDetails={() => setDetailsOpen(true)}
      />
      <PlanDetails
        isOpen={areDetailsOpen}
        monthKey={model.monthKey}
        monthlyBudget={config.monthlyBudget}
        monthlySpent={model.monthlySpent}
        currency={config.defaultCurrency}
        rhythm={rhythm}
        onOpenChange={setDetailsOpen}
        onBudgetUpdate={handleBudgetUpdate}
      />
      {renderPlanningTools(model, config.defaultCurrency, counts, t)}
    </div>
  );
};

export default PlanView;

// --- Helpers ---

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type OverviewCounts = {
  goals: number;
  debts: number;
  accounts: number;
};

// Every screen that plans ahead stays reachable from Plan, but navigation is
// one quiet list. A figure appears only after that tool has something to say.
const renderPlanningTools = (
  model: ReturnType<typeof buildPlanModel>,
  currency: string,
  counts: OverviewCounts,
  t: TFunc,
) => (
  <section className="mt-8" aria-labelledby="planning-tools-title">
    <h2 id="planning-tools-title" className="mb-3 type-heading">
      {t('plan.tools.title')}
    </h2>
    <div className="surface-card-flush divide-y divide-border/40">
      <PlanOverviewCard
        title={t('plan.recurring.title')}
        value={resolveValue(
          model.recurringCount,
          formatCurrency(model.recurringMonthly, currency),
        )}
        description={t('plan.recurring.description', {
          count: model.recurringCount,
        })}
        setupLabel={t('plan.tools.setUp')}
        path="/recurring"
        icon={Repeat}
      />
      <PlanOverviewCard
        title={t('plan.goals.title')}
        value={resolveValue(
          counts.goals,
          t('plan.goals.value', { count: counts.goals }),
        )}
        description={t('plan.goals.description')}
        setupLabel={t('plan.tools.setUp')}
        path="/goals"
        icon={Target}
      />
      <PlanOverviewCard
        title={t('plan.debts.title')}
        value={resolveValue(
          counts.debts,
          t('plan.debts.value', { count: counts.debts }),
        )}
        description={t('plan.debts.description')}
        setupLabel={t('plan.tools.setUp')}
        path="/debts"
        icon={CreditCard}
      />
      <PlanOverviewCard
        title={t('plan.networth.title')}
        value={resolveValue(
          counts.accounts,
          t('plan.networth.value', { count: counts.accounts }),
        )}
        description={t('plan.networth.description')}
        setupLabel={t('plan.tools.setUp')}
        path="/networth"
        icon={Wallet}
      />
    </div>
  </section>
);

const resolveValue = (count: number, value: string): string | null => {
  if (count === 0) {
    return null;
  }

  return value;
};

const buildPlanModel = (
  expenses: Expense[],
  goals: ReturnType<typeof useGoalsData>,
  recurringExpenses: ReturnType<typeof useRecurringData>['recurringExpenses'],
  now: Date,
) => {
  const monthKey = format(now, 'yyyy-MM');
  const monthlySpent = sumSpending(
    expenses.filter((expense) => expense.date.slice(0, 7) === monthKey),
  );
  const activeRecurring = recurringExpenses.filter((item) => item.active);

  return {
    monthKey,
    monthlySpent,
    upcomingThisMonth: computeUpcomingRecurringThisMonth(
      recurringExpenses,
      now,
    ),
    recurringMonthly: activeRecurring.reduce(
      (sum, item) => sum + getMonthlyAmount(item),
      0,
    ),
    recurringCount: activeRecurring.length,
    goalCount: goals.filter((goal) => !goal.is_completed).length,
  };
};

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};
