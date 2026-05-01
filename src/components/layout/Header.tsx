import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import ProfileMenu from '@/components/layout/ProfileMenu';
import AppMenu from '@/components/layout/AppMenu';

const Header = () => {
  const { session } = useAuth();
  const { t } = useTranslation();

  // Initialize theme on mount (applies to document + meta theme-color)
  useTheme();

  if (!session) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl pt-safe-t">
      <div className="container grid grid-cols-3 items-center h-16 px-4 pt-1">
        <div className="justify-self-start">
          <ProfileMenu />
        </div>
        <div className="justify-self-center flex items-center gap-2">
          <img
            src="/icon-512x512.png"
            alt={t('common.logoAlt')}
            className="h-7 w-7 rounded-lg mix-blend-multiply dark:invert dark:mix-blend-screen"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-lg font-semibold tracking-tight">Budgard</span>
        </div>
        <div className="justify-self-end">
          <AppMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
