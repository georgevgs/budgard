import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChartSpline from 'lucide-react/dist/esm/icons/chart-spline';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

const AnalyticsEmpty = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <EmptyStateCard
        variant="page"
        media={<ChartSpline className="h-12 w-12 text-muted-foreground/50" />}
        title={t('analytics.emptyTitle')}
        description={t('analytics.emptyDescription')}
        actionLabel={t('expenses.addExpense')}
        onAction={() => navigate('/today?action=add')}
      />
    </div>
  );
};

export default AnalyticsEmpty;
