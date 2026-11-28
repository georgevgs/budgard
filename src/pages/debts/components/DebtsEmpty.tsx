import { useTranslation } from 'react-i18next';
import { EmptyStateCard } from '@/common/ui/empty-state-card';
import Emoji3D from '@/common/components/common/Emoji3D/Emoji3D';

type DebtsEmptyProps = {
  onAddClick: () => void;
};

export const DebtsEmpty = ({ onAddClick }: DebtsEmptyProps) => {
  const { t } = useTranslation();

  return (
    <EmptyStateCard
      media={<Emoji3D emoji="💳" className="h-16 w-16" />}
      title={t('debts.empty.title')}
      description={t('debts.empty.description')}
      actionLabel={t('debts.empty.cta')}
      onAction={onAddClick}
    />
  );
};
