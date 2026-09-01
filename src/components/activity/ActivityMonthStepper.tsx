import { useTranslation } from 'react-i18next';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import {
  format,
  addMonths,
  parseISO,
  subMonths,
  setMonth,
  setYear,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
import MonthYearPickerContent from '@/components/expenses/MonthYearPickerContent';
import { useDateLocale } from '@/hooks/useDateLocale';
import type { ActivityPeriod } from '@/hooks/activity/useActivityFeed';

type Props = {
  period: ActivityPeriod;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
};

// The detail control for one period option, so it only appears while that
// option is chosen. Showing it under "last 30 days" would imply the month
// still narrows the range, which it does not. Slimmer than a standalone
// month picker on purpose — h-9 controls, no outer tile — now that it lives
// inside the sticky toolbar rather than standing on its own row.
const ActivityMonthStepper = ({
  period,
  selectedMonth,
  onMonthChange,
}: Props) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const selectedDate = parseISO(`${selectedMonth}-01`);

  if (period !== 'month') {
    return null;
  }

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newDate = subMonths(selectedDate, 1);
    if (direction === 'next') {
      newDate = addMonths(selectedDate, 1);
    }

    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const handleMonthSelect = (month: number) => {
    onMonthChange(format(setMonth(selectedDate, month), 'yyyy-MM'));
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    let offset = -1;
    if (direction === 'next') {
      offset = 1;
    }

    onMonthChange(
      format(
        setYear(selectedDate, selectedDate.getFullYear() + offset),
        'yyyy-MM',
      ),
    );
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleMonthChange('prev')}
        className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        aria-label={t('navigation.previousMonth')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 flex-1 rounded-full text-xs font-semibold sm:text-sm"
            aria-label={t('navigation.selectMonth')}
          >
            {format(selectedDate, 'LLLL yyyy', { locale: dateLocale })}
          </Button>
        </PopoverTrigger>
        <MonthYearPickerContent
          selectedDate={selectedDate}
          dateLocale={dateLocale}
          onYearChange={handleYearChange}
          onMonthSelect={handleMonthSelect}
        />
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleMonthChange('next')}
        className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
        aria-label={t('navigation.nextMonth')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ActivityMonthStepper;
