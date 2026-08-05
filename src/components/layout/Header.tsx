import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import ProfileMenu from '@/components/layout/ProfileMenu';
import AppMenu from '@/components/layout/AppMenu';

// Routes outside the four bottom tabs — they get a back button so users
// aren't stranded on screens where no tab is active.
const SECONDARY_ROUTES = ['/goals', '/networth', '/debts', '/settings'];

const Header = () => {
  const { session } = useAuth();
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Initialize theme on mount (applies to document + meta theme-color)
  useTheme();

  if (!session) {
    return null;
  }

  const isSecondaryRoute = SECONDARY_ROUTES.includes(pathname);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl pt-safe-t">
      <div className="container grid grid-cols-3 items-center h-16 px-4 pt-1">
        <div className="justify-self-start">
          {renderLeftSlot(isSecondaryRoute)}
        </div>
        <Link
          to="/expenses"
          viewTransition
          aria-label={t('navigation.goHome')}
          className="justify-self-center flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 -my-1 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="/icon-512x512.png"
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-lg mix-blend-multiply dark:invert dark:mix-blend-screen"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-lg font-semibold tracking-tight">Budgard</span>
        </Link>
        <div className="justify-self-end">
          <AppMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;

// ─── Helper render functions ──────────────────────────────────────────────────

const renderLeftSlot = (isSecondaryRoute: boolean) => {
  if (isSecondaryRoute) {
    return <BackButton />;
  }

  return <ProfileMenu />;
};

const BackButton = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    // React Router stamps an index into history state; 0 means this entry
    // was a direct load (deep link), where "back" would leave the app.
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (historyIndex && historyIndex > 0) {
      navigate(-1);

      return;
    }
    navigate('/expenses', { viewTransition: true });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-11 w-11 rounded-full p-0 bg-muted text-foreground hover:bg-muted/80 ring-1 ring-border/40"
      onClick={handleBack}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
};
