import Lock from 'lucide-react/dist/esm/icons/lock';
import { useTranslation } from 'react-i18next';
import { EmptyStateCard } from '@/components/ui/empty-state-card';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';

type Props = {
  title: string;
  description: string;
};

const ProUpsellCard = ({ title, description }: Props) => {
  const { t } = useTranslation();
  const { openUpgrade } = useUpgradeDialog();

  return (
    <EmptyStateCard
      media={<Lock className="h-12 w-12 text-muted-foreground/50" />}
      title={title}
      description={description}
      actionLabel={t('pro.upgradeTitle')}
      onAction={openUpgrade}
    />
  );
};

export default ProUpsellCard;
