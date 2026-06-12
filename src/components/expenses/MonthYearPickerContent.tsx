import { useTranslation } from 'react-i18next';
import type { Locale } from 'date-fns';
import { format, setMonth } from 'date-fns';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import { Button } from '@/components/ui/button';
import { PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
  selectedDate: Date;
  dateLocale: Locale | undefined;
  onYearChange: (direction: 'prev' | 'next') => void;
  onMonthSelect: (month: number) => void;
};

const MonthYearPickerContent = ({
  selectedDate,
  dateLocale,
  onYearChange,
  onMonthSelect,
}: Props) => {
  const { t } = useTranslation();
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  return (
    <PopoverContent className="w-64 p-0" align="center">
      <div className="flex items-center justify-between border-b p-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={() => onYearChange('prev')}
          aria-label={t('navigation.previousYear')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">{currentYear}</div>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          onClick={() => onYearChange('next')}
          aria-label={t('navigation.nextYear')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 p-2">
        {Array.from({ length: 12 }, (_, index) => (
          <Button
            key={`month-${index}`}
            variant="ghost"
            size="sm"
            className={cn(
              'h-10 w-full justify-center',
              currentMonth === index &&
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
            )}
            onClick={() => onMonthSelect(index)}
          >
            {format(setMonth(selectedDate, index), 'LLL', {
              locale: dateLocale,
            })}
          </Button>
        ))}
      </div>
    </PopoverContent>
  );
};

export default MonthYearPickerContent;
