import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MoreHorizontal from 'lucide-react/dist/esm/icons/more-horizontal';
import Target from 'lucide-react/dist/esm/icons/target';
import Wallet from 'lucide-react/dist/esm/icons/wallet';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';

const AppMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full p-0 bg-muted text-foreground hover:bg-muted/80 ring-1 ring-border/40"
          aria-label={t('navigation.openAppMenu')}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => navigate('/goals', { viewTransition: true })}
        >
          <Target className="h-4 w-4" />
          {t('navigation.goals')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/networth', { viewTransition: true })}
        >
          <Wallet className="h-4 w-4" />
          {t('navigation.networth')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/debts', { viewTransition: true })}
        >
          <CreditCard className="h-4 w-4" />
          {t('navigation.debts')}
        </DropdownMenuItem>
        {renderUpgradeItem(isPro, openUpgrade, t)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AppMenu;

// --- Helpers ---

const renderUpgradeItem = (
  isPro: boolean,
  openUpgrade: () => void,
  t: (key: string) => string,
) => {
  if (isPro) return null;

  return (
    <DropdownMenuItem onClick={openUpgrade}>
      <Sparkles className="h-4 w-4 text-primary" />
      {t('navigation.upgrade')}
    </DropdownMenuItem>
  );
};
