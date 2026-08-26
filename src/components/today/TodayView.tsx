import { format } from 'date-fns';
import TodayArrange from '@/components/today/TodayArrange';
import TodayGrid from '@/components/today/TodayGrid';
import TodayHeader from '@/components/today/TodayHeader';
import { ExpenseLoadingState } from '@/components/expenses/ExpensesLoading';
import { useDataConfig } from '@/contexts/DataContext';
import { useQuickAdd } from '@/contexts/QuickAddContext';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useExpenseAlerts } from '@/hooks/expensesList/useExpenseAlerts';
import { useDailyPace } from '@/hooks/today/useDailyPace';
import { useTodayGuidance } from '@/hooks/today/useTodayGuidance';
import { useTodayLayout } from '@/hooks/today/useTodayLayout';
import { useTopCategory } from '@/hooks/today/useTopCategory';

// The home screen, as a bento grid the user arranges themselves. What the
// modules are ranked by has not changed — what is about to leave the account,
// then what that means, then what already happened — but that ranking is now
// only the default, and the order below it is theirs.
const TodayView = () => {
  const { isInitialized, monthlyBudget } = useDataConfig();
  const { optimisticExpenses } = useQuickAdd();
  const dateLocale = useDateLocale();
  const now = useCurrentDate();
  const guidance = useTodayGuidance(optimisticExpenses, now);
  const pace = useDailyPace(optimisticExpenses, guidance.dailyAllowance, now);
  const topCategory = useTopCategory(optimisticExpenses);
  const layout = useTodayLayout();
  const showSkeleton = useDelayedLoading(!isInitialized);
  const currentMonth = format(now, 'yyyy-MM');

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
      <TodayHeader
        greeting={guidance.greeting}
        dateLabel={format(now, 'EEEE, d LLLL', { locale: dateLocale })}
        isArranging={layout.isArranging}
        onArrange={() => layout.setArranging(true)}
        onDone={() => layout.setArranging(false)}
      />
      {renderBody(layout, {
        visible: layout.visible,
        guidance,
        pace,
        topCategory,
        monthlyBudget,
        onArrange: () => layout.setArranging(true),
      })}
    </div>
  );
};

export default TodayView;

// --- Helpers ---

const renderBody = (
  layout: ReturnType<typeof useTodayLayout>,
  grid: React.ComponentProps<typeof TodayGrid>,
) => {
  if (layout.isArranging) {
    return <TodayArrange layout={layout} />;
  }

  return <TodayGrid {...grid} />;
};

const renderLoading = (showSkeleton: boolean) => {
  if (!showSkeleton) {
    return null;
  }

  return <ExpenseLoadingState />;
};
