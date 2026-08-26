import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ScrollSafeDropdownMenuTrigger from '@/components/common/ScrollSafeDropdownMenuTrigger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import Settings from 'lucide-react/dist/esm/icons/settings';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { useAuth } from '@/contexts/AuthContext';
import { useIsPro } from '@/hooks/useIsPro';
import { useUpgradeDialog } from '@/contexts/UpgradeDialogContext';

// The header's only menu. It used to sit opposite a second, identically
// styled dropdown holding Goals / Net worth / Debts — two pill buttons that
// looked the same and did different things. Those three destinations now live
// on Plan, which is where you go to think ahead; what is left here is the
// account itself.
const ProfileMenu = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const isPro = useIsPro();
  const { openUpgrade } = useUpgradeDialog();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!session?.user) return null;

  const initial = getInitial(session.user.email);

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <ScrollSafeDropdownMenuTrigger
        asChild
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-tile p-0 text-primary-ink shadow-[inset_0_0_0_1px_hsl(var(--tile-ring))] hover:bg-accent"
          aria-label={t('navigation.openProfileMenu')}
        >
          <span className="text-sm font-semibold">{initial}</span>
        </Button>
      </ScrollSafeDropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {renderEmail(session.user.email, t)}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/settings', { viewTransition: true })}
        >
          <Settings className="h-4 w-4" />
          {t('navigation.settings')}
        </DropdownMenuItem>
        {renderUpgradeItem(isPro, openUpgrade, t)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;

// --- Helpers ---

type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const getInitial = (email: string | undefined): string => {
  if (!email) return '?';

  return email.charAt(0).toUpperCase();
};

const renderEmail = (email: string | undefined, t: TranslateFunction) => {
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
};

const renderUpgradeItem = (
  isPro: boolean,
  openUpgrade: () => void,
  t: TranslateFunction,
) => {
  if (isPro) return null;

  return (
    <DropdownMenuItem onClick={openUpgrade}>
      <Sparkles className="h-4 w-4 text-primary-ink" />
      {t('navigation.upgrade')}
    </DropdownMenuItem>
  );
};
