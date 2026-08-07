import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ExpensesMonthlySelector from '@/components/expenses/ExpensesMonthlySelector';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
  period: ActivityPeriod;
  selectedMonth: string;
  onPeriodChange: (period: ActivityPeriod) => void;
  onMonthChange: (month: string) => void;
};

const PERIODS: ActivityPeriod[] = [
  'month',
  'last7',
  'last30',
  'last90',
  'thisQuarter',
  'thisYear',
  'all',
];

const ActivityPeriodSelector = (props: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Select
        value={props.period}
        onValueChange={(value) => props.onPeriodChange(value as ActivityPeriod)}
      >
        <SelectTrigger
          className="h-11 rounded-xl border-border/35 bg-card/72 shadow-none"
          aria-label={t('activity.period.label')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`activity.period.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {renderMonthStepper(props)}
    </div>
  );
};

export default ActivityPeriodSelector;

// --- Helpers ---

// The stepper is the detail control for one period option, so it only appears
// while that option is chosen. Showing it under "last 30 days" would imply the
// month still narrows the range, which it does not.
const renderMonthStepper = (props: Props) => {
  if (props.period !== 'month') {
    return null;
  }

  return (
    <ExpensesMonthlySelector
      selectedMonth={props.selectedMonth}
      onMonthChange={props.onMonthChange}
    />
  );
};
