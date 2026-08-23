import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
  period: ActivityPeriod;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
};

// The detail control for one period option, so it only appears while that
// option is chosen. Showing it under "last 30 days" would imply the month
// still narrows the range, which it does not.
const ActivityMonthStepper = ({ period, selectedMonth, onMonthChange }: Props) => {
  if (period !== 'month') {
    return null;
  }

  return (
    <ExpensesMonthlySelector
      selectedMonth={selectedMonth}
      onMonthChange={onMonthChange}
    />
  );
};

export default ActivityMonthStepper;
