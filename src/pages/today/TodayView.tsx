import { format } from 'date-fns';
import TodayArrange from '@/pages/today/components/TodayArrange';
import TodayGrid from '@/pages/today/components/TodayGrid';
import TodayHeader from '@/pages/today/components/TodayHeader';
import { ExpenseLoadingState } from '@/pages/expenses/components/ExpensesLoading';
import { useDataConfig } from '@/common/contexts/DataContext';
import { useQuickAdd } from '@/common/contexts/QuickAddContext';
import { useDateLocale } from '@/common/hooks/useDateLocale';
import { useCurrentDate } from '@/common/hooks/useCurrentDate';
import { useDelayedLoading } from '@/common/hooks/useDelayedLoading';
import { useExpenseAlerts } from '@/pages/expenses/hooks/useExpenseAlerts';
import { useDailyPace } from '@/pages/today/hooks/useDailyPace';
import { useTodayGuidance } from '@/pages/today/hooks/useTodayGuidance';
import { useTodayLayout } from '@/pages/today/hooks/useTodayLayout';
import { useTopCategory } from '@/pages/today/hooks/useTopCategory';

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
