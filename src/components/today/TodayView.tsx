import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import UpcomingBillsCard from '@/components/common/UpcomingBillsCard';
import WeeklyRecapCard from '@/components/recap/WeeklyRecapCard';
import RecentActivityPreview from '@/components/today/RecentActivityPreview';
import TodayHero from '@/components/today/TodayHero';
import TodayInsightList from '@/components/today/TodayInsightList';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import { useDataConfig } from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import { formatCurrency } from '@/lib/utils';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useExpenseAlerts } from '@/hooks/expensesList/useExpenseAlerts';
import { useTodayGuidance } from '@/hooks/today/useTodayGuidance';

// Ordered by how soon each block needs a decision: what is about to leave the
// account, then what that means, then what already happened. The recap and the
// savings rhythm used to sit above the recent list purely by accident of when
// they were built, which pushed the only time-sensitive card below the fold.
const TodayView = () => {
  const { t } = useTranslation();
  const { isInitialized } = useDataConfig();
  const { optimisticExpenses, handleExpenseEdit, handleIncomeEdit } =
    useQuickAdd();
  const guidance = useTodayGuidance(optimisticExpenses);
  const showSkeleton = useDelayedLoading(!isInitialized);
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Today is the tab that is always mounted, so the budget and per-category
  // threshold alerts hang off it. It only ever shows the current month, hence
  // selectedMonth === currentMonth.
  useExpenseAlerts({
    selectedMonth: currentMonth,
    currentMonth,
    monthlyTotal: guidance.spentThisMonth,
  });

  if (!isInitialized) {
    return renderLoading(showSkeleton);
  }

  return (
    <div className="page-shell">
      <TodayHero {...guidance} />
      <div className="mt-8 space-y-8">
        <UpcomingBillsCard
          items={guidance.upcomingWeek.items}
          count={guidance.upcomingWeek.count}
          currency={guidance.currency}
          title={t('today.upcoming.title')}
          summary={t('today.upcoming.summary', {
            amount: formatCurrency(
              guidance.upcomingWeek.total,
              guidance.currency,
            ),
            count: guidance.upcomingWeek.count,
          })}
        />
        <TodayInsightList insights={guidance.insights} />
        <WeeklyRecapCard />
        <RecentActivityPreview
          items={guidance.recentActivity}
          currency={guidance.currency}
          onExpenseEdit={handleExpenseEdit}
          onIncomeEdit={handleIncomeEdit}
        />
      </div>
    </div>
  );
};

export default TodayView;

// --- Helpers ---

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};
