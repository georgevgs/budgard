import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import FormsManager from '@/components/layout/FormsManager';
import SpeedDial from '@/components/layout/SpeedDial';
import UpcomingBillsCard from '@/components/common/UpcomingBillsCard';
import WeeklyRecapCard from '@/components/recap/WeeklyRecapCard';
import SavingsRhythm from '@/components/today/SavingsRhythm';
import RecentActivityPreview from '@/components/today/RecentActivityPreview';
import TodayHero from '@/components/today/TodayHero';
import TodayInsightList from '@/components/today/TodayInsightList';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import { useDataConfig } from '@/contexts/DataContext';
import { formatCurrency } from '@/lib/utils';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useExpenseAlerts } from '@/hooks/expensesList/useExpenseAlerts';
import { useExpenseFormState } from '@/hooks/expensesList/useExpenseFormState';
import { useOpenFormFromUrl } from '@/hooks/expensesList/useOpenFormFromUrl';
import { useOptimisticExpenseActions } from '@/hooks/expensesList/useOptimisticExpenseActions';
import { useSavingsRhythm } from '@/hooks/today/useSavingsRhythm';
import { useTodayGuidance } from '@/hooks/today/useTodayGuidance';

const TodayView = () => {
  const { t } = useTranslation();
  const { isInitialized } = useDataConfig();
  const formState = useExpenseFormState();
  const { optimisticExpenses, handleExpenseFormSubmit } =
    useOptimisticExpenseActions();
  const guidance = useTodayGuidance(optimisticExpenses);
  const rhythm = useSavingsRhythm(optimisticExpenses);
  const showSkeleton = useDelayedLoading(!isInitialized);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useOpenFormFromUrl(isInitialized, formState.setFormType);

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
    <div>
      <div className="today-shell mx-auto max-w-3xl px-4 pt-4 pb-5 sm:px-6">
        <TodayHero {...guidance} />
        <div className="mt-8 space-y-8">
          <WeeklyRecapCard />
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
          <SavingsRhythm rhythm={rhythm} currency={guidance.currency} />
          <RecentActivityPreview
            items={guidance.recentActivity}
            currency={guidance.currency}
          />
        </div>
      </div>

      <FormsManager
        formType={formState.formType}
        onClose={formState.handleFormClose}
        selectedExpense={formState.selectedExpense}
        onExpenseSubmit={handleExpenseFormSubmit}
      />
      <SpeedDial
        onAddExpense={formState.openNewExpenseForm}
        onAddCategory={formState.openNewCategoryForm}
      />
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
