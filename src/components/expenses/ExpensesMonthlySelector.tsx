import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger } from '@/components/ui/popover';
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
import { useDateLocale } from '@/hooks/useDateLocale';
import MonthYearPickerContent from '@/components/expenses/MonthYearPickerContent';

type ExpensesMonthlySelectorProps = {
  selectedMonth: string; // Format: "yyyy-MM"
  onMonthChange: (month: string) => void;
}

const ExpensesMonthlySelector = ({
  selectedMonth,
  onMonthChange,
}: ExpensesMonthlySelectorProps) => {
  const { t } = useTranslation();
  const selectedDate = parseISO(`${selectedMonth}-01`);
  const dateLocale = useDateLocale();

  const handleMonthChange = (direction: 'prev' | 'next') => {
    let newDate = subMonths(selectedDate, 1);
    if (direction === 'next') {
      newDate = addMonths(selectedDate, 1);
    }

    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const handleMonthSelect = (month: number) => {
    const newDate = setMonth(selectedDate, month);
    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    let offset = -1;
    if (direction === 'next') {
      offset = 1;
    }

    const newDate = setYear(selectedDate, selectedDate.getFullYear() + offset);
    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  return (
    <div className="flex items-center justify-between gap-4 p-1 rounded-2xl bg-card border border-border/40 shadow-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleMonthChange('prev')}
        className="h-10 w-10 p-0"
        aria-label={t('navigation.previousMonth')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="font-medium text-sm h-10"
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
        size="sm"
        onClick={() => handleMonthChange('next')}
        className="h-10 w-10 p-0"
        aria-label={t('navigation.nextMonth')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ExpensesMonthlySelector;
