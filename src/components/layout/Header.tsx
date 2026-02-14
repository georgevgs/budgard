import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import ThemeToggle from '@/components/layout/ThemeToggle';

const Header = () => {
  const { session } = useAuth();
  const { t } = useTranslation();

  // Initialize theme on mount (applies to document + meta theme-color)
  useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background pt-safe-t">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/icon-512x512.png"
            alt={t('common.logoAlt')}
            className="h-7 w-7"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-lg font-semibold tracking-tight">Budgard</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground gap-2 font-normal"
            aria-label={t('auth.signOut')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
