import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Wallet from 'lucide-react/dist/esm/icons/wallet';

type Props = {
  onAddClick: () => void;
}

const NetWorthEmpty = ({ onAddClick }: Props) => {
  const { t } = useTranslation();

  return (
    <Card className="border-border/50 rounded-2xl p-8 text-center overflow-hidden">
      <div className="flex flex-col items-center gap-3">
        <Wallet className="h-12 w-12 text-muted-foreground/50" />
        <div className="max-w-[280px]">
          <p className="font-medium">{t('networth.empty.title')}</p>
          <p className="text-sm text-muted-foreground">
            {t('networth.empty.description')}
          </p>
        </div>
        <Button
          onClick={onAddClick}
          variant="outline"
          size="sm"
          className="mt-2 max-w-full"
        >
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{t('networth.empty.cta')}</span>
        </Button>
      </div>
    </Card>
  );
}

export default NetWorthEmpty;
