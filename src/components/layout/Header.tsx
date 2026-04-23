import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Settings from 'lucide-react/dist/esm/icons/settings';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';

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
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="/icon-512x512.png"
            alt={t('common.logoAlt')}
            className="h-7 w-7 rounded-lg mix-blend-multiply dark:invert dark:mix-blend-screen"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-lg font-semibold tracking-tight">Budgard</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 text-muted-foreground"
          asChild
        >
          <Link to="/settings" aria-label={t('navigation.settings')}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
};

export default Header;
