import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Target from 'lucide-react/dist/esm/icons/target';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import { PageHeader } from '@/common/components/common/PageHeader';
import { TransactionsLoading } from '@/common/components/common/TransactionsLoading';
import { PlanOverviewCard } from '@/pages/plan/components/PlanOverviewCard';
import { MonthlyDecisionCard } from '@/pages/plan/components/MonthlyDecisionCard';
import { PlanDetails } from '@/pages/plan/components/PlanDetails';
import { PlanTimeline } from '@/pages/plan/components/PlanTimeline';
import type { TranslateFunction } from '@/constants/translate';
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
import type { TimelineRange } from '@/pages/plan/utils/moneyTimeline';
import { useMonthlyPosition } from '@/common/hooks/useMonthlyPosition';
import { getMonthlyAmount } from '@/constants/recurring';
import { formatCurrency } from '@/constants/utils';

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
  // The month is the window the budget is kept in, so it is the one the screen
  // opens on. The rolling 30 days stays a tap away for "what is coming after
  // this month closes".
  const [timelineRange, setTimelineRange] = useState<TimelineRange>('month');
  const now = useCurrentDate();
  const monthly = useMonthlyPosition(optimisticExpenses, now);
  const { timeline, hasSchedules } = useMoneyTimeline({
    recurringExpenses,
    recurringIncomes,
    range: timelineRange,
    now,
  });
  const model = useMemo(
    () => buildPlanModel(goals, recurringExpenses),
    [goals, recurringExpenses],
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
        decision={monthly.position}
        currency={config.defaultCurrency}
        onOpenDetails={() => setDetailsOpen(true)}
        onShowCommitted={() => setTimelineRange('month')}
      />
      <PlanTimeline
        timeline={timeline}
        hasSchedules={hasSchedules}
        currency={config.defaultCurrency}
        onRangeChange={setTimelineRange}
      />
      <PlanDetails
        isOpen={areDetailsOpen}
        monthKey={monthly.monthKey}
        monthlyBudget={config.monthlyBudget}
        monthlySpent={monthly.position.spent}
        currency={config.defaultCurrency}
        rhythm={monthly.rhythm}
        onOpenChange={setDetailsOpen}
        onBudgetUpdate={handleBudgetUpdate}
      />
      {renderPlanningTools(model, config.defaultCurrency, counts, t)}
    </div>
  );
};

export default PlanView;

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
  t: TranslateFunction,
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
  goals: ReturnType<typeof useGoalsData>,
  recurringExpenses: ReturnType<typeof useRecurringData>['recurringExpenses'],
) => {
  const activeRecurring = recurringExpenses.filter((item) => item.active);

  return {
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

  return <TransactionsLoading />;
};
