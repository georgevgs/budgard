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

// The window the whole screen is showing, as the pill beside the search box.
// It used to be a full-width select stacked above everything; a range is a
// qualifier on the search, not a step before it, so it sits where a qualifier
// goes.
const ActivityPeriodSelector = (props: Props) => {
  const { t } = useTranslation();

  return (
    <Select
      value={props.period}
      onValueChange={(value) => props.onPeriodChange(value as ActivityPeriod)}
    >
      <SelectTrigger
        className="h-10.5 w-auto shrink-0 gap-1.5 rounded-full border-0 bg-primary/13 px-3.5 text-xs font-semibold text-primary-ink shadow-none"
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
