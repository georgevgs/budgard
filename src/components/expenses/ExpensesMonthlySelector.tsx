import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  parseISO,
  subMonths,
  setMonth,
  setYear,
} from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExpensesMonthlySelectorProps {
  selectedMonth: string; // Format: "yyyy-MM"
  onMonthChange: (month: string) => void;
}

const ExpensesMonthlySelector = ({
  selectedMonth,
  onMonthChange,
}: ExpensesMonthlySelectorProps) => {
  const { t, i18n } = useTranslation();
  const selectedDate = parseISO(`${selectedMonth}-01`);
  const dateLocale = i18n.language === 'el' ? el : enUS;

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate =
      direction === 'next'
        ? addMonths(selectedDate, 1)
        : subMonths(selectedDate, 1);
    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const handleMonthSelect = (month: number) => {
    const newDate = setMonth(selectedDate, month);
    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newDate = setYear(
      selectedDate,
      selectedDate.getFullYear() + (direction === 'next' ? 1 : -1),
    );
    onMonthChange(format(newDate, 'yyyy-MM'));
  };

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  return (
    <div className="flex items-center justify-between gap-4 p-1 rounded-lg bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleMonthChange('prev')}
        className="h-8 w-8 p-0"
        aria-label={t('navigation.previousMonth')}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="font-medium text-sm h-8"
            aria-label={t('navigation.selectMonth')}
          >
            {format(selectedDate, 'MMMM yyyy', { locale: dateLocale })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="center">
          <div className="flex items-center justify-between border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleYearChange('prev')}
              aria-label={t('navigation.previousYear')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold">{currentYear}</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleYearChange('next')}
              aria-label={t('navigation.nextYear')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 p-2">
            {Array.from({ length: 12 }, (_, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-full justify-center',
                  currentMonth === index &&
                    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {format(setMonth(selectedDate, index), 'MMM', {
                  locale: dateLocale,
                })}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleMonthChange('next')}
        className="h-8 w-8 p-0"
        aria-label={t('navigation.nextMonth')}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ExpensesMonthlySelector;
