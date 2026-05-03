import { useTranslation } from 'react-i18next';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import { EmptyStateCard } from '@/components/ui/empty-state-card';

type Props = {
  onAddClick: () => void;
};

const DebtsEmpty = ({ onAddClick }: Props) => {
  const { t } = useTranslation();

  return (
    <EmptyStateCard
      media={<CreditCard className="h-12 w-12 text-muted-foreground/50" />}
      title={t('debts.empty.title')}
      description={t('debts.empty.description')}
      actionLabel={t('debts.empty.cta')}
      onAction={onAddClick}
    />
  );
};

export default DebtsEmpty;
