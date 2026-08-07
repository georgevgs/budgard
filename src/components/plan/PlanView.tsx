import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import BudgetProgress from '@/components/budget/BudgetProgress';
import UpcomingBillsCard from '@/components/common/UpcomingBillsCard';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import FiftyThirtyTwentyRing from '@/components/income/FiftyThirtyTwentyRing';
import PlanOverviewCard from '@/components/plan/PlanOverviewCard';
import {
  useDataConfig,
  useExpensesData,
  useGoalsData,
  useRecurringData,
} from '@/contexts/DataContext';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useDebts } from '@/hooks/useDebts';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { getMonthlyAmount } from '@/lib/recurring';
import { buildUpcomingBills } from '@/lib/upcomingBills';
import { formatCurrency } from '@/lib/utils';

const PlanView = () => {
  const { t } = useTranslation();
  const config = useDataConfig();
  const expenses = useExpensesData();
  const goals = useGoalsData();
  const { recurringExpenses } = useRecurringData();
  const { summary: debtSummary } = useDebts();
  const { handleBudgetUpdate } = useBudgetOps();
  const model = useMemo(
    () => buildPlanModel(expenses, goals, recurringExpenses),
    [expenses, goals, recurringExpenses],
  );
  const isLoading = !config.isInitialized || !config.isSecondaryLoaded;
  const showSkeleton = useDelayedLoading(isLoading);

  if (isLoading) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-5 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.035em]">
        {t('plan.title')}
      </h1>
      <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {t('plan.subtitle')}
      </p>
      <section
        className="surface-card mt-6 p-5"
        aria-labelledby="monthly-plan-title"
      >
        <h2
          id="monthly-plan-title"
          className="mb-4 font-display text-xl font-semibold"
        >
          {t('plan.monthlyPlan')}
        </h2>
        <BudgetProgress
          monthlyBudget={config.monthlyBudget}
          monthlySpent={model.monthlySpent}
          onBudgetUpdate={handleBudgetUpdate}
          currencyCode={config.defaultCurrency}
        />
      </section>
      <div className="mt-8">
        <UpcomingBillsCard
          items={model.upcoming.items}
          count={model.upcoming.count}
          currency={config.defaultCurrency}
          title={t('plan.commitments.title')}
          summary={t('plan.commitments.summary', {
            amount: formatCurrency(
              model.upcoming.total,
              config.defaultCurrency,
            ),
            count: model.upcoming.count,
          })}
        />
      </div>
      <div className="mt-8">
        <FiftyThirtyTwentyRing selectedMonth={model.monthKey} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PlanOverviewCard
          title={t('plan.recurring.title')}
          value={formatCurrency(model.recurringMonthly, config.defaultCurrency)}
          description={t('plan.recurring.description', {
            count: model.recurringCount,
          })}
          path="/recurring"
          icon={Repeat}
          toneClass="bg-primary/12 text-primary"
        />
        <PlanOverviewCard
          title={t('plan.goals.title')}
          value={t('plan.goals.value', { count: model.goalCount })}
          description={t('plan.goals.description')}
          path="/goals"
          icon={Target}
          toneClass="bg-income/12 text-income"
        />
        <PlanOverviewCard
          title={t('plan.debts.title')}
          value={t('plan.debts.value', { count: debtSummary.activeCount })}
          description={t('plan.debts.description')}
          path="/debts"
          icon={CreditCard}
          toneClass="bg-warning/14 text-warning-foreground"
        />
      </div>
    </div>
  );
};

export default PlanView;

// --- Helpers ---

const buildPlanModel = (
  expenses: ReturnType<typeof useExpensesData>,
  goals: ReturnType<typeof useGoalsData>,
  recurringExpenses: ReturnType<typeof useRecurringData>['recurringExpenses'],
) => {
  const now = new Date();
  const monthKey = format(now, 'yyyy-MM');
  const monthlySpent = expenses.reduce((sum, expense) => {
    if (expense.date.slice(0, 7) !== monthKey) {
      return sum;
    }

    return sum + expense.amount;
  }, 0);
  const activeRecurring = recurringExpenses.filter((item) => item.active);

  return {
    monthKey,
    monthlySpent,
    // A month-long window, where Today looks a week ahead: Plan is where you
    // come to see everything still committed, not just what lands imminently.
    upcoming: buildUpcomingBills(recurringExpenses, now, {
      withinDays: 30,
      limit: 6,
    }),
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
