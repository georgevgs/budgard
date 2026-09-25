import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';

type ActivityHistoryErrorProps = {
  onRetry: () => void;
};

export const ActivityHistoryError = ({
  onRetry,
}: ActivityHistoryErrorProps) => {
  const { t } = useTranslation();

  return (
    <SurfaceCard role="alert" className="rounded-2xl px-5 py-6 text-center">
      <p className="type-heading">{t('activity.historyLoadFailedTitle')}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {t('activity.historyLoadFailedBody')}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={onRetry}
      >
        {t('common.tryAgain')}
      </Button>
    </SurfaceCard>
  );
};
