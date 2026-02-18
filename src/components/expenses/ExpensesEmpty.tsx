import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

type ExpensesEmptyProps = {
  selectedMonth: string;
  onAddClick: () => void;
};

const ExpensesEmpty = ({ selectedMonth, onAddClick }: ExpensesEmptyProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'el' ? el : enUS;
  const monthLabel = format(new Date(selectedMonth + '-01'), 'MMMM yyyy', {
    locale: dateLocale,
  });

  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      <img
        src="/icons/money-bag.png"
        alt=""
        className="w-20 h-20 mb-6 opacity-80 drop-shadow-sm"
        aria-hidden="true"
      />
      <h3 className="text-base font-semibold mb-1">
        {t('expenses.noExpensesFor', { month: monthLabel })}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[220px]">
        {t('expenses.addFirstExpense')}
      </p>
      <Button onClick={onAddClick} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t('expenses.addExpense')}
      </Button>
    </div>
  );
};

export default ExpensesEmpty;
