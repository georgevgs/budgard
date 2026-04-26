import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

type IncomeEmptyProps = {
  selectedMonth: string;
  onAddClick: () => void;
};

const IncomeEmpty = ({ selectedMonth, onAddClick }: IncomeEmptyProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const monthLabel = format(new Date(selectedMonth + '-01'), 'LLLL yyyy', {
    locale: dateLocale,
  });

  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      <div
        className="w-20 h-20 mb-6 rounded-full bg-income/10 flex items-center justify-center"
        aria-hidden="true"
      >
        <Plus className="h-10 w-10 text-income" />
      </div>
      <h3 className="text-base font-semibold mb-1">
        {t('income.noIncomeFor', { month: monthLabel })}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
        {t('income.addFirstIncome')}
      </p>
      <Button onClick={onAddClick} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t('income.addIncome')}
      </Button>
    </div>
  );
};

export default IncomeEmpty;
