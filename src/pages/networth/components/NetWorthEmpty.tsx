import { useTranslation } from 'react-i18next';
import { EmptyStateCard } from '@/common/ui/empty-state-card';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';

type NetWorthEmptyProps = {
  onAddClick: () => void;
};

export const NetWorthEmpty = ({ onAddClick }: NetWorthEmptyProps) => {
  const { t } = useTranslation();

  return (
    <EmptyStateCard
      media={<Emoji3D emoji="💰" className="h-16 w-16" />}
      title={t('networth.empty.title')}
      description={t('networth.empty.description')}
      actionLabel={t('networth.empty.cta')}
      onAction={onAddClick}
    />
  );
};
