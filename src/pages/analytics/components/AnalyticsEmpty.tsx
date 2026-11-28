import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/common/components/common/PageHeader';
import { EmptyStateCard } from '@/common/ui/empty-state-card';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';

type AnalyticsEmptyProps = {
  title?: string;
  subtitle?: string;
};

export const AnalyticsEmpty = ({
  title: titleOverride,
  subtitle,
}: AnalyticsEmptyProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  let title = t('navigation.trends');
  if (titleOverride) {
    title = titleOverride;
  }

  return (
    <div className="page-shell">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="mt-8">
        <EmptyStateCard
          variant="page"
          media={<Emoji3D emoji="📊" className="h-16 w-16" />}
          title={t('analytics.emptyTitle')}
          description={t('analytics.emptyDescription')}
          actionLabel={t('expenses.addExpense')}
          onAction={() => navigate('/today?action=add')}
        />
      </div>
    </div>
  );
};
