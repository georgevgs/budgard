import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateLocale } from '@/hooks/useDateLocale';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

type ExpensesEmptyProps = {
  selectedMonth: string;
  onAddClick: () => void;
};

const ExpensesEmpty = ({ selectedMonth, onAddClick }: ExpensesEmptyProps) => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const monthLabel = format(new Date(selectedMonth + '-01'), 'LLLL yyyy', {
    locale: dateLocale,
  });

  return (
    <EmptyStateCard
      variant="page"
      media={
        <img
          src="/icons/money-bag.png"
          alt=""
          className="w-20 h-20 opacity-80 drop-shadow-sm"
          aria-hidden="true"
        />
      }
      title={t('expenses.noExpensesFor', { month: monthLabel })}
      description={t('expenses.addFirstExpense')}
      actionLabel={t('expenses.addExpense')}
      onAction={onAddClick}
    />
  );
};

export default ExpensesEmpty;
