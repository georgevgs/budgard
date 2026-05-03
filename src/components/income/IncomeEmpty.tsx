import { useTranslation } from 'react-i18next';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { format } from 'date-fns';
import { el, enUS } from 'date-fns/locale';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

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
    <EmptyStateCard
      variant="page"
      media={
        <div
          className="w-20 h-20 rounded-full bg-income/10 flex items-center justify-center"
          aria-hidden="true"
        >
          <Plus className="h-10 w-10 text-income" />
        </div>
      }
      title={t('income.noIncomeFor', { month: monthLabel })}
      description={t('income.addFirstIncome')}
      actionLabel={t('income.addIncome')}
      onAction={onAddClick}
    />
  );
};

export default IncomeEmpty;
