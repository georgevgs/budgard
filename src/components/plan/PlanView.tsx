import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import BentoGrid from '@/components/bento/BentoGrid';
import PageHeader from '@/components/common/PageHeader';
import BudgetProgress from '@/components/budget/BudgetProgress';
import UpcomingBillsCard from '@/components/common/UpcomingBillsCard';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import FiftyThirtyTwentyRing from '@/components/income/FiftyThirtyTwentyRing';
import PlanOverviewCard from '@/components/plan/PlanOverviewCard';
import MonthlyDecisionCard from '@/components/plan/MonthlyDecisionCard';
import SavingsRhythm from '@/components/plan/SavingsRhythm';
import {
  useAccountsData,
  useDataConfig,
  useGoalsData,
  useRecurringData,
} from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import { useBudgetOps } from '@/hooks/dataOps/useBudgetOps';
import { useDebts } from '@/hooks/useDebts';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useSavingsRhythm } from '@/hooks/savings/useSavingsRhythm';
import { getMonthlyAmount } from '@/lib/recurring';
import { computeUpcomingRecurringThisMonth } from '@/lib/forecast';
import { buildMonthlyDecision } from '@/lib/monthlyDecision';
import { buildUpcomingBills } from '@/lib/upcomingBills';
import { formatCurrency } from '@/lib/utils';
import { sumSpending } from '@/lib/spending';
import type { Expense } from '@/types/Expense';

const PlanView = () => {
  const { t } = useTranslation();
  const config = useDataConfig();
  const goals = useGoalsData();
  const { recurringExpenses } = useRecurringData();
  const { accounts } = useAccountsData();
  const { summary: debtSummary } = useDebts();
  const { handleBudgetUpdate } = useBudgetOps();
  const { optimisticExpenses } = useQuickAdd();
  const rhythm = useSavingsRhythm(optimisticExpenses);
  const model = useMemo(
    () => buildPlanModel(optimisticExpenses, goals, recurringExpenses),
    [optimisticExpenses, goals, recurringExpenses],
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
      <MonthlyDecisionCard
        decision={decision}
        currency={config.defaultCurrency}
      />
      <section
        id="monthly-plan"
        className="surface-card mt-6 scroll-mt-6 p-5"
        aria-labelledby="monthly-plan-title"
      >
        <h2 id="monthly-plan-title" className="mb-4 type-heading">
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
      {/* A habit built over a month, not a thing to react to this morning —
          it reads as planning, so it belongs beside the other planning. */}
      <div id="savings-rhythm" className="mt-8 scroll-mt-6">
        <SavingsRhythm rhythm={rhythm} currency={config.defaultCurrency} />
      </div>
      {renderOverviewGrid(model, config.defaultCurrency, counts, t)}
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

// Every screen that plans ahead is reachable from here — Plan is the hub, so
// nothing lives only behind a header menu.
const renderOverviewGrid = (
  model: ReturnType<typeof buildPlanModel>,
  currency: string,
  counts: OverviewCounts,
  t: TFunc,
) => (
  <BentoGrid className="mt-8 lg:grid-cols-4">
    <PlanOverviewCard
      title={t('plan.recurring.title')}
      value={formatCurrency(model.recurringMonthly, currency)}
      description={t('plan.recurring.description', {
        count: model.recurringCount,
      })}
      path="/recurring"
      icon={Repeat}
    />
    <PlanOverviewCard
      title={t('plan.goals.title')}
      value={t('plan.goals.value', { count: counts.goals })}
      description={t('plan.goals.description')}
      path="/goals"
      icon={Target}
    />
    <PlanOverviewCard
      title={t('plan.debts.title')}
      value={t('plan.debts.value', { count: counts.debts })}
      description={t('plan.debts.description')}
      path="/debts"
      icon={CreditCard}
    />
    <PlanOverviewCard
      title={t('plan.networth.title')}
      value={t('plan.networth.value', { count: counts.accounts })}
      description={t('plan.networth.description')}
      path="/networth"
      icon={Wallet}
    />
  </BentoGrid>
);

const buildPlanModel = (
  expenses: Expense[],
  goals: ReturnType<typeof useGoalsData>,
  recurringExpenses: ReturnType<typeof useRecurringData>['recurringExpenses'],
) => {
  const now = new Date();
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
