import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

const AnalyticsEmpty = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="container max-w-4xl mx-auto px-4 pt-4 pb-4">
      <EmptyStateCard
        variant="page"
        media={
          <img
            src="/icons/bar-chart.png"
            alt=""
            className="w-20 h-20 opacity-80 drop-shadow-sm"
            aria-hidden="true"
          />
        }
        title={t('analytics.emptyTitle')}
        description={t('analytics.emptyDescription')}
        actionLabel={t('expenses.addExpense')}
        onAction={() => navigate('/expenses?action=add')}
      />
    </div>
  );
};

export default AnalyticsEmpty;
