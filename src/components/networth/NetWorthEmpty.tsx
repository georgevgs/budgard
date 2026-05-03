import { useTranslation } from 'react-i18next';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

type Props = {
  onAddClick: () => void;
};

const NetWorthEmpty = ({ onAddClick }: Props) => {
  const { t } = useTranslation();

  return (
    <EmptyStateCard
      media={<Wallet className="h-12 w-12 text-muted-foreground/50" />}
      title={t('networth.empty.title')}
      description={t('networth.empty.description')}
      actionLabel={t('networth.empty.cta')}
      onAction={onAddClick}
    />
  );
};

export default NetWorthEmpty;
