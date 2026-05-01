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
import Repeat from 'lucide-react/dist/esm/icons/repeat';
import Wallet from 'lucide-react/dist/esm/icons/wallet';

const AppMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
        <DropdownMenuItem onClick={() => navigate('/networth')}>
          <Wallet className="h-4 w-4" />
          {t('navigation.networth')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/recurring')}>
          <Repeat className="h-4 w-4" />
          {t('navigation.recurring')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AppMenu;
