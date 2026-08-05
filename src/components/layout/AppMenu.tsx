import { useTranslation } from 'react-i18next';
import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const { pathname } = useLocation();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const items: AppMenuItem[] = [
    { label: t('navigation.goals'), path: '/goals', icon: Target },
    { label: t('navigation.networth'), path: '/networth', icon: Wallet },
    { label: t('navigation.debts'), path: '/debts', icon: CreditCard },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full p-0 bg-muted text-foreground hover:bg-muted/80 ring-1 ring-border/40"
          aria-label={t('navigation.openAppMenu')}
        >
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((item) => renderMenuItem(item, pathname, navigate))}
        {renderUpgradeItem(isPro, openUpgrade, t)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AppMenu;

// --- Helpers ---

type AppMenuItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

type Navigate = ReturnType<typeof useNavigate>;

const renderMenuItem = (
  item: AppMenuItem,
  pathname: string,
  navigate: Navigate,
) => {
  const Icon = item.icon;
  const isCurrent = pathname === item.path;

  return (
    <DropdownMenuItem
      key={item.path}
      aria-current={getAriaCurrent(isCurrent)}
      className={getMenuItemClass(isCurrent)}
      onClick={() => navigate(item.path, { viewTransition: true })}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </DropdownMenuItem>
  );
};

const getAriaCurrent = (isCurrent: boolean): 'page' | undefined => {
  if (isCurrent) return 'page';

  return undefined;
};

const getMenuItemClass = (isCurrent: boolean): string | undefined => {
  if (isCurrent) return 'bg-accent text-accent-foreground';

  return undefined;
};

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
