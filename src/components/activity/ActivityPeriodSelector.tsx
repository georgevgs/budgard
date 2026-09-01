import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
  period: ActivityPeriod;
  onPeriodChange: (period: ActivityPeriod) => void;
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

// The window the whole screen is showing. It lives with the other refinements
// so the feed has one obvious filter entry point instead of overlapping time
// controls above it.
const ActivityPeriodSelector = (props: Props) => {
  const { t } = useTranslation();

  return (
    <Select
      value={props.period}
      onValueChange={(value) => props.onPeriodChange(value as ActivityPeriod)}
    >
      <SelectTrigger
        className="h-11 w-full rounded-xl border-input bg-card text-sm shadow-none"
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
  );
};

export default ActivityPeriodSelector;
