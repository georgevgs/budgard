import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
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
import { useCurrentDate } from '@/hooks/useCurrentDate';
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
  const now = useCurrentDate();
  const rhythm = useSavingsRhythm(optimisticExpenses);
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
      {renderMonthlyContext(model.monthKey, rhythm, config.defaultCurrency, t)}
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

// The decision, boundary and commitments are the plan. These two analytical
// views explain it when someone wants the detail, without making every visit
// pass through two more dashboards first.
const renderMonthlyContext = (
  monthKey: string,
  rhythm: ReturnType<typeof useSavingsRhythm>,
  currency: string,
  t: TFunc,
) => (
  <details className="group mt-8">
    <summary className="surface-card flex cursor-pointer list-none items-center gap-4 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1">
        <span className="block type-heading">{t('plan.context.title')}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {t('plan.context.description')}
        </span>
      </span>
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        aria-hidden="true"
      />
    </summary>
    <div className="mt-8 space-y-8">
      <FiftyThirtyTwentyRing selectedMonth={monthKey} />
      <div id="savings-rhythm" className="scroll-mt-6">
        <SavingsRhythm rhythm={rhythm} currency={currency} />
      </div>
    </div>
  </details>
);

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
