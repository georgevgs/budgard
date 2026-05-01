import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Settings from 'lucide-react/dist/esm/icons/settings';
import { useAuth } from '@/contexts/AuthContext';

const ProfileMenu = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();

  if (!session?.user) return null;

  const initial = getInitial(session.user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full p-0 bg-primary/10 text-primary hover:bg-primary/20"
          aria-label={t('navigation.openProfileMenu')}
        >
          <span className="text-sm font-semibold">{initial}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {renderEmail(session.user.email, t)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
          {t('navigation.settings')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ProfileMenu;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getInitial = (email: string | undefined): string => {
  if (!email) return '?';

  return email.charAt(0).toUpperCase();
}

const renderEmail = (
  email: string | undefined,
  t: TranslateFunction,
) => {
  if (!email) return null;

  return (
    <DropdownMenuLabel className="font-normal">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          {t('navigation.signedInAs')}
        </span>
        <span className="text-sm font-medium truncate">{email}</span>
      </div>
    </DropdownMenuLabel>
  );
}
