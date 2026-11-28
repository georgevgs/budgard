import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';

const RetryCard = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) => {
  const { t } = useTranslation();

  return (
    <SurfaceCard role="alert" className="space-y-3 p-4">
      <p className="text-sm">{message}</p>
      <Button type="button" variant="secondary" onClick={() => void onRetry()}>
        {t('common.tryAgain')}
      </Button>
    </SurfaceCard>
  );
};

export default RetryCard;
